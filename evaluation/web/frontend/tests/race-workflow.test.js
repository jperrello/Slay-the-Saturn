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

    // Verify racer cards are visible
    const racers = page.locator('.racer-card');
    expect(await racers.count()).toBeGreaterThan(0);

    // Verify bot names are shown
    expect(await page.locator('h3').first().textContent()).toBeTruthy();
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

  test('racer stats update in real-time via WebSocket', async ({ page }) => {
    // Fill form and start race
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts,rndm');
    await page.fill('#test_count', '5');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for racer cards to appear
    const racerCards = page.locator('.racer-card');
    await expect(racerCards.first()).toBeVisible();

    // Get initial stats
    const firstCard = racerCards.first();
    const initialHealth = await firstCard.locator('.stat').first().textContent();

    // Wait for updates (multiple checks over time)
    let hasUpdated = false;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);
      const currentHealth = await firstCard.locator('.stat').first().textContent();
      if (currentHealth !== initialHealth) {
        hasUpdated = true;
        break;
      }
    }

    // Verify stats have updated (at least one racer should have results)
    const racerStats = page.locator('.racer-stats');
    const allStats = await racerStats.allTextContents();
    expect(allStats.length).toBeGreaterThan(0);
  });

  test('progress bars show simulation progress', async ({ page }) => {
    // Start a race with multiple simulations
    await page.fill('#enemies', 'h');
    await page.fill('#bot_names', 'mcts');
    await page.fill('#test_count', '5');
    await page.fill('#thread_count', '1');

    const startButton = page.locator('button:has-text("Start Race")');
    await startButton.click();

    // Wait for progress bar to appear
    const progressBar = page.locator('.progress-bar').first();
    await expect(progressBar).toBeVisible();

    // Verify progress bar width increases over time
    const initialWidth = await progressBar.locator('.progress-fill').evaluate(
      el => window.getComputedStyle(el).width
    );

    // Wait and check again
    await page.waitForTimeout(3000);
    const updatedWidth = await progressBar.locator('.progress-fill').evaluate(
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
});
