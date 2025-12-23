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