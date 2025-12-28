import { useState } from 'react'
import './ConfigPage.css'

const SCENARIO_DESCRIPTIONS = {
  0: 'Starter Ironclad: 5 Strikes, 4 Defends, 1 Bash',
  1: 'Basics Batter Stimulate: 5 Strikes, 4 Defends, Batter, Stimulate',
  2: 'Tolerate: 1 Strike, 3 Defends, Tolerate',
  3: 'Basics Bomb: 5 Strikes, 4 Defends, Bomb',
  4: 'Basics Suffer: 5 Strikes, 4 Defends, Suffer',
  5: 'GIGL Random Deck: 20 random GIGL generated cards'
}

const AVAILABLE_BOTS = [
  { 
    name: 'mcts', 
    category: 'Traditional',
    description: 'Monte Carlo Tree Search - traditional AI approach'
  },
  { 
    name: 'mcts-200', 
    category: 'Traditional',
    description: 'MCTS with 200 iterations'
  },
  { 
    name: 'bt3', 
    category: 'Traditional',
    description: 'Backtrack search (depth 3)'
  },
  { 
    name: 'bt5', 
    category: 'Traditional',
    description: 'Backtrack search (depth 5)'
  },
  { 
    name: 'rndm', 
    category: 'Baseline',
    description: 'Random action selection'
  },
  { 
    name: 'rcot-gpt41', 
    category: 'LLM (Reverse CoT)',
    description: 'GPT-4.1 with Reverse Chain-of-Thought'
  },
  { 
    name: 'rcot-claude', 
    category: 'LLM (Reverse CoT)',
    description: 'Claude Sonnet 4.5 with Reverse CoT'
  },
  { 
    name: 'rcot-gemini', 
    category: 'LLM (Reverse CoT)',
    description: 'Google Gemini with Reverse CoT'
  },
  { 
    name: 'rcot-openrouter-auto', 
    category: 'LLM (Reverse CoT)',
    description: 'OpenRouter auto-routing with Reverse CoT'
  },
  { 
    name: 'cot-gpt41', 
    category: 'LLM (CoT)',
    description: 'GPT-4.1 with Chain-of-Thought'
  },
  { 
    name: 'cot-claude', 
    category: 'LLM (CoT)',
    description: 'Claude Sonnet 4.5 with CoT'
  },
  { 
    name: 'cot-gemini', 
    category: 'LLM (CoT)',
    description: 'Google Gemini with CoT'
  },
  { 
    name: 'none-gpt41', 
    category: 'LLM (Minimal)',
    description: 'GPT-4.1 with minimal prompting'
  },
  { 
    name: 'none-claude', 
    category: 'LLM (Minimal)',
    description: 'Claude Sonnet 4.5 with minimal prompting'
  },
  { 
    name: 'none-gemini', 
    category: 'LLM (Minimal)',
    description: 'Google Gemini with minimal prompting'
  },
]

function ConfigPage({ onStartRace }) {
  const [formData, setFormData] = useState({
    scenario: 0,
    enemies: 'h',
    bot_names: ['mcts', 'bt3', 'rndm'],
    test_count: 25,
    thread_count: 4
  })
  const [showBotDropdown, setShowBotDropdown] = useState(false)
  const [botSearchQuery, setBotSearchQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleScenarioChange = (scenario) => {
    setFormData(prev => ({ ...prev, scenario }))
  }

  const handleEnemiesChange = (e) => {
    setFormData(prev => ({ ...prev, enemies: e.target.value }))
  }

  const handleTestCountChange = (e) => {
    setFormData(prev => ({ ...prev, test_count: parseInt(e.target.value) }))
  }

  const handleThreadCountChange = (e) => {
    setFormData(prev => ({ ...prev, thread_count: parseInt(e.target.value) }))
  }

  const handleBotToggle = (botName) => {
    setFormData(prev => {
      const isSelected = prev.bot_names.includes(botName)
      const newBotNames = isSelected
        ? prev.bot_names.filter(name => name !== botName)
        : [...prev.bot_names, botName]
      return { ...prev, bot_names: newBotNames }
    })
  }

  const handleRemoveBot = (botName) => {
    setFormData(prev => ({
      ...prev,
      bot_names: prev.bot_names.filter(name => name !== botName)
    }))
  }

  const validateFormData = () => {
    const errors = []

    if (formData.scenario < 0 || formData.scenario > 5) {
      errors.push('Scenario must be between 0 and 5')
    }

    if (!formData.enemies || formData.enemies.trim() === '') {
      errors.push('Enemies field cannot be empty')
    } else if (!/^[hgljsb]+$/.test(formData.enemies)) {
      errors.push('Enemies must contain only: h, g, l, j, s, b')
    }

    if (formData.bot_names.length === 0) {
      errors.push('At least one bot must be selected')
    }

    if (formData.test_count < 1) {
      errors.push('Test count must be at least 1')
    } else if (formData.test_count > 1000) {
      errors.push('Test count is too high (maximum 1000)')
    }

    if (formData.thread_count < 1) {
      errors.push('Thread count must be at least 1')
    } else if (formData.thread_count > 64) {
      errors.push('Thread count is too high (maximum 64)')
    }

    return errors
  }

  const handleStartRace = async () => {
    setErrorMessage(null)

    const errors = validateFormData()
    if (errors.length > 0) {
      setErrorMessage('Validation errors:\n\n' + errors.join('\n'))
      return
    }

    setIsLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch('http://localhost:8000/api/race/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenario: formData.scenario,
          enemies: formData.enemies,
          bot_names: formData.bot_names,
          test_count: formData.test_count,
          thread_count: formData.thread_count
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorText = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.detail) {
            errorText = errorData.detail
          }
        } catch (e) {
          // Use default error text
        }
        throw new Error(errorText)
      }

      const data = await response.json()
      console.log('Race started:', data)
      setErrorMessage(null)
      
      if (onStartRace) {
        onStartRace()
      }
    } catch (error) {
      console.error('Error starting race:', error)
      let errorMsg = error.message

      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. The server may be overloaded.'
      } else if (!navigator.onLine) {
        errorMsg = 'No internet connection. Please check your network.'
      }

      setErrorMessage(`Error: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBots = AVAILABLE_BOTS.filter(bot =>
    bot.name.toLowerCase().includes(botSearchQuery.toLowerCase()) ||
    bot.description.toLowerCase().includes(botSearchQuery.toLowerCase()) ||
    bot.category.toLowerCase().includes(botSearchQuery.toLowerCase())
  )

  const groupedBots = filteredBots.reduce((acc, bot) => {
    if (!acc[bot.category]) {
      acc[bot.category] = []
    }
    acc[bot.category].push(bot)
    return acc
  }, {})

  return (
    <div className="ConfigPage">
      <div className="config-header">
        <h2>Race Configuration</h2>
        <p className="config-subtitle">Configure your agent evaluation race</p>
      </div>

      {errorMessage && (
        <div className="error-message">
          <div className="error-content">
            <strong>Error:</strong> {errorMessage}
            <button
              className="error-close"
              onClick={() => setErrorMessage(null)}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="config-form">
        {/* Scenario Selection */}
        <div className="form-section">
          <label className="section-label">Scenario</label>
          <div className="scenario-grid">
            {Object.keys(SCENARIO_DESCRIPTIONS).map(key => {
              const scenarioNum = parseInt(key)
              return (
                <button
                  key={scenarioNum}
                  type="button"
                  className={`scenario-button ${formData.scenario === scenarioNum ? 'active' : ''}`}
                  onClick={() => handleScenarioChange(scenarioNum)}
                  title={SCENARIO_DESCRIPTIONS[scenarioNum]}
                >
                  <span className="scenario-number">{scenarioNum}</span>
                  <span className="scenario-name">
                    {SCENARIO_DESCRIPTIONS[scenarioNum].split(':')[0]}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="scenario-description">
            {SCENARIO_DESCRIPTIONS[formData.scenario]}
          </div>
        </div>

        {/* Enemies Input */}
        <div className="form-section">
          <label className="section-label" htmlFor="enemies-input">
            Enemies
          </label>
          <input
            id="enemies-input"
            type="text"
            className="enemies-input"
            value={formData.enemies}
            onChange={handleEnemiesChange}
            placeholder="e.g., h, ghl, j"
          />
          <div className="enemies-help">
            h=HobGoblin • g=Goblin • l=Leech • j=JawWorm • s=SimpleEnemy • b=Bomber
          </div>
        </div>

        {/* Bot Selection */}
        <div className="form-section">
          <label className="section-label">
            Bot Selection ({formData.bot_names.length} selected)
          </label>
          
          {/* Selected Bots */}
          <div className="selected-bots">
            {formData.bot_names.map(botName => (
              <div key={botName} className="selected-bot-chip">
                {botName}
                <button
                  type="button"
                  className="remove-bot"
                  onClick={() => handleRemoveBot(botName)}
                  aria-label={`Remove ${botName}`}
                >
                  ×
                </button>
              </div>
            ))}
            {formData.bot_names.length === 0 && (
              <div className="no-bots-selected">No bots selected</div>
            )}
          </div>

          {/* Bot Dropdown */}
          <div className="bot-selector">
            <input
              type="text"
              className="bot-search-input"
              placeholder="Search and add bots..."
              value={botSearchQuery}
              onChange={(e) => setBotSearchQuery(e.target.value)}
              onFocus={() => setShowBotDropdown(true)}
            />
            {showBotDropdown && (
              <div className="bot-dropdown">
                <div className="bot-dropdown-header">
                  <span>Available Bots</span>
                  <button
                    type="button"
                    className="close-dropdown"
                    onClick={() => {
                      setShowBotDropdown(false)
                      setBotSearchQuery('')
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="bot-dropdown-content">
                  {Object.keys(groupedBots).map(category => (
                    <div key={category} className="bot-category">
                      <div className="bot-category-header">{category}</div>
                      {groupedBots[category].map(bot => (
                        <div
                          key={bot.name}
                          className={`bot-option ${formData.bot_names.includes(bot.name) ? 'selected' : ''}`}
                          onClick={() => handleBotToggle(bot.name)}
                        >
                          <div className="bot-option-checkbox">
                            {formData.bot_names.includes(bot.name) && '✓'}
                          </div>
                          <div className="bot-option-info">
                            <div className="bot-option-name">{bot.name}</div>
                            <div className="bot-option-description">{bot.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {Object.keys(groupedBots).length === 0 && (
                    <div className="no-results">No bots found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Count Slider */}
        <div className="form-section">
          <label className="section-label" htmlFor="test-count-slider">
            Test Count: {formData.test_count}
          </label>
          <div className="slider-container">
            <input
              id="test-count-slider"
              type="range"
              min="1"
              max="100"
              value={formData.test_count}
              onChange={handleTestCountChange}
              className="slider"
            />
            <div className="slider-labels">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Thread Count Slider */}
        <div className="form-section">
          <label className="section-label" htmlFor="thread-count-slider">
            Thread Count: {formData.thread_count}
          </label>
          <div className="slider-container">
            <input
              id="thread-count-slider"
              type="range"
              min="1"
              max="16"
              value={formData.thread_count}
              onChange={handleThreadCountChange}
              className="slider"
            />
            <div className="slider-labels">
              <span>1</span>
              <span>8</span>
              <span>16</span>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          type="button"
          className="start-race-button"
          onClick={handleStartRace}
          disabled={isLoading || validateFormData().length > 0}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Starting Race...
            </>
          ) : (
            'Start Race'
          )}
        </button>
      </div>
    </div>
  )
}

export default ConfigPage
