import { expect, test, type Page } from "@playwright/test";
import {
  ROOM_FIXTURE_ROOMS,
  ROOM_MEMBER_TEST_USER,
  ROOM_OWNER_TEST_USER,
  type TestUser,
} from "../helpers/seed";

test.describe.configure({ mode: "serial", timeout: 90_000 });

async function signIn(page: Page, user: TestUser) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText(user.email)).toBeVisible();
}

async function openRoom(page: Page, name: string, timeout = 30_000) {
  await page.goto("/rooms");
  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("link", { name: "← Back to rooms" })).toBeVisible({
    timeout,
  });
}

test("approving a suggestion moves it through the queue to history", async ({ page }) => {
  await signIn(page, ROOM_OWNER_TEST_USER);
  await openRoom(page, ROOM_FIXTURE_ROOMS.approval);

  await expect(page.getByText("The Grand Cinema")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();

  // Suggest is approved for the lone owner (majority) -> moves to the queue tab.
  // First server-action invocation warms up the dev build; give the refresh room.
  await expect(page.getByText("No pending suggestions.")).toBeVisible({
    timeout: 30_000,
  });

  // The hero must paint its metadata above the backdrop — text present in the
  // DOM alone passed before even when clipped below the hero's overflow box.
  await expect(
    page.getByRole("heading", { level: 2, name: "The Grand Cinema" }),
  ).toBeInViewport();

  await page.getByRole("tab", { name: /Queue/ }).click();
  // Scoped to the queue list: the hero also surfaces the movie's title.
  await expect(page.getByRole("list").getByText("The Grand Cinema")).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Watched" }).click();
  await expect(
    page.getByText("Nothing in the queue yet.", { exact: false }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("tab", { name: /History/ }).click();
  await expect(page.getByText("The Grand Cinema")).toBeVisible();
});

test("an invited member accepts on /account and appears in the room", async ({ browser }) => {
  const memberCtx = await browser.newContext();
  const memberPage = await memberCtx.newPage();
  await signIn(memberPage, ROOM_MEMBER_TEST_USER);

  await memberPage.goto("/account");
  await expect(memberPage.getByRole("heading", { name: "Room Invites" })).toBeVisible();
  await expect(memberPage.getByText(ROOM_FIXTURE_ROOMS.invite)).toBeVisible();
  await memberPage.getByRole("button", { name: "Accept" }).click();
  await expect(memberPage.getByText(ROOM_FIXTURE_ROOMS.invite)).not.toBeVisible();
  await memberCtx.close();

  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await signIn(ownerPage, ROOM_OWNER_TEST_USER);
  await openRoom(ownerPage, ROOM_FIXTURE_ROOMS.invite);
  await ownerPage.getByRole("tab", { name: /Members/ }).click();
  await expect(ownerPage.getByText("Room Member")).toBeVisible();
  await ownerCtx.close();
});

test("the owner can change the approval mode", async ({ page }) => {
  await signIn(page, ROOM_OWNER_TEST_USER);
  await openRoom(page, ROOM_FIXTURE_ROOMS.settings);

  await page.getByRole("tab", { name: /Members/ }).click();
  await expect(page.getByRole("heading", { name: "Approval Rules" })).toBeVisible();
  await page.locator("#approval-mode").selectOption("unanimous");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("#approval-mode")).toHaveValue("unanimous");
});

test("an owner creates a room and sees the owner-only Members tab", async ({ page }) => {
  const name = `E2E Room ${Date.now()}`;
  await signIn(page, ROOM_OWNER_TEST_USER);

  await page.goto("/rooms/new");
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Create Room" }).click();

  // createRoom redirects into the freshly-created room after the insert.
  await page.waitForURL(/\/rooms\/[0-9a-f-]+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page.getByRole("tab", { name: /Members/ }).click();
  // The owner's row shows the "You" badge; the navbar button also contains the name,
  // so scope the assertion to the member row itself.
  await expect(
    page.locator("li").filter({ hasText: "Room Owner" }).getByText("You"),
  ).toBeVisible();
});