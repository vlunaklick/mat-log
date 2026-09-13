import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CatalogEntry,
  CoachMessage,
  Conversation,
  Draft,
  Proposal,
  ProposalPayload,
  TrainingState,
} from "@/lib/training";
export function useTraining() {
  return useQuery({
    queryKey: ["training"],
    queryFn: () => api.get<TrainingState>("/api/training/state"),
  });
}
export function useDrafts() {
  return useQuery({
    queryKey: ["drafts"],
    queryFn: () => api.get<Draft[]>("/api/training/drafts"),
  });
}
export function useDraft(id: string) {
  return useQuery({
    queryKey: ["drafts", id],
    queryFn: () => api.get<Draft>(`/api/training/drafts/${id}`),
    enabled: !!id,
  });
}
export function useProposals() {
  return useQuery({
    queryKey: ["proposals"],
    queryFn: () => api.get<Proposal[]>("/api/training/proposals"),
  });
}
export function useConversations(q = "") {
  return useQuery({
    queryKey: ["conversations", q],
    queryFn: () =>
      api.get<Conversation[]>(`/api/conversations?q=${encodeURIComponent(q)}`),
  });
}
export function useMessages(id?: string) {
  return useQuery({
    queryKey: ["chat", id],
    queryFn: () =>
      api.get<CoachMessage[]>(
        `/api/chat?conversationId=${encodeURIComponent(id!)}`,
      ),
    enabled: !!id,
  });
}
export interface CatalogResult {
  entries: CatalogEntry[];
  total: number;
  sources: Array<{
    name: string;
    url: string;
    description: string;
    imported: boolean;
  }>;
}
export function useCatalog(
  q: string,
  style: string,
  position: string,
  offset: number,
) {
  return useQuery({
    queryKey: ["catalog", q, style, position, offset],
    queryFn: () =>
      api.get<CatalogResult>(
        `/api/catalog?${new URLSearchParams({ q, style, position, offset: String(offset) })}`,
      ),
    staleTime: 60000,
  });
}
export function useTrainingActions() {
  const client = useQueryClient();
  async function refresh() {
    await Promise.all(
      [
        "training",
        "drafts",
        "proposals",
        "sessions",
        "techniques",
        "chat",
        "conversations",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }
  const update = useMutation({
    mutationFn: (body: { payload: ProposalPayload; revision: number }) =>
      api.put("/api/training/state", body),
    onSuccess: refresh,
  });
  const decide = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "accept" | "dismiss";
    }) => api.post(`/api/training/proposals/${id}/${action}`),
    onSuccess: refresh,
  });
  const saveDraft = useMutation({
    mutationFn: (draft: Draft) =>
      api.put<Draft>(`/api/training/drafts/${draft.id}`, draft),
    onSuccess: refresh,
  });
  const confirm = useMutation({
    mutationFn: (draft: Draft) =>
      api.post<Draft>(`/api/training/drafts/${draft.id}/confirm`, {
        revision: draft.revision,
      }),
    onSuccess: refresh,
  });
  const removeDraft = useMutation({
    mutationFn: (id: string) => api.del(`/api/training/drafts/${id}`),
    onSuccess: refresh,
  });
  const unlock = useMutation({
    mutationFn: (id: string) => api.post(`/api/catalog/${id}/unlock`),
    onSuccess: refresh,
  });
  return { update, decide, saveDraft, confirm, removeDraft, unlock, refresh };
}
