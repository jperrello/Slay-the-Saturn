"""
Main script for running MCTS bot on Slay the Spire scenarios
Assignment 6 - CMPM 146

Usage:
    python main_mcts.py -s starter -n 50 -p 1.41 -g 10 -v

Available scenarios: starter, basic, scaling, vigor, lowhp, bomb
"""

import sys
import os
import argparse

# Add parent directory to path to import from ggpa
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from game import GameState
from battle import BattleState
from config import Character, Verbose
from agent import JawWorm
from card import CardGen
import time
from ggpa.human_input import HumanInput
from ggpa.random_bot import RandomBot

# Import our MCTS bot
try:
    from ggpa.mcts_bot import MCTSAgent
except ImportError:
    print("Error: mcts_bot.py not found in ggpa/ directory")
    print("Make sure to copy mcts_bot.py to the ggpa/ folder")
    sys.exit(1)


def get_scenario_deck(scenario_name: str):
    """
    Get the deck and starting HP for a specific scenario.

    Args:
        scenario_name: Name of the scenario

    Returns:
        Tuple of (deck_cards, starting_hp)
    """
    scenarios = {
        'starter': (
            # Standard Iron Clad starter deck
            [
                CardGen.Strike(), CardGen.Strike(), CardGen.Strike(), CardGen.Strike(), CardGen.Strike(),
                CardGen.Defend(), CardGen.Defend(), CardGen.Defend(), CardGen.Defend(),
                CardGen.Bash()
            ],
            20
        ),
        'basic': (
            # Basic deck with some AOE
            [
                CardGen.Strike(), CardGen.Strike(),
                CardGen.Defend(), CardGen.Defend(), CardGen.Defend(),
                CardGen.Bash(),
                CardGen.Cleave(), CardGen.Cleave(),
                CardGen.Anger()
            ],
            18
        ),
        'scaling': (
            # Deck focused on upgrading and scaling
            [
                CardGen.Strike(),
                CardGen.Defend(), CardGen.Defend(),
                CardGen.Searing_Blow(),
                CardGen.Armaments()
            ],
            16
        ),
        'vigor': (
            # Deck with Vigor mechanics (Stimulate and Batter)
            [
                CardGen.Strike(),
                CardGen.Defend(), CardGen.Defend(), CardGen.Defend(),
                CardGen.Stimulate(), CardGen.Stimulate(),
                CardGen.Batter(), CardGen.Batter()
            ],
            15
        ),
        'lowhp': (
            # Low HP challenge with defensive cards
            [
                CardGen.Strike(),
                CardGen.Defend(), CardGen.Defend(), CardGen.Defend(), CardGen.Defend(),
                CardGen.Bash(),
                CardGen.Impervious()
            ],
            8
        ),
        'bomb': (
            # Bomb strategy deck
            [
                CardGen.Strike(),
                CardGen.Defend(), CardGen.Defend(), CardGen.Defend(), CardGen.Defend(),
                CardGen.Bomb(),
                CardGen.Bash()
            ],
            14
        ),
    }

    if scenario_name not in scenarios:
        print(f"Unknown scenario: {scenario_name}")
        print(f"Available scenarios: {', '.join(scenarios.keys())}")
        sys.exit(1)

    return scenarios[scenario_name]


def run_game(bot, scenario_name: str, verbose: bool = False) -> tuple:
    """
    Run a single game.

    Args:
        bot: The bot to use
        scenario_name: Name of the scenario
        verbose: Whether to print verbose output

    Returns:
        Tuple of (won, score, turns, time_taken)
    """
    # Get scenario
    deck, starting_hp = get_scenario_deck(scenario_name)

    # Create game state
    game_state = GameState(Character.IRON_CLAD, bot, 0)
    game_state.set_deck(*deck)

    # Set player HP
    game_state.player.max_health = starting_hp
    game_state.player.health = starting_hp

    # Create battle
    battle_state = BattleState(
        game_state,
        JawWorm(game_state),
        verbose=Verbose.LOG if verbose else Verbose.NO_LOG
    )

    # Track initial enemy health for score calculation
    initial_enemy_hp = sum(e.max_health for e in battle_state.enemies)

    # Run battle
    start = time.time()
    battle_state.run()
    end = time.time()

    # Get results
    result = battle_state.get_end_result()
    won = result == 1

    # Calculate score (damage dealt to enemy as percentage)
    if won:
        # If won, all enemies are dead (100% damage dealt)
        score = 1.0
    else:
        # If lost, calculate damage dealt
        current_enemy_hp = sum(e.health for e in battle_state.enemies)
        damage_dealt = initial_enemy_hp - current_enemy_hp
        score = damage_dealt / initial_enemy_hp if initial_enemy_hp > 0 else 0

    time_taken = end - start

    return won, score, battle_state.turn, time_taken


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Run MCTS bot on Slay the Spire scenarios')

    parser.add_argument('-n', '--iterations', type=int, default=50,
                       help='Number of MCTS iterations per turn (default: 50)')
    parser.add_argument('-s', '--scenario', type=str, default='starter',
                       help='Scenario to run: starter, basic, scaling, vigor, lowhp, bomb (default: starter)')
    parser.add_argument('-p', '--parameter', type=float, default=0.5,
                       help='Exploration parameter for UCB-1 (default: 0.5)')
    parser.add_argument('-g', '--games', type=int, default=1,
                       help='Number of games to run (default: 1)')
    parser.add_argument('-b', '--bot', type=str, default='mcts',
                       choices=['mcts', 'random', 'human'],
                       help='Bot to use (default: mcts)')
    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Print verbose output')

    args = parser.parse_args()

    # Create bot
    if args.bot == 'mcts':
        bot = MCTSAgent(iterations=args.iterations, parameter=args.parameter)
    elif args.bot == 'random':
        bot = RandomBot()
    elif args.bot == 'human':
        bot = HumanInput(True)
    else:
        print(f"Unknown bot: {args.bot}")
        sys.exit(1)

    # Print configuration
    print(f"Configuration:")
    print(f"  Scenario: {args.scenario}")
    print(f"  Bot: {args.bot}")
    if args.bot == 'mcts':
        print(f"  Iterations: {args.iterations}")
        print(f"  Parameter (c): {args.parameter}")
    print(f"  Games: {args.games}")
    print()

    # Run games
    wins = 0
    total_score = 0
    total_turns = 0
    total_time = 0

    for game_num in range(args.games):
        verbose = args.verbose and args.games <= 3

        if args.games > 3 or verbose:
            if args.games > 1:
                print(f"Game {game_num + 1}/{args.games}...", end=' ')

        won, score, turns, time_taken = run_game(bot, args.scenario, verbose)

        if won:
            wins += 1

        total_score += score
        total_turns += turns
        total_time += time_taken

        if args.games > 3:
            print(f"{'WIN' if won else 'LOSS'} (score: {score:.2f}, turns: {turns}, time: {time_taken:.2f}s)")
        elif args.games <= 3:
            print(f"\nResult: {'WIN' if won else 'LOSS'}")
            print(f"Score: {score:.2f}")
            print(f"Turns: {turns}")
            print(f"Time: {time_taken:.2f}s")
            print()

    # Print summary if multiple games
    if args.games > 1:
        print()
        print("=" * 50)
        print("SUMMARY")
        print("=" * 50)
        print(f"Games played: {args.games}")
        print(f"Wins: {wins} ({100 * wins / args.games:.1f}%)")
        print(f"Losses: {args.games - wins} ({100 * (args.games - wins) / args.games:.1f}%)")
        print(f"Average score: {total_score / args.games:.3f}")
        print(f"Average turns: {total_turns / args.games:.1f}")
        print(f"Average time: {total_time / args.games:.2f}s")
        print(f"Total time: {total_time:.2f}s")
        print()

    # Print tree if verbose and MCTS
    if args.verbose and args.bot == 'mcts' and args.games == 1:
        print()
        print("=" * 50)
        print("MCTS TREE (final turn)")
        print("=" * 50)
        bot.print_tree()


if __name__ == '__main__':
    main()