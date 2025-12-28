# MiniStS Language-Driven Play Reimagined

## AI Disclaimer
Hello, I am Joey and this is a personal playground for me to gain experience using Claude Code. It is an expansion of an old project, as you will soon read, and it is written by Claude Code. It is *AI generated*, and I understand if you would not like to interact with it. I want to offer full transparency. I am still heavily involved in the development, I just use agentic methods.


## Advanced LLM Agent Research Platform for Slay the Spire

This repository extends the original [MiniSTS](https://github.com/iambb5445/MiniSTS) framework by **iambb5445** with advanced language-driven play capabilities, chain-of-thought reasoning, and procedural card generation systems for LLM agent research.

---

## 🎯 Overview

**MiniStS Language-Driven Play Reimagined** is a research testbed for evaluating Large Language Model (LLM) agents in strategic card game environments. While the core game engine is built upon the original MiniSTS framework, this repository introduces novel reasoning architectures and card generation systems that push the boundaries of AI-driven gameplay.

### Attribution

**Core Game Engine**: The foundational game mechanics, battle system, and basic agent framework were created by **iambb5445** in the original [MiniSTS](https://github.com/iambb5445/MiniSTS) repository. We are grateful for this excellent foundation that made our research possible. The original implementation includes:
- Complete Slay the Spire battle simulation
- Card definition system with actions, targets, and status effects
- Base agent framework (GGPA)
- Backtracking search and random baseline agents
- Initial LLM agent integration

**Research Extensions**: This repository significantly extends the original framework with:
- **Chain-of-Thought (CoT) and Reverse Chain-of-Thought (RCoT) reasoning agents**
- **GIGL (Grammar-based Intelligent card Generation Language) procedural card generation system**
- **Multi-LLM support** (OpenAI, Claude, Gemini, OpenRouter)
- **Comprehensive evaluation framework** with 30+ agent configurations
- **Advanced prompting strategies** and agent comparison infrastructure
- **Modern codebase organization** with improved maintainability

---

## ✨ Key Features

### 🧠 Advanced Reasoning Agents

**Chain-of-Thought (CoT) Agent**
- Reasons about game state before making decisions
- Generates natural language explanations of strategy
- Supports multiple LLM backends (GPT-4.1, Claude Sonnet 4.5, Gemini 3 Pro)
- Demonstrates superior performance compared to minimal prompting

**Reverse Chain-of-Thought (RCoT) Agent**
- Outputs decision first, then provides reasoning
- Optimized for faster inference while maintaining strategic depth
- Useful for time-constrained scenarios

**Minimal Prompting Agent**
- Baseline LLM agent with no explicit reasoning requirement
- Useful for ablation studies on prompting strategies
- Supports same multi-LLM backend as CoT agents

### 🎴 GIGL Card Generation System

Our **Grammar-based Intelligent card Generation Language (GIGL)** enables:
- Procedurally generated cards using context-free grammar
- Automatic balancing based on configurable cost/power metrics
- Validation against game rules and mechanics
- 20+ pre-generated balanced cards for testing

**Key Components:**
- `GIGL/grammar.py` - Grammar rules and card generation logic
- `GIGL/balancer.py` - Automatic cost/effect balancing
- `GIGL/validator.py` - Game rule compliance checking
- `GIGL/configs/` - Configurable grammar and balancing parameters

### 🔬 Evaluation Infrastructure

Comprehensive tools for agent performance analysis:
- **Bot Evaluation** (`evaluation/evaluate_bot.py`) - Multi-threaded agent testing
- **Card Generation Testing** (`evaluation/evaluate_card_gen.py`) - GIGL card performance
- **Statistical Analysis** (`evaluation/generate_table_models.py`) - Cross-model comparison
- **Visualization** (`evaluation/plot_evaluation.py`) - Results plotting and histograms

### 🤖 Multi-LLM Support

Unified interface for:
- **OpenAI**: GPT-4.1, GPT-3.5-Turbo
- **Anthropic**: Claude Sonnet 4.5
- **Google**: Gemini 3 Pro Preview
- **OpenRouter**: Access to 100+ models including free tiers
- **Free Models**: Meta Llama 3.3, Qwen 3, Nemotron, DeepSeek

---

## 🚀 Installation & Setup

### Prerequisites

- Python 3.8+
- API keys for your chosen LLM provider(s)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/MiniStS-Language-Driven-Play-Reimagined.git
cd MiniStS-Language-Driven-Play-Reimagined

# Install dependencies
pip install -r requirements.txt

# Configure API keys
# Create .env file and add your API keys:
# OPENAI_API_KEY=your_openai_key_here
# OPENROUTER_API_KEY=your_openrouter_key_here
```

---

## 📖 Quick Start

### Running a Single Game

```bash
# Play manually with human input
python main.py

# Run a single game with a CoT agent
python run_cot_game.py
```

### Evaluating Agents

```bash
# Run 10 games with RCoT-GPT-4.1 agent against HobGoblin enemy
# 2 parallel threads, scenario 0
python evaluation/evaluate_bot.py 10 2 0 h rcot-gpt41 random

# Compare multiple agents
python evaluation/evaluate_bot.py 20 4 0 h cot-claude rcot-gpt41 none-gemini random
```

### Generating Cards with GIGL

```bash
# Generate new procedural cards
python GIGL/main.py

# Generated cards are saved to GIGL/generated_cards/
```

---

## 🎮 Agent Types

| Agent | Description | Model | Use Case |
|-------|-------------|-------|----------|
| `cot-gpt41` | Chain-of-Thought with GPT-4.1 | OpenAI GPT-4.1 | Strategic gameplay with reasoning |
| `rcot-claude` | Reverse CoT with Claude | Claude Sonnet 4.5 | Fast strategic decisions |
| `none-gemini` | Minimal prompting | Gemini 3 Pro | Baseline LLM performance |
| `mcts` | Monte Carlo Tree Search | N/A | Traditional AI baseline |
| `backtrack` | Backtracking search | N/A | Deterministic baseline |
| `random` | Random action selection | N/A | Lower bound baseline |

---

## 🏗️ Project Structure

```
MiniStS-Language-Driven-Play-Reimagined/
│
├── Core Game Engine (from original MiniSTS)
│   ├── game.py                 # GameState management
│   ├── battle.py               # Turn-based battle loop
│   ├── card.py                 # Card definitions and factory
│   ├── agent.py                # Player and enemy implementations
│   ├── status_effecs.py        # Status effects system
│   ├── value.py                # Upgradable value system
│   └── config.py               # Game configuration
│
├── Base Agent Framework
│   ├── base_agent.py           # GGPA base class (extracted from original)
│   ├── prompt_utils.py         # Prompt generation utilities
│   ├── random_bot.py           # Random baseline agent
│   ├── backtrack.py            # Backtracking search agent
│   └── human_input.py          # Manual testing interface
│
├── Modern LLM Agents (Research Contribution)
│   └── g3_files/agents/
│       ├── cot_agent.py        # Chain-of-Thought agent
│       ├── rcot_agent.py       # Reverse Chain-of-Thought agent
│       ├── none_agent.py       # Minimal prompting agent
│       └── mcts_bot.py         # Monte Carlo Tree Search
│
├── GIGL Card Generation (Research Contribution)
│   └── GIGL/
│       ├── generator.py        # Card generation engine
│       ├── grammar.py          # Grammar rules
│       ├── balancer.py         # Cost/effect balancing
│       ├── validator.py        # Rule validation
│       ├── configs/            # Configuration files
│       └── generated_cards/    # Output directory
│
├── Evaluation Infrastructure (Research Contribution)
│   └── evaluation/
│       ├── evaluate_bot.py              # Agent benchmarking
│       ├── evaluate_card_gen.py         # Card testing
│       ├── generate_table_models.py     # Statistical tables
│       ├── generate_table_scenarios.py  # Scenario comparison
│       ├── plot_evaluation.py           # Results visualization
│       └── plot_property.py             # Property analysis
│
├── Evaluation Results (Latest)
│   └── evaluation_results/
│       ├── premium/                     # Premium LLM comparison
│       ├── suite2_starter-ironclad_enemies_h_25_boteval/
│       ├── card_gen_gigl_test_enemies_h_1_CoT-claude/
│       ├── card_gen_gigl_test_enemies_h_1_CoT-gpt41/
│       ├── batter_stim/                 # Scenario tests
│       ├── bomb/
│       ├── tolerate/
│       ├── suffer/
│       └── generated_scenario/
│
├── Legacy Agents (from original MiniSTS)
│   └── ggpa/
│       ├── chatgpt_bot.py       # Original GPT integration
│       └── basic_agent.py       # Basic LLM agent
│
├── Entry Points
│   ├── main.py                  # Single game runner
│   └── run_cot_game.py          # CoT agent testing
│
├── Configuration
│   ├── requirements.txt
│   ├── .env                     # API keys (not in repo)
│   ├── .gitignore
│   └── auth.py                  # API key loading
│
├── Documentation
│   ├── README.md                # This file
│   ├── TESTING.md               # Testing guide
│   ├── game_plan.md             # Refactoring documentation
│   └── figures/
│
└── Archive (Historical Code)
    ├── ggpa/                    # Original agent framework
    ├── evaluation_results/      # Old test results
    └── scripts/                 # Deprecated scripts
```

---

## 📊 Evaluation Results

Our research has evaluated:
- **30+ agent configurations** across multiple LLMs
- **Premium models**: GPT-4.1, Claude Sonnet 4.5, Gemini 3 Pro
- **Free models**: Llama 3.3, Qwen 3, Nemotron, DeepSeek
- **Multiple scenarios**: 6+ enemy configurations and generated scenarios

Latest results available in `evaluation_results/premium/` and scenario-specific directories.

---

## 🔬 Research Contributions

This repository has contributed to the following publications:

### Published Research

1. **"MiniStS: A Testbed for Dynamic Rule Exploration"** (AIIDE 2024)
   - Introduced GIGL procedural card generation system
   - Evaluated LLM agents on procedurally generated content
   - Authors: Bahar Bateni and Jim Whitehead

2. **"Language-Driven Play: Large Language Models as Game-Playing Agents in Slay the Spire"** (FDG 2024)
   - Compared Chain-of-Thought reasoning strategies
   - Analyzed cross-model performance on strategic decision-making
   - Authors: Bahar Bateni and Jim Whitehead

---

## 🧪 Testing

See [TESTING.md](TESTING.md) for detailed testing instructions.

### Quick Test

```bash
# Verify core game engine
python main.py

# Test CoT agent
python run_cot_game.py

# Run small evaluation
python evaluation/evaluate_bot.py 5 1 0 h cot-gpt41 random
```

---

## 🤝 Contributing

While this is primarily a research repository, contributions are welcome:

1. **Bug Fixes**: Submit PRs for any bugs you find
2. **New Agents**: Implement novel agent architectures
3. **Evaluation Scenarios**: Add interesting test scenarios
4. **Documentation**: Improve setup guides and usage examples

Please ensure all PRs:
- Include proper attribution for any original MiniSTS code
- Follow existing code style and structure
- Include tests where applicable

---

## 📜 License

This project builds upon the original [MiniSTS](https://github.com/iambb5445/MiniSTS) framework. Please refer to the original repository for its license.

Research extensions and additions are provided for academic and research purposes.

---

## 🙏 Acknowledgments

- **iambb5445** - Creator of the original [MiniSTS](https://github.com/iambb5445/MiniSTS) framework that forms the foundation of this research
- The Slay the Spire community for inspiration and game design
- OpenAI, Anthropic, and Google for LLM API access
- Academic institutions supporting this research

---

## 📬 Contact

For questions about this research implementation:
- Open an issue on GitHub
- See published papers for academic contact information

For questions about the original MiniSTS framework:
- Visit the [original repository](https://github.com/iambb5445/MiniSTS)

---

## 🔗 Related Work

- [Original MiniSTS](https://github.com/iambb5445/MiniSTS) - Foundation framework
- [Slay the Spire](https://www.megacrit.com/) - Original game inspiration

---

**This repository represents a significant evolution of the MiniSTS framework, transforming it from a basic card game simulator into a comprehensive research platform for language-driven gameplay and procedural content generation. We stand on the shoulders of giants, building upon iambb5445's excellent foundation to explore new frontiers in AI-driven strategic decision-making.**
