<objective>
Integrate Saturn mDNS service discovery into the LLM agent architecture to enable API-key-free local testing. This will allow agents to automatically discover and connect to local OpenRouter servers running via Saturn, eliminating the need for API keys during development and testing.

This integration is critical for the research workflow: developers can run a local OpenRouter proxy server (saturn_files/openrouter_server.py) on their machine, and all agents will automatically discover and use it instead of requiring paid API credentials.
</objective>

<context>
This is a Slay the Spire AI research project that evaluates LLM agents (CoT, RCoT, None) across multiple scenarios. Currently, all agents require API keys and make direct calls to OpenRouter API, which costs money for every test run.

The Saturn system provides mDNS-based service discovery for local LLM proxy servers:
- saturn_files/openrouter_server.py: FastAPI server that proxies OpenRouter API locally
- saturn_files/simple_chat_client.py: Example client showing DNS-SD discovery pattern

Read CLAUDE.md and TESTING.md for full project context and agent patterns.
</context>

<requirements>
1. **Service Discovery Integration**:
   - Extract and adapt the DNS-SD discovery mechanism from simple_chat_client.py
   - Create a reusable saturn_discovery.py module in g3_files/
   - Support background service discovery with automatic server selection
   - Allow user selection of specific servers when multiple are available

2. **Agent Architecture Changes**:
   - Modify agent configs (CotConfig, RCotConfig, NoneConfig) to support Saturn mode
   - Auto-detect Saturn servers at agent initialization
   - If Saturn servers found: use Saturn server URLs instead of OpenRouter API
   - If no Saturn servers found: fail with clear error message (no API key fallback per user requirement)
   - Do NOT modify the agent reasoning logic or game-playing behavior

3. **Configuration Strategy** (Auto-detect):
   - Automatically discover Saturn servers when agents initialize
   - Default to priority-based selection (lowest priority number wins)
   - Add optional config parameter to specify server by name/URL
   - No environment variables needed - pure auto-detection

4. **Multi-Server Support**:
   - Detect all available Saturn servers
   - Provide mechanism to select specific server via agent config
   - Default behavior: use lowest priority server (following Saturn convention)
   - Log discovered servers for debugging

5. **Backwards Compatibility**:
   - Maintain existing API key-based flow as code path (but not as fallback)
   - Don't break existing evaluation scripts or bot configurations
   - Saturn detection should be automatic and transparent to existing test commands
</requirements>

<research>
Before implementing, thoroughly analyze:

1. **Saturn Discovery Mechanism** (@saturn_files/simple_chat_client.py):
   - How does ServiceDiscovery class work? (lines 24-208)
   - What's the DNS-SD command pattern? (dns-sd -B, dns-sd -L)
   - How are services parsed and deduplicated? (lines 173-190)
   - What information is extracted? (name, url, priority, ip)
   - How does background discovery work? (threading, callbacks)

2. **Saturn Server API** (@saturn_files/openrouter_server.py):
   - What endpoints does it expose? (/v1/health, /v1/models, /v1/chat/completions)
   - What's the request/response format? (lines 137-256)
   - How does it differ from standard OpenRouter API? (should be compatible)
   - What features are advertised via mDNS? (lines 325-328)

3. **Current Agent API Integration** (@g3_files/agents/cot_agent.py, rcot_agent.py, none_agent.py):
   - Where are API calls made? (search for openai.ChatCompletion.create)
   - How is the API key passed? (likely via openai.api_key = ...)
   - How is the base URL configured? (likely via openai.api_base = ...)
   - What error handling exists?
   - How are configs structured? (@dataclass pattern)

4. **Agent Initialization Flow**:
   - Where do agents initialize their API clients?
   - When would be the right time to run Saturn discovery?
   - How to pass discovered server URL to OpenAI SDK?

Consider multiple approaches for integration architecture before implementing.
</research>

<implementation>
Create a clean, modular integration following these steps:

**Step 1: Create Saturn Discovery Module**
Create ./g3_files/saturn_discovery.py:
- Extract ServiceDiscovery class from simple_chat_client.py
- Add SaturnDiscoveryManager class for one-time discovery (agents don't need background polling)
- Add get_saturn_server() function that returns best server URL or None
- Add get_all_saturn_servers() function for multi-server scenarios
- Include proper error handling and logging
- Make it work on Windows (dns-sd via Bonjour) and macOS/Linux

**Step 2: Modify Agent Configs**
Update @dataclass configs in each agent file:
- Add optional saturn_server_name: Optional[str] = None field
- This allows users to specify which Saturn server to use by name
- Keep all existing fields unchanged

**Step 3: Integrate Discovery into Agents**
Modify agent initialization logic:
- Before making API calls, attempt Saturn discovery
- If servers found and no API key: use Saturn server URL via openai.api_base
- If servers found and API key exists: prefer Saturn (per auto-detect requirement)
- If no servers found and no API key: fail with helpful error message
- If specific saturn_server_name configured: use that server only
- Log which server is being used (helpful for debugging test runs)

**Step 4: Update OpenAI SDK Configuration**
Modify how agents configure the OpenAI client:
- Set openai.api_base to Saturn server URL when using Saturn
- Keep model name unchanged (Saturn server handles routing)
- Don't send API key to local Saturn server (not needed)
- Preserve all other SDK settings (temperature, max_tokens, etc.)

**Design Principles**:
- **Single Responsibility**: Saturn discovery is separate module, agents just consume it
- **Fail Fast**: Clear errors when Saturn expected but not found
- **Minimal Invasiveness**: Don't refactor agent reasoning code, only API integration
- **Testability**: Easy to verify Saturn discovery without running full game simulations

**What to Avoid and WHY**:
- DON'T add Saturn polling/background threads to agents - agents are short-lived per game, one-time discovery is sufficient
- DON'T modify prompt_utils.py or game logic - this is purely an API integration change
- DON'T change the agent evaluation interface - existing test commands should work unchanged
- DON'T add complex configuration files - auto-detect should "just work"
- DON'T break existing API key flow - some users may still want direct API access
</implementation>

<parallel_tools>
For maximum efficiency, when you need to read multiple agent files to understand their structure, invoke all Read operations simultaneously rather than sequentially.
</parallel_tools>

<examples>
**Example: Agent initialization with Saturn (desired pattern)**
```python
# In cot_agent.py or similar
from g3_files.saturn_discovery import get_saturn_server

class CotAgent(GGPA):
    def __init__(self, config: CotConfig):
        # Attempt Saturn discovery
        saturn_url = get_saturn_server(
            preferred_name=config.saturn_server_name
        )

        if saturn_url:
            print(f"Using Saturn server: {saturn_url}")
            openai.api_base = saturn_url
            openai.api_key = "dummy"  # Saturn doesn't need real key
        elif OPENROUTER_API_KEY:
            # Standard flow
            openai.api_key = OPENROUTER_API_KEY
            openai.api_base = OPENROUTER_BASE_URL
        else:
            raise ValueError(
                "No Saturn servers found and no API key configured. "
                "Start a Saturn server (python saturn_files/openrouter_server.py) "
                "or set OPENROUTER_API_KEY in .env"
            )
```

**Example: Multi-server selection in config**
```python
# Evaluation script
config = CotConfig(
    model="openai/gpt-4.1",
    temperature=0.2,
    saturn_server_name="OpenRouter"  # Prefer specific server
)
agent = CotAgent(config)
```

**Anti-pattern: Don't do complex background discovery**
```python
# BAD - Too complex, agents don't need this
class CotAgent(GGPA):
    def __init__(self, config):
        self.discovery = ServiceDiscovery(discovery_interval=10)  # ❌
        # Agents are created per-game, no need for polling
```
</examples>

<output>
Create/modify these files:

1. ./g3_files/saturn_discovery.py - New module for Saturn service discovery
   - SaturnDiscoveryManager class (one-time discovery)
   - get_saturn_server(preferred_name: Optional[str] = None) -> Optional[str]
   - get_all_saturn_servers() -> List[SaturnService]
   - Proper logging and error handling

2. ./g3_files/agents/cot_agent.py - Integrate Saturn discovery
   - Update CotConfig dataclass
   - Modify initialization to use Saturn when available
   - Add logging for which server is used

3. ./g3_files/agents/rcot_agent.py - Integrate Saturn discovery
   - Update RCotConfig dataclass
   - Modify initialization to use Saturn when available
   - Add logging for which server is used

4. ./g3_files/agents/none_agent.py - Integrate Saturn discovery
   - Update NoneConfig dataclass
   - Modify initialization to use Saturn when available
   - Add logging for which server is used

5. ./g3_files/agents/mcts_bot.py - Review and integrate if it uses LLM calls
   - Check if MCTS bot makes API calls
   - If yes, integrate Saturn discovery
   - If no, skip (it's likely a pure tree search)

All paths are relative to project root.
</output>

<verification>
Before declaring complete, verify your implementation:

1. **Discovery Works**:
   - Run: `python saturn_files/openrouter_server.py` in one terminal
   - Test: `python -c "from g3_files.saturn_discovery import get_saturn_server; print(get_saturn_server())"`
   - Should print: `http://<ip>:<port>`

2. **Agent Integration Works**:
   - Ensure Saturn server is running
   - Run: `python evaluation/evaluate_bot.py 1 1 0 h cot-gpt41 --name saturn_test`
   - Check logs for "Using Saturn server: http://..."
   - Verify the evaluation completes without API key errors

3. **Multi-Server Selection**:
   - Start two Saturn servers on different ports with different priorities
   - Verify lowest priority is selected by default
   - Test config override with saturn_server_name parameter

4. **Error Handling**:
   - Stop all Saturn servers
   - Remove API keys from .env
   - Run agent - should get clear error message about no servers found
   - Verify error message includes instruction to start Saturn server

5. **Backwards Compatibility**:
   - Test with API keys and no Saturn server - should use direct API calls
   - Existing evaluation commands should work unchanged
   - No breaking changes to agent interfaces
</verification>

<success_criteria>
1. ✅ Saturn discovery module is clean, reusable, and well-documented
2. ✅ All three main agents (CoT, RCoT, None) support Saturn auto-detection
3. ✅ Agents automatically use Saturn servers when available (no config needed)
4. ✅ Multi-server scenarios are handled with priority-based selection
5. ✅ Optional server name selection works via config parameter
6. ✅ Clear error messages when no servers found and no API keys
7. ✅ Existing evaluation scripts work without modification
8. ✅ Logged output shows which server is being used
9. ✅ No breaking changes to agent game-playing logic or interfaces
10. ✅ Developer can run `python saturn_files/openrouter_server.py` and immediately test agents without any API keys
</success_criteria>
