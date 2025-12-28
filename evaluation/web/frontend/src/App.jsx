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

  useEffect(() => {
    if (!socket) return

    socket.on('race_started', (data) => {
      console.log('Race started:', data)
      setRaceStatus('running')
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

  return (
    <div className="RaceMonitor">
      <h2>Race Monitor</h2>
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
        <p className="no-race">No active race. Start a race from the backend to see live updates.</p>
      )}
    </div>
  )
}

export default App
