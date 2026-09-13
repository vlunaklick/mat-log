import { useDeferredValue, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatTimestamp, todayISO } from "@/lib/date";
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

const SUGGESTIONS = [
  "¿En qué me enfoco la próxima clase?",
  "¿Dónde me estoy trabando en los rolls?",
  "Revisá mi semana",
];

export default function CoachPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const conversations = useConversations(useDeferredValue(query));
  const current = id && conversations.data?.find((c) => c.id === id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Coach"
        lead={current ? current.title : undefined}
        back={id ? { to: "/coach", label: "Conversaciones" } : undefined}
        action={
          id && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/coach" />}
            >
              Nueva conversación
            </Button>
          )
        }
      />
      <ConversationView key={id ?? params.get("new") ?? "new"} id={id} />
      {!id && (query || !!conversations.data?.length) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title">Conversaciones</h2>
          <Input
            aria-label="Buscar en tus conversaciones"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ErrorNotice error={conversations.error} />
          {conversations.isPending ? (
            <Loading />
          ) : conversations.data?.length ? (
            <div className="flex flex-col">
              {conversations.data.map((c) => (
                <Link
                  key={c.id}
                  to={`/coach/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl p-3 hover:bg-surface"
                >
                  <span className="truncate">{c.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTimestamp(c.updatedAt)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay conversaciones que coincidan.
            </p>
          )}
        </section>
      )}
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
              ? "Contame la clase"
              : mode === "profile"
                ? "Contame tu recorrido"
                : mode === "gameplan"
                  ? "Pensemos tu juego"
                  : "¿En qué te ayudo?"
          }
          action={
            mode === "chat" && (
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((text) => (
                  <Button
                    key={text}
                    size="sm"
                    variant="outline"
                    onClick={() => setInput(text)}
                  >
                    {text}
                  </Button>
                ))}
              </div>
            )
          }
        >
          {mode === "log" &&
            "Hablá o escribí. Armo un borrador y te pregunto lo que falte."}
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
              {formatTimestamp(m.createdAt)}
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
        placeholder={
          selected
            ? "Respondé lo que recuerdes…"
            : mode === "log"
              ? "Hoy practicamos… Me costó… Quiero trabajar…"
              : "Escribí o grabá un audio…"
        }
      />
    </div>
  );
}
