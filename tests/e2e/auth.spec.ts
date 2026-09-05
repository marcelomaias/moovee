import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_TEST_USER,
  REGULAR_TEST_USER,
  type TestUser,
} from "../helpers/seed";

async function signIn(page: Page, user: TestUser) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();
  // Successful sign-in lands on "/" with the user visible in the navbar.
  await expect(page.getByText(user.email)).toBeVisible();
}

test("registers and signs in to reach the account page", async ({ page }) => {
  const email = `e2e-signup-${Date.now()}@test.local`;
  const password = "PlaywrightPassw0rd!";

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Signup User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign Up" }).click();

  await expect(page.getByText(email)).toBeVisible();

  // signUp auto-signs-in (better-auth mints a session); clear it so the
  // explicit sign-in flow below starts unauthenticated.
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
});

test("a regular user cannot access the admin dashboard", async ({ page }) => {
  await signIn(page, REGULAR_TEST_USER);

  await page.goto("/admin");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).not.toBeVisible();
});

test("an admin can access the admin dashboard", async ({ page }) => {
  await signIn(page, ADMIN_TEST_USER);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  await expect(page.getByText("System Registrations")).toBeVisible();
});

test("signing out revokes access to protected pages", async ({ page }) => {
  await signIn(page, REGULAR_TEST_USER);

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(REGULAR_TEST_USER.name) }).click();
  await page.getByRole("menuitem", { name: "Sign Out" }).click();

  // Sign-out is an async client call; wait for the observable logged-out state
  // before navigating, otherwise the goto aborts the in-flight sign-out request.
  await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in/);
});