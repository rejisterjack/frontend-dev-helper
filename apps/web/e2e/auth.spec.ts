import { expect, test } from "@playwright/test";

/**
 * Auth-flow smoke tests.
 *
 * Verifies the forms render correctly and that the dashboard is gated. Does
 * NOT exercise the full signup → email-verify → login flow because that
 * requires a working SMTP/Inbox and a real DB — those are integration tests,
 * tracked separately.
 */
test.describe("Auth gating", () => {
  test("dashboard redirects unauthenticated users to /login", async ({
    page,
  }) => {
    // Visit the protected route — middleware should redirect to /login.
    const response = await page.goto("/dashboard");
    // Either a 307 (redirect) or the final 200 on /login.
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/login/);
  });

  test("/licenses is gated", async ({ page }) => {
    await page.goto("/licenses");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/teams is gated", async ({ page }) => {
    await page.goto("/teams");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Login page", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();
  });

  test("links to signup and forgot-password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/signup",
    );
    await expect(
      page.getByRole("link", { name: /forgot password/i }),
    ).toHaveAttribute("href", "/forgot-password");
  });
});

test.describe("Signup page", () => {
  test("renders the signup form with all fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /create account/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Name")).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(
      page.getByPlaceholder("Password (min 8 characters)"),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Confirm password")).toBeVisible();
  });

  test("client-side validation rejects mismatched passwords", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.getByPlaceholder("Name").fill("Test User");
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page
      .getByPlaceholder("Password (min 8 characters)")
      .fill("password123");
    await page.getByPlaceholder("Confirm password").fill("different");
    await page.getByRole("button", { name: /sign up/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });
});
