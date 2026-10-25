import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("markets render with no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find signal in the market." }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("market controls apply automatically and menus close outside", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const categoryRequest = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.endsWith("/v1/markets") &&
      url.searchParams.get("category") === "bitcoin-ecosystem"
    );
  });
  await page.getByLabel("Category").selectOption("bitcoin-ecosystem");
  await expect(page).toHaveURL(/category=bitcoin-ecosystem/);
  expect((await categoryRequest).ok()).toBe(true);

  const searchRequest = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.endsWith("/v1/markets") &&
      url.searchParams.get("search") === "bitcoin"
    );
  });
  await page.getByPlaceholder("Search assets or symbols").fill("bitcoin");
  await expect(page).toHaveURL(/search=bitcoin/);
  expect((await searchRequest).ok()).toBe(true);

  await page.getByLabel("Currency", { exact: true }).selectOption("inr");
  await expect(page).toHaveURL(/currency=inr/);

  const filters = page.locator("details").filter({ hasText: "Filters" });
  await filters.locator("summary").click();
  await expect(filters).toHaveAttribute("open", "");
  await page
    .getByRole("heading", { name: "Find signal in the market." })
    .click();
  await expect(filters).not.toHaveAttribute("open", "");

  const columns = page.locator("details").filter({ hasText: "Columns" });
  await columns.locator("summary").click();
  await expect(columns).toHaveAttribute("open", "");
  await page
    .getByRole("heading", { name: "Find signal in the market." })
    .click();
  await expect(columns).not.toHaveAttribute("open", "");
});

test("comparison workflow loads", async ({ page }) => {
  await page.goto("/compare");
  await expect(
    page.getByRole("heading", { name: "Compare return and risk." }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Cryptocurrencies" }),
  ).toBeVisible();
  await expect(page.getByLabel("Chart metric")).toHaveValue("normalizedReturn");
});

test("guest watchlist survives rapid scope changes and reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Add Bitcoin to watchlist", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remove Bitcoin from watchlist",
      exact: true,
    }),
  ).toBeEnabled();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Watchlist", exact: true }).click();
    await expect(page.getByRole("link", { name: /Bitcoin #/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ethereum #/ })).toHaveCount(0);
    await page.getByRole("button", { name: "All", exact: true }).click();
  }
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Remove Bitcoin from watchlist",
      exact: true,
    }),
  ).toBeEnabled();
});

test("guest workspace saves watchlists and screens across reloads", async ({
  page,
}) => {
  await page.goto("/workspace");
  await expect(
    page.getByRole("heading", { name: "Watchlists", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept("Guest collection"));
  await page.getByRole("button", { name: "New list" }).click();
  await expect(
    page.getByRole("heading", { name: "Guest collection" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Guest collection" }),
  ).toBeVisible();

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const saveScreen = page.getByRole("button", { name: /Save screen/ });
  page.once("dialog", (dialog) => dialog.accept("Guest screen"));
  await saveScreen.click();
  await page.goto("/workspace");
  await expect(page.getByText("Guest screen", { exact: true })).toBeVisible();
});

test("legacy guest data is removed while theme preference survives", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("cryptoTerminal.theme", "light");
    localStorage.setItem("cryptoTerminal.watchlist", '["bitcoin"]');
    localStorage.setItem("cryptoTerminal.notes", "[]");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        theme: localStorage.getItem("cryptoTerminal.theme"),
        watchlist: localStorage.getItem("cryptoTerminal.watchlist"),
        notes: localStorage.getItem("cryptoTerminal.notes"),
      })),
    )
    .toEqual({ theme: "light", watchlist: null, notes: null });
});
