import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  Trash2,
  MessageSquare,
  Plus,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { useSettingsStore } from "@/stores/use-settings-store";
import { getSecret } from "@/lib/secrets";
import {
  useChatSessionsStore,
  type ChatMessage,
} from "@/stores/use-chat-sessions-store";

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 py-0.5">
      <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
      <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
      <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

function SessionPicker({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
}: {
  sessions: { id: string; title: string; updatedAt: number }[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium hover:text-foreground/80 transition-colors"
      >
        <span className="truncate max-w-[180px]">
          {active?.title ?? "New Chat"}
        </span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-lg shadow-md z-50 overflow-hidden">
            <div className="p-1.5">
              <button
                onClick={() => {
                  onNew();
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
              >
                <Plus className="size-3" />
                New Chat
              </button>
            </div>
            {sessions.length > 0 && <Separator />}
            <div className="max-h-48 overflow-y-auto p-1.5 flex flex-col gap-0.5">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs group cursor-pointer transition-colors ${
                    s.id === activeSessionId
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1 truncate">{s.title}</span>
                  {s.id === activeSessionId && (
                    <Check className="size-3 text-primary shrink-0" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                    className="shrink-0 size-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AIChatPanel() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ai = useSettingsStore((s) => s.ai);

  const sessions = useChatSessionsStore((s) => s.sessions);
  const activeSessionId = useChatSessionsStore((s) => s.activeSessionId);
  const activeSession = useChatSessionsStore((s) =>
    s.sessions.find((sess) => sess.id === s.activeSessionId),
  );
  const createSession = useChatSessionsStore((s) => s.createSession);
  const deleteSession = useChatSessionsStore((s) => s.deleteSession);
  const switchSession = useChatSessionsStore((s) => s.switchSession);
  const addMessage = useChatSessionsStore((s) => s.addMessage);
  const updateMessage = useChatSessionsStore((s) => s.updateMessage);
  const clearSession = useChatSessionsStore((s) => s.clearSession);
  const autoTitleSession = useChatSessionsStore((s) => s.autoTitleSession);

  const messages = activeSession?.messages ?? [];

  // Auto-create session if none exists
  useEffect(() => {
    if (!activeSessionId) {
      createSession();
    }
  }, [activeSessionId, createSession]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  useEffect(() => {
    const listener = (message: {
      type: string;
      messageId?: string;
      content?: string;
      done?: boolean;
      error?: string;
    }) => {
      if (message.type !== "AI_RESPONSE") return;
      if (!message.messageId || !activeSessionId) return;

      if (message.error) {
        setStreamingId(null);
        setIsLoading(false);
        updateMessage(activeSessionId, message.messageId, {
          role: "system",
          content: message.error!,
        });
        return;
      }

      if (message.content) {
        const sessionId = activeSessionId;
        const msgId = message.messageId;
        // Append content by reading current state
        const currentMsg = useChatSessionsStore
          .getState()
          .sessions.find((s) => s.id === sessionId)
          ?.messages.find((m) => m.id === msgId);

        if (currentMsg) {
          updateMessage(sessionId, msgId, {
            content: currentMsg.content + message.content,
          });
        }
      }

      if (message.done) {
        setStreamingId(null);
        setIsLoading(false);
      }
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [activeSessionId, updateMessage]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !activeSessionId) return;
    // The API key lives in encrypted-at-rest storage; check its presence via
    // the secrets module rather than the (now-empty) settings field.
    const hasKey =
      ai.provider === "ollama" || Boolean(await getSecret("aiApiKey"));
    if (!ai.enabled || !hasKey) {
      addMessage(activeSessionId, {
        id: crypto.randomUUID(),
        role: "system",
        content:
          "Please configure your AI API key in Settings to use this feature.",
        timestamp: Date.now(),
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    const assistantId = crypto.randomUUID();

    addMessage(activeSessionId, userMessage);
    autoTitleSession(activeSessionId, input.trim());

    addMessage(activeSessionId, {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    });

    setInput("");
    setIsLoading(true);
    setStreamingId(assistantId);

    const currentMessages =
      useChatSessionsStore
        .getState()
        .sessions.find((s) => s.id === activeSessionId)?.messages ?? [];

    const history = currentMessages
      .filter((m) => m.id !== assistantId)
      .map((m) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      }));

    try {
      const response = (await browser.runtime.sendMessage({
        type: "POPUP_SEND_AI_PROMPT",
        content: userMessage.content,
        history,
      })) as { messageId?: string; error?: string } | undefined;

      if (response?.error) {
        setStreamingId(null);
        setIsLoading(false);
        updateMessage(activeSessionId, assistantId, {
          role: "system",
          content: response.error!,
        });
        return;
      }

      if (response?.messageId) {
        setStreamingId(response.messageId);
        updateMessage(activeSessionId, assistantId, { id: response.messageId });
      }
    } catch (err) {
      setStreamingId(null);
      setIsLoading(false);
      updateMessage(activeSessionId, assistantId, {
        role: "system",
        content: `Failed to send message: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  }, [
    input,
    isLoading,
    ai.enabled,
    ai.provider,
    activeSessionId,
    addMessage,
    updateMessage,
    autoTitleSession,
  ]);

  const handleClear = () => {
    if (activeSessionId) clearSession(activeSessionId);
  };

  const handleNewChat = () => {
    createSession();
  };

  return (
    <div className="flex flex-col h-full px-4 pt-3 pb-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <SessionPicker
            sessions={sessions.map((s) => ({
              id: s.id,
              title: s.title,
              updatedAt: s.updatedAt,
            }))}
            activeSessionId={activeSessionId}
            onSelect={switchSession}
            onNew={handleNewChat}
            onDelete={deleteSession}
          />
          <span
            className={`inline-block size-1.5 rounded-full ${ai.enabled ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleNewChat}
            aria-label="New chat"
          >
            <Plus className="size-3 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleClear}
            aria-label="Clear chat"
          >
            <Trash2 className="size-3 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <Separator className="shrink-0" />

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 py-3">
        <div className="flex flex-col gap-2">
          {messages.length === 0 && (
            <div className="py-12 text-center">
              <div className="flex size-12 mx-auto mb-3 items-center justify-center rounded-full bg-secondary">
                <MessageSquare className="size-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground">
                How can I help?
              </p>
              <p className="text-[0.65rem] text-muted-foreground mt-1.5 max-w-[220px] mx-auto leading-relaxed">
                Ask about elements, debug styles, audit accessibility, or get
                suggestions for the current page.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.role === "system"
                      ? "bg-destructive/10 text-destructive border-l-2 border-destructive rounded-l-md"
                      : "bg-secondary text-foreground"
                }`}
              >
                {msg.content ||
                  (isLoading && msg.id === streamingId ? "" : msg.content)}
                {isLoading && msg.id === streamingId && !msg.content && (
                  <StreamingDots />
                )}
              </div>
            </div>
          ))}

          {isLoading && !streamingId && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-xl px-3 py-2">
                <StreamingDots />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <Separator className="shrink-0" />

      {/* Input */}
      <div className="relative pt-2 shrink-0">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask about this page..."
          className="min-h-[40px] max-h-[80px] text-xs resize-none bg-secondary border-0 rounded-xl pr-10 focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={1}
        />
        <Button
          variant="ghost"
          size="icon"
          className={`absolute right-1.5 bottom-1.5 size-7 rounded-lg ${input.trim() && !isLoading ? "text-primary hover:bg-primary/10" : "text-muted-foreground/40"}`}
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
