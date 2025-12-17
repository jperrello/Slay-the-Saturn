# MiniStS Language-Driven Play Refactoring Game Plan

## Executive Summary

This document outlines a comprehensive refactoring plan to clean up the MiniStS Language-Driven Play codebase while preserving all working functionality. The goal is to remove obsolete files inherited from the original [iambb5445/MiniSTS](https://github.com/iambb5445/MiniSTS) repository and clearly differentiate this evolved research implementation.

---

## Current State Analysis

### What This Codebase Has Become

Your repository has **significantly evolved** beyond the original MiniSTS:

- **Original MiniSTS**: Basic Slay the Spire simulator with simple agents (backtracking, basic ChatGPT)
- **Your Version**: Advanced research platform with:
  - Chain-of-Thought (CoT) and Reverse Chain-of-Thought (RCoT) reasoning
  - GIGL procedural card generation system
  - Multi-LLM support (OpenAI, Claude, Gemini, OpenRouter)
  - 30+ agent implementations
  - Comprehensive evaluation framework
  - Published research (AIIDE 2024, FDG 2024)

### Core Systems to Preserve

✅ **Keep - These are essential and actively used:**

1. **Core Game Engine**
   - `game.py` - GameState management
   - `battle.py` - Turn-based battle loop
   - `card.py` - Card definitions, CardGen factory, CardRepo
   - `agent.py` - Player, Enemy implementations
   - `status_effecs.py` - Status effects system
   - `value.py` - Value system (upgradable values, constants)
   - `utility.py` - Helper utilities
   - `config.py` - Game configuration enums

2. **Action & Targeting Systems**
   - `action/action.py`
   - `action/agent_targeted_action.py`
   - `action/card_targeted_action.py`
   - `target/agent_target.py`
   - `target/card_target.py`

3. **Modern Agent Framework (g3_files/)**
   - `g3_files/agents/cot_agent.py` - Chain-of-Thought
   - `g3_files/agents/rcot_agent.py` - Reverse Chain-of-Thought
   - `g3_files/agents/none_agent.py` - Minimal prompting
   - `g3_files/agents/mcts_bot.py` - Monte Carlo Tree Search

4. **GIGL Card Generation**
   - `GIGL/generator.py`
   - `GIGL/grammar.py`
   - `GIGL/balancer.py`
   - `GIGL/validator.py`
   - `GIGL/configs/grammar.json`
   - `GIGL/configs/balancing_config.json`
   - `GIGL/generated_cards/` - All 20 generated cards
   - `GIGL/main.py`

5. **Evaluation Infrastructure**
   - `evaluation/evaluate_bot.py` - Bot benchmarking
   - `evaluation/evaluate_card_gen.py` - Card generation testing
   - `evaluation/generate_table_models.py` - Statistics tables
   - `evaluation/generate_table_scenarios.py` - Scenario comparison
   - `evaluation/plot_evaluation.py` - Results visualization
   - `evaluation/plot_property.py` - Property analysis
   - `evaluation/aggregate_metadata.py`

6. **Entry Points**
   - `main.py` - Single game playthrough
   - `run_cot_game.py` - CoT agent testing

7. **Configuration Files**
   - `requirements.txt`
   - `.env` (API keys)
   - `.gitignore`

8. **Documentation**
   - `TESTING.md` - Testing guide (recently updated)
   - `figures/StS.gif` - Game visualization

9. **Recent Evaluation Results** (Latest research data)
   - `evaluation_results/premium/` - Premium LLM comparison
   - `evaluation_results/suite2_starter-ironclad_enemies_h_25_boteval/`
   - `evaluation_results/card_gen_gigl_test_enemies_h_1_CoT-claude/`
   - `evaluation_results/card_gen_gigl_test_enemies_h_1_CoT-gpt41/`

---

## Files to Remove or Archive

### 🗑️ Category 1: Legacy Agent Framework (ggpa/)

**Rationale**: The original agent framework has been superseded by the modern `g3_files/agents/` implementation with better LLM integration.

**Decision Options**:
- **Option A (Recommended)**: Move `ggpa/` to `archive/ggpa/` to preserve history
- **Option B**: Delete entirely (can recover from git history if needed)

**Files**:
```
ggpa/
├── ggpa.py                 # Base GGPA class (if needed, extract to utils)
├── human_input.py          # Keep if still used for manual testing
├── random_bot.py           # Baseline agent - KEEP for comparisons
├── backtrack.py            # Keep if still used in evaluations
├── mcts_bot.py             # Superseded by g3_files/agents/mcts_bot.py
├── chatgpt_bot.py          # Old OpenAI implementation - REMOVE
├── basic_agent.py          # Basic LLM agent - REMOVE
├── none_agent.py           # Superseded by g3_files version
├── prompt.py               # Old prompt engineering - REMOVE
└── prompt2.py              # Enhanced prompts - REMOVE
```

**Specific Actions**:
1. Verify `random_bot.py` is still used in `evaluate_bot.py` → **KEEP**
2. Check if `backtrack.py` is referenced in evaluations → **KEEP or ARCHIVE**
3. Check if `human_input.py` is used for testing → **KEEP or ARCHIVE**
4. Extract base `GGPA` class to `base_agent.py` in root if needed
5. Remove or archive: `chatgpt_bot.py`, `basic_agent.py`, `prompt.py`, `prompt2.py`, `ggpa/mcts_bot.py`, `ggpa/none_agent.py`

---

### 🗑️ Category 2: Obsolete Evaluation Results

**Rationale**: Historical evaluation data from early experiments. Can be archived or deleted to reduce repo size.

**Files to Remove**:
```
evaluation_results/
├── outdated/                           # Explicitly marked as obsolete - DELETE
├── for_pirates/                        # Historical results - ARCHIVE or DELETE
├── prompting_strategies/               # Early experiments - ARCHIVE or DELETE
├── free_models/                        # Old free model tests - EVALUATE and DECIDE
├── all_scenarios/                      # May be outdated - EVALUATE
├── batter_stim/                        # Single scenario test - EVALUATE
├── bomb/                               # Single scenario test - EVALUATE
├── tolerate/                           # Single scenario test - EVALUATE
├── suffer/                             # Single scenario test - EVALUATE
├── generated_scenario/                 # Custom generated tests - EVALUATE
└── _gigl-random-deck_enemies_h_25_boteval/  # Early GIGL test - EVALUATE
```

**Recommended Action**:
1. Create `evaluation_results/archive/` directory
2. Move obviously outdated folders to archive
3. Keep only:
   - `premium/` (latest premium LLM comparison)
   - `suite2_starter-ironclad_enemies_h_25_boteval/` (suite 2 results)
   - `card_gen_gigl_test_enemies_h_1_CoT-claude/` (GIGL evaluation)
   - `card_gen_gigl_test_enemies_h_1_CoT-gpt41/` (GIGL evaluation)

---

### 🗑️ Category 3: Unused Scripts

**Rationale**: Scripts that have been superseded or are no longer actively used.

**Files to Review**:
- `visualize_results.py` - Appears superseded by `evaluation/plot_evaluation.py`
  - Action: Verify not used, then DELETE or move to archive

---

### 🗑️ Category 4: Research Paper

**Rationale**: PDF can be linked in README instead of stored in repo.

**File**:
- `Slay the Spire LLM Paper.pdf`
  - Action: Remove from repo, add link to published paper in README

---

### 🗑️ Category 5: Minimal/Unnecessary Files

**Files**:
- `auth.py` (252 bytes, minimal) - If not used, DELETE
  - Check if `.env` handling is sufficient
  - If unused, remove

---

## Refactoring Steps (Recommended Order)

### Phase 1: Investigation & Verification (Do First)

1. **Verify Agent Usage**
   ```bash
   # Check which agents are actually imported in evaluation scripts
   grep -r "from ggpa" evaluation/
   grep -r "import.*ggpa" evaluation/
   grep -r "from ggpa" *.py
   ```

2. **Check for GGPA Base Class Dependencies**
   ```bash
   # See if g3_files agents inherit from ggpa.GGPA
   grep -r "GGPA" g3_files/
   ```

3. **Verify Script Usage**
   ```bash
   # Check if visualize_results.py is imported anywhere
   grep -r "visualize_results" .
   ```

4. **Check auth.py Usage**
   ```bash
   grep -r "import auth" .
   grep -r "from auth" .
   ```

### Phase 2: Create Archive Structure

```bash
mkdir archive
mkdir archive/ggpa
mkdir archive/evaluation_results
mkdir archive/scripts
```

### Phase 3: Move Legacy Agent Framework

**If agents in g3_files/ depend on ggpa.GGPA:**
1. Extract base class to `base_agent.py` in root
2. Update imports in `g3_files/agents/*.py`

**Then move old implementations:**
```bash
# Keep baseline agents for comparison
# Move obsolete agents to archive
mv ggpa/chatgpt_bot.py archive/ggpa/
mv ggpa/basic_agent.py archive/ggpa/
mv ggpa/prompt.py archive/ggpa/
mv ggpa/prompt2.py archive/ggpa/

# If mcts_bot and none_agent are fully replaced:
mv ggpa/mcts_bot.py archive/ggpa/
mv ggpa/none_agent.py archive/ggpa/
```

**Keep** (if still used):
- `ggpa/random_bot.py` - Baseline for comparisons
- `ggpa/backtrack.py` - If used in evaluations
- `ggpa/human_input.py` - For manual testing

### Phase 4: Clean Evaluation Results

```bash
# Move outdated results
mv evaluation_results/outdated archive/evaluation_results/
mv evaluation_results/for_pirates archive/evaluation_results/
mv evaluation_results/prompting_strategies archive/evaluation_results/

# Evaluate these and move if not needed for recent papers:
# evaluation_results/batter_stim
# evaluation_results/bomb
# evaluation_results/tolerate
# evaluation_results/suffer
# evaluation_results/generated_scenario
# evaluation_results/free_models
```

### Phase 5: Remove Unused Scripts

```bash
# If visualize_results.py is unused:
mv visualize_results.py archive/scripts/

# If auth.py is unused:
rm auth.py  # or move to archive
```

### Phase 6: Remove Research Paper

```bash
# Remove PDF, add link to README instead
rm "Slay the Spire LLM Paper.pdf"
```

### Phase 7: Update README

Create a new README that:
1. Clearly states this is an evolved version of MiniSTS
2. Credits the original: https://github.com/iambb5445/MiniSTS
3. Highlights your contributions:
   - Chain-of-Thought reasoning agents
   - GIGL card generation
   - Multi-LLM support
   - Published research
4. Provides clear setup/usage instructions
5. Links to published papers instead of including PDFs

---

## New Directory Structure (After Refactoring)

```
MiniStS-Language-Driven-Play-Reimagined/
├── Core Game Engine
│   ├── game.py
│   ├── battle.py
│   ├── card.py
│   ├── agent.py
│   ├── status_effecs.py
│   ├── value.py
│   ├── utility.py
│   └── config.py
│
├── Systems
│   ├── action/
│   └── target/
│
├── Modern Agent Framework
│   └── g3_files/
│       └── agents/
│           ├── cot_agent.py
│           ├── rcot_agent.py
│           ├── none_agent.py
│           └── mcts_bot.py
│
├── Baseline Agents (kept for comparison)
│   ├── random_bot.py        # Moved from ggpa/
│   ├── backtrack.py          # Moved from ggpa/ (if still needed)
│   └── human_input.py        # Moved from ggpa/ (if still needed)
│
├── GIGL Card Generation
│   └── GIGL/
│       ├── generator.py
│       ├── grammar.py
│       ├── balancer.py
│       ├── validator.py
│       ├── configs/
│       ├── generated_cards/
│       └── main.py
│
├── Evaluation Infrastructure
│   └── evaluation/
│       ├── evaluate_bot.py
│       ├── evaluate_card_gen.py
│       ├── generate_table_models.py
│       ├── generate_table_scenarios.py
│       ├── plot_evaluation.py
│       ├── plot_property.py
│       └── aggregate_metadata.py
│
├── Evaluation Results (Recent Only)
│   └── evaluation_results/
│       ├── premium/
│       ├── suite2_starter-ironclad_enemies_h_25_boteval/
│       ├── card_gen_gigl_test_enemies_h_1_CoT-claude/
│       └── card_gen_gigl_test_enemies_h_1_CoT-gpt41/
│
├── Entry Points
│   ├── main.py
│   └── run_cot_game.py
│
├── Documentation
│   ├── README.md              # NEW - Updated comprehensive guide
│   ├── TESTING.md
│   └── figures/
│
├── Configuration
│   ├── requirements.txt
│   ├── .env
│   └── .gitignore
│
└── Archive (Historical Code)
    ├── ggpa/                  # Legacy agent framework
    ├── evaluation_results/    # Old test results
    └── scripts/               # Deprecated scripts
```

---

## README Update Plan

### Sections to Include:

1. **Title & Description**
   - Clearly state: "MiniStS Language-Driven Play Reimagined"
   - Subtitle: "Advanced LLM Agent Testbed for Slay the Spire"

2. **Attribution**
   ```markdown
   This project builds upon the original [MiniSTS](https://github.com/iambb5445/MiniSTS)
   implementation by iambb5445, extending it with advanced LLM reasoning capabilities
   and procedural card generation.
   ```

3. **Key Features** (Your Contributions)
   - Chain-of-Thought (CoT) and Reverse Chain-of-Thought (RCoT) reasoning
   - GIGL procedural card generation system
   - Multi-LLM support (OpenAI, Claude, Gemini, OpenRouter)
   - 30+ agent implementations with comprehensive evaluation framework
   - Published research at AIIDE 2024 and FDG 2024

4. **Installation & Setup**
   ```bash
   pip install -r requirements.txt
   cp .env.example .env  # Add your API keys
   ```

5. **Quick Start**
   - Running a single game: `python main.py`
   - Testing agents: `python evaluation/evaluate_bot.py`
   - Generating cards: `python GIGL/main.py`

6. **Agent Types**
   - Table showing: Agent name, Description, Model used, Use case

7. **Evaluation Framework**
   - How to run evaluations
   - Understanding results
   - Available scenarios

8. **GIGL Card Generation**
   - Brief overview of grammar-based generation
   - How to generate new cards
   - Validation and balancing

9. **Published Research**
   - Links to papers (not PDFs in repo):
     - "MiniStS: A Testbed for Dynamic Rule Exploration" (AIIDE 2024)
     - "Language-Driven Play: Large Language Models as Game-Playing Agents" (FDG 2024)

10. **Architecture Overview**
    - Brief diagram or explanation of core systems
    - How components interact

11. **Testing**
    - Link to TESTING.md
    - Quick examples

12. **Contributing**
    - If accepting contributions, guidelines
    - Code style, PR process

13. **License**
    - Specify license (check if original has one)

14. **Citation**
    - BibTeX for published papers

---

## Testing Plan (Before Finalizing Refactor)

Before committing to the refactor, verify everything still works:

### 1. Test Core Game Engine
```bash
python main.py
# Should run a single game successfully
```

### 2. Test Modern Agents
```bash
python run_cot_game.py
# Should run CoT agent across scenarios
```

### 3. Test Evaluation Framework
```bash
python evaluation/evaluate_bot.py 5 2 0 h rcot-gpt41 random
# Should run 5 games, 2 threads, scenario 0, HobGoblin enemy
```

### 4. Test GIGL Generation
```bash
python GIGL/main.py
# Should generate new cards
```

### 5. Test Baseline Agents (If Kept)
```bash
# Test that random_bot, backtrack, etc. still work
python evaluation/evaluate_bot.py 3 1 0 h random backtrack
```

### 6. Verify Imports
```bash
# After moving files, ensure no broken imports
python -m py_compile *.py
python -m py_compile g3_files/agents/*.py
python -m py_compile evaluation/*.py
```

---

## Git Strategy

### Option A: Preserve History (Recommended)
```bash
# Create archive branch first
git checkout -b archive-before-refactor
git push origin archive-before-refactor

# Return to main and refactor
git checkout main
# ... perform refactoring ...
git add .
git commit -m "Refactor: Remove legacy code, archive old implementations"
```

### Option B: Clean Slate
```bash
# Move files to archive/
# git add archive/
# git rm -r ggpa/ (parts of)
# git rm -r evaluation_results/outdated
# etc.
```

### Recommended Commits:
1. "Archive legacy GGPA agent framework"
2. "Archive outdated evaluation results"
3. "Remove unused scripts and files"
4. "Update README for language-driven play version"
5. "Reorganize codebase structure"

---

## Risk Mitigation

1. **Backup Before Starting**
   ```bash
   # Create full backup
   cp -r . ../MiniStS-backup-$(date +%Y%m%d)
   ```

2. **Test After Each Phase**
   - Run test suite after moving each category
   - Verify imports aren't broken

3. **Keep Archive Accessible**
   - Don't delete immediately
   - Use `archive/` directory first
   - Can delete later after verification period

4. **Document Changes**
   - Add `CHANGELOG.md` noting what was removed
   - Update README with clear migration notes if others use this repo

---

## Timeline Estimate

- **Phase 1 (Investigation)**: Review all dependencies and usage
- **Phase 2 (Archive Setup)**: Create directory structure
- **Phase 3-6 (File Movement)**: Move files to archive, test after each
- **Phase 7 (README Update)**: Write comprehensive new README
- **Testing**: Full test suite run
- **Final Commit**: Git commit with clear message

---

## Success Criteria

✅ **Refactoring is complete when:**

1. All tests pass (single game, evaluation framework, GIGL generation)
2. No broken imports or missing dependencies
3. Codebase is organized with clear separation of concerns
4. README clearly explains what this project is and how it differs from original
5. Only actively used evaluation results remain
6. Archive directory contains historical code for reference
7. Git history is preserved
8. Repository size is reduced (optional: measure before/after)

---

## Future Considerations

After refactoring is complete:

1. **Consider Adding**:
   - CI/CD pipeline for automated testing
   - Docker containerization for reproducible environments
   - Pre-commit hooks for code quality
   - Type hints throughout codebase
   - Comprehensive docstrings

2. **Possible Enhancements**:
   - Web UI for game visualization
   - Real-time battle viewer
   - Interactive card builder
   - LLM agent comparison dashboard

3. **Documentation**:
   - Add architecture diagrams
   - Create developer guide
   - Write agent development tutorial
   - Document GIGL grammar system in detail

---

## Questions to Answer Before Proceeding

1. **Are baseline agents (random, backtrack) still used for comparisons?**
   - If yes → Keep in root or dedicated `baseline_agents/` directory
   - If no → Archive

2. **Do g3_files agents inherit from ggpa.GGPA?**
   - If yes → Extract base class to `base_agent.py`
   - If no → Can fully archive ggpa/ (except baselines)

3. **Which evaluation results are needed for current/future papers?**
   - Keep those in `evaluation_results/`
   - Archive the rest

4. **Is human_input.py used for manual testing?**
   - If yes → Keep (move to root)
   - If no → Archive

5. **Does auth.py provide functionality not in .env?**
   - If yes → Keep
   - If no → Delete

6. **Do you plan to publish code alongside papers?**
   - If yes → Prioritize clean, well-documented structure
   - Add citation information to README

---

## Conclusion

This refactoring will transform your repository from a mixed legacy/modern codebase into a clean, well-organized research platform that clearly showcases your contributions. The key is to:

1. **Preserve** all working functionality
2. **Archive** (don't delete) historical code
3. **Document** changes clearly
4. **Test** thoroughly after each phase
5. **Update** README to reflect current state

The result will be a professional, maintainable codebase that properly credits the original work while highlighting your significant extensions and research contributions.
