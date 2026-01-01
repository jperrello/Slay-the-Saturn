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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({
    enemies: null,
    bot_names: null,
    test_count: null,
    thread_count: null
  })
  const [touched, setTouched] = useState({
    enemies: false,
    bot_names: false
  })

  const validateEnemies = (value) => {
    if (!value || value.trim() === '') {
      return 'Enemies field cannot be empty'
    }
    if (!/^[hgljsb]+$/.test(value)) {
      return 'Only valid characters: h, g, l, j, s, b'
    }
    return null
  }

  const validateBots = (bots) => {
    if (bots.length === 0) {
      return 'At least one bot must be selected'
    }
    return null
  }

  const handleScenarioChange = (scenario) => {
    setFormData(prev => ({ ...prev, scenario }))
  }

  const handleEnemiesChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, enemies: value }))
    if (touched.enemies) {
      setFieldErrors(prev => ({ ...prev, enemies: validateEnemies(value) }))
    }
  }

  const handleEnemiesBlur = () => {
    setTouched(prev => ({ ...prev, enemies: true }))
    setFieldErrors(prev => ({ ...prev, enemies: validateEnemies(formData.enemies) }))
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
      setFieldErrors(fe => ({ ...fe, bot_names: validateBots(newBotNames) }))
      return { ...prev, bot_names: newBotNames }
    })
    setTouched(prev => ({ ...prev, bot_names: true }))
  }

  const handleRemoveBot = (botName) => {
    setFormData(prev => {
      const newBotNames = prev.bot_names.filter(name => name !== botName)
      setFieldErrors(fe => ({ ...fe, bot_names: validateBots(newBotNames) }))
      return { ...prev, bot_names: newBotNames }
    })
    setTouched(prev => ({ ...prev, bot_names: true }))
  }

  const handleSelectAllBots = () => {
    const allBotNames = AVAILABLE_BOTS.map(b => b.name)
    setFormData(prev => ({ ...prev, bot_names: allBotNames }))
    setFieldErrors(prev => ({ ...prev, bot_names: null }))
    setTouched(prev => ({ ...prev, bot_names: true }))
  }

  const handleClearAllBots = () => {
    setFormData(prev => ({ ...prev, bot_names: [] }))
    setFieldErrors(prev => ({ ...prev, bot_names: validateBots([]) }))
    setTouched(prev => ({ ...prev, bot_names: true }))
  }

  const handleSelectCategory = (category) => {
    const categoryBots = AVAILABLE_BOTS.filter(b => b.category === category).map(b => b.name)
    setFormData(prev => {
      const newBotNames = [...new Set([...prev.bot_names, ...categoryBots])]
      setFieldErrors(fe => ({ ...fe, bot_names: validateBots(newBotNames) }))
      return { ...prev, bot_names: newBotNames }
    })
    setTouched(prev => ({ ...prev, bot_names: true }))
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

  const handleShowConfirmation = () => {
    setErrorMessage(null)

    const errors = validateFormData()
    if (errors.length > 0) {
      setErrorMessage('Validation errors:\n\n' + errors.join('\n'))
      return
    }

    setShowConfirmDialog(true)
  }

  const handleCancelRace = () => {
    setShowConfirmDialog(false)
  }

  const handleConfirmRace = async () => {
    setShowConfirmDialog(false)
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
        <div className="form-section" role="group" aria-labelledby="scenario-label">
          <label id="scenario-label" className="section-label">Scenario</label>
          <div className="scenario-grid" role="radiogroup" aria-label="Select game scenario">
            {Object.keys(SCENARIO_DESCRIPTIONS).map(key => {
              const scenarioNum = parseInt(key)
              const isSelected = formData.scenario === scenarioNum
              return (
                <button
                  key={scenarioNum}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`scenario-button ${isSelected ? 'active' : ''}`}
                  onClick={() => handleScenarioChange(scenarioNum)}
                  title={SCENARIO_DESCRIPTIONS[scenarioNum]}
                  aria-label={`Scenario ${scenarioNum}: ${SCENARIO_DESCRIPTIONS[scenarioNum]}`}
                >
                  <span className="scenario-number" aria-hidden="true">{scenarioNum}</span>
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
            className={`enemies-input ${touched.enemies && fieldErrors.enemies ? 'input-error' : ''}`}
            value={formData.enemies}
            onChange={handleEnemiesChange}
            onBlur={handleEnemiesBlur}
            placeholder="e.g., h, ghl, j"
            aria-describedby="enemies-help enemies-error"
            aria-invalid={touched.enemies && fieldErrors.enemies ? 'true' : 'false'}
          />
          {touched.enemies && fieldErrors.enemies && (
            <div id="enemies-error" className="field-error" role="alert">
              {fieldErrors.enemies}
            </div>
          )}
          <div id="enemies-help" className="enemies-help">
            h=HobGoblin • g=Goblin • l=Leech • j=JawWorm • s=SimpleEnemy • b=Bomber
          </div>
        </div>

        {/* Bot Selection */}
        <div className={`form-section ${touched.bot_names && fieldErrors.bot_names ? 'section-error' : ''}`} role="group" aria-labelledby="bot-selection-label">
          <div className="section-header-row">
            <label id="bot-selection-label" className="section-label">
              Bot Selection ({formData.bot_names.length}/{AVAILABLE_BOTS.length})
            </label>
            <div className="bot-actions">
              <button
                type="button"
                className="bot-action-btn select-all"
                onClick={handleSelectAllBots}
                disabled={formData.bot_names.length === AVAILABLE_BOTS.length}
              >
                Select All
              </button>
              <button
                type="button"
                className="bot-action-btn clear-all"
                onClick={handleClearAllBots}
                disabled={formData.bot_names.length === 0}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Selected Bots */}
          <div className={`selected-bots ${touched.bot_names && fieldErrors.bot_names ? 'bots-error' : ''}`} role="list" aria-label="Selected bots">
            {formData.bot_names.map(botName => (
              <div key={botName} className="selected-bot-chip" role="listitem">
                {botName}
                <button
                  type="button"
                  className="remove-bot"
                  onClick={() => handleRemoveBot(botName)}
                  aria-label={`Remove ${botName} from selection`}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            ))}
            {formData.bot_names.length === 0 && (
              <div className="no-bots-selected" role="listitem">No bots selected</div>
            )}
          </div>
          {touched.bot_names && fieldErrors.bot_names && (
            <div className="field-error" role="alert">
              {fieldErrors.bot_names}
            </div>
          )}

          {/* Bot Dropdown */}
          <div className="bot-selector">
            <input
              type="text"
              className="bot-search-input"
              placeholder="Search and add bots..."
              value={botSearchQuery}
              onChange={(e) => setBotSearchQuery(e.target.value)}
              onFocus={() => setShowBotDropdown(true)}
              aria-label="Search for bots to add"
              aria-expanded={showBotDropdown}
              aria-controls="bot-dropdown-list"
            />
            {showBotDropdown && (
              <div className="bot-dropdown" id="bot-dropdown-list" role="listbox" aria-label="Available bots">
                <div className="bot-dropdown-header">
                  <span>Available Bots</span>
                  <button
                    type="button"
                    className="close-dropdown"
                    onClick={() => {
                      setShowBotDropdown(false)
                      setBotSearchQuery('')
                    }}
                    aria-label="Close bot dropdown"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="bot-dropdown-content">
                  {Object.keys(groupedBots).map(category => {
                    const categoryBotNames = groupedBots[category].map(b => b.name)
                    const allCategorySelected = categoryBotNames.every(name => formData.bot_names.includes(name))
                    return (
                    <div key={category} className="bot-category" role="group" aria-label={category}>
                      <div className="bot-category-header" role="presentation">
                        <span>{category}</span>
                        <button
                          type="button"
                          className="category-select-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectCategory(category)
                          }}
                          disabled={allCategorySelected}
                        >
                          {allCategorySelected ? '✓ All' : '+Add All'}
                        </button>
                      </div>
                      {groupedBots[category].map(bot => {
                        const isSelected = formData.bot_names.includes(bot.name)
                        return (
                          <div
                            key={bot.name}
                            role="option"
                            aria-selected={isSelected}
                            className={`bot-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleBotToggle(bot.name)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleBotToggle(bot.name)
                              }
                            }}
                          >
                            <div className="bot-option-checkbox" aria-hidden="true">
                              {isSelected ? '✓' : ''}
                            </div>
                            <div className="bot-option-info">
                              <div className="bot-option-name">{bot.name}</div>
                              <div className="bot-option-description">{bot.description}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )})}
                  {Object.keys(groupedBots).length === 0 && (
                    <div className="no-results" role="status">No bots found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Count Slider */}
        <div className="form-section">
          <label className="section-label" htmlFor="test-count-slider">
            Test Count: <span className="value-display">{formData.test_count}</span>
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
              aria-valuemin={1}
              aria-valuemax={100}
              aria-valuenow={formData.test_count}
              aria-valuetext={`${formData.test_count} simulations per bot`}
            />
            <div className="slider-labels" aria-hidden="true">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Thread Count Slider */}
        <div className="form-section">
          <label className="section-label" htmlFor="thread-count-slider">
            Thread Count: <span className="value-display">{formData.thread_count}</span>
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
              aria-valuemin={1}
              aria-valuemax={16}
              aria-valuenow={formData.thread_count}
              aria-valuetext={`${formData.thread_count} parallel threads`}
            />
            <div className="slider-labels" aria-hidden="true">
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
          onClick={handleShowConfirmation}
          disabled={isLoading || validateFormData().length > 0}
          aria-busy={isLoading}
          aria-disabled={isLoading || validateFormData().length > 0}
        >
          {isLoading ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              <span role="status">Starting Race...</span>
            </>
          ) : (
            'Start Race'
          )}
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirm-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
          <div className="confirm-dialog">
            <h3 id="confirm-dialog-title">Confirm Race Configuration</h3>
            <div className="confirm-dialog-content">
              <div className="confirm-item">
                <span className="confirm-label">Scenario:</span>
                <span className="confirm-value">{SCENARIO_DESCRIPTIONS[formData.scenario]}</span>
              </div>
              <div className="confirm-item">
                <span className="confirm-label">Enemies:</span>
                <span className="confirm-value">{formData.enemies}</span>
              </div>
              <div className="confirm-item">
                <span className="confirm-label">Bots ({formData.bot_names.length}):</span>
                <div className="confirm-bots">
                  {formData.bot_names.map(bot => (
                    <span key={bot} className="confirm-bot-chip">{bot}</span>
                  ))}
                </div>
              </div>
              <div className="confirm-item">
                <span className="confirm-label">Simulations:</span>
                <span className="confirm-value">{formData.test_count} per bot × {formData.bot_names.length} bots = <strong>{formData.test_count * formData.bot_names.length} total</strong></span>
              </div>
              <div className="confirm-item">
                <span className="confirm-label">Threads:</span>
                <span className="confirm-value">{formData.thread_count}</span>
              </div>
            </div>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={handleCancelRace}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-button"
                onClick={handleConfirmRace}
                autoFocus
              >
                Start Race
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConfigPage
