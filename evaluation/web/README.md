# Slay the Saturn - Web UI Dashboard

A modern, real-time web dashboard for evaluating LLM agents in Slay the Spire-like card game scenarios. Watch multiple AI agents compete in real-time with live statistics, token usage tracking, and comprehensive error monitoring.

## What is This?

The Web UI provides a browser-based interface for running and monitoring agent evaluation races. Instead of using the command line or terminal UI, you can:

- Start races through a user-friendly web form
- Watch live progress bars as agents play through scenarios
- Monitor LLM token usage and response times in real-time
- View detailed error logs when simulations fail
- Download results as CSV for further analysis
- Share race progress with multiple viewers simultaneously

### Key Use Case: Free LLM Testing with Saturn

If you have a **Saturn server** running on your local network, you can test LLM agents (GPT-4.1, Claude, Gemini) **without paying API costs** to OpenRouter. The web UI automatically discovers Saturn servers via mDNS and routes all LLM requests through your local proxy.

**This means:**
- No API key costs during development
- Faster response times (local network)
- Full control over rate limiting
- Same API compatibility as OpenRouter

See [Saturn Integration](#saturn-integration) below for setup details.

## Features

- **Real-time Monitoring**: WebSocket-powered live updates as each simulation completes
- **Multi-bot Dashboard**: Track multiple agents simultaneously with visual progress bars
- **LLM Metrics**: Monitor token usage, response times, invalid response rates, and costs
- **Race Configuration**: User-friendly form for setting up new races (no curl commands needed)
- **Error Tracking**: Collapsible error log panel with timestamps and failure details
- **Input Validation**: Client-side validation with helpful error messages
- **CSV Export**: Download race results with full statistics
- **Multi-client Support**: Multiple browsers can watch the same race simultaneously
- **Dark Theme**: Professional dark UI suitable for extended use
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Quick Start

### 1. Install Dependencies

**Backend (Python):**
```bash
cd evaluation/web/backend
pip install -r requirements.txt
```

**Frontend (Node.js):**
```bash
cd evaluation/web/frontend
npm install
npm run build
```

### 2. Start the Server

**Single Command (Production Mode):**
```bash
python evaluation/web/backend/web_main.py
```

Then open your browser to: **http://localhost:8000**

**That's it!** The server automatically serves the pre-built frontend and is ready to run races.

### 3. Start Your First Race

1. Navigate to the "Race Monitor" tab
2. Configure your race:
   - **Scenario**: 0 (starter deck - good for testing)
   - **Enemies**: h (HobGoblin - standard difficulty)
   - **Bot Names**: mcts,rndm (fast baseline bots)
   - **Test Count**: 10 (quick test)
   - **Thread Count**: 2 (parallel simulations)
3. Click "Start Race"
4. Watch the real-time progress bars fill up!

## Saturn Integration

### What is Saturn?

Saturn is a local OpenRouter API proxy server that runs on your network. It allows you to:
- Route LLM API calls through a local server (no direct API key charges during dev)
- Use Saturn's OpenRouter API key instead of your own
- Test LLM agents without worrying about costs
- Get faster response times via local network routing

### How the Web UI Uses Saturn

The web UI **automatically discovers Saturn servers** on your local network using mDNS (DNS Service Discovery). You don't need to configure anything - if Saturn is running, it will be used.

**Discovery Flow:**
1. Agent initialization checks for Saturn servers via mDNS
2. If found: Uses `http://SATURN_IP:PORT/v1` as OpenAI SDK base URL
3. If not found: Falls back to OpenRouter API (requires `OPENROUTER_API_KEY` in `.env`)
4. If neither: Displays error with setup instructions

**Priority Selection:**
- If multiple Saturn servers exist, the one with the **lowest priority value** is selected
- Default priority is 50 (lower = higher preference, e.g., priority 10 beats priority 50)
- This allows you to control which server is used in multi-server environments

### Testing with Saturn

**Step 1: Check if Saturn is Running**
```bash
# Discover Saturn servers on network
python g3_files/saturn_discovery.py
```

Expected output if Saturn is running:
```
Searching for Saturn servers...

Found 1 Saturn server(s):
  - OpenRouter: http://192.168.1.100:8080 (priority=50)

Best server (auto-selected): http://192.168.1.100:8080
```

**Step 2: Start a Race with LLM Agents**

In the Web UI, try this configuration:
- **Scenario**: 0
- **Enemies**: h
- **Bot Names**: rcot-gpt41,cot-claude,mcts
- **Test Count**: 5
- **Thread Count**: 2

Click "Start Race" and watch the console output. You should see:
```
[RCoT] Using Saturn server: http://192.168.1.100:8080
[CoT] Using Saturn server: http://192.168.1.100:8080
```

If Saturn isn't running, you'll see:
```
[RCoT] No Saturn servers found, using OpenRouter API directly
```

**Step 3: Monitor Token Usage**

During the race, the dashboard will show:
- Total tokens used by each LLM agent
- Average response time per API call
- Invalid response count (when LLM returns malformed JSON)
- Cost estimation (if enabled)

All of this is **free** when using Saturn!

### Starting Your Own Saturn Server

See `saturn_files/openrouter_server.py` for the Saturn server implementation. Basic usage:

```bash
# Set up .env file with OpenRouter API key
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
echo "OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions" >> .env

# Start Saturn server
python saturn_files/openrouter_server.py
```

Saturn will advertise itself via mDNS and be automatically discovered by all agents.

## Development Mode

For frontend development with live reload:

**Terminal 1 - Backend:**
```bash
cd evaluation/web/backend
python web_main.py
# Runs on http://localhost:8000
```

**Terminal 2 - Frontend Dev Server:**
```bash
cd evaluation/web/frontend
npm run dev
# Runs on http://localhost:5173 with hot module reload
```

When using dev mode, access the frontend at **http://localhost:5173**. It will automatically proxy API calls to the backend on port 8000.

## Using the Web UI

### Race Configuration Form

**Scenario (0-5):**
- **0**: starter-ironclad - Basic Ironclad deck (5 Strikes, 4 Defends, 1 Bash)
- **1**: basics-batter-stimulate - Basic cards with Batter and Stimulate
- **2**: tolerate - Minimal deck with Tolerate card
- **3**: basics-bomb - Basic cards with Bomb
- **4**: basics-suffer - Basic cards with Suffer
- **5**: gigl-random-deck - 20 randomly generated GIGL cards

**Enemies (string):**
- `h` = HobGoblin (22 damage, 10 block - standard difficulty)
- `g` = Goblin (6 damage, 2 block - easy)
- `l` = Leech (11 damage, 8 block, applies Weak)
- `j` = JawWorm (11 damage, 5 block, applies Vulnerable)
- `s` = SimpleEnemy (10 damage, 5 block)
- `b` = Bomber (3 damage, 1 block, plants Bomb)
- Combine: `ghl` (fight Goblin, HobGoblin, Leech in sequence)

**Bot Names (comma-separated):**

Fast Baseline Bots (no API costs):
- `mcts` - Monte Carlo Tree Search
- `bt3`, `bt5` - Backtrack search (depth 3 or 5)
- `rndm` - Random action selection

LLM Agents (requires Saturn or API keys):
- `rcot-gpt41` - Reverse Chain-of-Thought with GPT-4.1
- `cot-claude` - Chain-of-Thought with Claude Sonnet
- `none-gemini` - Minimal prompting with Gemini
- See `TESTING.md` for full list of available agents

**Test Count (1-1000):**
- Number of simulations to run per bot
- Higher = more reliable statistics, but takes longer
- Recommended: 25-50 for LLM agents, 100+ for baseline bots

**Thread Count (1-64):**
- Number of parallel simulation threads
- Higher = faster completion, but more CPU usage
- Recommended: 2-4 for typical machines

### Understanding the Dashboard

**Progress Bars:**
- Top bar: Simulations completed out of total (e.g., "18/25")
- Bottom bar: Wins vs losses (green = win, red = loss)

**Statistics Display:**
- **Wins/Losses**: Number of successful vs failed battles
- **Avg Health**: Average player health at end of combat
- **Tokens**: Total tokens consumed (LLM agents only)
- **Avg Response Time**: Average API call duration in seconds
- **Invalid Responses**: Number of malformed LLM outputs
- **Errors**: Simulations that crashed (0 health + 0 LLM requests)

**Error Panel:**
- Click "Toggle Errors" to view error log
- Shows bot name, simulation index, error type, and timestamp
- Useful for debugging agent failures

### Example Race Configurations

**Quick Test (30 seconds):**
```
Scenario: 0
Enemies: h
Bots: mcts,rndm
Test Count: 10
Thread Count: 2
```

**LLM Comparison (requires Saturn or API keys, ~5 minutes):**
```
Scenario: 0
Enemies: h
Bots: rcot-gpt41,cot-claude,none-gemini,mcts
Test Count: 25
Thread Count: 4
```

**GIGL Random Deck Challenge (interesting research scenario):**
```
Scenario: 5
Enemies: h
Bots: rcot-gpt41,mcts,bt5
Test Count: 20
Thread Count: 2
```

**Multi-Enemy Gauntlet (harder scenario):**
```
Scenario: 0
Enemies: ghl
Bots: mcts,bt5,rndm
Test Count: 50
Thread Count: 4
```

## API Documentation

### REST API Endpoints

**GET `/api/health`**
- Health check endpoint
- Returns: `{"status": "ok", "service": "slay-the-saturn-web"}`

**GET `/api/race/status`**
- Get current race status
- Returns: Race state with racers and progress, or `{"status": "idle"}` if no active race

**POST `/api/race/start`**
- Start a new evaluation race
- Request body:
  ```json
  {
    "scenario": 0,
    "enemies": "h",
    "bot_names": ["mcts", "rcot-gpt41", "bt3"],
    "test_count": 25,
    "thread_count": 4
  }
  ```
- Returns: Race initialization confirmation

**GET `/api/race/download`**
- Download race results as CSV
- Returns: CSV file with columns: BotName, PlayerHealth, Win, TotalRequests, InvalidResponses, TotalTokens, AvgResponseTime

**Interactive API Docs:**
Visit `http://localhost:8000/docs` for full Swagger UI documentation.

### WebSocket Events

The web UI uses Socket.IO for real-time updates.

**Server → Client Events:**

- `connection_established` - Client connected with session ID
- `race_started` - Race config (scenario, bots, total_sims)
  ```json
  {
    "scenario_name": "starter-ironclad",
    "enemies": "h",
    "bot_names": ["mcts", "rcot-gpt41"],
    "test_count": 25,
    "total_sims": 50
  }
  ```

- `racer_update` - Bot stats after each simulation
  ```json
  {
    "bot_name": "rcot-gpt41",
    "wins": 18,
    "losses": 5,
    "errors": 2,
    "simulations_complete": 25,
    "avg_health": 67.3,
    "total_tokens": 12450,
    "avg_response_time": 2.3
  }
  ```

- `status_update` - Global progress and ETA
  ```json
  {
    "completed_sims": 45,
    "total_sims": 50,
    "progress_pct": 90.0,
    "eta": 13.7,
    "is_finished": false
  }
  ```

- `error_logged` - Simulation crash details
  ```json
  {
    "bot": "rcot-gpt41",
    "simulation": 12,
    "error": "Simulation crashed (0 health, 0 requests)",
    "time": "14:35:22"
  }
  ```

- `race_finished` - Final results
  ```json
  {
    "total_sims": 50,
    "elapsed": 137.2,
    "total_errors": 2,
    "racers": { ... },
    "results": [ ... ]
  }
  ```

**Client → Server Events:**

- `request_race_status` - Request current race state (no payload)

### Example: Starting a Race via API

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/race/start \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": 0,
    "enemies": "h",
    "bot_names": ["mcts", "bt3", "rndm"],
    "test_count": 25,
    "thread_count": 4
  }'
```

**Using Python requests:**
```python
import requests

response = requests.post('http://localhost:8000/api/race/start', json={
    'scenario': 0,
    'enemies': 'h',
    'bot_names': ['mcts', 'rcot-gpt41', 'bt3'],
    'test_count': 25,
    'thread_count': 4
})

print(response.json())
```

**Using JavaScript fetch:**
```javascript
fetch('http://localhost:8000/api/race/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenario: 0,
    enemies: 'h',
    bot_names: ['mcts', 'bt3'],
    test_count: 25,
    thread_count: 4
  })
})
.then(res => res.json())
.then(data => console.log(data))
```

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Multiple Browser Clients                        │
│  http://localhost:8000  (Production Frontend)               │
│  http://localhost:5173  (Dev Frontend with HMR)             │
└────────────────┬────────────────────────────────────────────┘
                 │ WebSocket (Socket.IO)
                 ├─ race_started
                 ├─ racer_update (real-time stats)
                 ├─ status_update (progress/ETA)
                 ├─ error_logged
                 └─ race_finished
                 │
┌────────────────▼────────────────────────────────────────────┐
│            FastAPI Backend (:8000)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RaceManager (Thread-Safe)                           │  │
│  │  ├─ RaceState (scenario, bots, progress, errors)     │  │
│  │  ├─ RacerStats (wins, losses, health, LLM metrics)   │  │
│  │  └─ _emit_sync() → WebSocket broadcast              │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Background Thread: run_race_simulations()           │  │
│  │  └─ joblib.Parallel (threading backend)              │  │
│  │     └─ simulate_one() workers                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              LLM Agent Infrastructure                        │
│  ├─ Saturn Discovery (mDNS)                                 │
│  ├─ OpenAI SDK (OpenRouter fallback)                        │
│  └─ Agent implementations (CoT, RCoT, None)                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**Frontend (React + Vite):**
- `evaluation/web/frontend/src/App.jsx` - Main application with WebSocket connection, race config form, and dashboard
- `evaluation/web/frontend/src/App.css` - Dark theme styling
- `evaluation/web/frontend/vite.config.js` - Build configuration with proxy to backend

**Backend (FastAPI + Socket.IO):**
- `evaluation/web/backend/web_main.py` - FastAPI server with REST API, WebSocket handlers, and race execution
- `evaluation/web/backend/race_manager.py` - Thread-safe RaceManager, RacerStats, and RaceState classes

**Integration:**
- Reuses `evaluate_bot.py` infrastructure (same `simulate_one()`, `name_to_bot()`, `get_scenario()`)
- Same threading pattern as TUI (`joblib.Parallel`)
- Same error detection heuristic (0 health + 0 LLM requests = crash)

### Data Flow

```
Client submits race config via form
  ↓
POST /api/race/start
  ↓
Background thread: run_race_simulations()
  ↓
joblib.Parallel spawns worker threads
  ↓
Each worker calls simulate_one(bot, scenario, enemies)
  ↓
Worker completes → race_manager.update_racer()
  ↓
race_manager._emit_sync() → WebSocket broadcast
  ↓
All connected clients receive racer_update event
  ↓
Frontend updates progress bars and statistics
```

## Troubleshooting

### Server Won't Start

**Symptom:** Error when running `python web_main.py`

**Solutions:**
- Check if port 8000 is already in use:
  - Windows: `netstat -ano | findstr :8000`
  - Linux/Mac: `lsof -i :8000`
- Kill the process or change port in `web_main.py` (line with `uvicorn.run(port=8001)`)
- Verify dependencies are installed: `pip list | grep -E 'fastapi|uvicorn|socketio'`
- Ensure you're in the correct directory: `evaluation/web/backend/`

### Frontend Not Loading

**Symptom:** Blank page or 404 when accessing `http://localhost:8000`

**Solutions:**
- Check if frontend is built: `ls evaluation/web/static/`
- Rebuild: `cd evaluation/web/frontend && npm run build`
- Check browser console for errors (F12 → Console tab)
- Verify backend is running: `curl http://localhost:8000/api/health`
- Try accessing API docs: `http://localhost:8000/docs`

### WebSocket Connection Failed

**Symptom:** Connection indicator shows "Disconnected" or errors in console

**Solutions:**
- Check if backend is running on port 8000
- Open browser console (F12) and look for CORS errors
- Check Network tab (F12 → Network) for failed WebSocket connections
- Verify firewall isn't blocking localhost connections
- Try accessing `http://localhost:8000` directly (not `http://127.0.0.1:8000`)
- In dev mode, ensure frontend proxy is configured correctly in `vite.config.js`

### Race Won't Start

**Symptom:** Error message in red box after clicking "Start Race"

**Solutions:**
- Read the error message carefully - it will indicate which field is invalid
- Verify bot names are valid (see "Bot Names" section above or check `TESTING.md`)
- Ensure test_count is between 1 and 1000
- Ensure thread_count is between 1 and 64
- Check backend console for detailed error messages
- For LLM bots, verify either Saturn is running or you have API keys in `.env`

### No Real-time Updates

**Symptom:** Race starts but progress bars don't update

**Solutions:**
- Check WebSocket connection status indicator (top right of page)
- Verify backend is actually running race (check console logs for "Starting race...")
- Try refreshing the page (F5)
- Check Network tab (F12 → Network → WS filter) - you should see WebSocket messages
- Ensure you're not blocking WebSocket connections with browser extensions or firewall

### LLM Agents Not Working

**Symptom:** Errors like "No Saturn or API key found"

**Solutions:**

**Option 1: Use Saturn (free for testing):**
1. Check if Saturn is running: `python g3_files/saturn_discovery.py`
2. If not found, start Saturn: `python saturn_files/openrouter_server.py`
3. Ensure Saturn's `.env` file has `OPENROUTER_API_KEY` set
4. Verify Saturn is advertising via mDNS (requires Bonjour on Windows)

**Option 2: Use OpenRouter API directly:**
1. Create `.env` file in project root
2. Add: `OPENROUTER_API_KEY=sk-or-v1-...`
3. Get API key from https://openrouter.ai/keys

**Option 3: Use baseline bots for testing:**
- Stick to `mcts`, `bt3`, `bt5`, `rndm` - these work without API keys

### Saturn Not Discovered

**Symptom:** Console shows "No Saturn servers found"

**Solutions:**
- Verify Saturn server is running: `python saturn_files/openrouter_server.py`
- Check dns-sd is available: `dns-sd -B _saturn._tcp local` (requires Bonjour on Windows)
- Ensure both Saturn and agent are on the same network
- Check firewall settings (allow port 8080 or Saturn's configured port)
- Try manually testing Saturn: `curl http://SATURN_IP:8080/api/health`
- On Windows, install Bonjour Print Services if dns-sd command not found

### High Memory Usage

**Symptom:** Backend consuming too much RAM

**Solutions:**
- Reduce thread count (use 2-4 instead of 8+)
- Reduce test count for initial testing
- Avoid running multiple races simultaneously
- Check for memory leaks by monitoring backend console
- Restart backend between large races

### Slow Performance

**Symptom:** Race taking too long to complete

**Solutions:**
- Use faster baseline bots (mcts, bt3) instead of LLM agents for quick tests
- Reduce test count for initial testing
- Increase thread count (but not beyond your CPU core count)
- Check network latency if using OpenRouter API (Saturn is much faster)
- Verify you're not hitting API rate limits (check backend console)

## Comparison with TUI and CLI

| Feature | CLI (evaluate_bot.py) | TUI (tui_main.py) | Web UI (web_main.py) |
|---------|----------------------|-------------------|----------------------|
| **Interface** | Command-line output | Terminal UI | Browser Dashboard |
| **Real-time Updates** | No (batch at end) | Yes (Textual widgets) | Yes (WebSocket) |
| **Progress Bars** | tqdm | Custom (▰/█) | HTML/CSS bars |
| **Multi-User** | No | No | Yes (concurrent clients) |
| **Interactive Control** | No | Yes (keyboard: s, q, e) | Yes (REST API + form) |
| **Results Saving** | CSV on completion | CSV on 's' key | In-memory + API download |
| **Error Logging** | Optional log files | RichLog widget (toggle 'e') | WebSocket events + panel |
| **LLM Metrics** | CSV columns only | Live display | Live WebSocket updates |
| **Platform** | Any Python env | Any terminal | Any modern browser |
| **Remote Access** | No | No | Yes (network accessible) |
| **Mobile Support** | No | No | Yes (responsive design) |
| **Setup Complexity** | Simple | Simple | Medium (backend + frontend) |
| **Best For** | Batch processing, scripts | Local dev, quick tests | Demos, multi-user, remote monitoring |

**Use CLI when:**
- Running batch evaluations for research papers
- Automating evaluations in scripts/CI
- You want simple CSV output without interaction

**Use TUI when:**
- Doing local development and want live feedback
- You prefer terminal-based workflows
- You want keyboard-based interaction (save with 's', quit with 'q')

**Use Web UI when:**
- Giving demos or presentations
- Multiple people want to watch the same race
- You want remote access from other devices
- You prefer graphical dashboards over terminals
- Testing with Saturn and want to monitor token usage visually

## Development

### Project Structure

```
evaluation/web/
├── frontend/
│   ├── src/
│   │   ├── main.jsx          # React entry point
│   │   ├── App.jsx           # Main app with WebSocket + routing
│   │   ├── App.css           # App styles
│   │   └── index.css         # Global styles
│   ├── index.html            # HTML template
│   ├── vite.config.js        # Vite build config
│   ├── package.json          # npm dependencies
│   └── README.md             # Frontend documentation
├── backend/
│   ├── web_main.py           # FastAPI server + race execution
│   ├── race_manager.py       # Thread-safe race state manager
│   ├── requirements.txt      # pip dependencies
│   └── README.md             # Backend API documentation
├── static/                   # Built frontend (created by npm run build)
│   ├── index.html
│   └── assets/
│       ├── index-*.js
│       └── index-*.css
└── README.md                 # This file
```

### Adding a New Bot

1. Implement bot in `g3_files/agents/` or `*.py`
2. Register in `evaluation/evaluate_bot.py` in the `name_to_bot()` function
3. Bot will automatically appear in web UI - just enter its name in the form

### Customizing the Dashboard

**Changing Layout:**
- Edit `evaluation/web/frontend/src/App.jsx`
- Modify React components and structure
- Run `npm run build` to update production files

**Changing Styles:**
- Edit `evaluation/web/frontend/src/App.css` for component styles
- Edit `evaluation/web/frontend/src/index.css` for global styles
- Dark theme colors defined in CSS custom properties

**Adding New Features:**
- Backend: Add new REST endpoints in `web_main.py`
- Frontend: Add new components in `src/` directory
- Don't forget to rebuild: `npm run build`

### Running Tests

**Backend Integration Tests:**
```bash
# Playwright test for race workflow
cd evaluation/web/backend
pytest test_web_ui.py -v
```

**Frontend Tests:**
```bash
cd evaluation/web/frontend
npm run test
```

### Building for Production

```bash
# Build optimized frontend
cd evaluation/web/frontend
npm run build

# Built files output to ../static/

# Start production server
cd ../backend
python web_main.py
```

For production deployment, consider:
- Restricting CORS origins in `web_main.py`
- Using HTTPS/WSS for secure WebSocket connections
- Setting up reverse proxy (nginx/traefik)
- Enabling proper logging and monitoring
- Using a production ASGI server (Gunicorn with Uvicorn workers)

## Performance Considerations

**WebSocket Latency:**
- ~50ms per update on local network
- ~100-200ms for remote connections
- Updates batched per simulation (not per game action)

**Memory Usage:**
- Backend: 100-200MB baseline + simulation overhead
- Frontend: Typical browser overhead (~50-100MB per tab)
- Each simulation thread adds ~10-20MB

**Concurrent Users:**
- Backend can handle dozens of WebSocket connections
- All clients receive the same race updates (broadcast model)
- No per-client state management (stateless design)

**Typical Race Times:**
- Fast bots (mcts, bt3): ~1-2 seconds per simulation
- LLM agents with Saturn: ~5-10 seconds per simulation
- LLM agents with OpenRouter: ~10-20 seconds per simulation (network latency)

## Security Considerations

**Current State (Development Mode):**
- CORS enabled for all origins
- No authentication on API endpoints
- WebSocket connections accepted from any origin
- Static file serving enabled

**Production Recommendations:**
- Restrict CORS to specific domains
- Add authentication middleware (API keys, OAuth)
- Use HTTPS/WSS for encrypted connections
- Implement rate limiting on API endpoints
- Validate all user inputs server-side
- Set up proper logging and monitoring

## Known Limitations

1. **Single Race at a Time**: Backend only handles one active race (next race must wait until current finishes)
2. **No Race Control**: Cannot pause/stop/restart races mid-execution
3. **No Result Persistence**: Results only stored in memory during race (download before closing browser)
4. **No Historical View**: Cannot view past race results after page refresh
5. **No User Accounts**: All users see the same race (no per-user sessions)

## Future Enhancements

**Planned Features:**
- Race queue system (multiple races)
- Race stop/cancel functionality
- CSV export via frontend button
- Historical race results page
- Real-time cost estimation for LLM agents
- Configurable agent parameters in UI
- Multi-race comparison view

See `IMPLEMENTATION_SUMMARY.md` for full roadmap.

## License

See main project LICENSE file.

## Additional Resources

- **Full Documentation**: See `TESTING.md` for comprehensive testing guide
- **Saturn Setup**: See `saturn_files/` for Saturn server implementation
- **Agent Development**: See `g3_files/agents/` for agent examples
- **Backend API Details**: See `evaluation/web/backend/README.md`
- **GIGL Cards**: See `GIGL/` for card generation system

**External Documentation:**
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
