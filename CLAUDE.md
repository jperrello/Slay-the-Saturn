# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MiniStS Language-Driven Play Reimagined** is a research platform for evaluating LLM agents in Slay the Spire-like card game scenarios. The codebase extends the original MiniSTS framework by iambb5445 with:
- Chain-of-Thought (CoT) and Reverse Chain-of-Thought (RCoT) reasoning agents
- GIGL (Grammar-based Intelligent card Generation Language) procedural card system
- Multi-LLM support (OpenAI, Anthropic, Google, OpenRouter)
- Comprehensive multi-threaded evaluation framework

## Development Commands

### @TESTING.md

@TESTING.md contains all development commands needed to run this project, this includes bot evaluation, plotting figures, and card generation. If you need to run a test command it will be in this file. When asked to update or remove a specific command in a testing file, this is the fike to edit.


## High-Level Architecture

### Core Game Engine (Original MiniSTS)
The foundation layer provides stable game mechanics. Key files:
- `game.py`: GameState management (character, deck, ascension)
- `battle.py`: Turn-based battle loop (draw → player plays → enemies act)
- `card.py`: Card definitions, CardFactory, scenario repositories
- `agent.py`: Player and Enemy classes (JawWorm, HobGoblin, Goblin, Leech, slimes)
- `status_effecs.py`: Status effect system (Weak, Vulnerable, Strength, Vigor, Bomb, Tolerance)
- `action/`: Action system using fluent API: `DealAttackDamage(5).To(PlayerAgentTarget())`
- `target/`: Targeting system (AgentSet, CardPile abstractions)

### Agent Framework
All agents inherit from `base_agent.py::GGPA` (Game-Playing Agent):
- `choose_card()`: Select which card to play
- `choose_agent_target()`: Select target enemy
- `choose_card_target()`: Select target card
- `get_play_card_options()`: Get playable cards given current mana

**Modern LLM Agents** (`g3_files/agents/`):
- `cot_agent.py`: Chain-of-Thought (reason first, then decide)
- `rcot_agent.py`: Reverse CoT (decide first, then reason - faster inference)
- `none_agent.py`: Minimal prompting baseline (no explicit reasoning)
- `mcts_bot.py`: Monte Carlo Tree Search (traditional AI baseline)

**Non-LLM Baselines**:
- `random_bot.py`: Random action selection
- `backtrack.py`: Minimax search with configurable depth and optional state caching

All modern agents use `@dataclass` configs (e.g., `CotConfig`) with:
- Model specification (e.g., "openai/gpt-4.1", "anthropic/claude-sonnet-4.5")
- Hyperparameters (temperature=0.2, max_tokens=500)
- Statistics tracking (total_requests, invalid_responses, total_tokens, response_times)

### LLM Integration
- `prompt_utils.py`: Generates complete prompts for LLM agents
  - `get_action_prompt()`: Main entry point
  - `_get_game_context()`: Game rules and starting deck
  - `_get_game_state()`: Current turn state (mana, health, hand, enemies)
  - `_get_action_request()`: Action selection based on prompt strategy (NONE, CoT, CoT_rev)
- `auth.py`: API key loading from `.env` file
- Uses OpenAI SDK (openai==0.28.0) with OpenRouter for multi-backend support

### Saturn mDNS Integration
Saturn is a local OpenRouter API proxy server that allows routing LLM API calls through a local network server. The system uses mDNS (DNS Service Discovery) for automatic server discovery.

**Key Components:**
- `g3_files/saturn_discovery.py`: mDNS discovery module for finding Saturn servers
  - `get_saturn_server()`: Returns best server URL or None (line 39)
  - `get_all_saturn_servers()`: Returns all discovered servers sorted by priority (line 66)
  - `_run_dns_sd_discovery()`: Uses dns-sd command for service discovery (line 95)
- `saturn_files/openrouter_server.py`: Saturn proxy server implementation
  - Advertises via mDNS as `_saturn._tcp.local` service
  - Proxies requests to OpenRouter API configured in `.env`
  - Endpoint: `/v1/chat/completions` (line 166)

**Agent Integration:**
All modern LLM agents (CoT, RCoT, None) automatically discover and use Saturn at initialization:
1. Call `get_saturn_server()` from `saturn_discovery.py`
2. If server found: use `base_url=f"{saturn_url}/v1"` with dummy API key
3. If not found: fall back to OpenRouter with `OPENROUTER_API_KEY` from `.env`
4. If neither: raise ValueError with setup instructions

**URL Pattern Details:**
- **Discovery returns**: `http://IP:PORT` (base URL only, from mDNS TXT record)
- **Agent configures**: `base_url=f"{saturn_url}/v1"` (OpenAI SDK appends `/chat/completions`)
- **Final request URL**: `http://IP:PORT/v1/chat/completions` (matches Saturn endpoint)
- **Saturn forwards to**: `OPENROUTER_BASE_URL` from `.env` (must include `/chat/completions`)

**Priority Handling:**
- Multiple Saturn servers can exist on network
- Each server advertises a priority value (default: 50, lower = higher preference)
- `get_saturn_server()` returns server with lowest priority value
- Deduplication prefers non-loopback IPs when priority is equal

**Code References:**
- Agent initialization: `cot_agent.py:101-119`, `rcot_agent.py:85-103`, `none_agent.py:86-104`
- Discovery logic: `saturn_discovery.py:39-63`
- Priority selection: `saturn_discovery.py:62` (uses `min()` on priority)
- Deduplication: `saturn_discovery.py:190-207`

### GIGL Card Generation
`GIGL/` directory contains procedural card generation system:
- `generator.py`: Card blueprint creation using grammar rules
- `grammar.py`: Context-free grammar for card generation
- `balancer.py`: Validates cost/effect balance based on configurable metrics
- `validator.py`: Ensures game rule compliance
- `configs/`: JSON configuration files for grammar and balancing
- `generated_cards/`: Pre-generated card outputs

### Evaluation Infrastructure
`evaluation/` provides multi-threaded agent testing:
- `evaluate_bot.py`: Core benchmarking script (uses joblib for parallelization)
  - Supports 40+ bot configurations via `name_to_bot()` factory
  - 6 scenario presets (0=starter-ironclad, 1=batter-stimulate, 2=tolerate, 3=bomb, 4=suffer, 5=gigl-random-deck)
  - Enemy configs: h=HobGoblin, g=Goblin, l=Leech, j=JawWorm
  - Output: `evaluation_results/<name>_<scenario>_enemies_<enemies>_<test_count>_boteval/results.csv`
- `evaluate_card_gen.py`: Tests impact of generated cards on bot performance
- `generate_table_models.py`: Table 1 - model performance comparison (tokens, response time, win rate)
- `generate_table_scenarios.py`: Table 2 - scenario × bot comparison matrix
- `plot_evaluation.py`: Histogram with KDE of player health outcomes

## Agent Configuration Pattern

Modern agents use string identifiers in evaluation scripts:
- CoT variants: `cot-gpt41`, `cot-claude`, `cot-gemini`, `cot-llama-free`, etc.
- RCoT variants: `rcot-gpt41`, `rcot-claude`, `rcot-openrouter-auto`, etc.
- None (minimal) variants: `none-gpt41`, `none-claude`, `none-gemini`, etc.
- Traditional: `mcts`, `mcts-200`, `bt3`, `bt5` (backtrack with depth), `rndm` (random)

Configuration uses OpenRouter API model names:
- OpenAI: `"openai/gpt-4.1"`
- Anthropic: `"anthropic/claude-sonnet-4.5"`
- Google: `"google/gemini-3-pro-preview"`
- Free models: `"meta-llama/llama-3.3-70b-instruct"`, `"qwen/qwen-3-72b-instruct"`, etc.

## I have handled API keys

### Game Flow
```
GameState (character, bot, deck)
  ↓
BattleState (game_state, enemies, verbose_level)
  ↓
battle_state.run() - Main loop:
  └─ Turn Phase:
     ├─ Draw cards into hand
     ├─ Player chooses action via bot.choose_card()
     │  └─ For LLM: generate prompt → call API → parse response
     ├─ Execute card.play() action
     ├─ Clean up player state
     └─ Enemy turns (get_intention + execute)
  ↓
Return: BattleState with final health/win status
```

### Evaluation Output
Results saved to `evaluation_results/` with structure:
```
<test_name>_<scenario>_enemies_<enemies>_<test_count>_boteval/
├── results.csv          # Columns: BotName, PlayerHealth, Win, Scenario
├── execution_times.json # Per-bot timing statistics (if --time flag used)
└── <id>_<bot>.log      # Individual simulation logs (if --log flag used)
```

### Multi-Threading
- Uses `joblib` for parallel evaluation
- Can cause pickle serialization errors if agent code has issues
- Thread count controls parallelization: higher = faster but more memory

### Card Anonymization
Modern agents support `anonymize_cards=True` in config to hide card names from LLM (prevents exploitation of naming conventions).

## Important Files for New Features

- **New agent type**: Create in `g3_files/agents/`, inherit from `base_agent.GGPA`, add to `evaluate_bot.py::name_to_bot()`
- **New card**: Add to `card.py::CardRepo` scenarios or generate via `GIGL/main.py`
- **New enemy**: Add to `agent.py` as Enemy subclass, update `evaluate_bot.py` enemy parser
- **New scenario**: Add to `card.py::CardRepo`, update `evaluate_bot.py` scenario list
- **New evaluation metric**: Modify `evaluation/generate_table_models.py` or `generate_table_scenarios.py`

## Dependencies
```
matplotlib==3.8.0
tqdm==4.66.1
pandas==2.1.0
numpy==1.25.2
openai==0.28.0
joblib==1.3.2
```

Install: `pip install -r requirements.txt`

## Research Context

Published research:
1. "MiniStS: A Testbed for Dynamic Rule Exploration" (AIIDE 2024) - GIGL system
2. "Language-Driven Play: Large Language Models as Game-Playing Agents in Slay the Spire" (FDG 2024) - CoT reasoning strategies

Latest evaluation results in `evaluation_results/premium/` and scenario-specific directories.
