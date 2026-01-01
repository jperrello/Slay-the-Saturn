import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { getBotColor } from '../config/botColors'
import AnimatedCounter from './AnimatedCounter'
import './RaceDashboard.css'

function RaceDashboard({ socket }) {
  const [raceStatus, setRaceStatus] = useState('idle')
  const [racers, setRacers] = useState([])
  const [raceData, setRaceData] = useState(null)
  const [errors, setErrors] = useState([])
  const [showErrorPanel, setShowErrorPanel] = useState(false)
  const [totalSimsPerBot, setTotalSimsPerBot] = useState(25)
  const [raceStartTime, setRaceStartTime] = useState(null)
  const [justFlashed, setJustFlashed] = useState({})
  const [animatingStats, setAnimatingStats] = useState({})
  const [previousRanks, setPreviousRanks] = useState({})
  const [rankChanges, setRankChanges] = useState({})
  const [winStreaks, setWinStreaks] = useState({})
  const [recentWins, setRecentWins] = useState([])
  const [lastWinner, setLastWinner] = useState(null)

  // Sort racers by wins (descending) for competitive leaderboard
  const sortedRacers = useMemo(() => {
    return [...racers].sort((a, b) => {
      // Sort by wins descending
      if (b.wins !== a.wins) {
        return b.wins - a.wins
      }
      // If wins are equal, sort by losses ascending (fewer losses = better)
      if (a.losses !== b.losses) {
        return a.losses - b.losses
      }
      // If wins and losses are equal, sort by name
      return a.name.localeCompare(b.name)
    })
  }, [racers])

  // Track rank changes for animations
  useEffect(() => {
    if (sortedRacers.length === 0) return

    const currentRanks = {}
    sortedRacers.forEach((racer, index) => {
      currentRanks[racer.name] = index + 1
    })

    // Detect rank changes
    const changes = {}
    Object.keys(currentRanks).forEach(name => {
      const prevRank = previousRanks[name]
      const currRank = currentRanks[name]

      if (prevRank !== undefined && prevRank !== currRank) {
        const delta = prevRank - currRank // positive = moved up, negative = moved down
        changes[name] = {
          delta,
          direction: delta > 0 ? 'up' : 'down',
          from: prevRank,
          to: currRank
        }
      }
    })

    if (Object.keys(changes).length > 0) {
      setRankChanges(changes)
      // Clear rank change indicators after animation
      setTimeout(() => {
        setRankChanges({})
      }, 1500)
    }

    setPreviousRanks(currentRanks)
  }, [sortedRacers])

  useEffect(() => {
    if (!socket) return

    socket.on('race_started', (data) => {
      console.log('Race started:', data)
      setRaceStatus('running')
      setTotalSimsPerBot(data.test_count || 25)
      setRaceStartTime(Date.now())
      setRacers(data.bot_names.map(name => ({
        name,
        wins: 0,
        losses: 0,
        errors: 0,
        simulations_complete: 0,
        total_health: 0,
        avg_health: 0,
        current_health: 80, // Starting health
        max_health: 80,
        total_requests: 0,
        total_tokens: 0,
        invalid_responses: 0,
        avg_response_time: 0,
        total_execution_time: 0,
        avg_execution_time: 0
      })))
      setErrors([])
      setShowErrorPanel(false)
      setPreviousRanks({})
      setRankChanges({})
      setWinStreaks({})
      setRecentWins([])
      setLastWinner(null)
    })

    socket.on('race_status', (data) => {
      console.log('Race status received:', data)
      if (data.racers && Object.keys(data.racers).length > 0) {
        // Reconnected to an existing race - initialize from status
        const racerNames = Object.keys(data.racers)
        setRaceStatus(data.status?.is_finished ? 'finished' : 'running')
        setTotalSimsPerBot(data.status?.total_sims / racerNames.length || 25)
        setRacers(racerNames.map(name => ({
          name,
          ...data.racers[name],
          current_health: data.racers[name].avg_health || 80,
          max_health: 80
        })))
      }
    })

    socket.on('racer_update', (data) => {
      console.log('Racer update:', data)
      setRacers(prev => {
        const updated = prev.map(racer => {
          if (racer.name === data.bot_name) {
            const prevWins = racer.wins
            const prevLosses = racer.losses
            const isWin = data.wins > prevWins
            const isLoss = data.losses > prevLosses

            if (isWin || isLoss) {
              setJustFlashed(prev => ({
                ...prev,
                [data.bot_name]: isWin ? 'win' : 'loss'
              }))

              setAnimatingStats(prev => ({
                ...prev,
                [data.bot_name]: isWin ? 'win' : 'loss'
              }))

              // Track win streaks
              if (isWin) {
                setWinStreaks(prev => ({
                  ...prev,
                  [data.bot_name]: (prev[data.bot_name] || 0) + 1
                }))

                // Set last winner
                setLastWinner(data.bot_name)

                // Add to recent wins for notification
                const winNotification = {
                  id: Date.now(),
                  botName: data.bot_name,
                  streak: (winStreaks[data.bot_name] || 0) + 1
                }
                setRecentWins(prev => [...prev.slice(-4), winNotification])

                // Auto-remove notification after 4 seconds
                setTimeout(() => {
                  setRecentWins(prev => prev.filter(w => w.id !== winNotification.id))
                }, 4000)
              } else {
                // Reset streak on loss
                setWinStreaks(prev => ({
                  ...prev,
                  [data.bot_name]: 0
                }))
              }

              setTimeout(() => {
                setJustFlashed(prev => {
                  const newState = { ...prev }
                  delete newState[data.bot_name]
                  return newState
                })
              }, 600)

              setTimeout(() => {
                setAnimatingStats(prev => {
                  const newState = { ...prev }
                  delete newState[data.bot_name]
                  return newState
                })
              }, 600)
            }

            return { ...racer, ...data }
          }
          return racer
        })
        return updated
      })
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
      socket.off('race_status')
      socket.off('racer_update')
      socket.off('race_finished')
      socket.off('error_logged')
    }
  }, [socket])

  const handleDownloadCSV = useCallback(async () => {
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
  }, [])

  const handleNewRace = useCallback(() => {
    setRaceStatus('idle')
    setRacers([])
    setRaceData(null)
    setErrors([])
    setShowErrorPanel(false)
    setRaceStartTime(null)
  }, [])

  const handleToggleErrorPanel = useCallback(() => {
    setShowErrorPanel(prev => !prev)
  }, [])

  const handleClearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const formatTime = useCallback((seconds) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(0)
    return `${mins}m ${secs}s`
  }, [])

  const getElapsedTime = useCallback(() => {
    if (!raceStartTime) return '0s'
    const elapsed = (Date.now() - raceStartTime) / 1000
    return formatTime(elapsed)
  }, [raceStartTime, formatTime])

  return (
    <div className="RaceDashboard" role="main" aria-label="Race Dashboard">
      <div className="dashboard-header">
        <h2>Race Dashboard</h2>
        <div className="header-info">
          <div className="race-status" role="status" aria-live="polite">
            <span className="status-label">Status:</span>
            <span className={`status-badge status-${raceStatus}`}>
              <span className="status-icon" aria-hidden="true">
                {raceStatus === 'idle' ? '○' : raceStatus === 'running' ? '●' : '✓'}
              </span>
              {raceStatus.toUpperCase()}
            </span>
          </div>
          {raceStatus === 'running' && (
            <div className="race-timer" role="timer" aria-label={`Elapsed time: ${getElapsedTime()}`}>
              <span aria-hidden="true">⏱</span> Elapsed: {getElapsedTime()}
            </div>
          )}
        </div>
      </div>

      {/* Win Notifications Toast Area */}
      {recentWins.length > 0 && (
        <div className="win-notifications" role="log" aria-label="Recent wins">
          {recentWins.map(win => (
            <div
              key={win.id}
              className={`win-notification ${win.streak >= 5 ? 'mega-streak' : win.streak >= 3 ? 'hot-streak' : ''}`}
              style={{ '--win-color': getBotColor(win.botName) }}
            >
              <span className="win-icon" aria-hidden="true">🏆</span>
              <span className="win-text">
                <strong style={{ color: getBotColor(win.botName) }}>{win.botName}</strong> wins!
              </span>
              {win.streak > 1 && (
                <span className="win-streak-badge">{win.streak}x STREAK</span>
              )}
            </div>
          ))}
        </div>
      )}

      {sortedRacers.length > 0 ? (
        <div className="leaderboard-container" role="list" aria-label="Race leaderboard">
          {sortedRacers.map((racer, index) => {
            const botColor = getBotColor(racer.name)
            const progressPercent = (racer.simulations_complete / totalSimsPerBot) * 100
            const healthPercent = racer.max_health > 0
              ? (racer.avg_health / racer.max_health) * 100
              : 0
            const winRate = racer.wins + racer.losses > 0
              ? ((racer.wins / (racer.wins + racer.losses)) * 100).toFixed(1)
              : '0.0'

            const rankBadge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`
            const rankChange = rankChanges[racer.name]
            const isMovingUp = rankChange?.direction === 'up'
            const isMovingDown = rankChange?.direction === 'down'
            const currentStreak = winStreaks[racer.name] || 0
            const isLastWinner = lastWinner === racer.name
            const hasMegaStreak = currentStreak >= 5
            const hasHotStreak = currentStreak >= 3

            return (
              <div
                key={racer.name}
                role="listitem"
                aria-label={`${racer.name}: Rank ${index + 1}, ${racer.wins} wins, ${racer.losses} losses`}
                className={`leaderboard-row ${justFlashed[racer.name] === 'win' ? 'flash-win' : justFlashed[racer.name] === 'loss' ? 'flash-loss' : ''} ${isMovingUp ? 'rank-up' : ''} ${isMovingDown ? 'rank-down' : ''} ${hasMegaStreak ? 'mega-streak-row' : hasHotStreak ? 'hot-streak-row' : ''} ${isLastWinner ? 'last-winner' : ''}`}
                style={{
                  '--agent-color': botColor,
                  '--agent-color-glow': `${botColor}40`,
                  '--rank-position': index + 1,
                  order: index
                }}
              >
                {/* Rank Badge */}
                <div className="rank-badge" aria-label={`Rank ${index + 1}`}>
                  <span className="rank-text" aria-hidden="true">{rankBadge}</span>
                  {rankChange && (
                    <span
                      className={`rank-change-indicator ${rankChange.direction}`}
                      role="status"
                      aria-label={`Moved ${rankChange.direction} ${Math.abs(rankChange.delta)} position${Math.abs(rankChange.delta) > 1 ? 's' : ''}`}
                    >
                      {isMovingUp ? '▲' : '▼'} {Math.abs(rankChange.delta)}
                    </span>
                  )}
                </div>

                {/* Agent Info */}
                <div className="leaderboard-agent-info">
                  <div className="agent-header">
                    <span className="agent-name" style={{ color: botColor }}>
                      {racer.name}
                    </span>
                    {isLastWinner && (
                      <span className="last-winner-badge" role="status">
                        <span aria-hidden="true">⭐</span> LAST WIN
                      </span>
                    )}
                    {currentStreak >= 3 && (
                      <span className={`streak-badge ${hasMegaStreak ? 'mega' : 'hot'}`} role="status">
                        <span aria-hidden="true">🔥</span> {currentStreak}-WIN STREAK
                      </span>
                    )}
                    {racer.errors > 0 && (
                      <span className="agent-status-badge error" role="alert">
                        <span aria-hidden="true">⚠</span> {racer.errors} errors
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="leaderboard-progress">
                    <div className="progress-info">
                      <span className="progress-label">Progress</span>
                      <span className="progress-value">{racer.simulations_complete}/{totalSimsPerBot}</span>
                    </div>
                    <div
                      className="progress-bar-container"
                      role="progressbar"
                      aria-valuenow={Math.round(progressPercent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Simulation progress: ${racer.simulations_complete} of ${totalSimsPerBot} complete`}
                    >
                      <div 
                        className="progress-bar-fill"
                        style={{ 
                          width: `${Math.min(100, progressPercent)}%`,
                          background: `linear-gradient(90deg, ${botColor} 0%, ${botColor}cc 100%)`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Record and Stats */}
                <div className="leaderboard-stats">
                  <div className="stat-item">
                    <span className="stat-label">Record</span>
                    <span className={`stat-value ${animatingStats[racer.name] === 'win' ? 'animate-win' : animatingStats[racer.name] === 'loss' ? 'animate-loss' : ''}`}>
                      <AnimatedCounter value={racer.wins} suffix="W" /> / <AnimatedCounter value={racer.losses} suffix="L" />
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Win Rate</span>
                    <span className="stat-value">
                      <AnimatedCounter value={parseFloat(winRate)} decimals={1} suffix="%" duration={300} />
                    </span>
                  </div>
                  <div className="stat-item health-stat">
                    <span className="stat-label">Avg Health</span>
                    <div className={`health-bar-container ${healthPercent < 25 ? 'critical' : ''} ${healthPercent === 0 ? 'depleted' : ''}`}>
                      <div
                        className="health-bar-fill"
                        style={{
                          width: `${Math.max(0, Math.min(100, healthPercent))}%`,
                          '--health-percent': healthPercent
                        }}
                      >
                        <span className="health-text">{racer.avg_health.toFixed(1)}</span>
                      </div>
                      {healthPercent < 100 && (
                        <span className="health-text-overlay">{racer.avg_health.toFixed(1)}/{racer.max_health}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* LLM and Execution Stats */}
                <div className="leaderboard-detailed-stats">
                  {racer.total_tokens > 0 && (
                    <>
                      <div className="detail-stat">
                        <span className="stat-label">Tokens</span>
                        <span className="stat-value">
                          <AnimatedCounter value={racer.total_tokens} duration={500} />
                        </span>
                      </div>
                      <div className="detail-stat">
                        <span className="stat-label">Resp Time</span>
                        <span className="stat-value">
                          <AnimatedCounter value={racer.avg_response_time} decimals={2} suffix="s" duration={300} />
                        </span>
                      </div>
                      {racer.invalid_responses > 0 && (
                        <div className="detail-stat error">
                          <span className="stat-label">Invalid</span>
                          <span className="stat-value">
                            <AnimatedCounter value={racer.invalid_responses} />
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {racer.avg_execution_time > 0 && (
                    <div className="detail-stat">
                      <span className="stat-label">Exec Time</span>
                      <span className="stat-value">
                        <AnimatedCounter value={racer.avg_execution_time} decimals={2} suffix="s" duration={300} />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="no-race">
          <p>No active race.</p>
          <p className="no-race-hint">Configure and start a race from the Config tab</p>
        </div>
      )}

      {sortedRacers.length > 0 && (
        <div className="error-panel-toggle">
          <button
            onClick={handleToggleErrorPanel}
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
                onClick={handleClearErrors}
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
