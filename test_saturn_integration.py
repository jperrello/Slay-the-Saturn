#!/usr/bin/env python
"""Quick test of Saturn server integration with agents."""

import sys
sys.path.insert(0, 'g3_files')

from agents.rcot_agent import RCotAgent, RCotConfig
from saturn_discovery import get_saturn_server

def test_saturn_discovery():
    """Test that Saturn server can be discovered."""
    print("=" * 60)
    print("Test 1: Saturn Server Discovery")
    print("=" * 60)

    saturn_url = get_saturn_server()
    if saturn_url:
        print(f"[OK] Saturn server found: {saturn_url}")
        return True
    else:
        print("[FAIL] No Saturn server found")
        return False

def test_agent_initialization():
    """Test that agent can initialize with Saturn."""
    print("\n" + "=" * 60)
    print("Test 2: Agent Initialization with Saturn")
    print("=" * 60)

    try:
        config = RCotConfig(
            model="meta-llama/llama-3.2-3b-instruct:free",
            temperature=0.2,
            max_tokens=500
        )
        agent = RCotAgent(config)
        print(f"[OK] Agent created: {agent.name}")

        # Try to get the client (this triggers Saturn discovery)
        client = agent.client
        print(f"[OK] Client initialized successfully")
        print(f"  Base URL: {client.base_url}")

        return True
    except Exception as e:
        print(f"[FAIL] Agent initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_simple_request():
    """Test a simple LLM request through Saturn."""
    print("\n" + "=" * 60)
    print("Test 3: Simple LLM Request via Saturn")
    print("=" * 60)

    try:
        config = RCotConfig(
            model="meta-llama/llama-3.2-3b-instruct:free",
            temperature=0.2,
            max_tokens=50
        )
        agent = RCotAgent(config)

        # Make a simple test request
        client = agent.client
        print("Sending test request...")

        response = client.chat.completions.create(
            model=config.model,
            messages=[{"role": "user", "content": "Say 'Hello from Saturn!' and nothing else."}],
            max_tokens=20,
            temperature=0.0
        )

        reply = response.choices[0].message.content
        print(f"[OK] Received response: {reply}")

        # Check usage stats
        if hasattr(response, 'usage') and response.usage:
            print(f"  Tokens used: {response.usage.total_tokens}")

        return True
    except Exception as e:
        print(f"[FAIL] Request failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    results = []

    # Run tests
    results.append(("Saturn Discovery", test_saturn_discovery()))
    results.append(("Agent Initialization", test_agent_initialization()))
    results.append(("Simple LLM Request", test_simple_request()))

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "[OK] PASS" if result else "[FAIL] FAIL"
        print(f"{status}: {name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    sys.exit(0 if passed == total else 1)
