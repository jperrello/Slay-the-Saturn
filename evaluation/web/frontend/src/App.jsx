import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import ConfigPage from './components/ConfigPage'
import RaceDashboard from './components/RaceDashboard'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('config')
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

  const handleStartRace = () => {
    setActiveTab('dashboard')
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Slay the Saturn</h1>
        <div className="connection-status">
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </header>

      <nav className="App-tabs">
        <button
          className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Config
        </button>
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Race Dashboard
        </button>
      </nav>

      <main className="App-main">
        {activeTab === 'config' && <ConfigPage onStartRace={handleStartRace} />}
        {activeTab === 'dashboard' && <RaceDashboard socket={socket} />}
      </main>

      <footer className="App-footer">
        <p>Real-time agent evaluation dashboard for Slay the Spire-like scenarios</p>
      </footer>
    </div>
  )
}

export default App
