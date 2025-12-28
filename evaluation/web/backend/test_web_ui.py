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
        """Test that Config page renders and accepts input values"""
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            try:
                # Navigate to the app
                await page.goto("http://localhost:8000", wait_until="domcontentloaded")
                await page.wait_for_timeout(1000)

                # Verify we start on Config tab
                config_tab = page.locator('button.tab-button:has-text("Config")')
                assert await config_tab.evaluate("el => el.classList.contains('active')"), "Config tab should be active by default"
                print("✓ Config tab is active by default")

                # Verify form elements exist on Config page
                scenario_buttons = page.locator(".scenario-button")
                enemies_input = page.locator("#enemies-input")
                bot_search_input = page.locator(".bot-search-input")
                test_count_slider = page.locator("#test-count-slider")
                thread_count_slider = page.locator("#thread-count-slider")
                start_button = page.locator("button.start-race-button")

                # Check all form elements exist
                await scenario_buttons.first.wait_for()
                await enemies_input.wait_for()
                await bot_search_input.wait_for()
                await test_count_slider.wait_for()
                await thread_count_slider.wait_for()
                await start_button.wait_for()

                print("✓ All form elements found")

                # Test scenario button selection (default should be 0)
                active_scenario = page.locator(".scenario-button.active")
                scenario_text = await active_scenario.text_content()
                assert "0" in scenario_text, f"Expected scenario 0 to be active"
                print("✓ Scenario 0 selected by default")

                # Click scenario 1 button
                scenario_1_button = page.locator(".scenario-button").nth(1)
                await scenario_1_button.click()
                await page.wait_for_timeout(200)
                assert await scenario_1_button.evaluate("el => el.classList.contains('active')"), "Scenario 1 should be active after click"
                print("✓ Scenario buttons are clickable")

                # Test enemies input
                await enemies_input.fill("ghl")
                enemies_value = await enemies_input.input_value()
                assert enemies_value == "ghl", f"Expected enemies=ghl, got {enemies_value}"
                print("✓ Enemies input accepts values")

                # Test bot selection via dropdown
                await bot_search_input.click()
                await page.wait_for_timeout(300)

                # Verify dropdown appears
                bot_dropdown = page.locator(".bot-dropdown")
                await bot_dropdown.wait_for()
                print("✓ Bot dropdown opens on search input click")

                # Select a bot by clicking a bot option
                mcts_option = page.locator('.bot-option:has-text("mcts")').first
                await mcts_option.click()
                await page.wait_for_timeout(200)

                # Verify bot chip appears
                bot_chip = page.locator('.selected-bot-chip:has-text("mcts")')
                await bot_chip.wait_for()
                print("✓ Bot selection creates chip")

                # Test sliders
                await test_count_slider.fill("10")
                test_value = await test_count_slider.input_value()
                assert test_value == "10", f"Expected test_count=10, got {test_value}"
                print("✓ Test count slider accepts values")

                await thread_count_slider.fill("2")
                thread_value = await thread_count_slider.input_value()
                assert thread_value == "2", f"Expected thread_count=2, got {thread_value}"
                print("✓ Thread count slider accepts values")

                # Verify start button is present
                is_visible = await start_button.is_visible()
                assert is_visible, "Start button should be visible"
                print("✓ Start button is visible")

                print("\n✅ All Config page tests passed!")

            finally:
                await browser.close()


    @pytest.mark.asyncio
    async def test_start_race_and_dashboard(self):
        """Test race start flow and dashboard navigation"""
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
                    # Return a mock success response
                    await route.fulfill(
                        status=200,
                        content_type="application/json",
                        body='{"status": "race started"}'
                    )
                else:
                    await route.continue_()

            await page.route("**/*", handle_route)

            try:
                # Navigate to the app
                await page.goto("http://localhost:8000", wait_until="domcontentloaded")
                await page.wait_for_timeout(1000)

                # Should be on Config tab by default
                config_tab = page.locator('button.tab-button:has-text("Config")')
                assert await config_tab.evaluate("el => el.classList.contains('active')"), "Config tab should be active"
                print("✓ Started on Config tab")

                # Configure race
                await page.locator("#enemies-input").fill("h")
                await page.locator("#test-count-slider").fill("5")
                await page.locator("#thread-count-slider").fill("1")

                # Select bots
                await page.locator(".bot-search-input").click()
                await page.wait_for_timeout(300)
                await page.locator('.bot-option:has-text("mcts")').first.click()
                await page.wait_for_timeout(200)
                await page.locator('.bot-option:has-text("rndm")').first.click()
                await page.wait_for_timeout(200)

                # Close bot dropdown
                await page.locator(".close-dropdown").click()
                await page.wait_for_timeout(200)

                print("✓ Race configuration complete")

                # Click Start Race button
                start_button = page.locator("button.start-race-button")
                initial_text = await start_button.text_content()
                assert "Start Race" in initial_text, f"Button text should contain 'Start Race', got {initial_text}"
                print("✓ Button shows 'Start Race' text")

                await start_button.click()
                await page.wait_for_timeout(500)

                # Verify API call was made with correct data
                assert len(requests_captured) > 0, "API call should have been made"
                api_call = requests_captured[0]
                assert api_call["method"] == "POST", "Should be POST request"
                assert api_call["body"]["enemies"] == "h", "Enemies should be 'h'"
                assert api_call["body"]["test_count"] == 5, "Test count should be 5"
                assert api_call["body"]["thread_count"] == 1, "Thread count should be 1"
                assert "mcts" in api_call["body"]["bot_names"], "Should include mcts bot"
                assert "rndm" in api_call["body"]["bot_names"], "Should include rndm bot"
                print("✓ API call made with correct parameters")

                # Verify navigation to Race Dashboard
                dashboard_tab = page.locator('button.tab-button:has-text("Race Dashboard")')
                await page.wait_for_timeout(500)
                is_dashboard_active = await dashboard_tab.evaluate("el => el.classList.contains('active')")
                assert is_dashboard_active, "Should navigate to Race Dashboard after starting race"
                print("✓ Navigated to Race Dashboard tab")

                # Verify dashboard elements are visible
                dashboard_header = page.locator('.dashboard-header h2:has-text("Race Dashboard")')
                await dashboard_header.wait_for()
                print("✓ Race Dashboard loaded")

                print("\n✅ All race start and dashboard tests passed!")

            finally:
                await browser.close()


    @pytest.mark.asyncio
    async def test_dashboard_tab_navigation(self):
        """Test that dashboard tab can be accessed and shows correct state"""
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            try:
                # Navigate to the app
                await page.goto("http://localhost:8000", wait_until="domcontentloaded")
                await page.wait_for_timeout(1000)

                # Click on Race Dashboard tab
                dashboard_tab = page.locator('button.tab-button:has-text("Race Dashboard")')
                await dashboard_tab.click()
                await page.wait_for_timeout(500)

                # Verify tab is now active
                is_active = await dashboard_tab.evaluate("el => el.classList.contains('active')")
                assert is_active, "Race Dashboard tab should be active after click"
                print("✓ Race Dashboard tab activated")

                # Verify "no race" message appears when no race is active
                no_race_message = page.locator('.no-race p:has-text("No active race")')
                await no_race_message.wait_for()
                print("✓ Shows 'No active race' message")

                # Verify hint message exists
                hint_message = page.locator('.no-race-hint')
                is_visible = await hint_message.is_visible()
                assert is_visible, "Hint message should be visible"
                print("✓ Shows hint to configure race from Config tab")

                # Navigate back to Config tab
                config_tab = page.locator('button.tab-button:has-text("Config")')
                await config_tab.click()
                await page.wait_for_timeout(300)

                # Verify Config tab is now active
                is_config_active = await config_tab.evaluate("el => el.classList.contains('active')")
                assert is_config_active, "Config tab should be active after click"
                print("✓ Can navigate back to Config tab")

                print("\n✅ All dashboard tab navigation tests passed!")

            finally:
                await browser.close()


async def main():
    """Run tests manually"""
    test = TestWebUI()
    await test.test_form_renders_and_inputs_accept_values()
    await test.test_start_race_and_dashboard()
    await test.test_dashboard_tab_navigation()


if __name__ == "__main__":
    print("Running Playwright Web UI tests...")
    print("=" * 60)
    asyncio.run(main())
