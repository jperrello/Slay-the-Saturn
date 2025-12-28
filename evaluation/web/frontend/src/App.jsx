import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'

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

  const handleStartRace = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
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
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to start race: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Race started:', data)
    } catch (error) {
      console.error('Error starting race:', error)
      alert(`Error: ${error.message}`)
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
              >
                <option value="0">0: starter-ironclad</option>
                <option value="1">1: basics-batter-stimulate</option>
                <option value="2">2: tolerate</option>
                <option value="3">3: basics-bomb</option>
                <option value="4">4: basics-suffer</option>
                <option value="5">5: gigl-random-deck</option>
              </select>
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
              />
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

            <button type="submit" disabled={isLoading} className="start-button">
              {isLoading ? 'Starting...' : 'Start Race'}
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
          }} className="new-race-button">
            Start New Race
          </button>
        </div>
      )}
    </div>
  )
}

export default App
