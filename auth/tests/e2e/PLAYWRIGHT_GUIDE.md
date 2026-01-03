# Playwright Testing Guide

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [Creating Tests](#creating-tests)
3. [Running Tests](#running-tests)
4. [Playwright Codegen](#playwright-codegen)
5. [Test Structure](#test-structure)
6. [Common Assertions](#common-assertions)
7. [Debugging](#debugging)
8. [Configuration](#configuration)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

---

## Installation & Setup

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Install Playwright
```bash
npm install --save-dev @playwright/test
```

### Install Browsers
```bash
npx playwright install
```

### Project Structure
```
auth/
├── playwright.config.ts
├── tests/
│   ├── e2e/
│   │   ├── login.spec.ts
│   │   ├── staff-registration.spec.ts
│   │   └── employee-login.spec.ts
│   └── fixtures/
│       └── auth-fixtures.ts
└── test-results/
```

---

## Creating Tests

### Basic Test File Structure
```typescript
// tests/e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test('basic example test', async ({ page }) => {
  // Navigate to URL
  await page.goto('http://localhost:8000/staff/login/');
  
  // Interact with elements
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  
  // Click button
  await page.click('button[type="submit"]');
  
  // Assert results
  await expect(page).toHaveURL(/.*dashboard/);
});
```

### Test Naming Convention
- Use `.spec.ts` extension
- Clear, descriptive test names
- Group related tests in the same file
- Use `describe()` for grouping (optional)

### Example: Login Test
```typescript
import { test, expect } from '@playwright/test';

test.describe('Staff Login', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:8000/staff/login/');
    
    // Fill login form
    await page.fill('input[name="email"]', 'burnthisway22@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/.*dashboard|welcome/, { timeout: 10000 });
    
    // Verify login success
    await expect(page).toHaveURL(/.*dashboard|welcome/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:8000/staff/login/');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check for error message
    const error = page.locator('.toast-error, .error-message');
    await expect(error).toBeVisible();
  });
});
```

---

## Running Tests

### Quick Reference
```bash
# Run all tests (headless)
npx playwright test

# Run specific test file
npx playwright test tests/e2e/login.spec.ts

# Run tests with UI dashboard
npx playwright test --ui

# Run with browser visible (headed mode)
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests matching pattern
npx playwright test -g "login"

# Run with verbose output
npx playwright test --reporter=verbose
```

### Running with NPM Scripts
Check `package.json` for configured scripts:
```json
{
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:login": "playwright test tests/e2e/login.spec.ts"
  }
}
```

Run with:
```bash
npm test
npm run test:headed
npm run test:ui
```

### Test Results
After tests run, view results:
```bash
# Open HTML report
npx playwright show-report

# Report location: playwright-report/index.html
```

---

## Playwright Codegen

Playwright Codegen is a tool that records your interactions with a website and generates test code automatically.

### Basic Usage
```bash
# Start codegen
npx playwright codegen http://localhost:8000/staff/login/

# With specific browser
npx playwright codegen --browser=firefox http://localhost:8000/staff/login/

# Save to file while recording
npx playwright codegen -o tests/e2e/generated-test.spec.ts http://localhost:8000/staff/login/
```

### How It Works
1. Codegen opens a browser window and an inspector
2. Click/type interactions on the website
3. Inspector shows generated code in real-time
4. Copy code to your test file

### Codegen Workflow
```bash
# 1. Start recording
npx playwright codegen http://localhost:8000/staff/login/

# 2. In the browser window:
#    - Click email field
#    - Type your email
#    - Click password field
#    - Type your password
#    - Click login button
#    - Wait for page to load

# 3. In the Inspector window:
#    - See generated code
#    - Copy it to your test file

# 4. Enhance the generated code with assertions
```

### Generated Code Example
```typescript
// Generated by Codegen (raw output)
await page.goto('http://localhost:8000/staff/login/');
await page.click('input[name="email"]');
await page.fill('input[name="email"]', 'test@example.com');
await page.click('input[name="password"]');
await page.fill('input[name="password"]', 'password123');
await page.click('button[type="submit"]');

// Add your own assertions
await expect(page).toHaveURL(/.*dashboard/);
```

### Tips for Codegen
- Record slowly and deliberately
- Focus on the happy path first
- Add error checks and assertions after recording
- Use the Inspector to refine selectors
- Test with different data types

---

## Test Structure

### Page Object Model (Recommended)
Organize tests with Page Object Model for reusability:

```typescript
// pages/LoginPage.ts
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('http://localhost:8000/staff/login/');
  }

  async fillEmail(email: string) {
    await this.page.fill('input[name="email"]', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('input[name="password"]', password);
  }

  async clickLogin() {
    await this.page.click('button[type="submit"]');
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  async getErrorMessage() {
    return this.page.locator('.toast-error');
  }
}
```

### Using Page Objects in Tests
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('staff login flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');
  
  await expect(page).toHaveURL(/.*dashboard/);
});
```

---

## Common Assertions

### URL & Navigation
```typescript
// Check URL
await expect(page).toHaveURL('http://localhost:8000/dashboard/');
await expect(page).toHaveURL(/.*dashboard/);

// Wait for URL
await page.waitForURL('**/dashboard/**');
```

### Element Visibility
```typescript
// Check if visible
await expect(element).toBeVisible();
await expect(element).toBeHidden();
await expect(element).toBeEnabled();
await expect(element).toBeDisabled();
```

### Content Checks
```typescript
// Check text content
await expect(element).toContainText('Login');
await expect(element).toHaveText('Welcome');
await expect(element).toHaveValue('test@example.com');

// Exact match
await expect(element).toHaveText('Login', { exact: true });
```

### Classes & Attributes
```typescript
// Check class
await expect(element).toHaveClass('active');
await expect(element).toHaveClass(/active|selected/);

// Check attribute
await expect(element).toHaveAttribute('type', 'submit');
```

### Count
```typescript
// Count elements
await expect(page.locator('button')).toHaveCount(3);
```

---

## Debugging

### Debug Mode
```bash
# Run with Playwright Inspector
npx playwright test --debug

# Step through code:
# - Press 'Step Over' to go to next line
# - Inspect variables
# - See live preview of page
```

### Screenshots & Videos
```typescript
test('debug test', async ({ page }) => {
  await page.goto('http://localhost:8000/staff/login/');
  
  // Take screenshot
  await page.screenshot({ path: 'screenshot.png' });
  
  // Take screenshot of element
  const element = page.locator('button');
  await element.screenshot({ path: 'button.png' });
});
```

### Console Logs
```typescript
test('with logging', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:8000/staff/login/');
  // Page console logs will print
});
```

### Trace Viewer
```bash
# Run tests with tracing
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Enable Debug Logs
```bash
# Show debug information
DEBUG=pw:api npx playwright test

# More verbose
DEBUG=pw:* npx playwright test
```

---

## Configuration

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  
  // Test timeout
  timeout: 30 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 5000,
  },
  
  // Retry failed tests
  retries: 2,
  
  // Run tests in parallel (or single worker for debugging)
  workers: 4,
  
  // Reporter
  reporter: [
    ['html'],
    ['list'],
  ],
  
  // Shared settings for all
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  // Browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  // Global setup/teardown
  webServer: {
    command: 'python manage.py runserver',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Best Practices

### 1. Wait for Elements Properly
```typescript
// Good - Wait for element to be ready
await page.waitForSelector('button[type="submit"]');
await page.click('button[type="submit"]');

// Better - Use Playwright's auto-waiting
await page.click('button[type="submit"]');

// Bad - Hard coded wait
await page.waitForTimeout(1000); // Avoid this
```

### 2. Use Locators
```typescript
// Good - Playwright locator (recommended)
const button = page.locator('button[type="submit"]');
await button.click();

// Acceptable - CSS selectors
const button = page.querySelector('button[type="submit"]');

// Avoid - XPath (unless necessary)
const button = page.locator('//button[@type="submit"]');
```

### 3. Meaningful Test Names
```typescript
// Good
test('should login successfully with valid credentials', async ({ page }) => {

// Avoid
test('test login', async ({ page }) => {
```

### 4. One Assertion Per Test (or related assertions)
```typescript
// Good - Focused test
test('login redirects to dashboard', async ({ page }) => {
  await loginPage.login('test@example.com', 'password123');
  await expect(page).toHaveURL(/.*dashboard/);
});

// Avoid - Multiple unrelated assertions
test('login and check profile', async ({ page }) => {
  // Login
  // Check dashboard
  // Check profile page
  // Check user settings
  // Check logout button
});
```

### 5. Use Fixtures for Common Setup
```typescript
// tests/fixtures/auth-fixtures.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login
    await page.goto('http://localhost:8000/staff/login/');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Use
    await use(page);
    
    // Teardown: Logout
    await page.click('[data-testid="logout-button"]');
  },
});
```

### 6. Handle Dynamic Content
```typescript
// Wait for element with timeout
await page.waitForSelector('.notification', { timeout: 5000 });

// Wait for element to disappear
await page.waitForSelector('.loading', { state: 'hidden' });

// Wait for function/condition
await page.waitForFunction(() => document.querySelectorAll('li').length > 3);
```

---

## Examples

### Complete Login Test Suite
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8000';

test.describe('Staff Login Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login before each test
    await page.goto(`${BASE_URL}/staff/login/`);
  });

  test('should display login form', async ({ page }) => {
    // Verify form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill form
    await page.fill('input[name="email"]', 'burnthisway22@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify success
    await page.waitForURL(/.*dashboard|welcome/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard|welcome/);
  });

  test('should show error with invalid email', async ({ page }) => {
    // Fill with invalid email
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Check for error
    const error = page.locator('.error-message, .toast-error');
    await expect(error).toBeVisible();
  });

  test('should require both email and password', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check validation
    const emailInput = page.locator('input[name="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    
    expect(isInvalid).toBeTruthy();
  });

  test('should clear form after failed login', async ({ page }) => {
    // First attempt
    await page.fill('input[name="email"]', 'test1@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for error
    await page.waitForSelector('.error-message');
    
    // Verify form is still visible for retry
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();
  });
});
```

### Employee Login Test
```typescript
// tests/e2e/employee-login.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8000';

test('employee login should redirect to HDTS_SYSTEM_URL', async ({ page }) => {
  // Navigate to employee login
  await page.goto(`${BASE_URL}/employee/login/`);
  
  // Fill credentials
  await page.fill('input[name="email"]', 'john.doe@example.com');
  await page.fill('input[name="password"]', 'TestPassword123!');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect to HDTS system
  // Should redirect to URL from HDTS_SYSTEM_URL env variable
  await page.waitForURL(/.*localhost:5173|hdts/);
  
  // Verify we're on HDTS system
  expect(page.url()).toMatch(/5173|hdts/);
});
```

### With Fixtures
```typescript
// tests/e2e/authenticated.spec.ts
import { test, expect } from '@playwright/test';

// Setup authenticated user
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Login
  await page.goto('http://localhost:8000/staff/login/');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Save state
  await context.storageState({ path: 'auth.json' });
  await context.close();
});

test('should access dashboard when authenticated', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'auth.json' });
  const page = await context.newPage();
  
  // Go directly to protected page
  await page.goto('http://localhost:8000/dashboard/');
  
  // Should not redirect to login
  await expect(page).toHaveURL(/.*dashboard/);
  
  await context.close();
});
```

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `npx playwright test` | Run all tests headless |
| `npx playwright test --headed` | Run with visible browser |
| `npx playwright test --ui` | Open UI dashboard |
| `npx playwright test --debug` | Run with inspector |
| `npx playwright codegen URL` | Record interactions |
| `npx playwright show-report` | View HTML report |
| `npx playwright show-trace` | View trace recording |
| `npx playwright install` | Install browsers |
| `npx playwright install-deps` | Install system deps |

---

## Troubleshooting

### Test Timeout
```typescript
// Increase test timeout
test.setTimeout(60 * 1000); // 60 seconds

// Increase specific action timeout
await page.click('button', { timeout: 10000 });
```

### Element Not Found
```typescript
// Debug selector
const element = page.locator('button[type="submit"]');
console.log(await element.count()); // Check if element exists
console.log(await element.isVisible()); // Check if visible
```

### Flaky Tests
```typescript
// Wait for element state
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForFunction(() => 
  document.querySelector('button[type="submit"]')?.disabled === false
);
```

### Port Already in Use
```bash
# Kill process using port 8000
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :8000
kill -9 <PID>
```

---

## Additional Resources

- [Playwright Official Docs](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Codegen Docs](https://playwright.dev/docs/codegen)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

## Quick Start Checklist

- [ ] Install Playwright: `npm install --save-dev @playwright/test`
- [ ] Install browsers: `npx playwright install`
- [ ] Check `playwright.config.ts` is configured
- [ ] Create first test in `tests/e2e/`
- [ ] Use codegen to record interactions
- [ ] Add assertions and error checks
- [ ] Run tests: `npx playwright test`
- [ ] View results: `npx playwright show-report`
- [ ] Set up fixtures for common setup
- [ ] Add tests to CI/CD pipeline
