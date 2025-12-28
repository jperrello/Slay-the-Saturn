# Testing Guide

Reqs:
```bash
pip install pandas tqdm seaborn matplotlib joblib openai dotenv
```

## TLDR;

**Test Generated Cards (GIGL):**
```bash
python evaluation/evaluate_card_gen.py 10 4 20 h cot-claude --gigl-dir GIGL/generated_cards --name gigl_test
```
Note: this uses money to pay for claude.
It runs 10 sims for each 20 cards with 4 threads
If you want to test for free:
```bash
python evaluation/evaluate_card_gen.py 10 4 20 h bt5 --gigl-dir GIGL/generated_cards --name gigl_test
```

**Default Agent Comparison Test:**
```bash
python evaluation/evaluate_bot.py 50 4 0 h r bt3 none cot rcot --name agent_comparison --time
```

**Paid Agent Test (this is $$$, but also the most important command):**
```bash
python evaluation/evaluate_bot.py 25 4 0 h rcot-gpt41 rcot-openrouter-auto rcot-claude rcot-gemini mcts rndm --name premium --time
```

**GIGL Random Deck Test (Scenario 5):**
```bash
python evaluation/evaluate_bot.py 25 2 5 h rcot-gpt41 none-gpt41 mcts bt3 rndm --name gigl-random --time
```

**Generate Statistics Table (Table 1 from the paper):**
```bash
python evaluation/generate_table_models.py evaluation_results/<your_test_directory>/results.csv evaluation_results/<your_test_directory>/execution_times.json
```

**Generate Scenario Comparison Table (Table 2 from the paperq):**
```bash
# Requires consolidated results.csv with Scenario column (from all_scenarios/)
python evaluation/generate_table_scenarios.py evaluation_results/all_scenarios/results.csv --data playerhealth

```

**Plot Results:**
```bash
# For bot evaluation results (group by BotName):
python evaluation/plot_evaluation.py evaluation_results/<your_test_directory>/results.csv BotName

# For card generation results (group by CardName):
python evaluation/plot_evaluation.py evaluation_results/card_gen_<name>_enemies_<enemies>_<test_count>_<bot>/results.csv CardName
```

**TUI Race Visualization (NEW!):**
```bash
# Quick visual test with fast bots:
python evaluation/tui_main.py 10 2 0 h rndm bt3 mcts

# Compare LLM agents in real-time (requires API keys):
python evaluation/tui_main.py 5 4 0 h rcot-gpt41 cot-claude mcts
```

## Saturn mDNS Integration

Saturn is a local OpenRouter API proxy that allows you to route LLM API calls through a local server. The system uses mDNS (DNS Service Discovery) to automatically find Saturn servers on your local network.

### Testing Saturn Discovery

**Discover Saturn Servers:**
```bash
python g3_files/saturn_discovery.py
```

Expected output:
```
Searching for Saturn servers...

Found 2 Saturn server(s):
  - OpenRouter: http://192.168.56.1:8080 (priority=10)
  - Saturn-Backup: http://192.168.56.1:8081 (priority=50)

Best server (auto-selected): http://192.168.56.1:8080
```

### How Agents Use Saturn

Modern LLM agents (CoT, RCoT, None) automatically discover and use Saturn servers:

1. **Auto-Discovery**: At initialization, agents call `get_saturn_server()` from `saturn_discovery.py`
2. **Priority Selection**: If multiple servers exist, the one with the **lowest priority value** is selected (lower = higher preference)
3. **Graceful Fallback**: If no Saturn servers found, agents fall back to OpenRouter API directly (requires `OPENROUTER_API_KEY` in `.env`)

**Agent initialization flow:**
```
Agent.__init__()
  ↓
saturn_url = get_saturn_server()  # mDNS discovery
  ↓
if saturn_url:
    base_url = f"{saturn_url}/v1"  # e.g., http://192.168.56.1:8080/v1
elif OPENROUTER_API_KEY:
    base_url = "https://openrouter.ai/api/v1"  # Direct OpenRouter
else:
    raise ValueError("No Saturn or API key")
```

### URL Configuration Patterns

The system uses different URL patterns at different layers:

1. **Discovery returns**: `http://IP:PORT` (base URL only)
2. **Agent base_url**: `http://IP:PORT/v1` (for OpenAI SDK to append `/chat/completions`)
3. **Saturn forwards to**: `https://openrouter.ai/api/v1/chat/completions` (complete endpoint in `.env`)

**Why `/v1` is added twice:**
- OpenAI SDK automatically appends `/chat/completions` to `base_url`
- Agents must provide `base_url` ending in `/v1` so final URL is `http://IP:PORT/v1/chat/completions`
- Saturn server expects requests at `/v1/chat/completions` endpoint (see `saturn_files/openrouter_server.py:166`)

### Environment Variables

**`.env` file (required for Saturn server):**
```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions
```

**Important:**
- `OPENROUTER_BASE_URL` must be the **complete endpoint** (includes `/chat/completions`)
- Saturn server POSTs directly to this URL (doesn't use OpenAI SDK)
- Changes to `.env` require Saturn server restart (no hot reload)

### Testing with Saturn

**Test with Saturn auto-discovery:**
```bash
# Ensure Saturn server is running first
python saturn_files/openrouter_server.py

# Run evaluation (agents will auto-discover Saturn)
python evaluation/evaluate_bot.py 5 1 0 h cot-gpt41 --name saturn_test
```

**Expected console output:**
```
[CoT] Using Saturn server: http://192.168.56.1:8080
```

**Test without Saturn (fallback):**
```bash
# Stop Saturn server, ensure OPENROUTER_API_KEY is in .env
python evaluation/evaluate_bot.py 5 1 0 h cot-gpt41 --name openrouter_test
```

**Expected console output:**
```
[CoT] No Saturn servers found, using OpenRouter API directly
```

### Troubleshooting Saturn Discovery

**No servers found:**
1. Verify Saturn server is running: `python saturn_files/openrouter_server.py`
2. Check dns-sd is available: `dns-sd -B _saturn._tcp local` (requires Bonjour on Windows)
3. Ensure same network as Saturn server
4. Check firewall settings

**Wrong server selected (multiple servers):**
- Discovery selects server with **lowest priority value**
- Set priority via Saturn server config (TXT record in mDNS advertisement)
- Default priority is 50 if not specified

**404 or 502 errors:**
- Verify Saturn base URL ends with `/v1`: Check agent code at `cot_agent.py:105`, `rcot_agent.py:89`, `none_agent.py:90`
- Verify `.env` has complete endpoint: `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions`

## How to run

### Available Bots (All use group 3's agents and not the paper's)
- Baseline: `rndm`, `basic`, `r` (random)
- None (Minimal prompting - PromptOption.NONE - asks LLM to pick action index without explanation):
  - `none` (default: GPT-4.1)
  - Premium: `none-gpt41`, `none-openrouter-auto`, `none-claude`, `none-gemini`
  - Free: `none-llama-free`, `none-qwen-free`, `none-nemotron-free`, `none-gpt-oss-free`, `none-deepseek-free`
- Backtrack: `bt<depth>`, `bts<depth>` (e.g., `bt3`, `bts5`)
- MCTS: `mcts`, `mcts-<iterations>` (e.g., `mcts-200`)
- CoT (Chain-of-Thought):
  - `cot` (default: GPT-4.1)
  - Premium: `cot-gpt41`, `cot-openrouter-auto`, `cot-claude`, `cot-gemini`
  - Free: `cot-llama-free`, `cot-qwen-free`, `cot-nemotron-free`, `cot-gpt-oss-free`, `cot-deepseek-free`
- RCoT (Reverse Chain-of-Thought):
  - `rcot` (default: OpenRouter auto-routing)
  - Premium: `rcot-gpt41`, `rcot-openrouter-auto`, `rcot-claude`, `rcot-gemini`
  - Free: `rcot-llama-free`, `rcot-qwen-free`, `rcot-nemotron-free`, `rcot-gpt-oss-free`, `rcot-deepseek-free`
- Legacy GPT: `legacy-gpt-<model>-<prompt>` (e.g., `legacy-gpt-t3.5-cot`)

### Available Enemies (Global)
Enemy configuration string (e.g., `gsl` for Goblin, SimpleEnemy, Leech):
- `h` = HobGoblin (from paper: 22 damage attack, 10 block, probably what you want to run)
- `g` = Goblin
- `l` = Leech
- `j` = JawWorm

---
### 1. Card Generation Evaluation (`evaluate_card_gen.py`)

Evaluates the impact of generated or custom cards on bot performance.

**Basic Usage:**
```bash
python evaluation/evaluate_card_gen.py <test_count> <thread_count> <gen_count> <enemies> <bot>
```

**Arguments:**
- `test_count`: Number of test simulations per card
- `thread_count`: Number of parallel threads
- `gen_count`: Number of cards to test
- `enemies`: Enemy configuration string (same as evaluate_bot.py)
- `bot`: Bot name to use for evaluation

**Optional Flags:**
- `--name <name>`: Custom name for the test run
- `--dir <directory>`: Custom directory for results
- `--log`: Enable logging
- `--gigl-dir <directory>`: Directory containing GIGL JSON card files (instead of random generation)

**Example (Random Cards):**
```bash
python evaluation/evaluate_card_gen.py 50 4 10 ghl mcts --name random_cards
```

**Example (GIGL Cards):**
```bash
python evaluation/evaluate_card_gen.py 50 4 10 ghl mcts --gigl-dir path/to/cards --name gigl_test
```

**Output:**
Results are saved to `evaluation_results/card_gen_<name>_enemies_<enemies>_<test_count>_<bot>/`
- `results.csv`: Columns: BotName, CardName, PlayerHealth, Win

---
### 2. Bot Evaluation (`evaluate_bot.py`)

Evaluates different bot agents against specific scenarios and enemies.

**Basic Usage:**
```bash
python evaluation/evaluate_bot.py <test_count> <thread_count> <scenario> <enemies> <bot1> [bot2 ...]
```

**Arguments:**
- `test_count`: Number of test simulations to run per bot
- `thread_count`: Number of parallel threads to use (this makes it faster but leads to pickling if my code breaks)
- `scenario`: Scenario index (0-5)
  - 0: starter-ironclad (5 Strikes, 4 Defends, 1 Bash)
  - 1: basics-batter-stimulate (5 Strikes, 4 Defends, Batter, Stimulate)
  - 2: tolerate (1 Strike, 3 Defends, Tolerate)
  - 3: basics-bomb (5 Strikes, 4 Defends, Bomb)
  - 4: basics-suffer (5 Strikes, 4 Defends, Suffer)
  - 5: gigl-random-deck (20 random GIGL generated cards, no basic cards)
- `enemies`: Enemy configuration string (see Available Enemies above)
- `bot1`, `bot2`, etc.: Bot names to evaluate (see Available Bots above)

**Optional Flags:**
- `--name <name>`: Custom name for the test run
- `--dir <directory>`: Custom directory for results
- `--log`: Enable logging
- `--anonymize`: Anonymize card names in the scenario
- `--time`: Track execution time for each bot

**Example:**
```bash
python evaluation/evaluate_bot.py 100 4 0 s none basic mcts --name my_test --log
```

**Output:**
Results are saved to `evaluation_results/<name>_<scenario>_enemies_<enemies>_<test_count>_boteval/`
- `results.csv`: Simulation results with columns: BotName, PlayerHealth, Win
- `execution_times.json`: Execution times per bot (if `--time` flag used)
- Individual log files for each simulation (if `--log` flag used)

---


### 3. Plot Evaluation Results (`plot_evaluation.py`)

Generates statistical plots from evaluation results.

**Basic Usage:**
```bash
python evaluation/plot_evaluation.py <filename> <by_column>
```

**Arguments:**
- `filename`: Path to the CSV results file
- `by_column`: Column to group by (e.g., `BotName`, `CardName`)

**Optional Flags:**2
- `--maxx <value>`: Maximum x-axis value for the plot

**Example:**
```bash
python evaluation/plot_evaluation.py evaluation_results/my_test/results.csv BotName --maxx 80
```

**Output:**
- Displays histogram with KDE showing distribution of PlayerHealth by the specified column
- Prints mean PlayerHealth for each group

---

### 4. TUI Race Visualization (`tui_main.py`)

An interactive TypeRacer-style terminal interface for real-time agent evaluation visualization with comprehensive performance metrics and error tracking.

**Features:**
- **Dual progress tracking**: Simulation progress bar + win progress bar per agent
- **Real-time LLM metrics**: Token usage, response times, invalid responses
- **Error detection**: Distinguishes crashes from legitimate losses
- **Interactive error log**: Toggle error panel to see failure details
- **Result persistence**: Save results to CSV with 's' key
- **Live ETA**: Time remaining estimation based on current progress
- **Performance stats**: Full statistics tracking like CLI version

**Basic Usage:**
```bash
python evaluation/tui_main.py <test_count> <thread_count> <scenario> <enemies> <bot1> [bot2 ...]
```

**Arguments:**
- `test_count`: Number of simulations per bot
- `thread_count`: Number of parallel threads
- `scenario`: Scenario index (0-5)
- `enemies`: Enemy configuration string (e.g., "h", "ghl")
- `bot1`, `bot2`, etc.: Bot names to evaluate
- `--dir <directory>`: Optional custom directory for saved results

**Examples:**

Quick test with fast bots:
```bash
python evaluation/tui_main.py 10 2 0 h rndm bt3 mcts
```

Compare LLM agents with metrics (requires API keys):
```bash
python evaluation/tui_main.py 25 4 0 h rcot-gpt41 cot-claude none-gemini mcts
```

GIGL random deck scenario with custom save directory:
```bash
python evaluation/tui_main.py 20 2 5 h rcot-gpt41 mcts bt5 rndm --dir my_results
```

**TUI Display:**
```
╔════════════════════════════════════════════════════════════════════════════╗
║ Race: starter-ironclad | Enemies: h                                        ║
╠════════════════════════════════════════════════════════════════════════════╣
║ mcts (92/100)                                                               ║
║ ▰▰▰▰▰▰▰▰▰▰ 25/25                                                           ║
║ ██████████████████████████████ 22W/3L                                      ║
║                                                                             ║
║ rcot-gpt41 (76/100)                                                         ║
║ ▰▰▰▰▰▰▰▰▰▰ 25/25 | 2 errors                                                ║
║ ████████████████████░░░░░░░░░░ 18W/5L | 12,450 tokens | 2.3s avg          ║
║                                                                             ║
║ bt3 (45/100)                                                                ║
║ ▰▰▰▰▰▰▰▰▰▰ 25/25                                                           ║
║ ██████████░░░░░░░░░░░░░░░░░░░░ 12W/13L                                     ║
╠════════════════════════════════════════════════════════════════════════════╣
║ ✓ Race finished! 75 sims in 45.2s | 2 errors | Press 's' to save results  ║
║ Press 'q' to quit | 's' to save | 'e' to toggle errors                     ║
╚════════════════════════════════════════════════════════════════════════════╝
```

**Controls:**
- `q`: Quit the TUI
- `s`: Save results to CSV (includes full stats like CLI version)
- `e`: Toggle error log panel to see crash details

**Output Files (when saved):**
Results saved to `evaluation_results/tui_<scenario>_enemies_<enemies>_<test_count>_<timestamp>/`
- `results.csv`: Full results with columns: BotName, PlayerHealth, Win, TotalRequests, InvalidResponses, TotalTokens, AvgResponseTime, InvalidRate
- `errors.csv`: Error log with bot name, simulation index, error details, and timestamp

**Key Improvements over CLI:**
- **Error visibility**: Errors shown in red with count, dedicated error panel
- **LLM metrics**: Token counts and response times displayed per-bot in real-time
- **Dual progress**: See both simulation progress (▰▰▰) and win progress (███)
- **Live updates**: Watch stats change as each simulation completes
- **ETA tracking**: Estimated time remaining based on actual performance
- **Interactive**: Toggle error log, save results on demand

**Notes:**
- Progress bars use different characters: ▰/▱ for simulations, █/░ for wins
- Errors (0 health + no LLM requests) highlighted in red
- LLM agents show token usage, average response time, and invalid response count
- Press 's' anytime to save partial results (useful for long runs)
- Error panel shows timestamp and details for each crashed simulation
- Compatible with all CSV analysis tools (plot_evaluation.py, generate_table_models.py)

---

### 5. Web UI Race Dashboard (`web_main.py`)

A modern web-based dashboard for real-time agent evaluation with live WebSocket updates, multi-client support, and comprehensive race statistics.

**Features:**
- **Real-time WebSocket updates**: Live race progress streaming to all connected clients
- **Multi-bot dashboard**: Track multiple agents simultaneously with visual progress bars
- **LLM metrics display**: Token usage, response times, invalid responses
- **REST API control**: Start races, check status, health monitoring
- **Production-ready**: Static file serving, CORS support, async architecture
- **Multi-client**: Multiple users can watch the same race in real-time

**Setup:**

Install backend dependencies:
```bash
cd evaluation/web/backend
pip install -r requirements.txt
```

Install frontend dependencies and build:
```bash
cd evaluation/web/frontend
npm install
npm run build
```

**Running the Web Server:**

Start the backend server:
```bash
cd evaluation/web/backend
python web_main.py
```

Server endpoints:
- **Web UI**: `http://localhost:8000`
- **API Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`
- **WebSocket**: `ws://localhost:8000/socket.io`

**Development Mode (Frontend Hot Reload):**

Terminal 1 - Backend:
```bash
cd evaluation/web/backend
python web_main.py
```

Terminal 2 - Frontend Dev Server:
```bash
cd evaluation/web/frontend
npm run dev
```

Access frontend at `http://localhost:5173` with auto-reload on code changes.

**Starting a Race:**

Using curl:
```bash
curl -X POST http://localhost:8000/api/race/start \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": 0,
    "enemies": "h",
    "bot_names": ["mcts", "rcot-gpt41", "bt3"],
    "test_count": 25,
    "thread_count": 4
  }'
```

Using Python requests:
```python
import requests

response = requests.post('http://localhost:8000/api/race/start', json={
    'scenario': 0,
    'enemies': 'h',
    'bot_names': ['mcts', 'rcot-gpt41', 'bt3', 'rndm'],
    'test_count': 25,
    'thread_count': 4
})
print(response.json())
```

**WebSocket Events:**

The web UI automatically receives these events:

Server → Client:
- `race_started` - Race initialization with bot names and config
- `racer_update` - Bot stats after each simulation (wins, losses, health, tokens)
- `status_update` - Global progress, ETA, completion percentage
- `error_logged` - Simulation crash details
- `race_finished` - Final results and statistics

Client → Server:
- `request_race_status` - Request current race state

**Example Race Configurations:**

Quick test (fast bots):
```json
{
  "scenario": 0,
  "enemies": "h",
  "bot_names": ["mcts", "bt3", "rndm"],
  "test_count": 10,
  "thread_count": 2
}
```

LLM comparison (requires API keys):
```json
{
  "scenario": 0,
  "enemies": "h",
  "bot_names": ["rcot-gpt41", "cot-claude", "none-gemini", "mcts"],
  "test_count": 25,
  "thread_count": 4
}
```

GIGL random deck scenario:
```json
{
  "scenario": 5,
  "enemies": "h",
  "bot_names": ["rcot-gpt41", "mcts", "bt5", "rndm"],
  "test_count": 20,
  "thread_count": 2
}
```

**Architecture Overview:**

```
Frontend (React + Vite)
  ↓ WebSocket (socket.io-client)
Backend (FastAPI + Socket.IO)
  ↓ RaceManager
  ↓ Background Thread
  ↓ joblib.Parallel
  ↓ simulate_one() workers
```

**Key Components:**

- **Frontend** (`evaluation/web/frontend/`):
  - React 18 with hooks
  - Socket.io-client for WebSocket
  - React Router for navigation
  - Vite for fast builds

- **Backend** (`evaluation/web/backend/`):
  - FastAPI for REST API
  - python-socketio for WebSocket
  - RaceManager for thread-safe state
  - Integration with evaluate_bot.py

**Output:**

Results stored in RaceManager and broadcast via WebSocket:
- All connected clients see live updates
- Final results available via `/api/race/status` endpoint
- Can be saved to CSV via custom endpoint (future enhancement)

**Comparison with TUI:**

| Feature | TUI | Web UI |
|---------|-----|--------|
| Interface | Terminal | Browser |
| Multi-user | Single terminal session | Multiple concurrent clients |
| Platform | Any terminal | Any browser |
| Updates | Textual widget refresh | WebSocket push |
| Control | Keyboard (q, s, e) | REST API |
| Deployment | Local only | Can be hosted remotely |
| Results | Save with 's' key | API endpoint |

**Notes:**
- Web server runs on port 8000 (configurable)
- Frontend dev server runs on port 5173 (Vite default)
- CORS enabled for development (restrict in production)
- Uses same simulation backend as TUI and CLI
- Compatible with all bot types and scenarios
- Thread-safe for concurrent race execution

---
## Output Directory Structure

All results are saved in the `evaluation_results/` directory with the following structure:
```
evaluation_results/
├── <test_name>_<scenario>_enemies_<enemies>_<test_count>_boteval/
│   ├── results.csv
│   ├── execution_times.json (if --time used)
│   ├── <id>_<bot_name>.log (if --log used)
│   └── <id>_<bot_name>_history (ChatGPT bots only)
└── card_gen_<name>_enemies_<enemies>_<test_count>_<bot>/
    └── results.csv
```

## Table Generation Scripts

### `generate_table.py` / `generate_table_models.py` (Table 1 - Model Performance)
Generates model performance comparison table with detailed LLM metrics.

**Usage:**
```bash
python evaluation/generate_table.py <results.csv> <execution_times.json>
```

**Output:**
- Groups by BotName
- Displays: Total Requests, Total Tokens, Avg Response Time, Invalid Response %, Avg Execution Time
- Saves to `stats_table.md` in same directory as input CSV

**Example:**
```bash
python evaluation/generate_table.py evaluation_results/premium_starter-ironclad_enemies_h_25_boteval/results.csv evaluation_results/premium_starter-ironclad_enemies_h_25_boteval/execution_times.json
```

### `generate_table_scenarios.py` (Table 2 - Scenario Comparison)
Generates scenario comparison table with BotNames as columns and Scenarios as rows.

**Usage:**
```bash
python evaluation/generate_table_scenarios.py <consolidated_results.csv> --data <metric>
```

**Arguments:**
- `csv_file`: Path to consolidated results.csv with Scenario column
- `--data <metric>`: Metric to display (default: playerhealth)
  - `playerhealth`: Average Player Health
  - `winrate`: Win Rate (%)
  - `totaltokens`: Total Tokens
  - `totalrequests`: Total Requests
  - `stdplayerhealth`: Standard Deviation of Player Health

**Output:**
- 5x5 table (Scenarios × BotNames)
- Saves to `scenario_table_<metric>.md`

**Example:**
```bash
python evaluation/generate_table_scenarios.py evaluation_results/all_scenarios/results.csv --data playerhealth
python evaluation/generate_table_scenarios.py evaluation_results/all_scenarios/results.csv --data winrate
```

**Note:** To create a consolidated results.csv with Scenario column:
1. Create `evaluation_results/all_scenarios/` directory
2. Combine individual scenario CSVs, adding a "Scenario" column to each
3. Example script to consolidate results is in `evaluation_results/all_scenarios/combine_results.py`