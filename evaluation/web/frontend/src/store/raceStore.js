import { create } from 'zustand'

/**
 * Race Store - Frontend state management using Zustand
 * Manages race configuration, status, racer data, and error logs
 */

export const useRaceStore = create((set, get) => ({
  // Race Configuration
  raceConfig: {
    scenario: 0,
    enemies: 'h',
    bot_names: [],
    test_count: 25,
    thread_count: 4,
  },

  // Race Status
  raceStatus: 'idle', // 'idle', 'running', 'finished'
  isLoading: false,
  errorMessage: null,

  // Racer Data Map
  racerData: new Map(),

  // Error Log Array
  errorLog: [],

  // WebSocket instance
  socket: null,
  isConnected: false,

  // ============ Actions ============

  // Update race configuration
  setRaceConfig: (config) => set({ raceConfig: config }),

  // Update race status
  setRaceStatus: (status) => set({ raceStatus: status }),

  // Set loading state
  setIsLoading: (isLoading) => set({ isLoading }),

  // Set error message
  setErrorMessage: (message) => set({ errorMessage: message }),

  // Initialize racer data
  initializeRacers: (botNames) =>
    set(() => {
      const racerData = new Map()
      botNames.forEach((name) => {
        racerData.set(name, {
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
          avg_response_time: 0,
        })
      })
      return { racerData }
    }),

  // Update specific racer data
  updateRacer: (botName, data) =>
    set((state) => {
      const newRacerData = new Map(state.racerData)
      const existing = newRacerData.get(botName) || { name: botName }
      newRacerData.set(botName, { ...existing, ...data })
      return { racerData: newRacerData }
    }),

  // Get racer data
  getRacer: (botName) => get().racerData.get(botName),

  // Get all racers as array
  getRacers: () => Array.from(get().racerData.values()),

  // Add error to log
  addError: (error) =>
    set((state) => ({
      errorLog: [
        ...state.errorLog,
        {
          timestamp: new Date().toLocaleTimeString(),
          bot_name: error.bot_name || 'Unknown',
          sim_index: error.sim_index || 0,
          error_msg: error.error_msg || 'Unknown error',
        },
      ],
    })),

  // Clear error log
  clearErrorLog: () => set({ errorLog: [] }),

  // Get error count
  getErrorCount: () => get().errorLog.length,

  // Set WebSocket instance
  setSocket: (socket) => set({ socket }),

  // Set connection status
  setIsConnected: (isConnected) => set({ isConnected }),

  // Setup WebSocket listeners
  setupSocketListeners: (socket) => {
    const { 
      initializeRacers, 
      updateRacer, 
      setRaceStatus,
      addError,
      setRaceConfig,
    } = get()

    socket.on('race_started', (data) => {
      console.log('Race started:', data)
      setRaceConfig({
        scenario: data.scenario,
        enemies: data.enemies,
        bot_names: data.bot_names,
        test_count: data.test_count,
        thread_count: data.thread_count,
      })
      initializeRacers(data.bot_names)
      setRaceStatus('running')
    })

    socket.on('racer_update', (data) => {
      console.log('Racer update:', data)
      updateRacer(data.bot_name, data)
    })

    socket.on('race_finished', (data) => {
      console.log('Race finished:', data)
      setRaceStatus('finished')
    })

    socket.on('error_logged', (data) => {
      console.error('Simulation error:', data)
      addError(data)
    })
  },

  // Reset race state
  resetRace: () => set({
    raceStatus: 'idle',
    racerData: new Map(),
    errorLog: [],
    errorMessage: null,
    isLoading: false,
  }),
}))

/**
 * Hook to subscribe to specific racer data
 * Returns racer data and computed stats
 */
export const useRacerData = (botName) => {
  const racerData = useRaceStore((state) => state.racerData.get(botName))
  
  return {
    ...racerData,
    // Computed win rate
    winRate: racerData
      ? ((racerData.wins / (racerData.wins + racerData.losses)) * 100).toFixed(1)
      : '0.0',
    // Computed progress percentage
    progressPercent: racerData ? Math.min(100, Math.max(0, racerData.simulations_complete)) : 0,
    // Computed error rate
    errorRate: racerData && racerData.total_requests > 0
      ? ((racerData.invalid_responses / racerData.total_requests) * 100).toFixed(1)
      : '0.0',
  }
}

/**
 * Hook to subscribe to race status
 */
export const useRaceStatus = () =>
  useRaceStore((state) => ({
    status: state.raceStatus,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    isConnected: state.isConnected,
  }))

/**
 * Hook to subscribe to error log
 */
export const useErrorLog = () =>
  useRaceStore((state) => ({
    errors: state.errorLog,
    count: state.errorLog.length,
  }))

/**
 * Hook to subscribe to all racers
 */
export const useAllRacers = () => useRaceStore((state) => Array.from(state.racerData.values()))

export default useRaceStore
