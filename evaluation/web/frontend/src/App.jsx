import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const SCENARIO_DESCRIPTIONS = {
  0: 'Starter Ironclad: 5 Strikes, 4 Defends, 1 Bash',
  1: 'Basics Batter Stimulate: 5 Strikes, 4 Defends, Batter, Stimulate',
  2: 'Tolerate: 1 Strike, 3 Defends, Tolerate',
  3: 'Basics Bomb: 5 Strikes, 4 Defends, Bomb',
  4: 'Basics Suffer: 5 Strikes, 4 Defends, Suffer',
  5: 'GIGL Random Deck: 20 random GIGL generated cards'
}

function App() {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const socketInstance = io('http://localhost:8000', {
      transports: ['websocket', 'polling']
    })

    socketInstance.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.close()
    }
  }, [])

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Slay the Saturn - Race Dashboard</h1>
          <div className="connection-status">
            Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </header>

        <nav className="App-nav">
          <Link to="/">Home</Link>
          <Link to="/race">Race Monitor</Link>
        </nav>

        <main className="App-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/race" element={<RaceMonitor socket={socket} />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function Home() {
  return (
    <div className="Home">
      <h2>Welcome to Slay the Saturn</h2>
      <p>Real-time agent evaluation dashboard for Slay the Spire-like scenarios</p>
      <div className="features">
        <h3>Features</h3>
        <ul>
          <li>Live race monitoring with WebSocket updates</li>
          <li>Multi-bot parallel evaluation</li>
          <li>Real-time LLM metrics (tokens, response times)</li>
          <li>Error tracking and logging</li>
          <li>CSV result export</li>
        </ul>
      </div>
    </div>
  )
}

function RaceMonitor({ socket }) {
  const [raceStatus, setRaceStatus] = useState('idle')
  const [racers, setRacers] = useState([])
  const [raceData, setRaceData] = useState(null)
  const [showForm, setShowForm] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [errors, setErrors] = useState([])
  const [showErrorPanel, setShowErrorPanel] = useState(false)
  const [formData, setFormData] = useState({
    scenario: '0',
    enemies: 'h',
    bot_names: 'mcts,bt3,rndm',
    test_count: '25',
    thread_count: '4'
  })

  useEffect(() => {
    if (!socket) return

    socket.on('race_started', (data) => {
      console.log('Race started:', data)
      setRaceStatus('running')
      setShowForm(false)
      setRacers(data.bot_names.map(name => ({
        name,
        wins: 0,
        losses: 0,
        errors: 0,
        simulations_complete: 0,
        total_health: 0,
        avg_health: 0,
        total_requests: 0,
        total_tokens: 0,
        invalid_responses: 0,
        avg_response_time: 0
      })))
    })

    socket.on('racer_update', (data) => {
      console.log('Racer update:', data)
      setRacers(prev => prev.map(racer =>
        racer.name === data.bot_name ? { ...racer, ...data } : racer
      ))
    })

    socket.on('race_finished', (data) => {
      console.log('Race finished:', data)
      setRaceStatus('finished')
      setRaceData(data)
    })

    socket.on('error_logged', (data) => {
      console.error('Simulation error:', data)
      const timestamp = new Date().toLocaleTimeString()
      const errorEntry = {
        timestamp,
        bot_name: data.bot_name || 'Unknown',
        sim_num: data.sim_index || 0,
        error_message: data.error_msg || 'Unknown error'
      }
      setErrors(prev => [...prev, errorEntry])
    })

    return () => {
      socket.off('race_started')
      socket.off('racer_update')
      socket.off('race_finished')
      socket.off('error_logged')
    }
  }, [socket])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateFormData = () => {
    const errors = []

    // Validate scenario
    const scenario = parseInt(formData.scenario)
    if (isNaN(scenario) || scenario < 0 || scenario > 5) {
      errors.push('Scenario must be between 0 and 5')
    }

    // Validate enemies string
    if (!formData.enemies || formData.enemies.trim() === '') {
      errors.push('Enemies field cannot be empty')
    } else if (!/^[hgljsb]+$/.test(formData.enemies)) {
      errors.push('Enemies must contain only: h (HobGoblin), g (Goblin), l (Leech), j (JawWorm), s (SimpleEnemy), b (Bomber)')
    }

    // Validate bot names
    const botNames = formData.bot_names.split(',').map(b => b.trim()).filter(b => b !== '')
    if (botNames.length === 0) {
      errors.push('At least one bot name is required')
    } else if (botNames.some(name => name === '')) {
      errors.push('Bot names cannot contain empty values')
    }

    // Validate test count
    const testCount = parseInt(formData.test_count)
    if (isNaN(testCount) || testCount < 1) {
      errors.push('Test count must be a positive integer (minimum 1)')
    } else if (testCount > 1000) {
      errors.push('Test count is too high (maximum 1000)')
    }

    // Validate thread count
    const threadCount = parseInt(formData.thread_count)
    if (isNaN(threadCount) || threadCount < 1) {
      errors.push('Thread count must be a positive integer (minimum 1)')
    } else if (threadCount > 64) {
      errors.push('Thread count is too high (maximum 64)')
    }

    return errors
  }

  const handleStartRace = async (e) => {
    e.preventDefault()
    
    // Clear any previous errors
    setErrorMessage(null)
    
    // Validate form data
    const errors = validateFormData()
    if (errors.length > 0) {
      setErrorMessage('Validation errors:\n\n' + errors.join('\n'))
      return
    }

    setIsLoading(true)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch('http://localhost:8000/api/race/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenario: parseInt(formData.scenario),
          enemies: formData.enemies,
          bot_names: formData.bot_names.split(',').map(b => b.trim()),
          test_count: parseInt(formData.test_count),
          thread_count: parseInt(formData.thread_count)
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
          // If response is not JSON, use the default error text
        }
        throw new Error(errorText)
      }
      
      const data = await response.json()
      console.log('Race started:', data)
      setErrorMessage(null)
    } catch (error) {
      console.error('Error starting race:', error)
      let errorMsg = error.message
      
      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. The server may be overloaded.'
      } else if (!navigator.onLine) {
        errorMsg = 'No internet connection. Please check your network.'
      }
      
      setErrorMessage(`Error: ${errorMsg}`)
      setIsLoading(false)
    }
  }

  const handleDownloadCSV = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/race/download')
      
      if (!response.ok) {
        throw new Error(`Failed to download CSV: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'race-results.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading CSV:', error)
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <div className="RaceMonitor">
      <h2>Race Monitor</h2>
      
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

      {showForm && (
        <div className="race-form">
          <h3>Start a New Race</h3>
          <form onSubmit={handleStartRace}>
            <div className="form-group">
              <label htmlFor="scenario">Scenario:</label>
              <select
                id="scenario"
                name="scenario"
                value={formData.scenario}
                onChange={handleFormChange}
                title={SCENARIO_DESCRIPTIONS[formData.scenario]}
              >
                <option value="0">0: starter-ironclad</option>
                <option value="1">1: basics-batter-stimulate</option>
                <option value="2">2: tolerate</option>
                <option value="3">3: basics-bomb</option>
                <option value="4">4: basics-suffer</option>
                <option value="5">5: gigl-random-deck</option>
              </select>
              <div className="form-help">
                {SCENARIO_DESCRIPTIONS[formData.scenario]}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="enemies">Enemies:</label>
              <input
                id="enemies"
                type="text"
                name="enemies"
                value={formData.enemies}
                onChange={handleFormChange}
                placeholder="e.g., h, ghl, j"
                title="h=HobGoblin, g=Goblin, l=Leech, j=JawWorm, s=SimpleEnemy, b=Bomber"
              />
              <div className="form-help">
                h=HobGoblin • g=Goblin • l=Leech • j=JawWorm • s=SimpleEnemy • b=Bomber
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="bot_names">Bot Names (comma-separated):</label>
              <input
                id="bot_names"
                type="text"
                name="bot_names"
                value={formData.bot_names}
                onChange={handleFormChange}
                placeholder="e.g., mcts, bt3, rndm"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="test_count">Test Count:</label>
                <input
                  id="test_count"
                  type="number"
                  name="test_count"
                  value={formData.test_count}
                  onChange={handleFormChange}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="thread_count">Thread Count:</label>
                <input
                  id="thread_count"
                  type="number"
                  name="thread_count"
                  value={formData.thread_count}
                  onChange={handleFormChange}
                  min="1"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || validateFormData().length > 0} 
              className="start-button"
              title={validateFormData().length > 0 ? validateFormData()[0] : 'Click to start the race'}
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
          </form>
        </div>
      )}

      <div className="race-status">
        Status: <span className={`status-${raceStatus}`}>{raceStatus.toUpperCase()}</span>
      </div>

      {racers.length > 0 ? (
        <div className="racers">
          {racers.map(racer => (
            <div key={racer.name} className="racer-card">
              <h3>{racer.name}</h3>
              <div className="racer-stats">
                <div className="stat">
                  <span className="label">Avg Health:</span>
                  <span className="value">{racer.avg_health.toFixed(1)}</span>
                </div>
                <div className="stat">
                  <span className="label">Record:</span>
                  <span className="value">{racer.wins}W/{racer.losses}L</span>
                </div>
                {racer.errors > 0 && (
                  <div className="stat error">
                    <span className="label">Errors:</span>
                    <span className="value">{racer.errors}</span>
                  </div>
                )}
                {racer.total_tokens > 0 && (
                  <>
                    <div className="stat">
                      <span className="label">Tokens:</span>
                      <span className="value">{racer.total_tokens.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Avg Response:</span>
                      <span className="value">{racer.avg_response_time.toFixed(1)}s</span>
                    </div>
                  </>
                )}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(racer.simulations_complete / 100) * 100}%` }}
                />
              </div>
              <div className="simulations-count">
                {racer.simulations_complete} simulations
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-race">No active race. Fill out the form to start a race.</p>
      )}

      {racers.length > 0 && (
        <div className="error-panel-toggle">
          <button 
            onClick={() => setShowErrorPanel(!showErrorPanel)}
            className="toggle-errors-button"
          >
            {showErrorPanel ? '▼' : '▶'} Errors ({errors.length})
          </button>
        </div>
      )}

      {showErrorPanel && errors.length > 0 && (
        <div className="error-panel">
          <div className="error-panel-header">
            <h3>Simulation Errors</h3>
            <div className="error-panel-actions">
              <button 
                onClick={() => setErrors([])}
                className="clear-errors-button"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="error-panel-content">
            {errors.map((error, idx) => (
              <div key={idx} className="error-entry">
                <span className="error-timestamp">[{error.timestamp}]</span>
                <span className="error-bot">{error.bot_name}</span>
                <span className="error-sim">sim #{error.sim_num}:</span>
                <span className="error-message">{error.error_message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {raceStatus === 'finished' && (
        <div className="race-actions">
          <button onClick={handleDownloadCSV} className="download-button">
            Download Results as CSV
          </button>
          <button onClick={() => {
            setShowForm(true)
            setRaceStatus('idle')
            setRacers([])
            setRaceData(null)
            setErrors([])
            setShowErrorPanel(false)
          }} className="new-race-button">
            Start New Race
          </button>
        </div>
      )}
    </div>
  )
}

export default App
