import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketResponse } from "@crypto-terminal/contracts";
import { MarketScreener } from "./market-screener";
import * as api from "@/lib/api";

const { getPrimaryWatchlist } = vi.hoisted(() => ({
  getPrimaryWatchlist: vi.fn(async () => [] as string[]),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    addPrimaryWatchlistItem: vi.fn(),
    createSavedScreen: vi.fn(),
    getMarkets: vi.fn(),
    getPrimaryWatchlist,
    removePrimaryWatchlistItem: vi.fn(),
  };
});

vi.mock("./auth-provider", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Ada", email: "ada@example.com" },
    isPending: false,
  }),
}));

vi.mock("./auth-gate-dialog", () => ({
  AuthGateDialog: () => null,
}));

const marketData: MarketResponse = {
  data: [
    {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      image: "https://assets.coingecko.com/bitcoin.png",
      currentPrice: 100,
      marketCap: 1_000,
      marketCapRank: 1,
      totalVolume: 100,
      high24h: 110,
      low24h: 90,
      change24h: 1,
      change7d: 2,
      change30d: 3,
      ath: 120,
      athDistance: 16.7,
      lastUpdated: "2026-09-17T00:00:00.000Z",
    },
  ],
  overview: {
    totalMarketCap: 1_000,
    totalVolume: 100,
    bitcoinDominance: 50,
    advancing: 1,
    declining: 0,
    unchanged: 0,
  },
  pagination: { page: 1, perPage: 25, total: 1, totalPages: 1 },
  meta: {
    currency: "usd",
    updatedAt: "2026-09-17T00:00:00.000Z",
    stale: false,
    cache: "miss",
  },
};

describe("MarketScreener watchlist scope", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());
  it("persists the clicked add intent and reuses market results while toggling", async () => {
    const saved: string[] = [];
    getPrimaryWatchlist.mockImplementation(async () => [...saved]);
    vi.mocked(api.addPrimaryWatchlistItem).mockImplementation(
      async (coinId) => {
        saved.push(coinId);
        return { id: coinId, coinId, createdAt: new Date().toISOString() };
      },
    );
    vi.mocked(api.getMarkets).mockResolvedValue(marketData);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <MarketScreener
          initialData={marketData}
          initialQuery={{}}
          categories={[]}
        />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Watchlist" })).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add Bitcoin to watchlist" }),
    );
    await waitFor(() =>
      expect(api.addPrimaryWatchlistItem).toHaveBeenCalledWith("bitcoin"),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Remove Bitcoin from watchlist" }),
      ).toBeEnabled(),
    );
    expect(api.removePrimaryWatchlistItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Watchlist" }));
    await waitFor(() => expect(api.getMarkets).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Bitcoin/ })).toBeVisible(),
    );
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.click(screen.getByRole("button", { name: "Watchlist" }));
    expect(screen.getByRole("link", { name: /Bitcoin/ })).toBeVisible();
    expect(api.getMarkets).toHaveBeenCalledTimes(1);
    expect(saved).toEqual(["bitcoin"]);
    getPrimaryWatchlist.mockImplementation(async () => []);
  });
  it("shows an empty state instead of all markets for an empty watchlist", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MarketScreener
          initialData={marketData}
          categories={[]}
          initialQuery={{}}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: /Bitcoin/ })).toBeVisible();
    await waitFor(() => expect(getPrimaryWatchlist).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Watchlist" })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Watchlist" }));

    expect(
      screen.getByRole("heading", { name: "Your watchlist is empty" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Bitcoin/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
});
