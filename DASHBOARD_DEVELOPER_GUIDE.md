# Race Dashboard - Developer Quick Reference

## Project Structure

```
evaluation/web/frontend/src/
├── App.jsx                       # Main app (updated with store integration)
├── App.css                       # Form & layout styles
├── theme.css                     # Dark theme & base components
├── index.css                     # Global styles
├── main.jsx                      # Entry point
│
├── config/
│   └── botColors.js              # Bot → Color mapping
│
├── components/
│   ├── RaceDashboard.jsx         # Main dashboard component
│   ├── RaceDashboard.css         # Dashboard-specific styles
│   └── ConfigPage.jsx            # Form for race configuration
│
└── store/
    └── raceStore.js              # Zustand state management
```

## Quick Setup

### 1. Install dependencies
```bash
cd evaluation/web/frontend
npm install
```
This installs zustand@^4.4.0 along with other React dependencies.

### 2. Development server
```bash
npm run dev
```
Starts Vite dev server at `http://localhost:5173`

### 3. Production build
```bash
npm run build
```
Builds optimized static files for deployment.

---

## State Management (Zustand)

### Store Location
`src/store/raceStore.js`

### Using the Store

**Read state:**
```javascript
import { useRaceStore } from '../store/raceStore'

const MyComponent = () => {
  const raceStatus = useRaceStore(state => state.raceStatus)
  const racers = useRaceStore(state => Array.from(state.racerData.values()))
  return <div>{raceStatus}</div>
}
```

**Update state:**
```javascript
const updateRacer = useRaceStore(state => state.updateRacer)
updateRacer('mcts', { wins: 10, avg_health: 45.2 })
```

**Custom hooks:**
```javascript
import { useRaceStatus, useAllRacers, useErrorLog } from '../store/raceStore'

// In component:
const { status, isLoading } = useRaceStatus()
const racers = useAllRacers()
const { errors, count } = useErrorLog()
```

### State Structure
```javascript
{
  // Race config
  raceConfig: {
    scenario: 0,
    enemies: 'h',
    bot_names: ['mcts', 'rcot-gpt41', 'bt3'],
    test_count: 25,
    thread_count: 4
  },

  // Status tracking
  raceStatus: 'idle' | 'running' | 'finished',
  isLoading: false,
  errorMessage: null,

  // Racer data (Map for O(1) lookups)
  racerData: Map {
    'mcts' => {
      name: 'mcts',
      wins: 15,
      losses: 10,
      errors: 0,
      simulations_complete: 25,
      total_health: 1250,
      avg_health: 50.0,
      total_requests: 0,
      total_tokens: 0,
      invalid_responses: 0,
      avg_response_time: 0
    },
    'rcot-gpt41' => { ... }
  },

  // Error log
  errorLog: [
    {
      timestamp: '3:45:30 PM',
      bot_name: 'rcot-gpt41',
      sim_index: 5,
      error_msg: 'API timeout'
    }
  ],

  // WebSocket
  socket: socketInstance | null,
  isConnected: true
}
```

---

## Color System

### Bot Colors

**File:** `src/config/botColors.js`

**Usage in Components:**
```javascript
import { getBotColor } from '../config/botColors'

const AgentCard = ({ botName }) => {
  const color = getBotColor(botName)  // Returns hex: '#a855f7'
  return <div style={{ borderColor: color }}>{botName}</div>
}
```

**Supported Colors:**
```javascript
{
  'mcts', 'bt3', 'rcot-gpt41', 'cot-claude', 'none-gemini' // → Color from config
  'unknown-bot' // → Defaults to purple '#a855f7'
}
```

**Adding New Bot Colors:**

Edit `botColors.js`:
```javascript
const BOT_COLORS = {
  'new-bot-name': '#ec4899',  // pink
  'another-bot': '#06b6d4',   // cyan
}
```

---

## RaceDashboard Component

### Main Component
**File:** `src/components/RaceDashboard.jsx`

Displays grid of agent cards showing live race progress.

**Props:** None (reads from Zustand store)

**Returns:**
- Race dashboard with header, status, and agent cards
- Empty state message if no race active

### AgentCard Subcomponent

Shows individual bot performance with:
- Bot name with color-coded border
- Current health bar (0-100)
- Iteration progress (0-100 simulations)
- Win/loss record
- LLM metrics (tokens, response time, error rate)
- Completion status indicator

---

## Styling System

### Theme CSS (src/theme.css)
Base dark theme with CSS custom properties:

```css
:root {
  --bg-primary: #0a0a0a;         /* Deepest black */
  --bg-secondary: #1a1a1a;       /* Dark gray cards */
  --bg-tertiary: #2a2a2a;        /* Lighter gray inputs */
  
  --accent-purple: #a855f7;      /* Main accent */
  --accent-cyan: #06b6d4;
  --accent-green: #10b981;
  --accent-yellow: #f59e0b;
  --accent-pink: #ec4899;
  
  --text-primary: #f5f5f5;       /* Main text */
  --text-secondary: #b0b0b0;     /* Dimmer text */
  --text-tertiary: #808080;      /* Dim labels */
}
```

**Reusable classes:**
- `.card` - Card component base
- `.progress-bar-container` - Progress bar
- `.health-bar` - Health display
- `.stat-card` - Stat display with left border
- `.agent-cards-grid` - Responsive grid

### Component CSS (src/components/RaceDashboard.css)
Dashboard-specific styles with color variants:

```css
.agent-card {
  border: 2px solid var(--agent-color, #a855f7);
  box-shadow: 0 0 20px var(--agent-color-alpha, rgba(168, 85, 247, 0.15));
}

.agent-card.color-purple { --agent-color: #a855f7; }
.agent-card.color-cyan   { --agent-color: #06b6d4; }
.agent-card.color-green  { --agent-color: #10b981; }
.agent-card.color-yellow { --agent-color: #f59e0b; }
.agent-card.color-pink   { --agent-color: #ec4899; }
```

---

## WebSocket Integration

### Setup
App.jsx automatically sets up WebSocket listeners via store:

```javascript
useEffect(() => {
  const socket = io('http://localhost:8000', {
    transports: ['websocket', 'polling']
  })
  
  setSocket(socket)
  setupSocketListeners(socket)  // Automatically handles events
}, [])
```

### Expected WebSocket Events

**1. race_started**
```javascript
{
  scenario: 0,
  enemies: 'h',
  bot_names: ['mcts', 'rcot-gpt41'],
  test_count: 25,
  thread_count: 4
}
```

**2. racer_update**
```javascript
{
  bot_name: 'mcts',
  wins: 5,
  losses: 3,
  errors: 0,
  simulations_complete: 8,
  total_health: 375,
  avg_health: 46.875,
  total_requests: 8,
  total_tokens: 2400,
  invalid_responses: 0,
  avg_response_time: 0.85
}
```

**3. race_finished**
```javascript
{
  duration_seconds: 120.5,
  total_simulations: 50,
  completed_at: '2024-12-27T21:30:45Z'
}
```

**4. error_logged**
```javascript
{
  bot_name: 'rcot-gpt41',
  sim_index: 7,
  error_msg: 'API connection timeout'
}
```

### Emitting Events (Backend)
```python
# Example backend code
socket.emit('race_started', {
    'scenario': 0,
    'enemies': 'h',
    'bot_names': ['mcts', 'rcot-gpt41'],
    'test_count': 25,
    'thread_count': 4
})

# For each simulation update:
socket.emit('racer_update', {
    'bot_name': 'mcts',
    'wins': 10,
    'avg_health': 50.5,
    # ... other fields
})
```

---

## Common Tasks

### Add a New Bot Color

1. Edit `src/config/botColors.js`:
```javascript
const BOT_COLORS = {
  'new-bot-variant': '#color-hex',
}
```

2. Component automatically uses it (no code changes needed)

### Customize Card Styling

1. Edit `src/components/RaceDashboard.css`
2. Modify `.agent-card` or `.color-*` classes
3. Changes apply to all agent cards

### Add a New Metric Display

1. Update racer data structure in store (add field)
2. Edit AgentCard component to display field
3. Update WebSocket listener to populate field
4. Add corresponding CSS styling if needed

### Change Dark Theme

1. Edit CSS variables in `src/theme.css`:
```css
:root {
  --accent-purple: #new-color;  /* Changes all purple elements */
}
```

---

## Testing Checklist

- [ ] `npm run build` completes without errors
- [ ] `npm run dev` starts dev server
- [ ] WebSocket connects (check browser console)
- [ ] Agent cards render with correct colors
- [ ] Progress bars animate smoothly
- [ ] Health bars update in real-time
- [ ] Error badge appears when errors > 0
- [ ] Responsive design on mobile (F12 → responsive mode)
- [ ] Hover effects work on agent cards
- [ ] Error log panel toggles correctly
- [ ] Form validation works (start button disables on error)
- [ ] Race status badge pulses while running
- [ ] Completion checkmark appears at 100%

---

## Performance Tips

1. **Zustand Optimization:**
   - Hooks automatically optimize re-renders
   - Only subscribe to needed state slices
   - Avoid subscribing entire state object

2. **CSS Optimization:**
   - Glow effects use GPU-accelerated box-shadow
   - Animations use transform and opacity (not position/size)
   - Gradients pre-computed at build time

3. **Large Races:**
   - With 10+ bots, grid naturally wraps to responsive layout
   - Each card independently updates via store
   - No performance degradation observed with 20+ agents

---

## Browser DevTools Tips

### Chrome/Edge DevTools

1. **React DevTools** - Inspect component hierarchy
   - Install: Chrome Web Store extension
   - Inspect Zustand state in Components tab
   
2. **Network Tab**
   - Check WebSocket messages (WS tab)
   - Monitor message frequency and size

3. **Console**
   - Check for import errors
   - Monitor socket.emit/socket.on logs

### Firefox
- Similar tools available via DevTools add-ons
- Native WebSocket inspector in Network tab

---

## Debugging

### WebSocket Connection Issues
```javascript
// Check connection in browser console:
io()  // → ManagerInitializing...
// Wait a moment
io()  // → ManagerConnected, or error message
```

### Store State Inspection
```javascript
// Browser console:
import { useRaceStore } from './store/raceStore'
useRaceStore.getState()  // View full state
useRaceStore.getState().raceStatus  // View specific value
```

### Component Rendering
```javascript
// Add debug logs in components:
console.log('AgentCard rendering:', { botName: racer.name, health: racer.avg_health })
```

---

## File Sizes (Production Build)

Estimated gzipped sizes after build:
- `botColors.js` - ~1.2 KB
- `raceStore.js` - ~2.8 KB
- `RaceDashboard.jsx` - ~3.5 KB
- `theme.css` - ~6.2 KB
- `RaceDashboard.css` - ~8.5 KB

**Total new code:** ~22 KB (gzipped)

---

## Resources

- [Zustand Docs](https://github.com/pmndrs/zustand)
- [React Hooks Guide](https://react.dev/reference/react)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify WebSocket connection in Network tab
3. Inspect store state with Zustand devtools
4. Review RACE_DASHBOARD_IMPLEMENTATION.md for architecture details
