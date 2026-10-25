import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResearchNote } from "./research-note";
import { guestWorkspace } from "@/lib/guest-workspace";

const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  getNotes: vi.fn(async () => [
    {
      coinId: "bitcoin",
      body: "Account note",
      updatedAt: new Date().toISOString(),
    },
  ]),
}));
vi.mock("./auth-provider", () => ({
  useAuth: () => ({ user: state.user, isPending: false }),
}));
vi.mock("@/lib/api", () => ({ getResearchNotes: state.getNotes }));

beforeEach(() => {
  localStorage.clear();
  state.user = null;
  vi.clearAllMocks();
});

describe("research workspace ownership", () => {
  it("saves guest notes and switches back after sign-out without exposing account notes", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const ui = () => (
      <QueryClientProvider client={client}>
        <ResearchNote coinId="bitcoin" coinName="Bitcoin" />
      </QueryClientProvider>
    );
    const view = render(ui());
    const editor = await screen.findByRole("textbox", {
      name: "Research note for Bitcoin",
    });
    fireEvent.change(editor, { target: { value: "Guest note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    await screen.findByRole("button", { name: "Saved" });
    expect((await guestWorkspace.getResearchNotes())[0].body).toBe(
      "Guest note",
    );
    expect(state.getNotes).not.toHaveBeenCalled();
    state.user = { id: "account-1" };
    view.rerender(ui());
    await waitFor(() =>
      expect(screen.getByRole("textbox")).toHaveValue("Account note"),
    );
    state.user = null;
    view.rerender(ui());
    await waitFor(() =>
      expect(screen.getByRole("textbox")).toHaveValue("Guest note"),
    );
  });
});
