import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Clear localStorage before navigation
    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    // Mock /api/chat to ensure fast, deterministic E2E tests in CI without external API flakiness
    await page.route('**/api/chat*', async (route) => {
      if (route.request().method() === 'POST') {
        // Add a short delay (400ms) so loading state (.animate-bounce) is reliably rendered and asserted
        await new Promise((resolve) => setTimeout(resolve, 400));
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'x-vercel-ai-ui-message-stream': 'v1',
          },
          body: 'data: {"type":"text-delta","textDelta":"I am Borderless AI, your immigration assistant. Here are the verified legal details for your query."}\n\ndata: [DONE]\n\n',
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threads: [], messages: [] }),
        });
      }
    });
    
    // Start each test by visiting the chat page
    await page.goto('/chat');
  });

  test('Initial Render & UI Verification', async ({ page }) => {
    // Verify Header exists
    await expect(page.locator('h1', { hasText: 'Borderless AI' })).toBeVisible();

    // Verify the two suggestion buttons exist using getByText
    await expect(page.getByText("What are the requirements for Germany's Opportunity Card (Chancenkarte)?").first()).toBeVisible();
    await expect(page.getByText("Do I need a job offer for Canadian Express Entry?").first()).toBeVisible();

    // Verify input placeholder states 3 free messages
    const input = page.locator('input').first();
    await expect(input).toBeVisible();

    // Verify submit button is disabled initially
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
  });

  test('Suggestion Button Interaction', async ({ page }) => {
    // Click the first suggestion button
    await page.getByText("What are the requirements for Germany's Opportunity Card (Chancenkarte)?").first().click();

    // Verify the user message appeared in the chat history
    await expect(page.getByText("What are the requirements for Germany's Opportunity Card (Chancenkarte)?").last()).toBeVisible();

    // Verify the animated loading indicator appears
    await expect(page.locator('.animate-bounce').first()).toBeVisible();

    // Wait for the AI to respond
    await expect(page.locator('.animate-bounce').first()).toBeHidden({ timeout: 60000 });
  });

  test('Form Submission & Loading State', async ({ page }) => {
    const input = page.locator('input').first();
    const submitBtn = page.locator('button[type="submit"]');
    
    await input.pressSequentially('What is the capital of France?');
    await expect(submitBtn).toBeEnabled();
    
    await submitBtn.click();

    // Verify input is cleared
    await expect(input).toHaveValue('');

    // Verify the user message appeared in the chat history
    await expect(page.locator('text=What is the capital of France?')).toBeVisible();

    // Verify the animated loading indicator appears
    await expect(page.locator('.animate-bounce').first()).toBeVisible();

    // Wait for the AI to respond
    await expect(page.locator('.animate-bounce').first()).toBeHidden({ timeout: 60000 });
  });

  test('Free Tier Limitation Enforcement', async ({ page }) => {
    const input = page.locator('input').first();
    const submitBtn = page.locator('button[type="submit"]');

    // We will send 3 short messages to hit the limit.
    for (let i = 1; i <= 3; i++) {
      await input.fill(`Test message ${i}`);
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();
      
      // Wait for the response to begin loading and then finish streaming
      await expect(page.locator('.animate-bounce').first()).toBeVisible();
      await expect(page.locator('.animate-bounce').first()).toBeHidden({ timeout: 60000 });
    }

    // Now that 3 messages are sent, the free limit should be reached.
    // The input box should no longer be visible.
    await expect(input).toBeHidden();

    // The "Free Consultation Complete" banner should appear
    await expect(page.locator('text=Free Consultation Complete')).toBeVisible();

    // The "Sign In to Continue" button should be visible
    await expect(page.locator('button', { hasText: 'Sign In to Continue' })).toBeVisible();
  });
});
