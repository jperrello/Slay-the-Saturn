# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started. We also use MCP servers and agents, utilize the installed ones to their fullest capabilities. Example: serena for reading, code-analyzer for understanding code flow.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session (user says "land the plane")**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Linus Tests** Review your code as Linus Torvalds would.
4. **Update issue status** - Close finished work, update in-progress items
5. **PUSH TO REMOTE** - work methodically to ensure both local and remote
issues merge safely. This may require pulling, handling conflicts (sometimes accepting remote
changes and re-importing), syncing the database, and verifying consistency. Be creative and
patient - the goal is clean reconciliation where no issues are lost. Basic example:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
6. **Clean up** - Clear stashes, prune remote branches
7. **Verify** - All changes committed AND pushed
8. **Choose a follow-up issue for next session**
- Provide a prompt for the user to give to you in the next session
- Format: "Continue work on bd-X: [issue title]. [Brief context about what's been done and
what's next]"

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER STOP before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds


## Important:
- **NEVER add co-author information or Claude attribution**
- Commits should be authored solely by the user
- Do not include any "Generated with Claude" messages
- Do not add "Co-Authored-By" lines
- Write commit messages as if the user wrote them
- **ALWAYS use conventional commit format for automated versioning**
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

REMEMBER TO ALWAYS PUSH