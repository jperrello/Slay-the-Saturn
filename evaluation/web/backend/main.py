import socketio
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
from pathlib import Path

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

app = FastAPI(title="Slay the Saturn Web API")

socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path='/socket.io'
)

static_dir = Path(__file__).parent.parent / 'static'
if static_dir.exists():
    app.mount('/static', StaticFiles(directory=str(static_dir)), name='static')

@app.get('/api/health')
async def health():
    return {'status': 'ok', 'service': 'slay-the-saturn-web'}

@app.get('/')
async def serve_frontend():
    index_file = static_dir / 'index.html'
    if index_file.exists():
        return FileResponse(str(index_file))
    return {'message': 'Frontend not built. Run: cd evaluation/web/frontend && npm run build'}

@sio.event
async def connect(sid, environ):
    print(f'Client connected: {sid}')
    await sio.emit('connection_established', {'sid': sid}, room=sid)

@sio.event
async def disconnect(sid):
    print(f'Client disconnected: {sid}')

@sio.event
async def request_race_status(sid):
    await sio.emit('race_status', {
        'status': 'idle',
        'message': 'No active race'
    }, room=sid)

if __name__ == '__main__':
    print('Starting Slay the Saturn Web Server...')
    print('Server: http://localhost:8000')
    print('WebSocket: ws://localhost:8000/socket.io')
    print('Health check: http://localhost:8000/api/health')
    uvicorn.run(
        socket_app,
        host='0.0.0.0',
        port=8000,
        log_level='info'
    )
