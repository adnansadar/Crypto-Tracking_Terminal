import { beforeEach, describe, expect, it, vi } from "vitest";
import { guestWorkspace, GUEST_WORKSPACE_KEY } from "./guest-workspace";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("guest workspace persistence", () => {
  it("persists all features and removes individual items", async () => {
    await guestWorkspace.addPrimaryWatchlistItem("bitcoin");
    await guestWorkspace.addPrimaryWatchlistItem("bitcoin");
    expect(await guestWorkspace.getPrimaryWatchlist()).toEqual(["bitcoin"]);
    const list = await guestWorkspace.createWatchlist("Layer ones");
    await guestWorkspace.addWatchlistItem(list.id, "ethereum");
    const screen = await guestWorkspace.createSavedScreen("Momentum", {
      minChange: "5",
    });
    await guestWorkspace.saveResearchNote("bitcoin", "Review supply");
    expect(
      JSON.parse(localStorage.getItem(GUEST_WORKSPACE_KEY)!).notes[0].body,
    ).toBe("Review supply");
    expect(
      (await guestWorkspace.getWatchlists()).find((item) => item.id === list.id)
        ?.items[0].coinId,
    ).toBe("ethereum");
    expect(await guestWorkspace.getSavedScreens()).toEqual([screen]);
    await guestWorkspace.removePrimaryWatchlistItem("bitcoin");
    await guestWorkspace.deleteWatchlist(list.id);
    await guestWorkspace.deleteSavedScreen(screen.id);
    await guestWorkspace.deleteResearchNote("bitcoin");
    expect(await guestWorkspace.getPrimaryWatchlist()).toEqual([]);
    expect(await guestWorkspace.getSavedScreens()).toEqual([]);
    expect(await guestWorkspace.getResearchNotes()).toEqual([]);
  });

  it("reports blocked storage and preserves invalid stored data", async () => {
    localStorage.setItem(GUEST_WORKSPACE_KEY, "invalid");
    await expect(guestWorkspace.getWatchlists()).rejects.toThrow();
    expect(localStorage.getItem(GUEST_WORKSPACE_KEY)).toBe("invalid");
    localStorage.clear();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage full");
    });
    await expect(
      guestWorkspace.saveResearchNote("bitcoin", "Draft"),
    ).rejects.toThrow("Storage full");
  });
});
