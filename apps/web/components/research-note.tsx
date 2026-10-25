"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/use-workspace";

export function ResearchNote({
  coinId,
  coinName,
}: {
  coinId: string;
  coinName: string;
}) {
  const { operations, owner, isPending: authPending } = useWorkspace();
  const notes = useQuery({
    queryKey: ["workspace", "notes", owner],
    queryFn: operations.getResearchNotes,
    enabled: !authPending,
  });

  if (authPending || notes.isLoading)
    return (
      <section className="note-panel">Loading your research note…</section>
    );

  if (notes.isError)
    return (
      <section className="note-panel">
        <div>
          <p className="eyebrow">Private workspace</p>
          <h2>Research note unavailable</h2>
        </div>
        <p>Please check your connection and refresh the page.</p>
      </section>
    );

  const note = notes.data?.find((item) => item.coinId === coinId);
  return (
    <ResearchNoteEditor
      key={`${owner}:${coinId}`}
      coinId={coinId}
      coinName={coinName}
      userId={owner}
      initialBody={note?.body ?? ""}
    />
  );
}

function ResearchNoteEditor({
  coinId,
  coinName,
  userId,
  initialBody,
}: {
  coinId: string;
  coinName: string;
  userId: string;
  initialBody: string;
}) {
  const { operations, isGuest } = useWorkspace();
  const queryClient = useQueryClient();
  const [body, setBody] = useState(initialBody);
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: async (value: string) => {
      if (value.trim()) await operations.saveResearchNote(coinId, value);
      else await operations.deleteResearchNote(coinId);
    },
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({
        queryKey: ["workspace", "notes", userId],
      });
    },
  });

  return (
    <section className="note-panel">
      <div>
        <p className="eyebrow">Private workspace</p>
        <h2>Research note</h2>
        <p>
          Capture your thesis, risks, and follow-up questions about {coinName}.
          {isGuest && " Saved in this browser only."}
        </p>
      </div>
      <label>
        <span className="sr-only">Research note for {coinName}</span>
        <textarea
          value={body}
          maxLength={5000}
          onChange={(event) => {
            setBody(event.target.value);
            setSaved(false);
          }}
          placeholder="Example: Revisit token supply changes before comparing valuation…"
        />
      </label>
      <div>
        <small>
          {mutation.isError
            ? "Could not save. Try again."
            : `${body.length} / 5,000`}
        </small>
        <button
          className="primary-button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(body)}
        >
          {mutation.isPending ? "Saving…" : saved ? "Saved" : "Save note"}
        </button>
      </div>
    </section>
  );
}
