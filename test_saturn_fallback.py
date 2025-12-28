#!/usr/bin/env python
"""Test graceful fallback when Saturn is not available."""

import sys
sys.path.insert(0, 'g3_files')
sys.path.insert(0, 'utils')

from agents.rcot_agent import RCotAgent, RCotConfig
from saturn_discovery import get_saturn_server
import os

def test_no_saturn_with_api_key():
    """Test fallback to OpenRouter when Saturn not available but API key exists."""
    print("=" * 60)
    print("Test: Fallback to OpenRouter (API key present)")
    print("=" * 60)

    # Check if API key is set
    from auth import OPENROUTER_API_KEY
    if not OPENROUTER_API_KEY:
        print("[SKIP] OPENROUTER_API_KEY not set in .env, cannot test fallback")
        return None

    # Temporarily override get_saturn_server to return None (simulating no Saturn)
    import g3_files.agents.rcot_agent as rcot_module
    original_get_saturn = rcot_module.get_saturn_server

    try:
        # Make get_saturn_server always return None
        rcot_module.get_saturn_server = lambda **kwargs: None

        config = RCotConfig(
            model="meta-llama/llama-3.2-3b-instruct:free",
            temperature=0.2,
            max_tokens=50
        )
        agent = RCotAgent(config)

        client = agent.client
        print(f"[OK] Agent initialized without Saturn")
        print(f"  Base URL: {client.base_url}")

        # Verify it's using OpenRouter directly
        if "openrouter.ai" in str(client.base_url):
            print("[OK] Using OpenRouter API directly (expected fallback)")
            return True
        else:
            print(f"[FAIL] Expected openrouter.ai but got: {client.base_url}")
            return False

    except Exception as e:
        print(f"[FAIL] Fallback failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Restore original function
        rcot_module.get_saturn_server = original_get_saturn


def test_no_saturn_no_api_key():
    """Test error message when neither Saturn nor API key available."""
    print("\n" + "=" * 60)
    print("Test: Error when no Saturn and no API key")
    print("=" * 60)

    # Temporarily override both get_saturn_server and API key
    import g3_files.agents.rcot_agent as rcot_module
    import auth as auth_module

    original_get_saturn = rcot_module.get_saturn_server
    original_api_key = auth_module.OPENROUTER_API_KEY

    try:
        # Make both unavailable
        rcot_module.get_saturn_server = lambda **kwargs: None
        auth_module.OPENROUTER_API_KEY = None

        # Also need to update the imported reference in rcot_agent
        from g3_files.agents import rcot_agent
        rcot_agent.OPENROUTER_API_KEY = None

        config = RCotConfig(
            model="meta-llama/llama-3.2-3b-instruct:free",
            temperature=0.2,
            max_tokens=50
        )

        try:
            agent = RCotAgent(config)
            # Try to access client (this should trigger the error)
            client = agent.client
            print("[FAIL] Expected ValueError but agent initialized successfully")
            return False
        except ValueError as e:
            error_msg = str(e)
            if "No Saturn servers found" in error_msg and "API key" in error_msg:
                print(f"[OK] Got expected error message:")
                print(f"  {error_msg.split(chr(10))[0]}")
                return True
            else:
                print(f"[FAIL] Got ValueError but unexpected message: {error_msg}")
                return False
        except Exception as e:
            print(f"[FAIL] Got unexpected exception: {type(e).__name__}: {e}")
            return False

    finally:
        # Restore originals
        rcot_module.get_saturn_server = original_get_saturn
        auth_module.OPENROUTER_API_KEY = original_api_key
        from g3_files.agents import rcot_agent
        rcot_agent.OPENROUTER_API_KEY = original_api_key


if __name__ == "__main__":
    results = []

    # Run tests
    result1 = test_no_saturn_with_api_key()
    if result1 is not None:
        results.append(("Fallback to OpenRouter", result1))

    results.append(("Error without Saturn/API key", test_no_saturn_no_api_key()))

    # Summary
    print("\n" + "=" * 60)
    print("Fallback Test Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "[OK] PASS" if result else "[FAIL] FAIL"
        print(f"{status}: {name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    sys.exit(0 if passed == total else 1)
