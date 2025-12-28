# Slay the Saturn - Web Backend

FastAPI backend with Socket.IO for real-time agent evaluation race streaming.

## Setup

Install dependencies:
```bash
cd evaluation/web/backend
pip install -r requirements.txt
```

## Running the Server

Start the FastAPI + Socket.IO server:
```bash
python web_main.py
```

Or using uvicorn directly:
```bash
uvicorn web_main:socket_app --host 0.0.0.0 --port 8000 --reload
```

Server will be available at:
- **HTTP**: `http://localhost:8000`
- **WebSocket**: `ws://localhost:8000/socket.io`
- **API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **Health Check**: `http://localhost:8000/api/health`

## API Endpoints

### REST API

**GET `/api/health`**
- Health check endpoint
- Returns: `{"status": "ok", "service": "slay-the-saturn-web"}`

**GET `/api/race/status`**
- Get current race status
- Returns: Race state with racers and progress, or `{"status": "idle"}` if no active race

**POST `/api/race/start`**
- Start a new evaluation race
- Body:
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

### WebSocket Events

#### Server → Client

**`connection_established`**
- Sent when client connects
- Payload: `{sid: string}`

**`race_started`**
- Sent when a new race begins
- Payload:
  ```json
  {
    "scenario_name": "starter-ironclad",
    "enemies": "h",
    "bot_names": ["mcts", "rcot-gpt41"],
    "test_count": 25,
    "thread_count": 4,
    "total_sims": 50
  }
  ```

**`racer_update`**
- Sent after each simulation completes
- Payload:
  ```json
  {
    "bot_name": "rcot-gpt41",
    "wins": 18,
    "losses": 5,
    "errors": 2,
    "simulations_complete": 25,
    "avg_health": 67.3,
    "total_requests": 450,
    "invalid_responses": 3,
    "total_tokens": 12450,
    "avg_response_time": 2.3,
    "invalid_rate": 0.67
  }
  ```

**`status_update`**
- Sent after each simulation completes
- Payload:
  ```json
  {
    "completed_sims": 45,
    "total_sims": 50,
    "progress_pct": 90.0,
    "elapsed": 123.5,
    "eta": 13.7,
    "error_count": 2,
    "is_finished": false
  }
  ```

**`error_logged`**
- Sent when a simulation crashes
- Payload:
  ```json
  {
    "bot": "rcot-gpt41",
    "simulation": 12,
    "error": "Simulation crashed (0 health, 0 requests)",
    "time": "14:35:22"
  }
  ```

**`race_finished`**
- Sent when all simulations complete
- Payload:
  ```json
  {
    "total_sims": 50,
    "elapsed": 137.2,
    "total_errors": 2,
    "racers": { ... },
    "results": [ ... ]
  }
  ```

**`race_status`**
- Response to `request_race_status` event
- Payload: Current race state or `{"status": "idle"}`

#### Client → Server

**`request_race_status`**
- Request current race status
- No payload

## Architecture

### RaceManager (`race_manager.py`)

Thread-safe manager for race state and WebSocket event emission.

**Key Classes:**
- `RacerStats`: Tracks per-bot statistics (wins, losses, health, LLM metrics)
- `RaceState`: Manages overall race state (racers, progress, errors, results)
- `RaceManager`: Coordinates race lifecycle and emits WebSocket events

**Thread Safety:**
- Uses `threading.Lock` for shared state access
- Safe for concurrent simulation workers
- Async event emission via `socketio.AsyncServer`

### Simulation Integration (`web_main.py`)

Integrates with existing `evaluate_bot.py` infrastructure:

**Simulation Flow:**
1. Client calls `/api/race/start` with config
2. Server spawns background thread calling `run_race_simulations()`
3. Uses `joblib.Parallel` for multi-threaded simulation (same as TUI)
4. Each `simulate_one()` result triggers `race_manager.update_racer()`
5. RaceManager emits WebSocket events to all connected clients
6. Race finishes when `completed_sims == total_sims`

**Data Flow:**
```
simulate_one() → result tuple (8 elements)
  ↓
race_manager.update_racer() → update internal state
  ↓
race_manager._emit_sync() → WebSocket broadcast
  ↓
All connected clients receive updates
```

### Static File Serving

The backend serves the built frontend from `evaluation/web/static/`:
- Production build created by `npm run build` in frontend
- Fallback to API-only mode if frontend not built
- Catch-all route `/{full_path:path}` serves `index.html` for client-side routing

## Development

### Testing WebSocket Events

Use Socket.IO client or browser console:
```javascript
const socket = io('http://localhost:8000')

socket.on('connect', () => console.log('Connected'))
socket.on('race_started', (data) => console.log('Race started:', data))
socket.on('racer_update', (data) => console.log('Racer update:', data))
socket.on('race_finished', (data) => console.log('Race finished:', data))

socket.emit('request_race_status')
```

### Starting a Race

Use curl or Postman:
```bash
curl -X POST http://localhost:8000/api/race/start \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": 0,
    "enemies": "h",
    "bot_names": ["mcts", "bt3", "rndm"],
    "test_count": 10,
    "thread_count": 2
  }'
```

### Monitoring

- **Logs**: Server logs show WebSocket connections and race events
- **API Docs**: Visit `http://localhost:8000/docs` for interactive API documentation
- **Health**: Check `http://localhost:8000/api/health` for server status

## Differences from TUI

| Feature | TUI (tui_main.py) | Web (web_main.py) |
|---------|-------------------|-------------------|
| UI Updates | `call_from_thread()` to Textual | `race_manager._emit_sync()` to Socket.IO |
| State Management | `RaceTUI` class attributes | `RaceState` dataclass |
| Threading | Textual worker thread | FastAPI background thread |
| Result Storage | In-memory until save | In-memory + WebSocket broadcast |
| Error Logging | RichLog widget | WebSocket `error_logged` event |
| User Input | Keyboard bindings ('s', 'q', 'e') | HTTP REST API |

## Dependencies

- **FastAPI**: Modern async web framework
- **python-socketio**: Socket.IO server implementation
- **uvicorn**: ASGI server
- **joblib**: Parallel simulation execution (shared with evaluate_bot.py)

## Configuration

Default server configuration in `web_main.py`:
- Host: `0.0.0.0` (all interfaces)
- Port: `8000`
- CORS: Enabled for all origins (development mode)
- Socket.IO path: `/socket.io`
- Async mode: `asgi`

Production deployment should:
- Restrict CORS origins
- Use HTTPS/WSS
- Set up reverse proxy (nginx/traefik)
- Configure proper logging
