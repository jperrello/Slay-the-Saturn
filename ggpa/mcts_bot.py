"""
Monte Carlo Tree Search (MCTS) Bot for Slay the Spire Combat
Assignment 6 - CMPM 146

This implementation uses Stochastic UCB-1 for node selection.
"""

from __future__ import annotations
import random
import math
from typing import TYPE_CHECKING
from ggpa.ggpa import GGPA
from action.action import EndAgentTurn, PlayCard

if TYPE_CHECKING:
    from game import GameState
    from battle import BattleState
    from agent import Agent
    from card import Card


class MCTSAgent(GGPA):
    """
    MCTS Agent that interfaces with the game.
    You should not need to modify this class.
    """
    def __init__(self, iterations: int = 100, parameter: float = 0.5):
        super().__init__("MCTSAgent")
        self.iterations = iterations
        self.parameter = parameter
        self.root = None

    def choose_card(self, game_state: GameState, battle_state: BattleState) -> EndAgentTurn | PlayCard:
        """Choose the best card to play using MCTS."""
        # Create root node for current state
        self.root = TreeNode(None, None, self.parameter)

        # Run MCTS iterations
        for _ in range(self.iterations):
            # Copy state for this iteration
            state_copy = battle_state.copy_undeterministic()
            self.root.step(state_copy)

        # Get and return best action
        return self.root.get_best(battle_state)

    def choose_agent_target(self, battle_state: BattleState, list_name: str, agent_list: list[Agent]) -> Agent:
        """Choose a random agent target."""
        return random.choice(agent_list)

    def choose_card_target(self, battle_state: BattleState, list_name: str, card_list: list[Card]) -> Card:
        """Choose a random card target."""
        return random.choice(card_list)

    def print_tree(self):
        """Print the MCTS tree for debugging."""
        if self.root:
            self.root.print_tree()


class TreeNode:
    """
    Represents a single node in the MCTS game tree.
    """
    def __init__(self, action, parent: TreeNode | None, c: float = 0.5):
        """
        Initialize a tree node.

        Args:
            action: The action that led to this node
            parent: Parent node (None for root)
            c: Exploration parameter for UCB-1
        """
        self.action = action
        self.parent = parent
        self.c = c
        self.children: dict = {}  # Maps action keys to child nodes
        self.visits = 0
        self.total_score = 0.0
        self.unexplored_actions = []

    def step(self, state: BattleState) -> None:
        """
        Perform one complete MCTS iteration:
        1. Selection - traverse tree using UCB-1
        2. Expansion - add one new child node
        3. Rollout - simulate to end from new node
        4. Backpropagation - update scores up the tree

        Args:
            state: Current battle state
        """
        # Selection: traverse to a leaf node
        node = self.select(state)

        # Expansion: expand one unexplored child (if possible)
        if not state.ended():
            node = node.expand(state)

        # Rollout: simulate to the end
        score = node.rollout(state)

        # Backpropagation: update statistics
        node.backpropagate(score)

    def select(self, state: BattleState) -> TreeNode:
        """
        Recursively select child nodes until reaching a node that is not fully expanded.
        Uses Stochastic UCB-1 for selection.

        Args:
            state: Current battle state

        Returns:
            The selected leaf node
        """
        node = self

        # Keep selecting until we find a non-fully-expanded node or terminal state
        while not state.ended():
            # Get available actions if we haven't yet
            if node.visits == 0:
                node.unexplored_actions = node._get_actions(state)
                return node

            # If there are unexplored actions, return this node for expansion
            if node.unexplored_actions:
                return node

            # All actions explored - select best child using UCB-1
            if not node.children:
                return node

            # Apply action and move to child
            action = node._select_child_action()
            state.step(action)
            node = node.children[action.key()]

        return node

    def expand(self, state: BattleState) -> TreeNode:
        """
        Expand one unexplored child node.

        Args:
            state: Current battle state

        Returns:
            The newly created child node
        """
        # Initialize unexplored actions if needed
        if not self.unexplored_actions:
            self.unexplored_actions = self._get_actions(state)

        # If no actions available (shouldn't happen), return self
        if not self.unexplored_actions:
            return self

        # Select a random unexplored action
        action = random.choice(self.unexplored_actions)
        self.unexplored_actions.remove(action)

        # Create child node
        child = TreeNode(action, self, self.c)
        self.children[action.key()] = child

        # Apply action to state
        state.step(action)

        return child

    def rollout(self, state: BattleState) -> float:
        """
        Simulate the game to completion using random actions.

        Args:
            state: Current battle state

        Returns:
            Score of the terminal state
        """
        # Play randomly until game ends
        while not state.ended():
            actions = self._get_actions(state)
            if not actions:
                break
            action = random.choice(actions)
            state.step(action)

        # Evaluate final state
        return self._evaluate_state(state)

    def backpropagate(self, score: float) -> None:
        """
        Propagate the score up the tree, updating visit counts and total scores.

        Args:
            score: The score to backpropagate
        """
        node = self
        while node is not None:
            node.visits += 1
            node.total_score += score
            node = node.parent

    def get_best(self, state: BattleState) -> EndAgentTurn | PlayCard:
        """
        Get the best action based on visit counts (exploitation).

        Args:
            state: Current battle state

        Returns:
            The best action to take
        """
        # If no children, return random action
        if not self.children:
            actions = self._get_actions(state)
            return random.choice(actions) if actions else EndAgentTurn()

        # Return child with most visits (most explored = most promising)
        best_action = max(self.children.keys(),
                         key=lambda k: self.children[k].visits)

        # Find the actual action object
        for action in self._get_actions(state):
            if action.key() == best_action:
                return action

        # Fallback
        return EndAgentTurn()

    def print_tree(self, indent: int = 0) -> None:
        """
        Print the tree structure for debugging.

        Args:
            indent: Current indentation level
        """
        avg_score = self.total_score / self.visits if self.visits > 0 else 0
        action_str = self.action.key() if self.action else "Root"

        print(" " * indent + f"{action_str} {avg_score:.2f} (visits: {self.visits})")

        # Sort children by visits for better readability
        sorted_children = sorted(self.children.items(),
                                key=lambda x: x[1].visits,
                                reverse=True)

        for _, child in sorted_children:
            child.print_tree(indent + 2)

    def _get_actions(self, state: BattleState) -> list:
        """
        Get available actions from the state.

        Args:
            state: Current battle state

        Returns:
            List of available actions
        """
        # Get playable cards
        actions = []
        for i in range(len(state.hand)):
            if state.hand[i].is_playable(state.game_state, state):
                actions.append(PlayCard(i))

        # Always can end turn
        actions.append(EndAgentTurn())

        return actions

    def _select_child_action(self):
        """
        Select a child using Stochastic UCB-1.
        Calculates UCB-1 values and selects probabilistically.

        Returns:
            Selected action
        """
        # Calculate UCB-1 values for all children
        ucb_values = {}
        for action_key, child in self.children.items():
            if child.visits == 0:
                # Unvisited children get high priority
                ucb_values[action_key] = float('inf')
            else:
                exploitation = child.total_score / child.visits
                exploration = self.c * math.sqrt(math.log(self.visits) / child.visits)
                ucb_values[action_key] = exploitation + exploration

        # Convert to probabilities using softmax
        max_ucb = max(ucb_values.values())
        if max_ucb == float('inf'):
            # If any child is unvisited, select randomly among unvisited
            unvisited = [k for k, v in ucb_values.items() if v == float('inf')]
            selected_key = random.choice(unvisited)
        else:
            # Softmax with temperature = 1
            exp_values = {k: math.exp(v - max_ucb) for k, v in ucb_values.items()}
            total_exp = sum(exp_values.values())
            probabilities = {k: v / total_exp for k, v in exp_values.items()}

            # Sample according to probabilities
            keys = list(probabilities.keys())
            probs = [probabilities[k] for k in keys]
            selected_key = random.choices(keys, weights=probs, k=1)[0]

        # Find and return the actual action object
        return self.children[selected_key].action

    def _evaluate_state(self, state: BattleState) -> float:
        """
        Evaluate a game state.

        Uses a combination of damage dealt and health remaining:
        - Base score is damage dealt to enemies
        - Bonus for player health remaining
        - Win gives full score (1.0)
        - Loss gives low score based on damage dealt

        Args:
            state: Battle state to evaluate

        Returns:
            Score between 0 and 1
        """
        # Check if game ended
        if state.ended():
            result = state.get_end_result()
            if result == 1:  # Win
                # Win bonus + health bonus
                health_pct = state.player.health / state.player.max_health
                return 0.8 + 0.2 * health_pct  # 0.8 to 1.0
            else:  # Loss
                # Partial credit for damage dealt
                total_enemy_hp = sum(e.max_health for e in state.enemies)
                damage_dealt = sum(e.max_health - e.health for e in state.enemies)
                return 0.3 * (damage_dealt / total_enemy_hp)  # 0.0 to 0.3

        # Game still ongoing - evaluate partial progress
        total_enemy_hp = sum(e.max_health for e in state.enemies)
        damage_dealt = sum(e.max_health - e.health for e in state.enemies)
        damage_ratio = damage_dealt / total_enemy_hp if total_enemy_hp > 0 else 0

        health_ratio = state.player.health / state.player.max_health

        # Weighted combination: prioritize damage dealt
        return 0.7 * damage_ratio + 0.3 * health_ratio