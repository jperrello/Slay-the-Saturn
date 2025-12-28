# Slay the Saturn - Web Frontend

Real-time agent evaluation dashboard built with React + Vite.

## Setup

Install dependencies:
```bash
cd evaluation/web/frontend
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

This will start the Vite dev server at `http://localhost:5173` with:
- Hot module replacement (HMR)
- WebSocket proxy to backend at `http://localhost:8000`
- Auto-reload on file changes

## Production Build

Build for production:
```bash
npm run build
```

This creates optimized static files in `evaluation/web/static/` that can be served by the FastAPI backend.

## Features

- **Live Race Monitoring**: Real-time updates via WebSocket
- **Multi-Bot Dashboard**: Track multiple agents simultaneously
- **LLM Metrics**: Token usage, response times, invalid responses
- **Error Tracking**: Dedicated error logging panel
- **Progress Visualization**: Win/loss tracking with progress bars

## WebSocket Events

The frontend listens for these events from the backend:

### Server → Client

- `race_started` - Race initialization complete
  - Payload: `{bot_names, scenario_name, total_sims, thread_count}`

- `racer_update` - Bot statistics updated after simulation
  - Payload: `{bot_name, wins, losses, errors, avg_health, total_requests, total_tokens, avg_response_time, invalid_responses}`

- `status_update` - Global progress/ETA update
  - Payload: `{completed_sims, total_sims, elapsed, eta, error_count}`

- `error_logged` - New error detected
  - Payload: `{bot, simulation, error, time}`

- `race_finished` - All simulations complete
  - Payload: `{total_sims, elapsed, total_errors, final_results}`

## Architecture

- **React 18**: Component-based UI with hooks
- **React Router**: Client-side routing (`/`, `/race`)
- **Socket.io-client**: WebSocket connection to backend
- **Vite**: Fast build tool with ESM support

## File Structure

```
frontend/
├── src/
│   ├── main.jsx         # React entry point
│   ├── App.jsx          # Main app component with routing
│   ├── App.css          # App-specific styles
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies
└── README.md            # This file
```

## Backend Integration

The frontend expects a FastAPI backend with Socket.IO support at `http://localhost:8000`.

See `evaluation/web/backend/` for backend implementation details.

## Development Notes

- WebSocket connection auto-reconnects on disconnect
- All timestamps use local timezone
- Token counts formatted with comma separators
- Progress bars update smoothly with CSS transitions
- Error states highlighted in red
