import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { History, SquarePen } from "lucide-react";
import { api } from "@/lib/api";
import { formatTimestamp, todayISO } from "@/lib/date";
import type { Conversation, Draft } from "@/lib/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Disclosure } from "@/components/app/disclosure";
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

const LOG_STARTERS = [
  "Hoy practicamos…",
  "Me costó…",
  "En los rolls…",
];

export default function CoachPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [historyOpen, setHistoryOpen] = useState(false);
  // Only the current title is needed on the canvas; the full list lives in the history sheet.
  const conversations = useConversations("");
  const current = id ? conversations.data?.find((c) => c.id === id) : undefined;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h1 className="text-h2 md:text-h1">Coach</h1>
          {current && (
            <p className="truncate text-sm text-muted-foreground">
              {current.title}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Historial de conversaciones"
            onClick={() => setHistoryOpen(true)}
          >
            <History />
          </Button>
          {id && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Nueva conversación"
              nativeButton={false}
              render={<Link to="/coach" />}
            >
              <SquarePen />
            </Button>
          )}
        </div>
      </header>
      <ConversationView key={id ?? params.get("new") ?? "new"} id={id} />
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          {historyOpen && (
            <HistoryList activeId={id} onPick={() => setHistoryOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HistoryList({
  activeId,
  onPick,
}: {
  activeId?: string;
  onPick: () => void;
}) {
  const [query, setQuery] = useState("");
  const conversations = useConversations(useDeferredValue(query));
  return (
    <>
      <SheetHeader className="pr-14">
        <SheetTitle className="text-title">Conversaciones</SheetTitle>
      </SheetHeader>
      <div className="px-4 pb-3">
        <Input
          aria-label="Buscar en tus conversaciones"
          placeholder="Buscar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4">
        <ErrorNotice error={conversations.error} />
        {conversations.isPending ? (
          <Loading />
        ) : conversations.data?.length ? (
          conversations.data.map((c) => (
            <Link
              key={c.id}
              to={`/coach/${c.id}`}
              onClick={onPick}
              aria-current={c.id === activeId ? "page" : undefined}
              className="flex min-h-12 flex-col justify-center rounded-2xl px-3 py-2 transition-colors hover:bg-surface aria-[current=page]:bg-surface"
            >
              <span className="truncate text-sm">{c.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(c.updatedAt)}
              </span>
            </Link>
          ))
        ) : (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            {query ? "Nada coincide." : "Todavía no hay conversaciones."}
          </p>
        )}
      </div>
    </>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageCount = messages.data?.length ?? 0;
  // Follow the conversation as it grows; instant jump when less motion is asked for.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messageCount, send.isPending]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        role="region"
        aria-label="Conversación con el coach"
        tabIndex={0}
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1"
      >
        <div className="flex flex-col gap-4 pb-2">
          <ErrorNotice
            error={messages.error ?? drafts.error ?? proposals.error}
          />
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
                !input && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {(mode === "log" ? LOG_STARTERS : SUGGESTIONS).map((text) => (
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
              {mode === "log" && "Hablá o escribí. Te pregunto lo que falte."}
            </Blank>
          )}
          {createdId && messages.isPending && <Loading />}
          <div className="flex flex-col gap-3" aria-live="polite">
            {messages.data?.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground"
                    : "mr-auto max-w-full rounded-3xl bg-surface px-4 py-3"
                }
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {m.content}
                </p>
                <time
                  dateTime={new Date(m.createdAt).toISOString()}
                  className="sr-only"
                >
                  {formatTimestamp(m.createdAt)}
                </time>
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
          {pendingDrafts.map((d) => (
            <div key={d.id} className="rounded-3xl bg-surface px-4 py-2">
              <Disclosure
                summary={
                  <span className="font-medium text-foreground break-words">
                    {d.data.classTopic || "Clase por completar"}
                  </span>
                }
              >
                <div className="flex flex-col items-start gap-3 pb-2">
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link to={`/drafts/${d.id}`} />}
                  >
                    Revisar borrador
                  </Button>
                  {d.id === draftId && d.questions.length > 0 && (
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                      {d.questions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  )}
                  {d.id === draftId ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start"
                      onClick={() => setDraftId(null)}
                    >
                      Hablar de otra cosa
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start"
                      onClick={() => setDraftId(d.id)}
                    >
                      Responder preguntas acá
                    </Button>
                  )}
                </div>
              </Disclosure>
            </div>
          ))}
        </div>
      </div>
      <ErrorNotice error={send.error} />
      <div className="shrink-0 bg-background">
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
                ? "Hoy practicamos… Me costó…"
                : "Escribí o grabá un audio…"
          }
        />
      </div>
    </div>
  );
}
