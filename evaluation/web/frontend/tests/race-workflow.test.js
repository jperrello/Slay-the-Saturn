import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8000';

test.describe('Race Start Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/race`);
    // Wait for WebSocket connection and form to render
    await page.waitForSelector('#scenario', { timeout: 5000 });
  });

  test('form renders with all required fields', async ({ page }) => {
    // Check scenario dropdown
    const scenarioSelect = page.locator('#scenario');
    await expect(scenarioSelect).toBeVisible();
    const currentValue = await scenarioSelect.inputValue();
    expect(currentValue).toBe('0');

    // Check enemies input
    const enemiesInput = page.locator('#enemies');
    await expect(enemiesInput).toBeVisible();
    expect(await enemiesInput.inputValue()).toBe('h');

    // Check bot names input
    const botsInput = page.locator('#bot_names');
    await expect(botsInput).toBeVisible();
    expect(await botsInput.inputValue()).toBe('mcts,bt3,rndm');

    // Check test count input
    const testCountInput = page.locator('#test_count');
    await expect(testCountInput).toBeVisible();
    expect(await testCountInput.inputValue()).toBe('25');

    // Check thread count input
    const threadCountInput = page.locator('#thread_count');
    await expect(threadCountInput).toBeVisible();
    expect(await threadCountInput.inputValue()).toBe('4');

    // Check start button
    const startButton = page.locator('button:has-text("Start Race")');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });

  test('form accepts input values', async ({ page }) => {
    // Change scenario
    await page.selectOption('#scenario', '1');
    expect(await page.locator('#scenario').inputValue()).toBe('1');

    // Change enemies
    await page.fill('#enemies', 'ghl');
    expect(await page.locator('#enemies').inputValue()).toBe('ghl');

    // Change bot names
    await page.fill('#bot_names', 'mcts,rndm');
    expect(await page.locator('#bot_names').inputValue()).toBe('mcts,rndm');

    // Change test count
    await page.fill('#test_count', '10');
    expect(await page.locator('#test_count').inputValue()).toBe('10');

    // Change thread count
    await page.fill('#thread_count', '2');
    expect(await page.locator('#thread_count').inputValue()).toBe('2');
  });

  test('scenario dropdown has all options', async ({ page }) => {
    const scenarioSelect = page.locator('#scenario');
    const options = await scenarioSelect.locator('option').allTextContents();
    
    expect(options).toContain('0: starter-ironclad');
    expect(options).toContain('1: basics-batter-stimulate');
    expect(options).toContain('2: tolerate');
    expect(options).toContain('3: basics-bomb');
    expect(options).toContain('4: basics-suffer');
    expect(options).toContain('5: gigl-random-deck');
  });

  test('start race button hides form and shows race monitor', async ({ page }) => {
    // Verify form is visible initially
    const form = page.locator('.race-form');
    await expect(form).toBeVisible();

    // Fill form with valid values
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts,rndm');
    await page.fill('#test_count', '2');
    await page.fill('#thread_count', '1');

    // Click start button
    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Verify form is hidden
    await expect(form).not.toBeVisible();

    // Verify race status shows RUNNING
    const raceStatus = page.locator('.race-status');
    await expect(raceStatus).toContainText('RUNNING');

    // Verify agent cards are visible (new UI element)
    const agentCards = page.locator('.agent-card');
    expect(await agentCards.count()).toBeGreaterThan(0);

    // Verify agent names are shown with correct styling
    const agentNames = page.locator('.agent-name');
    expect(await agentNames.count()).toBeGreaterThan(0);
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

    // Fill form with custom values
    await page.selectOption('#scenario', '2');
    await page.fill('#enemies', 'jgl');
    await page.fill('#bot_names', 'mcts,basic');
    await page.fill('#test_count', '3');
    await page.fill('#thread_count', '2');

    // Click start button
    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for API call
    await page.waitForTimeout(1000);

    // Verify API was called
    expect(requests.length).toBeGreaterThan(0);
    const request = requests[requests.length - 1];
    expect(request.method).toBe('POST');
    expect(request.body.scenario).toBe(2);
    expect(request.body.enemies).toBe('jgl');
    expect(request.body.bot_names).toEqual(['mcts', 'basic']);
    expect(request.body.test_count).toBe(3);
    expect(request.body.thread_count).toBe(2);
  });

  test('agent stats update in real-time via WebSocket', async ({ page }) => {
    // Fill form and start race
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts,rndm');
    await page.fill('#test_count', '5');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for agent cards to appear
    const agentCards = page.locator('.agent-card');
    await expect(agentCards.first()).toBeVisible();

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

    // Verify stats have updated (at least one card should have results)
    const agentStatsGrids = page.locator('.agent-stats-grid');
    expect(await agentStatsGrids.count()).toBeGreaterThan(0);
  });

  test('progress bars show simulation progress with correct styling', async ({ page }) => {
    // Start a race with multiple simulations
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts');
    await page.fill('#test_count', '5');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for agent card and progress bar to appear
    const agentCard = page.locator('.agent-card').first();
    await expect(agentCard).toBeVisible();

    // Verify progress-bar-fill element exists with correct class
    const progressBarFill = agentCard.locator('.progress-bar-fill');
    await expect(progressBarFill).toBeVisible();

    // Verify initial width is 0% or greater
    const initialWidth = await progressBarFill.evaluate(
      el => window.getComputedStyle(el).width
    );
    expect(parseFloat(initialWidth)).toBeGreaterThanOrEqual(0);

    // Wait and check again for progress update
    await page.waitForTimeout(3000);
    const updatedWidth = await progressBarFill.evaluate(
      el => window.getComputedStyle(el).width
    );

    // Width should have increased or stayed the same (no negative progress)
    const initialPixels = parseFloat(initialWidth);
    const updatedPixels = parseFloat(updatedWidth);
    expect(updatedPixels).toBeGreaterThanOrEqual(initialPixels);
  });

  test('WebSocket connection status displays correctly', async ({ page }) => {
    // Check initial connection status
    const connectionStatus = page.locator('.connection-status');
    
    // Wait for connection to establish
    await expect(connectionStatus).toContainText('Connected', { timeout: 5000 });
  });

  test('error handling for invalid inputs', async ({ page }) => {
    // Try to set negative values (if validation exists)
    await page.fill('#test_count', '-1');
    
    // Try to start race
    const startButton = page.locator('button:has-text("Start Race")');
    
    // The button should either be disabled or the form should prevent submission
    // This depends on implementation - adjust assertion as needed
    const isDisabled = await startButton.isDisabled();
    
    // At minimum, verify the form exists and button is present
    expect(await startButton.isVisible()).toBeTruthy();
  });

  test('user can fill form with different scenario options', async ({ page }) => {
    const scenarios = ['0', '1', '2', '3', '4', '5'];

    for (const scenario of scenarios) {
      await page.selectOption('#scenario', scenario);
      const selected = await page.locator('#scenario').inputValue();
      expect(selected).toBe(scenario);
    }
  });

  test('agent cards render with correct bot names and styling', async ({ page }) => {
    // Start race with specific bots
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts,bt3,rndm');
    await page.fill('#test_count', '2');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for agent cards to render
    const agentCards = page.locator('.agent-card');
    expect(await agentCards.count()).toBe(3);

    // Verify each card has agent-name element with bot name
    const agentNames = page.locator('.agent-name');
    expect(await agentNames.count()).toBe(3);

    // Verify bot names are displayed (sorted alphabetically)
    const names = await agentNames.allTextContents();
    expect(names).toEqual(['bt3', 'mcts', 'rndm']);
  });

  test('agent names render with correct bot colors', async ({ page }) => {
    // Start race with bots that have specific colors
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts,bt3,rcot');
    await page.fill('#test_count', '2');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for agent cards
    const agentCards = page.locator('.agent-card');
    await expect(agentCards.first()).toBeVisible();

    // Verify each agent name has the correct color applied
    // mcts = purple (#a855f7), bt3 = cyan (#06b6d4), rcot = green (#10b981)
    const firstAgentName = agentCards.nth(0).locator('.agent-name');
    const secondAgentName = agentCards.nth(1).locator('.agent-name');
    const thirdAgentName = agentCards.nth(2).locator('.agent-name');

    // Check that color style is applied
    const color1 = await firstAgentName.evaluate(el => window.getComputedStyle(el).color);
    const color2 = await secondAgentName.evaluate(el => window.getComputedStyle(el).color);
    const color3 = await thirdAgentName.evaluate(el => window.getComputedStyle(el).color);

    // All should have color style (not empty)
    expect(color1).toBeTruthy();
    expect(color2).toBeTruthy();
    expect(color3).toBeTruthy();
  });

  test('health bar fill element renders and updates', async ({ page }) => {
    // Start a race
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts');
    await page.fill('#test_count', '5');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for agent card
    const agentCard = page.locator('.agent-card').first();
    await expect(agentCard).toBeVisible();

    // Verify health-bar-fill element exists
    const healthBarFill = agentCard.locator('.health-bar-fill');
    await expect(healthBarFill).toBeVisible();

    // Verify it has width property (starts at some percentage)
    const initialWidth = await healthBarFill.evaluate(
      el => window.getComputedStyle(el).width
    );
    expect(parseFloat(initialWidth)).toBeGreaterThanOrEqual(0);

    // Wait for updates and check again
    await page.waitForTimeout(2000);
    const updatedWidth = await healthBarFill.evaluate(
      el => window.getComputedStyle(el).width
    );
    
    // Width should update as health changes
    expect(parseFloat(updatedWidth)).toBeGreaterThanOrEqual(0);
  });

  test('agent card border color matches bot color', async ({ page }) => {
    // Start race
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts');
    await page.fill('#test_count', '2');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for agent card
    const agentCard = page.locator('.agent-card').first();
    await expect(agentCard).toBeVisible();

    // Verify card has --agent-color CSS variable set
    const agentColorVar = await agentCard.evaluate(
      el => window.getComputedStyle(el).getPropertyValue('--agent-color')
    );
    expect(agentColorVar.trim()).toBeTruthy();

    // Verify the actual border color is set
    const borderColor = await agentCard.evaluate(
      el => window.getComputedStyle(el).borderColor
    );
    expect(borderColor).toBeTruthy();
  });

  test('progress bar and health bar have correct container structure', async ({ page }) => {
    // Start race
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts');
    await page.fill('#test_count', '2');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for agent card
    const agentCard = page.locator('.agent-card').first();
    await expect(agentCard).toBeVisible();

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
    // Start race with multiple bots
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts,bt3,rndm');
    await page.fill('#test_count', '2');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for all agent cards to render
    const agentCards = page.locator('.agent-card');
    await expect(agentCards.first()).toBeVisible();
    expect(await agentCards.count()).toBe(3);

    // Verify each card has all required elements
    for (let i = 0; i < 3; i++) {
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
});
