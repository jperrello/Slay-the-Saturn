import sys
import os
import pandas as pd
import time
from pathlib import Path
from datetime import datetime
from typing import Optional
from threading import Event, Lock

from textual.app import App, ComposeResult
from textual.containers import Vertical
from textual.widgets import Header, Footer, Static, RichLog
from textual import work
from textual.binding import Binding
from joblib import Parallel, delayed

current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
sys.path.append(str(parent_dir))

from game import GameState
from battle import BattleState
from agent import Enemy
from card import Card
from config import Character, Verbose
from evaluation.evaluate_bot import name_to_bot, get_scenario, get_enemies, simulate_one


class RacerWidget(Static):
    def __init__(self, bot_name: str, total_sims: int) -> None:
        super().__init__()
        self.bot_name = bot_name
        self.total_sims = total_sims
        self.wins = 0
        self.losses = 0
        self.errors = 0
        self.total_health = 0
        self.simulations_complete = 0
        self.avg_health = 100.0
        self.current_activity = "Waiting..."

        self.total_requests = 0
        self.total_tokens = 0
        self.total_response_time = 0.0
        self.invalid_responses = 0

    def set_activity(self, activity: str) -> None:
        self.current_activity = activity
        self.refresh()

    def update_stats(
        self,
        health: int,
        won: bool,
        total_requests: int = 0,
        invalid_responses: int = 0,
        total_tokens: int = 0,
        avg_response_time: float = 0.0,
        invalid_rate: float = 0.0
    ) -> None:
        if health == 0 and not won and total_requests == 0:
            self.errors += 1
        elif won:
            self.wins += 1
        else:
            self.losses += 1

        self.total_health += health
        self.simulations_complete += 1
        self.avg_health = self.total_health / self.simulations_complete if self.simulations_complete > 0 else 100.0

        self.total_requests += total_requests
        self.total_tokens += total_tokens
        self.total_response_time += avg_response_time
        self.invalid_responses += invalid_responses

        self.current_activity = f"Completed sim #{self.simulations_complete}"
        self.refresh()

    def render(self) -> str:
        win_bar_width = 30
        sim_bar_width = 10

        win_filled = int((self.wins / self.total_sims) * win_bar_width) if self.total_sims > 0 else 0
        win_empty = win_bar_width - win_filled
        win_bar = '█' * win_filled + '░' * win_empty

        sim_filled = int((self.simulations_complete / self.total_sims) * sim_bar_width) if self.total_sims > 0 else 0
        sim_empty = sim_bar_width - sim_filled
        sim_bar = '▰' * sim_filled + '▱' * sim_empty

        health_display = f"{self.avg_health:.0f}/100"
        name_line = f"{self.bot_name} ({health_display}) - {self.current_activity}"

        status_parts = []
        if self.errors > 0:
            status_parts.append(f"[red]{self.errors} errors[/red]")

        stats_line = f"{sim_bar} {self.simulations_complete}/{self.total_sims}"
        if status_parts:
            stats_line += " | " + " | ".join(status_parts)

        result_line = f"{win_bar} {self.wins}W/{self.losses}L"

        metrics_parts = []
        if self.total_tokens > 0:
            metrics_parts.append(f"{self.total_tokens:,} tokens")
        if self.total_requests > 0 and self.simulations_complete > 0:
            avg_rt = self.total_response_time / self.simulations_complete
            metrics_parts.append(f"{avg_rt:.1f}s avg")
        if self.invalid_responses > 0:
            metrics_parts.append(f"[yellow]{self.invalid_responses} invalid[/yellow]")

        if metrics_parts:
            return f"{name_line}\n{stats_line}\n{result_line} | {' | '.join(metrics_parts)}"
        else:
            return f"{name_line}\n{stats_line}\n{result_line}"


class RaceContainer(Vertical):
    def __init__(self, bot_names: list[str], total_sims_per_bot: int) -> None:
        super().__init__()
        self.racers = {name: RacerWidget(name, total_sims_per_bot) for name in bot_names}

    def compose(self) -> ComposeResult:
        for racer in self.racers.values():
            yield racer
            yield Static("")

    def update_racer(
        self,
        bot_name: str,
        health: int,
        won: bool,
        total_requests: int = 0,
        invalid_responses: int = 0,
        total_tokens: int = 0,
        avg_response_time: float = 0.0,
        invalid_rate: float = 0.0
    ) -> None:
        if bot_name in self.racers:
            self.racers[bot_name].update_stats(
                health,
                won,
                total_requests,
                invalid_responses,
                total_tokens,
                avg_response_time,
                invalid_rate
            )

    def set_racer_activity(self, bot_name: str, activity: str) -> None:
        if bot_name in self.racers:
            self.racers[bot_name].set_activity(activity)


class RaceTUI(App):
    CSS = """
    Screen {
        background: $surface;
    }

    #race-header {
        dock: top;
        height: 3;
        background: $primary;
        color: $text;
        content-align: center middle;
        text-style: bold;
    }

    #race-container {
        padding: 1 2;
        height: auto;
    }

    RacerWidget {
        height: 4;
        padding: 0 1;
    }

    #error-log {
        dock: bottom;
        height: 8;
        background: $panel;
        border: solid red;
    }

    #status {
        dock: bottom;
        height: 1;
        background: $panel;
        padding: 0 2;
        content-align: center middle;
    }

    #controls {
        dock: bottom;
        height: 1;
        background: $panel;
        padding: 0 2;
        content-align: center middle;
    }

    .finished {
        background: green;
        text-style: bold;
    }
    """

    BINDINGS = [
        ("q", "quit", "Quit"),
        Binding("s", "save_results", "Save Results", show=True),
        Binding("e", "toggle_errors", "Toggle Errors", show=True),
    ]

    def __init__(
        self,
        bot_names: list[str],
        scenario_index: int,
        enemies_str: str,
        test_count: int,
        thread_count: int = 4,
        save_dir: Optional[str] = None
    ) -> None:
        super().__init__()
        self.bot_names = bot_names
        self.scenario_index = scenario_index
        self.enemies_str = enemies_str
        self.test_count = test_count
        self.thread_count = thread_count
        self.completed_sims = 0
        self.total_sims = test_count * len(bot_names)
        self.save_dir = save_dir
        self.show_errors = False
        self.is_finished = False

        self.stop_event = Event()
        self.worker_handle = None
        self.data_lock = Lock()

        self.results_data = []
        self.errors_list = []

        self.start_time = time.time()

        scenario_callable = get_scenario(scenario_index, anonymize=False)
        self.scenario_name, self.deck = scenario_callable()

    def compose(self) -> ComposeResult:
        yield Header()

        header_text = f"Race: {self.scenario_name} | Enemies: {self.enemies_str}"
        yield Static(header_text, id="race-header")

        self.race_container = RaceContainer(self.bot_names, self.test_count)
        yield self.race_container

        self.error_log = RichLog(id="error-log", highlight=True, markup=True)
        self.error_log.display = False
        yield self.error_log

        self.status_widget = Static("Starting simulations...", id="status")
        yield self.status_widget

        yield Static("Press 'q' to quit | 's' to save | 'e' to toggle errors", id="controls")
        yield Footer()

    def on_mount(self) -> None:
        self.worker_handle = self.run_simulations()

    def on_unmount(self) -> None:
        self.stop_event.set()
        if self.worker_handle:
            self.worker_handle.cancel()

    def update_status(self) -> None:
        self.completed_sims += 1
        pct = (self.completed_sims / self.total_sims) * 100
        elapsed = time.time() - self.start_time

        if self.completed_sims == self.total_sims:
            self.is_finished = True
            total_errors = len(self.errors_list)
            self.status_widget.add_class("finished")
            self.status_widget.update(
                f"✓ Race finished! {self.total_sims} sims in {elapsed:.1f}s | "
                f"{total_errors} errors | Press 's' to save results"
            )
        else:
            est_total = (elapsed / self.completed_sims) * self.total_sims if self.completed_sims > 0 else 0
            eta = est_total - elapsed
            self.status_widget.update(
                f"Progress: {self.completed_sims}/{self.total_sims} ({pct:.0f}%) | "
                f"ETA: {eta:.0f}s | Elapsed: {elapsed:.0f}s"
            )

    def log_error(self, bot_name: str, sim_index: int, error_info: str) -> None:
        with self.data_lock:
            self.errors_list.append({
                'bot': bot_name,
                'simulation': sim_index,
                'error': error_info,
                'time': datetime.now().strftime("%H:%M:%S")
            })
        self.error_log.write(f"[red][{datetime.now().strftime('%H:%M:%S')}] Error in {bot_name} sim #{sim_index}:[/red] {error_info}")

    def action_toggle_errors(self) -> None:
        self.show_errors = not self.show_errors
        self.error_log.display = self.show_errors
        if self.show_errors and len(self.errors_list) == 0:
            self.error_log.write("[green]No errors logged yet![/green]")

    def action_save_results(self) -> None:
        with self.data_lock:
            if len(self.results_data) == 0:
                self.status_widget.update("No results to save yet!")
                return

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            dir_name = f"tui_{self.scenario_name}_enemies_{self.enemies_str}_{self.test_count}_{timestamp}"

            if self.save_dir:
                path = os.path.join(self.save_dir, dir_name)
            else:
                path = os.path.join('evaluation_results', dir_name)

            os.makedirs(path, exist_ok=True)

            df = pd.DataFrame(
                self.results_data,
                columns=["BotName", "PlayerHealth", "Win", "TotalRequests", "InvalidResponses",
                         "TotalTokens", "AvgResponseTime", "InvalidRate", "Error"]
            )
            csv_path = os.path.join(path, "results.csv")
            df.to_csv(csv_path, index=False)

            if self.errors_list:
                errors_df = pd.DataFrame(self.errors_list)
                errors_path = os.path.join(path, "errors.csv")
                errors_df.to_csv(errors_path, index=False)

        self.status_widget.update(f"✓ Results saved to {path}")

    @work(exclusive=True, thread=True)
    def run_simulations(self) -> None:
        bots = [name_to_bot(name, 1 / self.thread_count) for name in self.bot_names]

        sim_tasks = [
            delayed(simulate_one)(
                i,
                bots[i // self.test_count],
                self.deck,
                self.enemies_str,
                "",
                Verbose.NO_LOG
            ) for i in range(self.test_count * len(bots))
        ]

        with Parallel(n_jobs=self.thread_count, backend='loky', return_as='generator') as parallel:
            for idx, result in enumerate(parallel(sim_tasks)):
                if self.stop_event.is_set():
                    break

                bot_name, health, won, total_requests, invalid_responses, total_tokens, avg_response_time, invalid_rate, error_msg = result

                bot_idx = idx // self.test_count
                sim_num = (idx % self.test_count) + 1

                self.call_from_thread(
                    self.race_container.set_racer_activity,
                    bot_name,
                    f"Running sim #{sim_num}/{self.test_count}"
                )

                if error_msg:
                    self.call_from_thread(
                        self.log_error,
                        bot_name,
                        idx,
                        error_msg
                    )

                with self.data_lock:
                    self.results_data.append(result)

                self.call_from_thread(
                    self.race_container.update_racer,
                    bot_name,
                    health,
                    won,
                    total_requests,
                    invalid_responses,
                    total_tokens,
                    avg_response_time,
                    invalid_rate
                )

                self.call_from_thread(self.update_status)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="TUI for MiniStS Agent Evaluation")
    parser.add_argument('test_count', type=int, help='Number of simulations per bot')
    parser.add_argument('thread_count', type=int, help='Number of parallel threads')
    parser.add_argument('scenario', type=int, help='Scenario index (0-5)')
    parser.add_argument('enemies', type=str, help='Enemy configuration (e.g., "h", "ghl")')
    parser.add_argument('bots', nargs='+', help='Bot names to evaluate')
    parser.add_argument('--dir', type=str, default=None, help='Custom directory for results')

    args = parser.parse_args()

    app = RaceTUI(
        bot_names=args.bots,
        scenario_index=args.scenario,
        enemies_str=args.enemies,
        test_count=args.test_count,
        thread_count=args.thread_count,
        save_dir=args.dir
    )

    app.run()


if __name__ == "__main__":
    main()
