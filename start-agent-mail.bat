@echo off
REM Start MCP Agent Mail Server
echo Starting MCP Agent Mail Server...
echo Server will be available at http://127.0.0.1:8765/mcp/
echo.
cd mcp_agent_mail
uv run python -m mcp_agent_mail.cli serve-http
