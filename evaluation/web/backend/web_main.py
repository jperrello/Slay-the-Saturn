import sys
import sys
import os
from pathlib import Path
import csv
import io
import time

project_root = Path(__file__).parent.parent.parent.parent
evaluation_dir = project_root / 'evaluation'
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(evaluation_dir))

import socketio
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import threading

from race_manager import RaceManager
from evaluate_bot import name_to_bot, get_scenario, get_enemies, simulate_one
from evaluate_bot import Verbose
from core.game import GameState
from joblib import Parallel, delayed

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False
)

app = FastAPI(title="Slay the Saturn Web API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path='/socket.io'
)

race_manager = RaceManager(sio)

static_dir = Path(__file__).parent.parent / 'static'

class RaceConfig(BaseModel):
    scenario: int
    enemies: str
    bot_names: List[str]
    test_count: int
    thread_count: int

@app.get('/api/health')
async def health():
    return {'status': 'ok', 'service': 'slay-the-saturn-web'}

@app.get('/api/race/status')
async def get_race_status():
    status = race_manager.get_current_status()
    if status is None:
        return {'status': 'idle', 'message': 'No active race'}
    return status

@app.post('/api/race/reset')
async def reset_race():
    """Reset/cancel the current race, allowing a new one to start."""
    if race_manager.current_race:
        race_manager.current_race.is_finished = True
        race_manager.current_race = None
    return {'status': 'reset', 'message': 'Race state cleared'}

@app.post('/api/race/start')
async def start_race(config: RaceConfig):
    if race_manager.current_race and not race_manager.current_race.is_finished:
        raise HTTPException(status_code=400, detail="Race already in progress")

    scenario_callable = get_scenario(config.scenario, anonymize=False)
    scenario_name, deck = scenario_callable()

    thread = threading.Thread(
        target=run_race_simulations,
        args=(
            race_manager,
            config.bot_names,
            deck,
            config.enemies,
            scenario_name,
            config.test_count,
            config.thread_count
        ),
        daemon=True
    )
    thread.start()

    return {
        'status': 'started',
        'scenario': scenario_name,
        'enemies': config.enemies,
        'bots': config.bot_names,
        'total_simulations': config.test_count * len(config.bot_names)
    }

@app.get('/api/race/download')
async def download_race_results():
    if race_manager.current_race is None or not race_manager.current_race.results:
        raise HTTPException(status_code=404, detail="No race results available")
    
    results = race_manager.current_race.results
    
    output = io.StringIO()
    if results:
        fieldnames = list(results[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="race-results.csv"'}
    )

@app.get('/{full_path:path}')
async def serve_frontend(full_path: str):
    requested_file = static_dir / full_path
    
    if requested_file.exists() and requested_file.is_file():
        try:
            requested_file_resolved = requested_file.resolve()
            static_dir_resolved = static_dir.resolve()
            
            if static_dir_resolved in requested_file_resolved.parents or requested_file_resolved.parent == static_dir_resolved:
                return FileResponse(str(requested_file))
        except (ValueError, OSError):
            pass
    
    index_file = static_dir / 'index.html'
    if index_file.exists():
        return FileResponse(str(index_file))
    return {'message': 'Frontend not built. Run: cd evaluation/web/frontend && npm run build'}

@sio.event
async def connect(sid, environ):
    print(f'Client connected: {sid}')
    await sio.emit('connection_established', {'sid': sid}, room=sid)

    status = race_manager.get_current_status()
    if status:
        await sio.emit('race_status', status, room=sid)

@sio.event
async def disconnect(sid):
    print(f'Client disconnected: {sid}')

@sio.event
async def request_race_status(sid):
    status = race_manager.get_current_status()
    if status is None:
        await sio.emit('race_status', {
            'status': 'idle',
            'message': 'No active race'
        }, room=sid)
    else:
        await sio.emit('race_status', status, room=sid)

def run_race_simulations(race_manager: RaceManager, bot_names: List[str], deck: list,
                         enemies_str: str, scenario_name: str, test_count: int,
                         thread_count: int):
    bots = [name_to_bot(name, 1 / thread_count) for name in bot_names]

    race_manager.start_race(
        scenario_name=scenario_name,
        enemies_str=enemies_str,
        bot_names=[bot.name for bot in bots],
        test_count=test_count,
        thread_count=thread_count
    )

    sim_tasks = [
        delayed(simulate_one)(
            i,
            bots[i // test_count],
            deck,
            enemies_str,
            "",
            Verbose.NO_LOG
        ) for i in range(test_count * len(bots))
    ]

    sim_start_times = {}
    
    with Parallel(n_jobs=thread_count, backend='loky', return_as='generator') as parallel:
        for idx, result in enumerate(parallel(sim_tasks)):
            sim_end_time = time.time()
            sim_start_time = sim_start_times.get(idx, race_manager.current_race.start_time)
            execution_time = sim_end_time - sim_start_time
            
            bot_name, health, won, total_requests, invalid_responses, total_tokens, avg_response_time, invalid_rate, error_msg = result

            bot_idx = idx // test_count
            sim_num = (idx % test_count) + 1

            if error_msg:
                race_manager.log_error(bot_name, idx, error_msg)

            race_manager.update_racer(
                bot_name=bot_name,
                health=health,
                won=won,
                total_requests=total_requests,
                invalid_responses=invalid_responses,
                total_tokens=total_tokens,
                avg_response_time=avg_response_time,
                invalid_rate=invalid_rate,
                sim_index=idx,
                execution_time=execution_time
            )
            
            sim_start_times[idx + 1] = sim_end_time

    race_manager.finish_race()

if __name__ == '__main__':
    print('=' * 80)
    print('Slay the Saturn Web Server')
    print('=' * 80)
    print(f'Server: http://localhost:8000')
    print(f'WebSocket: ws://localhost:8000/socket.io')
    print(f'API Health: http://localhost:8000/api/health')
    print(f'Race Status: http://localhost:8000/api/race/status')
    print('=' * 80)
    uvicorn.run(
        socket_app,
        host='0.0.0.0',
        port=8000,
        log_level='info'
    )
