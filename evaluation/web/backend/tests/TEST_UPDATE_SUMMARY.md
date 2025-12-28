# Playwright Test Updates - Summary

## Issue: Slay-the-Saturn-42n
**Testing: Update Playwright tests for new UI layout**

## Changes Made

The Playwright tests in `test_web_ui.py` have been completely updated to work with the new UI layout that uses tab navigation and modern controls.

### Test File Location
`C:\Users\jperr\Documents\GitHub\Slay-the-Saturn\evaluation\web\backend\test_web_ui.py`

### Updated Tests

#### 1. `test_form_renders_and_inputs_accept_values()`
**Purpose**: Verify Config page form elements render and accept user input

**Key Changes**:
- ✅ Updated to verify Config tab is active by default
- ✅ Changed from text inputs to scenario button selection (`.scenario-button`)
- ✅ Updated enemies input locator to `#enemies-input`
- ✅ Changed bot selection from text input to searchable dropdown (`.bot-search-input`, `.bot-dropdown`, `.bot-option`)
- ✅ Updated test count and thread count from text inputs to range sliders (`#test-count-slider`, `#thread-count-slider`)
- ✅ Verified bot selection creates chips (`.selected-bot-chip`)
- ✅ Updated start button locator to `.start-race-button`

**Test Coverage**:
- Tab navigation defaults to Config
- All 6 scenario buttons render and are clickable
- Enemies text input accepts values
- Bot dropdown opens on search input focus
- Bot selection toggles and creates chips
- Sliders accept numeric values
- Start button is visible

#### 2. `test_start_race_and_dashboard()`
**Purpose**: Test complete race start workflow and navigation to dashboard

**Key Changes**:
- ✅ Renamed from `test_start_race_api_call()` to reflect broader scope
- ✅ Updated form interaction to use new controls (sliders, dropdown)
- ✅ Added bot selection via dropdown with chip creation
- ✅ Added dropdown close interaction
- ✅ Verified API call parameters match form input
- ✅ Added verification of automatic navigation to Race Dashboard tab after race start
- ✅ Mock API response to allow UI flow testing

**Test Coverage**:
- Config page form can be filled with new controls
- Start Race button triggers API call with correct JSON payload
- API call includes scenario, enemies, bot_names (array), test_count, thread_count
- UI automatically navigates to Race Dashboard tab after successful start
- Race Dashboard header appears after navigation

#### 3. `test_dashboard_tab_navigation()` (NEW)
**Purpose**: Test Race Dashboard tab behavior when no race is active

**Key Features**:
- ✅ Verifies manual tab navigation works (Config ↔ Dashboard)
- ✅ Tests "No active race" message appears on empty dashboard
- ✅ Verifies hint message directs users to Config tab
- ✅ Tests bi-directional tab switching

**Test Coverage**:
- Race Dashboard tab can be clicked and becomes active
- Empty state shows "No active race" message
- Hint text appears with correct guidance
- Can navigate back to Config tab

## Test Execution Requirements

### Prerequisites
1. **Web Server Must Be Running**:
   ```bash
   # Terminal 1: Start backend server
   cd evaluation/web/backend
   python web_main.py
   ```

2. **Frontend Must Be Built** (for production mode):
   ```bash
   cd evaluation/web/frontend
   npm install
   npm run build
   ```

3. **Playwright Must Be Installed**:
   ```bash
   pip install pytest playwright
   playwright install chromium
   ```

### Running Tests

**With pytest**:
```bash
cd C:\Users\jperr\Documents\GitHub\Slay-the-Saturn
pytest evaluation/web/backend/test_web_ui.py -v
```

**Manual execution**:
```bash
cd C:\Users\jperr\Documents\GitHub\Slay-the-Saturn\evaluation\web\backend
python test_web_ui.py
```

**Expected output** (when server is running):
```
Running Playwright Web UI tests...
============================================================
✓ Config tab is active by default
✓ All form elements found
✓ Scenario 0 selected by default
✓ Scenario buttons are clickable
✓ Enemies input accepts values
✓ Bot dropdown opens on search input click
✓ Bot selection creates chip
✓ Test count slider accepts values
✓ Thread count slider accepts values
✓ Start button is visible

✅ All Config page tests passed!

✓ Started on Config tab
✓ Race configuration complete
✓ Button shows 'Start Race' text
✓ API call made with correct parameters
✓ Navigated to Race Dashboard tab
✓ Race Dashboard loaded

✅ All race start and dashboard tests passed!

✓ Race Dashboard tab activated
✓ Shows 'No active race' message
✓ Shows hint to configure race from Config tab
✓ Can navigate back to Config tab

✅ All dashboard tab navigation tests passed!
```

## UI Component Locators Reference

### Config Page
- **Tab button**: `button.tab-button:has-text("Config")`
- **Scenario buttons**: `.scenario-button` (with `.active` class when selected)
- **Enemies input**: `#enemies-input`
- **Bot search input**: `.bot-search-input`
- **Bot dropdown**: `.bot-dropdown`
- **Bot option**: `.bot-option` (with `.selected` class when checked)
- **Bot chip**: `.selected-bot-chip`
- **Close dropdown**: `.close-dropdown`
- **Test count slider**: `#test-count-slider`
- **Thread count slider**: `#thread-count-slider`
- **Start button**: `button.start-race-button`

### Race Dashboard Page
- **Tab button**: `button.tab-button:has-text("Race Dashboard")`
- **Dashboard header**: `.dashboard-header h2:has-text("Race Dashboard")`
- **No race message**: `.no-race p:has-text("No active race")`
- **Hint message**: `.no-race-hint`
- **Agent cards**: `.agent-card` (when race is active)
- **Error panel toggle**: `.toggle-errors-button`

### Common Elements
- **Header**: `.App-header h1:has-text("Slay the Saturn")`
- **Connection status**: `.connection-status`
- **Tab navigation**: `.App-tabs`

## Key Differences from Old UI

| Feature | Old UI | New UI |
|---------|--------|--------|
| **Layout** | Single page with Race Monitor link | Tab-based navigation (Config ↔ Dashboard) |
| **Scenario selection** | Text input/dropdown `#scenario` | Button grid `.scenario-button` |
| **Bot selection** | Text input `#bot_names` | Searchable dropdown + chips `.bot-search-input` |
| **Test/Thread count** | Number inputs | Range sliders `#test-count-slider` |
| **Start button** | Generic selector | Specific class `.start-race-button` |
| **Dashboard access** | Link navigation | Tab click |

## Next Steps

To fully validate these tests:

1. **Start the web server**:
   ```bash
   python evaluation/web/backend/web_main.py
   ```

2. **Run the tests**:
   ```bash
   pytest evaluation/web/backend/test_web_ui.py -v
   ```

3. **Verify all tests pass** (should see 3 passing tests)

4. **Update beads issue**:
   ```bash
   bd update Slay-the-Saturn-42n --status closed
   ```

## Test Maintenance Notes

- Tests use `async_playwright` in headless mode (no browser window)
- All tests have proper cleanup in `finally` blocks
- Timeouts are used to allow UI rendering (adjust if needed on slower systems)
- Mock API responses prevent actual race execution during testing
- Tests verify both structure (elements exist) and behavior (interactions work)

## Related Files

- **Test file**: `evaluation/web/backend/test_web_ui.py`
- **Frontend components**:
  - `evaluation/web/frontend/src/App.jsx`
  - `evaluation/web/frontend/src/components/ConfigPage.jsx`
  - `evaluation/web/frontend/src/components/RaceDashboard.jsx`
- **Backend server**: `evaluation/web/backend/web_main.py`
- **Documentation**: `evaluation/web/README.md`
