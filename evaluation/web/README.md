# Slay the Saturn - Web UI Dashboard

A modern, real-time web dashboard for evaluating LLM agents in Slay the Spire-like scenarios using WebSocket-based live updates and a REST API backend.

## Features

- **Real-time Monitoring**: WebSocket-powered live updates of race progress
- **Multi-bot Dashboard**: Track multiple agents simultaneously
- **LLM Metrics**: Monitor token usage, response times, and error rates
- **Race Configuration**: User-friendly form for setting up new races
- **Error Tracking**: Collapsible error log panel with detailed error information
- **Input Validation**: Client-side validation with helpful error messages
- **CSV Export**: Download race results for analysis
- **Dark Theme**: Professional dark UI suitable for extended use
- **Responsive Design**: Works on desktop, tablet, and mobile

## Installation

### Backend Setup

```bash
# Install Python dependencies
cd evaluation/web/backend
pip install -r requirements.txt
```

### Frontend Setup

```bash
# Install Node dependencies
cd evaluation/web/frontend
npm install
```

## Running the Server

### Production (Pre-built Frontend)

```bash
# Start the production server
python evaluation/web/backend/web_main.py

# Access at: http://localhost:8000
```

The production server automatically serves the pre-built frontend from `evaluation/web/static/`.

### Development (Live Frontend Reload)

**Terminal 1 - Backend API:**
```bash
cd evaluation/web/backend
python web_main.py
# Server runs on http://localhost:8000
```

**Terminal 2 - Frontend Dev Server:**
```bash
cd evaluation/web/frontend
npm run dev
# Frontend runs on http://localhost:5173
# Automatically proxies API calls to http://localhost:8000
```

## Building the Frontend

To update the production frontend after making changes:

```bash
cd evaluation/web/frontend
npm run build

# Built files are output to ../static/
```

## Architecture

### Backend (FastAPI)

- **Framework**: FastAPI with Socket.IO for WebSocket support
- **Entry Point**: `evaluation/web/backend/web_main.py`
- **API Endpoints**:
  - `POST /api/race/start` - Start a new race
  - `GET /api/race/status` - Get current race status
  - `GET /api/race/download` - Download race results as CSV
  - `GET /api/health` - Health check endpoint

- **WebSocket Events**:
  - `race_started` - Race initialization
  - `racer_update` - Per-racer statistics updates
  - `race_finished` - Race completion
  - `error_logged` - Simulation errors

### Frontend (React + Vite)

- **Framework**: React 18 with hooks
- **Build Tool**: Vite for fast development
- **WebSocket Client**: Socket.io-client
- **Styling**: CSS with dark theme
- **Components**:
  - `RaceMonitor` - Main race view with form and dashboard
  - `RacerCard` - Individual bot statistics display
  - Error panel with collapsible UI

## Configuration

### Race Parameters

- **Scenario** (0-5): Predefined game scenarios
  - 0: starter-ironclad (basic cards)
  - 1: basics-batter-stimulate
  - 2: tolerate
  - 3: basics-bomb
  - 4: basics-suffer
  - 5: gigl-random-deck
  
- **Enemies** (string): Enemy types to face
  - h = HobGoblin (22 damage, 10 block)
  - g = Goblin (6 damage, 2 block)
  - l = Leech (11 damage, 8 block, Weak)
  - j = JawWorm (11 damage, 5 block, Vulnerable)
  - s = SimpleEnemy (10 damage, 5 block)
  - b = Bomber (3 damage, 1 block, Bomb)
  - Example: "h", "ghl", "j"

- **Bot Names** (comma-separated): Agents to evaluate
  - `mcts`, `rndm` (fast baseline bots)
  - `bt3`, `bt5` (Backtrack with depth)
  - `cot-claude`, `rcot-gpt41` (LLM agents)
  - Example: "mcts,rndm,bt3"

- **Test Count**: Number of simulations per bot (1-1000)

- **Thread Count**: Parallel threads for simulation (1-64)

## API Documentation

### Start Race

```http
POST /api/race/start
Content-Type: application/json

{
  "scenario": 0,
  "enemies": "h",
  "bot_names": ["mcts", "bt3"],
  "test_count": 25,
  "thread_count": 4
}

Response:
{
  "status": "started",
  "scenario": "starter-ironclad",
  "enemies": "h",
  "bots": ["mcts", "bt3"],
  "total_simulations": 50
}
```

### Get Race Status

```http
GET /api/race/status

Response:
{
  "status": "running",
  "racers": [
    {
      "name": "mcts",
      "wins": 5,
      "losses": 2,
      "simulations_complete": 7,
      "total_tokens": 0
    }
  ]
}
```

### Download Results

```http
GET /api/race/download

Response: CSV file with columns:
- BotName
- PlayerHealth
- Win
- TotalRequests (for LLM bots)
- InvalidResponses (for LLM bots)
- TotalTokens (for LLM bots)
- AvgResponseTime (for LLM bots)
```

## Troubleshooting

### Server Won't Start

- Check if port 8000 is already in use: `netstat -ano | findstr :8000`
- Verify Python dependencies: `pip list | grep -E 'fastapi|uvicorn|socketio'`
- Ensure you're in the correct directory: `evaluation/web/backend/`

### Frontend Not Loading

- Check if frontend is built: `ls evaluation/web/static/`
- Rebuild: `cd evaluation/web/frontend && npm run build`
- Check browser console for errors (F12)
- Verify WebSocket connection in Network tab

### WebSocket Connection Failed

- Check if backend is running on port 8000
- Check browser console for CORS errors
- Verify firewall isn't blocking localhost connections
- Try `http://localhost:8000` directly in browser

### Race Won't Start

- Check form validation messages (red error box)
- Verify bot names are valid (check TESTING.md for available bots)
- Ensure test_count and thread_count are within valid ranges
- Check backend console for error messages

### No Real-time Updates

- Check WebSocket connection status indicator (top right)
- Verify backend is actually running race (check console logs)
- Try refreshing the page (F5)
- Check Network tab - WebSocket should show messages flowing in

## Development

### Adding a New Bot

1. Implement bot in `g3_files/agents/` or `*.py`
2. Register in `evaluation/evaluate_bot.py` `name_to_bot()` function
3. Use in web UI by adding name to "Bot Names" field

### Customizing the Dashboard

- Edit `evaluation/web/frontend/src/App.jsx` for layout changes
- Edit `evaluation/web/frontend/src/App.css` for styling
- Run `npm run build` to update production static files

### Running Tests

```bash
# Playwright test for race workflow
pytest evaluation/web/backend/test_web_ui.py -v

# Or with npm
cd evaluation/web/frontend
npm run test
```

## Deployment

### Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM python:3.10
WORKDIR /app
COPY . .
RUN pip install -r evaluation/web/backend/requirements.txt
EXPOSE 8000
CMD ["python", "evaluation/web/backend/web_main.py"]
```

### Production Considerations

- Use a production ASGI server (e.g., Gunicorn with Uvicorn workers)
- Enable HTTPS/TLS for secure WebSocket connections
- Set up proper logging and monitoring
- Configure CORS if serving frontend from different domain
- Consider reverse proxy (Nginx) for load balancing

## Comparison with TUI

| Feature | Web UI | TUI |
|---------|--------|-----|
| Real-time Updates | WebSocket | Terminal refresh |
| Multi-client | Yes | Single terminal |
| Browser Requirement | Yes | No |
| Deployment | Server + Client | Local CLI |
| Error Logging | Collapsible panel | Toggleable panel |
| Mobile Support | Yes | No |
| Setup Complexity | Medium | Simple |

**Use Web UI for**: Remote monitoring, multi-user access, web-based deployment

**Use TUI for**: Local development, quick CLI tests, no browser requirement

## Performance

- WebSocket connection: ~50ms latency per update
- Frontend rendering: Optimized with React hooks
- Backend: Async I/O with FastAPI
- Typical memory usage: 100-200MB (backend) + browser overhead

## License

See main project LICENSE file

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
