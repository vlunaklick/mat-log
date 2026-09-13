import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { useChat, useClearChat, streamCoach } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { suggestedPrompts } from "./prompts";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle, EmptyContent } from "@/components/ui/empty";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function CoachPage() {
  const queryClient = useQueryClient();
  const { data: messages, isPending, isError, error } = useChat();
  const clearChat = useClearChat();

  const [input, setInput] = useState("");
  const [pendingUser, setPendingUser] = useState("");
  const [pendingAssistant, setPendingAssistant] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setInput("");
    setSendError(null);
    setPendingUser(trimmed);
    setStreaming(true);
    setPendingAssistant("");

    try {
      let full = "";
      await streamCoach(trimmed, (chunk) => {
        full += chunk;
        setPendingAssistant(full);
      });
      await queryClient.invalidateQueries({ queryKey: ["chat"] });
      setPendingUser("");
      setPendingAssistant("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
    } finally {
      setStreaming(false);
    }
  }

  async function handleClear() {
    await clearChat.mutateAsync();
    setPendingUser("");
    setPendingAssistant("");
    setSendError(null);
  }

  const hasMessages = (messages && messages.length > 0) || pendingUser;

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
        {isPending && (
          <div className="flex flex-col gap-3">
            <Skeleton className="ml-auto h-10 w-2/3 rounded-3xl" />
            <Skeleton className="h-16 w-3/4 rounded-3xl" />
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>{error instanceof Error ? error.message : "Could not load chat."}</AlertDescription>
          </Alert>
        )}

        {!isPending && !hasMessages && (
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

        {!isPending && messages?.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}

        {pendingUser && <Bubble role="user" content={pendingUser} />}

        {streaming && <Bubble role="assistant" content={pendingAssistant || "…"} caption="Thinking" />}

        {sendError && (
          <Alert variant="destructive">
            <AlertDescription>{sendError}</AlertDescription>
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
