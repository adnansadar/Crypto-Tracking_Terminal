import { z } from "zod";
import {
  watchlistSchema,
  savedScreenSchema,
  researchNoteSchema,
} from "@crypto-terminal/contracts";

export const GUEST_WORKSPACE_KEY = "cryptoTerminal.guestWorkspace.v1";
const workspaceSchema = z.object({
  watchlists: z.array(watchlistSchema),
  screens: z.array(savedScreenSchema),
  notes: z.array(researchNoteSchema),
});
type Workspace = z.infer<typeof workspaceSchema>;

function read(): Workspace {
  const stored = window.localStorage.getItem(GUEST_WORKSPACE_KEY);
  if (!stored) return { watchlists: [], screens: [], notes: [] };
  return workspaceSchema.parse(JSON.parse(stored));
}

function update<T>(change: (workspace: Workspace) => T): T {
  const workspace = read();
  const result = change(workspace);
  // Let storage failures reach the UI rather than claiming the work was saved.
  window.localStorage.setItem(GUEST_WORKSPACE_KEY, JSON.stringify(workspace));
  return result;
}

const timestamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export const guestWorkspace = {
  async getPrimaryWatchlist() {
    return (
      read()
        .watchlists.find((list) => list.name === "My watchlist")
        ?.items.map((item) => item.coinId) ?? []
    );
  },
  async addPrimaryWatchlistItem(coinId: string) {
    return update((workspace) => {
      let list = workspace.watchlists.find(
        (item) => item.name === "My watchlist",
      );
      if (!list) {
        list = {
          id: id(),
          name: "My watchlist",
          items: [],
          createdAt: timestamp(),
          updatedAt: timestamp(),
        };
        workspace.watchlists.push(list);
      }
      let item = list.items.find((entry) => entry.coinId === coinId);
      if (!item) {
        item = { id: id(), coinId, createdAt: timestamp() };
        list.items.push(item);
      }
      return item;
    });
  },
  async removePrimaryWatchlistItem(coinId: string) {
    update((workspace) => {
      const list = workspace.watchlists.find(
        (item) => item.name === "My watchlist",
      );
      if (list)
        list.items = list.items.filter((item) => item.coinId !== coinId);
    });
  },
  async getWatchlists() {
    return read().watchlists;
  },
  async createWatchlist(name: string) {
    return update((workspace) => {
      const list = watchlistSchema.parse({
        id: id(),
        name,
        items: [],
        createdAt: timestamp(),
        updatedAt: timestamp(),
      });
      if (workspace.watchlists.some((item) => item.name === list.name))
        throw new Error("A watchlist with this name already exists");
      workspace.watchlists.push(list);
      return list;
    });
  },
  async deleteWatchlist(listId: string) {
    update((workspace) => {
      workspace.watchlists = workspace.watchlists.filter(
        (list) => list.id !== listId || list.name === "My watchlist",
      );
    });
  },
  async addWatchlistItem(listId: string, coinId: string) {
    return update((workspace) => {
      const list = workspace.watchlists.find((item) => item.id === listId);
      if (!list) throw new Error("Watchlist not found");
      const existing = list.items.find((item) => item.coinId === coinId);
      if (existing) return existing;
      const item = { id: id(), coinId, createdAt: timestamp() };
      list.items.push(item);
      return item;
    });
  },
  async getSavedScreens() {
    return read().screens;
  },
  async createSavedScreen(name: string, query: Record<string, string>) {
    return update((workspace) => {
      const screen = savedScreenSchema.parse({
        id: id(),
        name,
        query,
        createdAt: timestamp(),
        updatedAt: timestamp(),
      });
      workspace.screens.push(screen);
      return screen;
    });
  },
  async deleteSavedScreen(screenId: string) {
    update((workspace) => {
      workspace.screens = workspace.screens.filter(
        (screen) => screen.id !== screenId,
      );
    });
  },
  async getResearchNotes() {
    return read().notes;
  },
  async saveResearchNote(coinId: string, body: string) {
    return update((workspace) => {
      const note = researchNoteSchema.parse({
        coinId,
        body,
        updatedAt: timestamp(),
      });
      workspace.notes = workspace.notes.filter(
        (item) => item.coinId !== coinId,
      );
      workspace.notes.push(note);
      return note;
    });
  },
  async deleteResearchNote(coinId: string) {
    update((workspace) => {
      workspace.notes = workspace.notes.filter(
        (item) => item.coinId !== coinId,
      );
    });
  },
};
