import { useDeferredValue, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/date";
import type { Conversation, Draft } from "@/lib/training";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Composer } from "./Composer";
import {
  useConversations,
  useMessages,
  useDrafts,
  useProposals,
  useTrainingActions,
} from "../training/queries";
import { Blank, ErrorNotice, Loading } from "../training/shared";
import { ProposalCard } from "../training/ProposalCard";

export default function CoachPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const conversations = useConversations(useDeferredValue(query));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tu coach."
        lead="Tu entrenamiento, con memoria."
        action={
          <Button onClick={() => navigate(`/coach?new=${crypto.randomUUID()}`)}>
            Nueva conversación
          </Button>
        }
      />
      <details className="rounded-3xl bg-surface p-4" open={!id}>
        <summary className="cursor-pointer text-sm font-medium">
          Historial de conversaciones
        </summary>
        <div className="mt-4 flex flex-col gap-3">
          <Input
            aria-label="Buscar en todos los chats"
            placeholder="Buscar en todos los chats…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ErrorNotice error={conversations.error} />
          {conversations.isPending ? (
            <Loading />
          ) : (
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {conversations.data?.map((c) => (
                <Link
                  key={c.id}
                  to={`/coach/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl p-3 hover:bg-background"
                  aria-current={id === c.id ? "page" : undefined}
                >
                  <span className="truncate">{c.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
              {!conversations.data?.length && (
                <p className="text-sm text-muted-foreground">
                  No hay conversaciones que coincidan.
                </p>
              )}
            </div>
          )}
        </div>
      </details>
      <ConversationView key={id ?? params.get("new") ?? "new"} id={id} />
    </div>
  );
}
function ConversationView({ id }: { id?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode") ?? "chat";
  const [input, setInput] = useState(params.get("prompt") ?? "");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [createdId, setCreatedId] = useState<string | undefined>(id);
  const [draftId, setDraftId] = useState<string | null>(params.get("draft"));
  const messages = useMessages(createdId);
  const drafts = useDrafts();
  const proposals = useProposals();
  const actions = useTrainingActions();
  const send = useMutation({
    mutationFn: async () => {
      let conversationId = createdId;
      if (!conversationId) {
        const conversation = await api.post<Conversation>(
          "/api/conversations",
          { title: input.trim().slice(0, 90) || "Nueva conversación" },
        );
        conversationId = conversation.id;
        setCreatedId(conversationId);
      }
      const result = await api.post<{ draft?: Draft }>("/api/coach", {
        message: input,
        conversationId,
        requestId,
        draftId,
        localDate: todayISO(),
        mode,
      });
      return { conversationId, result };
    },
    onSuccess: async ({ conversationId, result }) => {
      setInput("");
      setRequestId(crypto.randomUUID());
      if (result.draft)
        setDraftId(result.draft.status === "draft" ? result.draft.id : null);
      await actions.refresh();
      if (!id)
        navigate(
          `/coach/${conversationId}${result.draft ? `?draft=${result.draft.id}` : ""}`,
          { replace: true },
        );
    },
    onError: async () => {
      await actions.refresh();
    },
  });
  const pendingDrafts =
    drafts.data?.filter(
      (d) => d.conversationId === createdId && d.status === "draft",
    ) ?? [];
  const selected = pendingDrafts.find((d) => d.id === draftId);
  return (
    <div className="flex flex-col gap-5">
      <ErrorNotice error={messages.error ?? drafts.error ?? proposals.error} />
      {!createdId && (
        <Blank
          title={
            mode === "log"
              ? "Contame la clase."
              : mode === "profile"
                ? "Conozcamos tu recorrido."
                : mode === "gameplan"
                  ? "Pensemos tu juego."
                  : "Una conversación que continúa."
          }
        >
          {mode === "log"
            ? "Hablá o escribí. Armo un borrador y te pregunto lo que falte."
            : "Podés hablar de tus clases, objetivos o planes. Los cambios importantes se confirman con vos."}
        </Blank>
      )}
      {createdId && messages.isPending && <Loading />}
      <div className="flex flex-col gap-4" aria-live="polite">
        {messages.data?.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-auto max-w-[90%] rounded-3xl rounded-br-md bg-primary p-4 text-primary-foreground"
                : "mr-auto max-w-full rounded-3xl bg-surface p-4"
            }
          >
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {m.content}
            </p>
            <p className="mt-2 text-xs opacity-60">
              {new Date(m.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      {proposals.data
        ?.filter(
          (p) => p.conversationId === createdId && p.status === "pending",
        )
        .map((p) => (
          <ProposalCard key={p.id} proposal={p} />
        ))}
      {pendingDrafts.length > 0 && (
        <div className="flex flex-col gap-3">
          {pendingDrafts.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-3"
            >
              <Badge variant="outline">Borrador</Badge>
              <Link className="text-sm underline" to={`/drafts/${d.id}`}>
                {d.data.classTopic || "Clase por completar"}
              </Link>
              <Button
                size="sm"
                variant={d.id === draftId ? "secondary" : "outline"}
                onClick={() => setDraftId(d.id)}
              >
                {d.id === draftId ? "Respondiendo preguntas" : "Continuar acá"}
              </Button>
            </div>
          ))}
        </div>
      )}
      {selected && (
        <div className="flex flex-col gap-2">
          <p className="text-label">Preguntas pendientes</p>
          {selected.questions.map((q, i) => (
            <p className="text-sm" key={i}>
              {q}
            </p>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setDraftId(null)}>
            Hablar de otra cosa
          </Button>
        </div>
      )}
      <ErrorNotice error={send.error} />
      <Composer
        value={input}
        onChange={(text) => {
          setInput(text);
          if (send.isError) {
            setRequestId(crypto.randomUUID());
            send.reset();
          }
        }}
        onSend={() => send.mutate()}
        busy={send.isPending}
        label={
          selected ? "Respondé lo que recuerdes" : "Escribí o grabá un audio"
        }
      />
      <p className="text-xs text-muted-foreground">
        El coach puede recuperar chats y clases anteriores. Los borradores
        quedan pendientes; perfil, objetivos y gameplans cambian cuando
        confirmás una propuesta.
      </p>
    </div>
  );
}
