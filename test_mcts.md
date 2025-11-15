# MCTS Agent Testing Guide

This document provides a comprehensive guide to testing the Monte Carlo Tree Search (MCTS) agent implementation for MiniStS (Slay the Spire).

## Table of Contents

1. [Quick Start](#quick-start)
2. [Testing Methods](#testing-methods)
3. [Test Scenarios](#test-scenarios)
4. [Parameter Tuning](#parameter-tuning)
5. [Performance Benchmarking](#performance-benchmarking)
6. [Debugging and Analysis](#debugging-and-analysis)
7. [Integration Testing](#integration-testing)
8. [Automated Testing](#automated-testing)

---

## Quick Start

### Single Game Test

Test the MCTS agent on the starter scenario with default parameters:

```bash
python main_mcts.py -s starter -n 50 -g 1 -v
```

### Quick Validation Test

Run the automated test suite across all scenarios:

```bash
bash test_mcts.sh
```

---

## Testing Methods

### 1. Interactive Single Game Testing

**Purpose**: Manual verification and debugging of agent behavior

**Command**:
```bash
python main_mcts.py -s <scenario> -n <iterations> -g 1 -v
```

**Parameters**:
- `-s, --scenario`: Scenario name (starter, basic, scaling, vigor, lowhp, bomb)
- `-n, --iterations`: MCTS iterations per turn (default: 50)
- `-p, --parameter`: UCB-1 exploration constant (default: 0.5)
- `-v, --verbose`: Enable detailed logging
- `-g, --games`: Number of games (use 1 for single game)

**Example**:
```bash
# Test on starter scenario with 100 iterations and verbose output
python main_mcts.py -s starter -n 100 -p 0.5 -g 1 -v
```

**What to Look For**:
- Does the agent make sensible decisions?
- Are defensive plays prioritized when health is low?
- Does the agent use multi-target attacks when facing multiple enemies?
- Check the MCTS tree structure at the end (printed when -v is used)

---

### 2. Multiple Game Statistical Testing

**Purpose**: Measure win rate and consistency across multiple runs

**Command**:
```bash
python main_mcts.py -s <scenario> -n <iterations> -g <num_games>
```

**Example**:
```bash
# Run 50 games on the starter scenario
python main_mcts.py -s starter -n 50 -g 50
```

**Output Metrics**:
- **Win Rate**: Percentage of games won
- **Average Score**: Damage dealt ratio (0.0 to 1.0)
- **Average Turns**: Number of turns per game
- **Average Time**: Time taken per game
- **Total Time**: Total execution time

**Expected Win Rates** (with n=50):
| Scenario | Expected Win Rate | Description |
|----------|------------------|-------------|
| starter  | 85-95%          | Standard Iron Clad starter deck |
| basic    | 75-90%          | Basic deck with AOE cards |
| scaling  | 65-80%          | Scaling-focused deck |
| vigor    | 60-75%          | Vigor mechanics deck |
| lowhp    | 40-60%          | Low HP challenge |
| bomb     | 55-70%          | Bomb strategy deck |

---

### 3. Parameter Sweep Testing

**Purpose**: Find optimal exploration parameter (c) for different scenarios

**Method**: Test different values of the UCB-1 exploration constant

**Test Script**:
```bash
# Test different exploration parameters
for c in 0.1 0.5 1.0 1.41 2.0; do
    echo "Testing c=$c"
    python main_mcts.py -s starter -n 50 -p $c -g 20
done
```

**Parameters to Test**:
- `c = 0.1`: Heavy exploitation (greedy)
- `c = 0.5`: Moderate exploitation (default)
- `c = 1.0`: Balanced
- `c = 1.41`: Balanced (√2, theoretical optimal for some domains)
- `c = 2.0`: High exploration

**What to Measure**:
- Win rate vs. exploration parameter
- Average score vs. exploration parameter
- Time per decision vs. exploration parameter

**Expected Behavior**:
- Lower c: Faster decisions, may get stuck in local optima
- Higher c: More exploration, better long-term strategy, slower decisions
- Optimal c varies by scenario (typically 0.5-1.41)

---

### 4. Iteration Count Testing

**Purpose**: Determine minimum iterations needed for good performance

**Method**: Test different iteration counts

**Test Script**:
```bash
# Test different iteration counts
for n in 10 20 50 100 200 500; do
    echo "Testing n=$n iterations"
    python main_mcts.py -s starter -n $n -g 20
done
```

**Expected Behavior**:
- **n < 10**: Very poor performance, mostly random
- **n = 10-20**: Reasonable decisions, some tactical mistakes
- **n = 50-100**: Good performance on most scenarios
- **n = 100-200**: Excellent performance, diminishing returns
- **n > 200**: Marginal improvements, significant time cost

**Trade-off Analysis**:
| Iterations | Win Rate (starter) | Avg Time/Turn | Quality |
|-----------|-------------------|---------------|---------|
| 10        | ~60-70%          | ~0.2s         | Poor    |
| 20        | ~75-85%          | ~0.4s         | Fair    |
| 50        | ~85-95%          | ~1.0s         | Good    |
| 100       | ~90-98%          | ~2.0s         | Very Good |
| 200       | ~92-99%          | ~4.0s         | Excellent |

---

### 5. Comparative Bot Testing

**Purpose**: Compare MCTS agent against other agents

**Using evaluation/evaluate_bot.py**:

```bash
# Compare MCTS against random and backtracking bots
python evaluation/evaluate_bot.py 50 10 0 j r bt3 bt4
```

**To Add MCTS to evaluate_bot.py**:

Add this code to the `name_to_bot` function in `evaluation/evaluate_bot.py`:

```python
# After line 31
if len(name) > 4 and name[0:4] == 'mcts':
    # Format: mcts-{iterations}-{parameter}
    # Example: mcts-50-0.5 or mcts-100-1.41
    if len(name.split('-')) >= 3:
        _, iterations, param = name.split('-')[:3]
        from ggpa.mcts_bot import MCTSAgent
        return MCTSAgent(int(iterations), float(param))
    else:
        from ggpa.mcts_bot import MCTSAgent
        return MCTSAgent(50, 0.5)  # defaults
```

**Then run**:
```bash
# Compare MCTS with different bots
python evaluation/evaluate_bot.py 50 10 0 j r bt3 bt4 mcts-50-0.5 mcts-100-1.0
```

**Baseline Comparisons**:
- **Random Bot (r)**: Should win ~5-15% on starter scenario
- **Backtrack Depth 3 (bt3)**: Should win ~70-85% on starter scenario
- **Backtrack Depth 4 (bt4)**: Should win ~80-95% on starter scenario
- **MCTS (n=50, c=0.5)**: Should win ~85-95% on starter scenario
- **MCTS (n=100, c=1.0)**: Should win ~90-98% on starter scenario

---

### 6. Scenario-Specific Testing

**Purpose**: Validate agent behavior on different deck archetypes

#### Starter Scenario
```bash
python main_mcts.py -s starter -n 50 -g 20
```
- **Deck**: 5x Strike, 4x Defend, 1x Bash
- **HP**: 20
- **Strategy**: Balanced offense/defense
- **Expected**: 85-95% win rate

#### Basic Scenario (AOE Testing)
```bash
python main_mcts.py -s basic -n 50 -g 20
```
- **Deck**: Includes Cleave cards for multi-target damage
- **HP**: 18
- **Strategy**: Test multi-target action selection
- **Expected**: 75-90% win rate

#### Scaling Scenario
```bash
python main_mcts.py -s scaling -n 75 -p 1.0 -g 20
```
- **Deck**: Searing Blow (upgradable), Armaments (upgrade mechanic)
- **HP**: 16
- **Strategy**: Long-term planning, upgrade synergies
- **Expected**: 65-80% win rate
- **Note**: Requires higher exploration (c=1.0) for upgrade timing

#### Vigor Scenario
```bash
python main_mcts.py -s vigor -n 75 -p 1.0 -g 20
```
- **Deck**: Stimulate, Batter (Vigor mechanic cards)
- **HP**: 15
- **Strategy**: Vigor buff timing (double next attack damage)
- **Expected**: 60-75% win rate
- **Challenge**: Requires planning 1-2 turns ahead

#### Low HP Scenario
```bash
python main_mcts.py -s lowhp -n 100 -p 1.41 -g 20
```
- **Deck**: Heavy defense with Impervious
- **HP**: 8
- **Strategy**: Critical defense prioritization
- **Expected**: 40-60% win rate
- **Challenge**: Every mistake can be fatal
- **Note**: Needs high exploration and more iterations

#### Bomb Scenario
```bash
python main_mcts.py -s bomb -n 75 -p 1.0 -g 20
```
- **Deck**: Bomb card (delayed damage mechanic)
- **HP**: 14
- **Strategy**: Timing bomb placement and surviving
- **Expected**: 55-70% win rate
- **Challenge**: Multi-turn planning for bomb detonation

---

### 7. Stress Testing

**Purpose**: Test performance under extreme conditions

#### High Iteration Test
```bash
# Test with very high iteration count
python main_mcts.py -s starter -n 1000 -g 5 -v
```
- Measure: Time per turn, memory usage
- Expected: Should still complete, 5-10s per turn

#### Low Resource Test
```bash
# Test with minimal iterations
python main_mcts.py -s lowhp -n 5 -g 10
```
- Measure: How poorly does it perform with minimal computation?
- Expected: <30% win rate, but should not crash

#### Multiple Scenario Marathon
```bash
# Test all scenarios sequentially
for scenario in starter basic scaling vigor lowhp bomb; do
    echo "Testing $scenario"
    python main_mcts.py -s $scenario -n 50 -g 10
done
```

---

## Debugging and Analysis

### 1. Tree Visualization

**Enable tree printing** (only works for single games with -v flag):

```bash
python main_mcts.py -s starter -n 50 -g 1 -v
```

**Output Format**:
```
EndAgentTurn 0.85 (visits: 120)
  PlayCard(0) 0.92 (visits: 380)
    PlayCard(1) 0.88 (visits: 150)
    EndAgentTurn 0.94 (visits: 230)
  PlayCard(1) 0.78 (visits: 200)
```

**Interpretation**:
- **Action Name**: What action leads to this node
- **Score**: Average score from this node (0.0 to 1.0)
- **Visits**: Number of times this node was explored
- **Indentation**: Shows tree depth (parent-child relationships)

**What to Check**:
1. **High visit count** = agent considered this action important
2. **High score** = action led to good outcomes during simulation
3. **Best action** = highest visit count (exploitation) or highest score
4. **Exploration spread** = are visits distributed or concentrated?

---

### 2. Verbose Battle Logging

**Enable detailed logging**:
```bash
python main_mcts.py -s starter -n 50 -g 1 -v
```

**Shows**:
- Each card played
- Damage dealt/taken
- Block applied
- Status effects applied
- Enemy intentions
- Turn-by-turn health tracking

**Use Cases**:
- Verify agent is playing legal actions
- Check if defensive decisions make sense
- Identify tactical mistakes
- Understand why games are won/lost

---

### 3. Custom Test Scenarios

**Create your own test scenarios** in `main_mcts.py`:

```python
# Add to get_scenario_deck function
'custom': (
    [
        CardGen.Strike(), CardGen.Strike(),
        CardGen.Defend(), CardGen.Defend(), CardGen.Defend(),
        # Add your custom cards here
        CardGen.Bash(),
        CardGen.Whirlwind(),
    ],
    25  # Starting HP
)
```

Then test:
```bash
python main_mcts.py -s custom -n 50 -g 20 -v
```

---

### 4. State Evaluation Testing

**Verify the evaluation function** (`_evaluate_state` in mcts_bot.py:313):

The evaluation function uses:
- **Win**: 0.8 to 1.0 (based on remaining health)
- **Loss**: 0.0 to 0.3 (based on damage dealt)
- **Ongoing**: Weighted combination of damage dealt and health ratio

**Test if evaluation is working**:
1. Run with verbose logging
2. Check if agent prioritizes health when low
3. Check if agent values damage dealt to enemies
4. Verify winning states score highest

**Manual Evaluation Test**:
```bash
# Low HP scenario should show defensive bias
python main_mcts.py -s lowhp -n 100 -g 1 -v | grep -i "defend\|block"
```

---

### 5. Random Seed Testing

**Test determinism** (not currently implemented, but can be added):

If you want reproducible results, add random seed control:

```python
# At top of main_mcts.py
import random
random.seed(42)
```

Then:
```bash
# Should give same results every time
python main_mcts.py -s starter -n 50 -g 1
```

---

## Performance Benchmarking

### Time Complexity Benchmarking

**Measure time vs iterations**:

```bash
# Benchmark script
echo "Iterations,Time/Turn,Win Rate" > benchmark.csv
for n in 10 20 50 100 200 500; do
    result=$(python main_mcts.py -s starter -n $n -g 10)
    # Parse and append to CSV
done
```

**Expected Time Complexity**:
- Time per turn ≈ O(iterations × actions × depth)
- Average: ~0.02s per iteration on modern hardware
- 50 iterations: ~1s per turn
- 100 iterations: ~2s per turn

---

### Memory Profiling

**Check memory usage** (requires memory_profiler):

```python
# Add to mcts_bot.py
from memory_profiler import profile

@profile
def step(self, state: BattleState) -> None:
    # ... existing code ...
```

Run:
```bash
python -m memory_profiler main_mcts.py -s starter -n 50 -g 1
```

**Expected Memory**:
- Tree nodes: ~100-500 per turn (depends on branching factor)
- Each node: ~200 bytes
- Total: ~20-100 KB per turn (very lightweight)

---

### Scalability Testing

**Test with different tree sizes**:

```bash
# Small tree (low branching)
python main_mcts.py -s scaling -n 100 -g 10  # Fewer cards in hand

# Large tree (high branching)
python main_mcts.py -s basic -n 100 -g 10    # More cards in hand
```

**Factors affecting tree size**:
1. **Hand size**: More cards = more actions = larger tree
2. **Playable cards**: Mana limits which cards can be played
3. **Iterations**: More iterations = deeper/wider tree

---

## Integration Testing

### 1. Test with Existing Evaluation Framework

**Run MCTS in the standard evaluation pipeline**:

```bash
# After modifying evaluate_bot.py to support MCTS
cd evaluation
python evaluate_bot.py 50 10 0 j mcts-50-0.5 --log
```

**Benefits**:
- Standardized comparison with other bots
- Consistent test scenarios
- Automated logging and metrics collection

---

### 2. Test Against Different Enemies

**Modify main_mcts.py to use different enemies**:

```python
# In run_game function, change line 142-143:
# from:
battle_state = BattleState(game_state, JawWorm(game_state), ...)

# to test different enemies:
from agent import Goblin, HobGoblin, Leech

battle_state = BattleState(game_state, HobGoblin(game_state), ...)
# or multiple enemies:
battle_state = BattleState(game_state, Goblin(game_state), Goblin(game_state), ...)
```

**Enemy Difficulty** (approximate):
1. **Goblin**: Easy (low HP, weak attacks)
2. **Leech**: Easy-Medium (healing mechanic)
3. **JawWorm**: Medium (balanced)
4. **HobGoblin**: Hard (high damage)
5. **Multiple enemies**: Very Hard (action economy challenge)

---

### 3. Cross-Validation Testing

**Test on unseen scenarios**:

1. Create new scenario in CardRepo
2. Test MCTS without parameter tuning
3. Measure performance

**Purpose**: Ensure agent generalizes, not just overfitting to test scenarios

---

## Automated Testing

### Using the Test Shell Script

**Run the complete test suite**:

```bash
bash test_mcts.sh
```

**What it tests**:
1. Starter scenario (expected 90-100% win rate)
2. Basic scenario (expected 80-100% win rate)
3. Scaling scenario (expected 70-90% win rate)
4. Vigor scenario (expected 60-80% win rate)
5. Low HP scenario (expected 50-70% win rate)
6. Bomb scenario (expected 60-80% win rate)

**Duration**: ~5-10 minutes for full suite

**Expected Output**:
```
Test 1: Starter Scenario (n=20, games=10)
Expected: 9-10 wins (90-100%)
----------------------------------------
Wins: 9 (90.0%)
...
```

---

### Creating Custom Test Scripts

**Example: Regression Test**

Create `regression_test.sh`:

```bash
#!/bin/bash
# Regression test - ensure MCTS meets minimum performance thresholds

echo "Running MCTS Regression Tests..."

# Test 1: Starter scenario must win at least 80%
result=$(python main_mcts.py -s starter -n 50 -g 20 | grep "Wins:" | awk '{print $2}')
wins=${result%\%}
if [ $wins -lt 80 ]; then
    echo "FAIL: Starter scenario win rate too low: $wins%"
    exit 1
fi
echo "PASS: Starter scenario ($wins%)"

# Test 2: Basic scenario must win at least 70%
result=$(python main_mcts.py -s basic -n 50 -g 20 | grep "Wins:" | awk '{print $2}')
wins=${result%\%}
if [ $wins -lt 70 ]; then
    echo "FAIL: Basic scenario win rate too low: $wins%"
    exit 1
fi
echo "PASS: Basic scenario ($wins%)"

# Add more tests...

echo "All regression tests passed!"
```

Run:
```bash
bash regression_test.sh
```

---

### Continuous Integration Testing

**For CI/CD pipelines** (GitHub Actions, Jenkins, etc.):

**Example GitHub Actions workflow** (`.github/workflows/test_mcts.yml`):

```yaml
name: MCTS Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.8'
    - name: Install dependencies
      run: pip install -r requirements.txt
    - name: Run quick MCTS tests
      run: |
        python main_mcts.py -s starter -n 20 -g 5
        python main_mcts.py -s basic -n 20 -g 5
    - name: Check win rate threshold
      run: bash regression_test.sh
```

---

## Test Checklist

### Before Submission/Deployment

- [ ] **Basic Functionality**: Single game runs without errors
- [ ] **Win Rate**: Meets minimum thresholds on all scenarios
- [ ] **Parameter Validation**: Tested multiple c values
- [ ] **Iteration Scaling**: Tested 10, 50, 100 iterations
- [ ] **Verbose Output**: Tree structure makes sense
- [ ] **Comparison**: Performs better than random bot
- [ ] **Edge Cases**: Handles low HP, no playable cards
- [ ] **Time Performance**: Completes in reasonable time
- [ ] **All Scenarios**: Tested all 6 scenarios
- [ ] **Automated Suite**: test_mcts.sh passes

---

## Common Issues and Debugging

### Issue: Low Win Rate

**Possible Causes**:
1. Too few iterations (increase `-n`)
2. Poor exploration parameter (try `-p 1.0` or `-p 1.41`)
3. Bug in evaluation function
4. Bug in action selection

**Debug Steps**:
```bash
# Test with high iterations
python main_mcts.py -s starter -n 200 -g 10

# Test with different c values
python main_mcts.py -s starter -n 50 -p 1.41 -g 10

# Check tree structure
python main_mcts.py -s starter -n 50 -g 1 -v
```

---

### Issue: Slow Performance

**Possible Causes**:
1. Too many iterations
2. Deep tree (many playable cards)
3. Inefficient state copying

**Solutions**:
```bash
# Reduce iterations
python main_mcts.py -s starter -n 20 -g 10

# Profile performance
python -m cProfile main_mcts.py -s starter -n 50 -g 1
```

---

### Issue: Crashes or Errors

**Common Errors**:
1. `KeyError` in action selection → Bug in action.key() method
2. `IndexError` in PlayCard → Invalid card index
3. Infinite loop → Battle not ending properly

**Debug**:
```bash
# Run with verbose and examine log
python main_mcts.py -s starter -n 50 -g 1 -v

# Add print statements to mcts_bot.py
# Check state.ended() returns correctly
```

---

## Advanced Testing Techniques

### 1. A/B Testing Different MCTS Variants

Compare different MCTS implementations:

```bash
# Test Stochastic UCB-1 (current implementation)
python main_mcts.py -s starter -n 50 -g 50

# If you implement UCT (standard UCB-1), compare:
# (would require modifying _select_child_action)
```

---

### 2. Ablation Testing

**Test individual components**:

1. **Test without exploration**: Set c=0
   ```bash
   python main_mcts.py -s starter -n 50 -p 0.0 -g 20
   ```
   Expected: Lower win rate due to greedy behavior

2. **Test with pure exploration**: Set c=10
   ```bash
   python main_mcts.py -s starter -n 50 -p 10.0 -g 20
   ```
   Expected: Lower win rate due to too much exploration

3. **Test with minimal rollouts**: Reduce iterations to 5
   ```bash
   python main_mcts.py -s starter -n 5 -g 20
   ```
   Expected: Near-random performance

---

### 3. Human Comparison Testing

**Compare MCTS decisions to human decisions**:

```bash
# First, play as human and note decisions
python main_mcts.py -s starter -b human -g 1 -v

# Then run MCTS and compare
python main_mcts.py -s starter -n 100 -g 1 -v
```

**Analysis**:
- Do MCTS and human make similar key decisions?
- Does MCTS find non-obvious good plays?
- Are there systematic differences in strategy?

---

## Summary

This guide covers comprehensive testing strategies for the MCTS agent:

1. **Quick validation** using automated test suite
2. **Statistical testing** with multiple games
3. **Parameter optimization** through sweeps
4. **Comparative analysis** against other bots
5. **Debugging tools** for understanding behavior
6. **Performance benchmarking** for efficiency
7. **Integration testing** with existing framework
8. **Automated testing** for CI/CD

**Recommended Testing Workflow**:

1. Run quick test suite: `bash test_mcts.sh`
2. If any failures, debug with verbose single game
3. Tune parameters if win rates are low
4. Run longer tests (50+ games) for final validation
5. Compare against baseline bots
6. Document results

**Key Metrics to Track**:
- Win rate by scenario
- Average time per turn
- Average score (damage dealt ratio)
- Tree depth and breadth
- Parameter sensitivity

Happy testing!