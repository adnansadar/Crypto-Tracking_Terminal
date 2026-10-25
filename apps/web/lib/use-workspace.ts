"use client";

import * as api from "./api";
import { guestWorkspace } from "./guest-workspace";
import { useAuth } from "@/components/auth-provider";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GUEST_WORKSPACE_KEY } from "./guest-workspace";

export function useWorkspace() {
  const { user, isPending } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    function refresh(event: StorageEvent) {
      if (!user && (event.key === GUEST_WORKSPACE_KEY || event.key === null)) {
        void queryClient.invalidateQueries({ queryKey: ["workspace"] });
      }
    }
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [user, queryClient]);
  return {
    operations: user ? api : guestWorkspace,
    owner: user?.id ?? "guest",
    isPending,
    isGuest: !user,
  };
}
