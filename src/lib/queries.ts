import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, streamCoach } from "./api";
import type { Grade } from "./srs";
import type { ChatMessage, Session, Settings, Technique } from "./types";

// ---------- Sessions ----------

export function useSessions() {
  return useQuery({ queryKey: ["sessions"], queryFn: () => api.get<Session[]>("/api/sessions") });
}

export function useSessionMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sessions"] });

  const create = useMutation({
    mutationFn: (session: Omit<Session, "id" | "createdAt">) => api.post<Session>("/api/sessions", session),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, ...session }: Omit<Session, "createdAt"> & { id: number }) =>
      api.put<Session>(`/api/sessions/${id}`, session),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.del<void>(`/api/sessions/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// ---------- Techniques ----------

export function useTechniques() {
  return useQuery({ queryKey: ["techniques"], queryFn: () => api.get<Technique[]>("/api/techniques") });
}

type TechniqueInput = Pick<Technique, "name" | "position" | "type" | "steps" | "details" | "mistakes" | "videoUrl">;

export function useTechniqueMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["techniques"] });

  const create = useMutation({
    mutationFn: (technique: TechniqueInput) => api.post<Technique>("/api/techniques", technique),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, ...technique }: TechniqueInput & { id: number }) =>
      api.put<Technique>(`/api/techniques/${id}`, technique),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.del<void>(`/api/techniques/${id}`),
    onSuccess: invalidate,
  });

  const review = useMutation({
    mutationFn: ({ id, grade }: { id: number; grade: Grade }) =>
      api.post<Technique>(`/api/techniques/${id}/review`, { grade }),
    onSuccess: invalidate,
  });

  return { create, update, remove, review };
}

// ---------- Settings ----------

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/api/settings") });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Settings) => api.put<Settings>("/api/settings", settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

// ---------- Coach / chat ----------

export function useChat() {
  return useQuery({ queryKey: ["chat"], queryFn: () => api.get<ChatMessage[]>("/api/chat") });
}

export function useClearChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.del<void>("/api/chat"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat"] }),
  });
}

export { streamCoach };
