import { useState, useEffect } from 'react'
import './RaceDashboard.css'

function RaceDashboard({ socket }) {
  const [raceStatus, setRaceStatus] = useState('idle')
  const [racers, setRacers] = useState([])
  const [raceData, setRaceData] = useState(null)
  const [errors, setErrors] = useState([])
  const [showErrorPanel, setShowErrorPanel] = useState(false)

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
      setErrors([])
      setShowErrorPanel(false)
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

  const handleNewRace = () => {
    setRaceStatus('idle')
    setRacers([])
    setRaceData(null)
    setErrors([])
    setShowErrorPanel(false)
  }

  return (
    <div className="RaceDashboard">
      <div className="dashboard-header">
        <h2>Race Dashboard</h2>
        <div className="race-status">
          Status: <span className={`status-${raceStatus}`}>{raceStatus.toUpperCase()}</span>
        </div>
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
        <div className="no-race">
          <p>No active race.</p>
          <p className="no-race-hint">Configure and start a race from the Config tab</p>
        </div>
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
          <button onClick={handleNewRace} className="new-race-button">
            Start New Race
          </button>
        </div>
      )}
    </div>
  )
}

export default RaceDashboard
