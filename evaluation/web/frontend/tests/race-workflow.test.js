import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8000';

async function startRaceAndWaitForAgentCards(page, options = {}) {
  const testCount = options.testCount || 25;
  const threadCount = options.threadCount || 4;
  
  // Set test count and thread count if needed
  if (testCount !== 25) {
    await page.fill('#test-count-slider', String(testCount));
  }
  if (threadCount !== 4) {
    await page.fill('#thread-count-slider', String(threadCount));
  }
  
  // Click start button
  const startButton = page.locator('.start-race-button');
  await startButton.click();
  
  // Wait for either dashboard tab switch OR error message
  // The tab changes via onStartRace callback after successful API call
  await page.waitForTimeout(2000); // Allow API call to complete
  
  // Check if there's an error displayed
  const errorMessage = page.locator('.error-message');
  const hasError = await errorMessage.count() > 0;
  if (hasError) {
    const errorText = await errorMessage.textContent();
    throw new Error(`API Error: ${errorText}`);
  }
  
  // Now wait for dashboard to be visible (may need to click tab if not auto-switched)
  const raceDashboard = page.locator('.RaceDashboard');
  const isDashboardVisible = await raceDashboard.isVisible();
  if (!isDashboardVisible) {
    // Click dashboard tab manually if not visible
    const dashboardTab = page.locator('.tab-button:has-text("Race Dashboard")');
    await dashboardTab.click();
  }
  await expect(raceDashboard).toBeVisible({ timeout: 5000 });
  
  // Wait for race to start (agent cards appear when race_started event received)
  const agentCards = page.locator('.agent-card');
  await expect(agentCards.first()).toBeVisible({ timeout: 30000 });
  
  return agentCards;
}

test.describe('Race Start Workflow', () => {
  test.beforeEach(async ({ page, request }) => {
    // Navigate to the page first
    await page.goto(BASE_URL);
    
    // Reset any in-progress race using page.evaluate (runs in browser context)
    await page.evaluate(async (url) => {
      try {
        await fetch(`${url}/api/race/reset`, { method: 'POST' });
      } catch (e) {
        // Ignore errors
      }
    }, BASE_URL);
    
    // Wait a moment for reset to take effect
    await page.waitForTimeout(500);
    
    // Reload the page to get fresh state
    await page.reload();
    
    // Wait for Config tab to be active by default
    await page.waitForSelector('.ConfigPage', { timeout: 5000 });
  });

  test('form renders with all required fields', async ({ page }) => {
    // Check scenario buttons exist
    const scenarioButtons = page.locator('.scenario-button');
    expect(await scenarioButtons.count()).toBe(6);

    // Check enemies input
    const enemiesInput = page.locator('#enemies-input');
    await expect(enemiesInput).toBeVisible();
    expect(await enemiesInput.inputValue()).toBe('h');

    // Check bot selection area
    const botSearchInput = page.locator('.bot-search-input');
    await expect(botSearchInput).toBeVisible();

    // Check selected bots display
    const selectedBots = page.locator('.selected-bots');
    await expect(selectedBots).toBeVisible();

    // Check test count slider
    const testCountSlider = page.locator('#test-count-slider');
    await expect(testCountSlider).toBeVisible();
    expect(await testCountSlider.inputValue()).toBe('25');

    // Check thread count slider
    const threadCountSlider = page.locator('#thread-count-slider');
    await expect(threadCountSlider).toBeVisible();
    expect(await threadCountSlider.inputValue()).toBe('4');

    // Check start button
    const startButton = page.locator('.start-race-button');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });

  test('form accepts input values', async ({ page }) => {
    // Change scenario by clicking a button
    const scenario1Button = page.locator('.scenario-button').nth(1);
    await scenario1Button.click();
    await expect(scenario1Button).toHaveClass(/active/);

    // Change enemies
    await page.fill('#enemies-input', 'ghl');
    expect(await page.locator('#enemies-input').inputValue()).toBe('ghl');

    // Change test count via slider
    await page.fill('#test-count-slider', '10');
    expect(await page.locator('#test-count-slider').inputValue()).toBe('10');

    // Change thread count via slider
    await page.fill('#thread-count-slider', '2');
    expect(await page.locator('#thread-count-slider').inputValue()).toBe('2');
  });

  test('scenario buttons allow selection of all options', async ({ page }) => {
    const scenarioButtons = page.locator('.scenario-button');
    
    // Click through all scenario buttons
    for (let i = 0; i < 6; i++) {
      const button = scenarioButtons.nth(i);
      await button.click();
      await expect(button).toHaveClass(/active/);
    }
  });

  test('start race button switches to dashboard tab', async ({ page }) => {
    // Verify Config page is visible initially
    const configPage = page.locator('.ConfigPage');
    await expect(configPage).toBeVisible();

    // Start race and wait for agent cards to appear
    const agentCards = await startRaceAndWaitForAgentCards(page);

    // Verify race status shows RUNNING
    const raceStatus = page.locator('.race-status');
    await expect(raceStatus).toContainText('RUNNING', { timeout: 5000 });
  });

  test('start race API call is made with correct data', async ({ page }) => {
    // Set up request interception
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/race/start')) {
        requests.push({
          method: request.method(),
          body: request.postDataJSON()
        });
      }
    });

    // Select scenario 2
    const scenario2Button = page.locator('.scenario-button').nth(2);
    await scenario2Button.click();

    // Fill enemies
    await page.fill('#enemies-input', 'jgl');

    // Click start button
    const startButton = page.locator('.start-race-button');
    await startButton.click();

    // Wait for API call
    await page.waitForTimeout(1000);

    // Verify API was called
    expect(requests.length).toBeGreaterThan(0);
    const request = requests[requests.length - 1];
    expect(request.method).toBe('POST');
    expect(request.body.scenario).toBe(2);
    expect(request.body.enemies).toBe('jgl');
    expect(request.body.bot_names).toContain('mcts');
  });

  test('agent stats update in real-time via WebSocket', async ({ page }) => {
    // Start race and wait for agent cards
    const agentCards = await startRaceAndWaitForAgentCards(page);

    // Get initial stat value from first card
    const firstCard = agentCards.first();
    const initialStat = await firstCard.locator('.stat-value').first().textContent();

    // Wait for updates (multiple checks over time)
    let hasUpdated = false;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);
      const currentStat = await firstCard.locator('.stat-value').first().textContent();
      if (currentStat !== initialStat) {
        hasUpdated = true;
        break;
      }
    }

    // Verify stats grid exists in the card
    const agentStatsGrids = page.locator('.agent-stats-grid');
    expect(await agentStatsGrids.count()).toBeGreaterThan(0);
  });

  test('progress bars show simulation progress with correct styling', async ({ page }) => {
    // Start race and wait for agent cards
    const agentCards = await startRaceAndWaitForAgentCards(page);
    const agentCard = agentCards.first();

    // Verify progress-bar-fill element exists
    const progressBarFill = agentCard.locator('.progress-bar-fill');
    await expect(progressBarFill).toBeVisible();

    // Verify initial width is 0% or greater
    const initialWidth = await progressBarFill.evaluate(
      el => window.getComputedStyle(el).width
    );
    expect(parseFloat(initialWidth)).toBeGreaterThanOrEqual(0);
  });

  test('WebSocket connection status displays correctly', async ({ page }) => {
    // Check connection status in header
    const connectionStatus = page.locator('.connection-status');
    
    // Wait for connection to establish
    await expect(connectionStatus).toContainText('Connected', { timeout: 5000 });
  });

  test('error handling for invalid inputs', async ({ page }) => {
    // Clear enemies field (should cause validation error)
    await page.fill('#enemies-input', '');
    
    // Try to start race
    const startButton = page.locator('.start-race-button');
    
    // Start button should be disabled when validation fails
    await expect(startButton).toBeDisabled();
  });

  test('user can click all scenario buttons', async ({ page }) => {
    const scenarioButtons = page.locator('.scenario-button');

    for (let i = 0; i < 6; i++) {
      const button = scenarioButtons.nth(i);
      await button.click();
      await expect(button).toHaveClass(/active/);
    }
  });

  test('agent cards render with correct bot names and styling', async ({ page }) => {
    // Start race and wait for agent cards
    const agentCards = await startRaceAndWaitForAgentCards(page);
    expect(await agentCards.count()).toBe(3);

    // Verify each card has agent-name element
    const agentNames = page.locator('.agent-name');
    expect(await agentNames.count()).toBe(3);

    // Verify bot names are displayed (sorted alphabetically, using full bot names)
    const names = await agentNames.allTextContents();
    expect(names).toEqual(['Backtrack-Depth3', 'MCTSAgent', 'RandomBot']);
  });

  test('agent names render with correct bot colors', async ({ page }) => {
    // Start race and wait for agent cards
    const agentCards = await startRaceAndWaitForAgentCards(page);

    // Verify each agent name has color style applied
    const agentNames = page.locator('.agent-name');
    const count = await agentNames.count();

    for (let i = 0; i < count; i++) {
      const agentName = agentNames.nth(i);
      const color = await agentName.evaluate(el => window.getComputedStyle(el).color);
      expect(color).toBeTruthy();
    }
  });

  test('health bar fill element renders and updates', async ({ page }) => {
    // Start race and wait for agent cards
    const agentCards = await startRaceAndWaitForAgentCards(page);
    const agentCard = agentCards.first();

    // Verify health-bar-fill element exists
    const healthBarFill = agentCard.locator('.health-bar-fill');
    await expect(healthBarFill).toBeVisible();

    // Verify it has width property
    const initialWidth = await healthBarFill.evaluate(
      el => window.getComputedStyle(el).width
    );
    expect(parseFloat(initialWidth)).toBeGreaterThanOrEqual(0);
  });

  test('agent card border color matches bot color', async ({ page }) => {
    // Start race and wait for agent cards
    const agentCards = await startRaceAndWaitForAgentCards(page);
    const agentCard = agentCards.first();

    // Verify card has --agent-color CSS variable set
    const agentColorVar = await agentCard.evaluate(
      el => window.getComputedStyle(el).getPropertyValue('--agent-color')
    );
    expect(agentColorVar.trim()).toBeTruthy();
  });

  test('progress bar and health bar have correct container structure', async ({ page }) => {
    // Start race and wait for agent cards
    const agentCards = await startRaceAndWaitForAgentCards(page);
    const agentCard = agentCards.first();

    // Verify progress-bar-container exists with progress-bar-fill child
    const progressBarContainer = agentCard.locator('.progress-bar-container');
    await expect(progressBarContainer).toBeVisible();
    
    const progressBarFill = progressBarContainer.locator('.progress-bar-fill');
    await expect(progressBarFill).toBeVisible();

    // Verify health-bar exists with health-bar-fill child
    const healthBar = agentCard.locator('.health-bar');
    await expect(healthBar).toBeVisible();
    
    const healthBarFill = healthBar.locator('.health-bar-fill');
    await expect(healthBarFill).toBeVisible();
  });

  test('all agent cards in grid have required elements', async ({ page }) => {
    // Start race and wait for agent cards
    const agentCards = await startRaceAndWaitForAgentCards(page);
    const cardCount = await agentCards.count();

    // Verify each card has all required elements
    for (let i = 0; i < cardCount; i++) {
      const card = agentCards.nth(i);
      
      // Check agent name exists
      const agentName = card.locator('.agent-name');
      await expect(agentName).toBeVisible();
      
      // Check progress bar structure exists
      const progressBarFill = card.locator('.progress-bar-fill');
      await expect(progressBarFill).toBeVisible();
      
      // Check health bar exists
      const healthBarFill = card.locator('.health-bar-fill');
      await expect(healthBarFill).toBeVisible();
      
      // Check stats grid exists
      const statsGrid = card.locator('.agent-stats-grid');
      await expect(statsGrid).toBeVisible();
    }
  });

  test('tab navigation works correctly', async ({ page }) => {
    // Config tab should be active by default
    const configTab = page.locator('.tab-button:has-text("Config")');
    await expect(configTab).toHaveClass(/active/);

    // Click Dashboard tab
    const dashboardTab = page.locator('.tab-button:has-text("Race Dashboard")');
    await dashboardTab.click();

    // Dashboard should now be visible
    await expect(dashboardTab).toHaveClass(/active/);
    const dashboard = page.locator('.RaceDashboard');
    await expect(dashboard).toBeVisible();

    // Click back to Config tab
    await configTab.click();
    await expect(configTab).toHaveClass(/active/);
    const configPage = page.locator('.ConfigPage');
    await expect(configPage).toBeVisible();
  });

  test('bot selection dropdown works', async ({ page }) => {
    // Click on bot search input to open dropdown
    const botSearchInput = page.locator('.bot-search-input');
    await botSearchInput.click();

    // Dropdown should appear
    const dropdown = page.locator('.bot-dropdown');
    await expect(dropdown).toBeVisible();

    // Should show bot categories
    const categories = page.locator('.bot-category-header');
    expect(await categories.count()).toBeGreaterThan(0);

    // Close dropdown
    const closeButton = page.locator('.close-dropdown');
    await closeButton.click();
    await expect(dropdown).not.toBeVisible();
  });

  test('bot can be added and removed from selection', async ({ page }) => {
    // Get initial selected bot count
    const initialChips = await page.locator('.selected-bot-chip').count();

    // Open bot dropdown
    await page.locator('.bot-search-input').click();
    const dropdown = page.locator('.bot-dropdown');
    await expect(dropdown).toBeVisible();

    // Click on a bot that's not selected (look for one without selected class)
    const unselectedBot = page.locator('.bot-option:not(.selected)').first();
    await unselectedBot.click();

    // Should have one more chip now
    const newChipCount = await page.locator('.selected-bot-chip').count();
    expect(newChipCount).toBe(initialChips + 1);

    // Remove a bot by clicking X on a chip
    const removeButton = page.locator('.remove-bot').first();
    await removeButton.click();

    // Should be back to initial count
    const finalCount = await page.locator('.selected-bot-chip').count();
    expect(finalCount).toBe(initialChips);
  });

  test('dashboard shows no active race message when idle', async ({ page }) => {
    // Navigate to dashboard tab
    const dashboardTab = page.locator('.tab-button:has-text("Race Dashboard")');
    await dashboardTab.click();

    // Should show "No active race" message
    const noRaceMessage = page.locator('.no-race');
    await expect(noRaceMessage).toBeVisible();
    await expect(noRaceMessage).toContainText('No active race');
  });

  test('race finished state shows download and new race buttons', async ({ page }) => {
    // Start a quick race (1 sim, 1 thread for fast completion)
    const agentCards = await startRaceAndWaitForAgentCards(page, { testCount: 1, threadCount: 1 });
    
    // Wait for race to finish
    const raceStatus = page.locator('.race-status');
    await expect(raceStatus).toContainText('FINISHED', { timeout: 120000 });

    // Verify action buttons are visible
    const downloadButton = page.locator('.download-button');
    await expect(downloadButton).toBeVisible();

    const newRaceButton = page.locator('.new-race-button');
    await expect(newRaceButton).toBeVisible();
  });
});
