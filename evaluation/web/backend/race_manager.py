import threading
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
import socketio

@dataclass
class RacerStats:
    bot_name: str
    wins: int = 0
    losses: int = 0
    errors: int = 0
    simulations_complete: int = 0
    total_simulations: int = 0
    current_health: int = 0
    total_health: int = 0
    avg_health: float = 0.0
    total_requests: int = 0
    invalid_responses: int = 0
    total_tokens: int = 0
    total_response_time: float = 0.0
    avg_response_time: float = 0.0
    invalid_rate: float = 0.0
    total_execution_time: float = 0.0
    avg_execution_time: float = 0.0

    def update_from_simulation(self, health: int, won: bool, total_requests: int,
                               invalid_responses: int, total_tokens: int,
                               avg_response_time: float, invalid_rate: float,
                               execution_time: float = 0.0):
        self.simulations_complete += 1
        self.current_health = health
        self.total_health += health
        self.avg_health = self.total_health / self.simulations_complete

        if health == 0 and not won and total_requests == 0:
            self.errors += 1
        elif won:
            self.wins += 1
        else:
            self.losses += 1

        self.total_requests += total_requests
        self.invalid_responses += invalid_responses
        self.total_tokens += total_tokens
        self.total_response_time += avg_response_time
        self.total_execution_time += execution_time

        if self.simulations_complete > 0:
            self.avg_response_time = self.total_response_time / self.simulations_complete
            self.avg_execution_time = self.total_execution_time / self.simulations_complete
            if self.total_requests > 0:
                self.invalid_rate = (self.invalid_responses / self.total_requests) * 100

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class RaceState:
    scenario_name: str
    enemies_str: str
    bot_names: List[str]
    test_count: int
    thread_count: int
    racers: Dict[str, RacerStats] = field(default_factory=dict)
    completed_sims: int = 0
    total_sims: int = 0
    start_time: Optional[float] = None
    errors: List[Dict[str, Any]] = field(default_factory=list)
    results: List[Dict[str, Any]] = field(default_factory=list)
    is_finished: bool = False

    def __post_init__(self):
        self.total_sims = self.test_count * len(self.bot_names)
        self.racers = {name: RacerStats(bot_name=name, total_simulations=self.test_count) for name in self.bot_names}
        self.start_time = time.time()

    def get_elapsed_time(self) -> float:
        if self.start_time is None:
            return 0.0
        return time.time() - self.start_time

    def get_eta(self) -> float:
        if self.completed_sims == 0:
            return 0.0
        elapsed = self.get_elapsed_time()
        rate = elapsed / self.completed_sims
        remaining = self.total_sims - self.completed_sims
        return rate * remaining

    def get_progress_percentage(self) -> float:
        if self.total_sims == 0:
            return 0.0
        return (self.completed_sims / self.total_sims) * 100

    def update_racer(self, bot_name: str, health: int, won: bool, total_requests: int,
                    invalid_responses: int, total_tokens: int, avg_response_time: float,
                    invalid_rate: float, execution_time: float = 0.0):
        if bot_name in self.racers:
            self.racers[bot_name].update_from_simulation(
                health, won, total_requests, invalid_responses,
                total_tokens, avg_response_time, invalid_rate, execution_time
            )
            self.completed_sims += 1

    def log_error(self, bot_name: str, sim_index: int, error_info: str):
        self.errors.append({
            'bot_name': bot_name,
            'sim_index': sim_index,
            'error_msg': error_info,
            'time': datetime.now().strftime('%H:%M:%S')
        })

    def add_result(self, result: Dict[str, Any]):
        self.results.append(result)

    def get_status_dict(self) -> Dict[str, Any]:
        return {
            'completed_sims': self.completed_sims,
            'total_sims': self.total_sims,
            'progress_pct': self.get_progress_percentage(),
            'elapsed': self.get_elapsed_time(),
            'eta': self.get_eta(),
            'error_count': len(self.errors),
            'is_finished': self.is_finished
        }

class RaceManager:
    def __init__(self, sio: socketio.AsyncServer):
        self.sio = sio
        self.current_race: Optional[RaceState] = None
        self.lock = threading.Lock()

    def start_race(self, scenario_name: str, enemies_str: str, bot_names: List[str],
                   test_count: int, thread_count: int):
        with self.lock:
            self.current_race = RaceState(
                scenario_name=scenario_name,
                enemies_str=enemies_str,
                bot_names=bot_names,
                test_count=test_count,
                thread_count=thread_count
            )

        self._emit_sync('race_started', {
            'scenario_name': scenario_name,
            'enemies': enemies_str,
            'bot_names': bot_names,
            'test_count': test_count,
            'thread_count': thread_count,
            'total_sims': self.current_race.total_sims
        })

    def update_racer(self, bot_name: str, health: int, won: bool, total_requests: int,
                    invalid_responses: int, total_tokens: int, avg_response_time: float,
                    invalid_rate: float, sim_index: int, execution_time: float = 0.0):
        if self.current_race is None:
            return

        with self.lock:
            self.current_race.update_racer(
                bot_name, health, won, total_requests, invalid_responses,
                total_tokens, avg_response_time, invalid_rate, execution_time
            )

            result = {
                'BotName': bot_name,
                'PlayerHealth': health,
                'Win': won,
                'TotalRequests': total_requests,
                'InvalidResponses': invalid_responses,
                'TotalTokens': total_tokens,
                'AvgResponseTime': avg_response_time,
                'InvalidRate': invalid_rate
            }
            self.current_race.add_result(result)

            racer_data = self.current_race.racers[bot_name].to_dict()
            status_data = self.current_race.get_status_dict()

        self._emit_sync('racer_update', racer_data)
        self._emit_sync('status_update', status_data)

        if status_data['completed_sims'] >= status_data['total_sims']:
            self.finish_race()

    def finish_race(self):
        if self.current_race is None:
            return

        with self.lock:
            self.current_race.is_finished = True
            final_data = {
                'total_sims': self.current_race.total_sims,
                'elapsed': self.current_race.get_elapsed_time(),
                'total_errors': len(self.current_race.errors),
                'racers': {name: racer.to_dict() for name, racer in self.current_race.racers.items()},
                'results': self.current_race.results
            }

        self._emit_sync('race_finished', final_data)

    def log_error(self, bot_name: str, sim_index: int, error_info: str):
        if self.current_race is None:
            return

        with self.lock:
            self.current_race.log_error(bot_name, sim_index, error_info)
            error_data = self.current_race.errors[-1]

        self._emit_sync('error_logged', error_data)

    def get_current_status(self) -> Optional[Dict[str, Any]]:
        if self.current_race is None:
            return None

        with self.lock:
            return {
                'scenario_name': self.current_race.scenario_name,
                'enemies': self.current_race.enemies_str,
                'status': self.current_race.get_status_dict(),
                'racers': {name: racer.to_dict() for name, racer in self.current_race.racers.items()}
            }

    def _emit_sync(self, event: str, data: Any):
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.sio.emit(event, data))
            else:
                loop.run_until_complete(self.sio.emit(event, data))
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.sio.emit(event, data))
