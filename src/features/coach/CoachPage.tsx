import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { db, DEFAULT_SETTINGS } from "@/lib/db";
import { askCoach, suggestedPrompts } from "@/lib/coach";
import { buildCoachSummary } from "@/lib/stats";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle, EmptyContent } from "@/components/ui/empty";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function Bubble({ role, content, caption }: { role: "user" | "assistant"; content: string; caption?: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[80%] flex-col gap-1">
        <div
          className={
            isUser
              ? "whitespace-pre-wrap rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground"
              : "whitespace-pre-wrap rounded-3xl rounded-bl-md bg-surface px-4 py-2.5 text-sm text-surface-foreground"
          }
        >
          {content}
        </div>
        {caption ? <p className="px-1 text-xs text-muted-foreground">{caption}</p> : null}
      </div>
    </div>
  );
}

function ChatUI() {
  const messages = useLiveQuery(() => db.chat.orderBy("createdAt").toArray(), []) ?? [];
  const [input, setInput] = useState("");
  const [pending, setPending] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setInput("");
    setError(null);
    await db.chat.add({ role: "user", content: trimmed, createdAt: Date.now() });

    setStreaming(true);
    setPending("");
    try {
      const settings = await db.settings.get("settings");
      const apiKey = settings?.geminiApiKey;
      if (!apiKey) throw new Error("No Google AI Studio API key configured.");

      const [sessions, techniques] = await Promise.all([db.sessions.toArray(), db.techniques.toArray()]);
      const summary = buildCoachSummary(sessions, techniques, settings);

      const allMessages = await db.chat.orderBy("createdAt").toArray();
      const history = allMessages.slice(-20).map((m) => ({ role: m.role, content: m.content }));

      let full = "";
      for await (const chunk of askCoach({ apiKey, summary, history })) {
        full += chunk;
        setPending(full);
      }

      await db.chat.add({ role: "assistant", content: full, createdAt: Date.now() });
      setPending("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStreaming(false);
    }
  }

  async function handleClear() {
    await db.chat.clear();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Coach."
        lead="Ask about your training, get one clear focus."
        action={
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>Clear chat</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear the whole chat history?</AlertDialogTitle>
                <AlertDialogDescription>This removes every message in this conversation. It cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleClear}>
                  Clear chat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <div className="flex h-[calc(100dvh-16rem)] flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && !pending && (
          <div className="flex flex-1 flex-col gap-4">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Ask your coach anything</EmptyTitle>
                <EmptyDescription>Your last 30 days of sessions and techniques inform the answers.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts().map((p) => (
                    <Button key={p} variant="outline" size="sm" onClick={() => send(p)}>
                      {p}
                    </Button>
                  ))}
                </div>
              </EmptyContent>
            </Empty>
          </div>
        )}

        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}

        {streaming && <Bubble role="assistant" content={pending || "…"} caption="Thinking" />}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="sticky bottom-24 md:bottom-4">
        <InputGroup className="h-auto rounded-full bg-card p-1 ring-1 ring-border-soft">
          <InputGroupInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask your coach..."
            disabled={streaming}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              variant="default"
              className="rounded-full"
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              aria-label="Send"
            >
              <ArrowUp />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

export default function CoachPage() {
  const settings =
    useLiveQuery(() => db.settings.get("settings").then((s) => s ?? DEFAULT_SETTINGS), []) ?? DEFAULT_SETTINGS;

  if (!settings.geminiApiKey) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Coach." lead="Ask about your training, get one clear focus." />
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Add a Google AI Studio API key</EmptyTitle>
              <EmptyDescription>
                The coach needs a free Google AI Studio API key to talk to you. Add one in Settings to get started.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button nativeButton={false} render={<Link to="/settings" />}>Go to Settings</Button>
            </EmptyContent>
          </Empty>
        </Card>
      </div>
    );
  }

  return <ChatUI />;
}
