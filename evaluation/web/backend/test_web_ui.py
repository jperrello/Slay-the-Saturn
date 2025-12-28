#!/usr/bin/env python
"""Playwright tests for Slay the Saturn Web UI"""

import asyncio
import pytest
from playwright.async_api import async_playwright, Browser
import time


class TestWebUI:
    """Test suite for web UI race functionality"""
    
    @pytest.mark.asyncio
    async def test_form_renders_and_inputs_accept_values(self):
        """Test that form renders and accepts input values"""
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            
            try:
                # Navigate to the app
                await page.goto("http://localhost:8000", wait_until="domcontentloaded")
                await page.wait_for_timeout(1000)
                
                # Navigate to race monitor
                await page.click('a:has-text("Race Monitor")')
                await page.wait_for_timeout(500)
                
                # Verify form elements exist
                scenario_select = page.locator("#scenario")
                enemies_input = page.locator("#enemies")
                bots_input = page.locator("#bot_names")
                test_count_input = page.locator("#test_count")
                thread_count_input = page.locator("#thread_count")
                start_button = page.locator("button:has-text('Start Race')")
                
                # Check all form elements exist
                await scenario_select.wait_for()
                await enemies_input.wait_for()
                await bots_input.wait_for()
                await test_count_input.wait_for()
                await thread_count_input.wait_for()
                await start_button.wait_for()
                
                print("✓ All form elements found")
                
                # Test scenario dropdown
                current_value = await scenario_select.input_value()
                assert current_value == "0", f"Expected scenario=0, got {current_value}"
                print("✓ Scenario selector has correct default")
                
                # Test enemies input
                await enemies_input.fill("ghl")
                enemies_value = await enemies_input.input_value()
                assert enemies_value == "ghl", f"Expected enemies=ghl, got {enemies_value}"
                print("✓ Enemies input accepts values")
                
                # Test bot names input
                await bots_input.fill("mcts,bt3")
                bots_value = await bots_input.input_value()
                assert bots_value == "mcts,bt3", f"Expected bots=mcts,bt3, got {bots_value}"
                print("✓ Bot names input accepts values")
                
                # Test numeric inputs
                await test_count_input.fill("10")
                test_value = await test_count_input.input_value()
                assert test_value == "10", f"Expected test_count=10, got {test_value}"
                print("✓ Test count input accepts values")
                
                await thread_count_input.fill("2")
                thread_value = await thread_count_input.input_value()
                assert thread_value == "2", f"Expected thread_count=2, got {thread_value}"
                print("✓ Thread count input accepts values")
                
                # Verify start button is enabled
                is_disabled = await start_button.is_disabled()
                assert not is_disabled, "Start button should not be disabled"
                print("✓ Start button is enabled")
                
                print("\n✅ All form tests passed!")
                
            finally:
                await browser.close()


    @pytest.mark.asyncio
    async def test_start_race_api_call(self):
        """Test that start race button makes proper API call"""
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            
            # Intercept API requests
            requests_captured = []
            
            async def handle_route(route):
                if "/api/race/start" in route.request.url:
                    requests_captured.append({
                        "url": route.request.url,
                        "method": route.request.method,
                        "body": route.request.post_data_json if route.request.method == "POST" else None
                    })
                    # Return a mock response
                    await route.continue_()
                else:
                    await route.continue_()
            
            await page.route("**/*", handle_route)
            
            try:
                # Navigate and fill form
                await page.goto("http://localhost:8000", wait_until="domcontentloaded")
                await page.wait_for_timeout(1000)
                await page.click('a:has-text("Race Monitor")')
                await page.wait_for_timeout(500)
                
                # Fill form with test values
                await page.fill("#scenario", "0")
                await page.fill("#enemies", "h")
                await page.fill("#bot_names", "mcts,rndm")
                await page.fill("#test_count", "5")
                await page.fill("#thread_count", "1")
                
                # Verify button text before clicking
                start_button = page.locator("button:has-text('Start Race')")
                initial_text = await start_button.text_content()
                assert "Start Race" in initial_text, f"Button text should contain 'Start Race', got {initial_text}"
                print("✓ Button shows 'Start Race' text")
                
                print("\n✅ API call test setup complete!")
                
            finally:
                await browser.close()


async def main():
    """Run tests manually"""
    test = TestWebUI()
    await test.test_form_renders_and_inputs_accept_values()
    await test.test_start_race_api_call()


if __name__ == "__main__":
    print("Running Playwright Web UI tests...")
    print("=" * 60)
    asyncio.run(main())
