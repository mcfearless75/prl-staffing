"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Trash2, Brain, Zap, AlertTriangle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: string; [key: string]: unknown };

type ApiMessage = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};

type DisplayMessage = {
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
};

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_TURNS = 20;
const GDPR_KEY = "prl-ai-gdpr-v1";

function trimApiHistory(messages: ApiMessage[]): ApiMessage[] {
  const limit = MAX_TURNS * 2;
  if (messages.length > limit) {
    return messages.slice(messages.length - limit);
  }
  return messages;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AiAssistantPage() {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [useOpus, setUseOpus] = useState(false);
  const [gdprAgreed, setGdprAgreed] = useState(true); // default true; check localStorage on mount
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const agreed = localStorage.getItem(GDPR_KEY);
    if (!agreed) setGdprAgreed(false);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const handleAgree = useCallback(() => {
    localStorage.setItem(GDPR_KEY, "1");
    setGdprAgreed(true);
  }, []);

  const handleClear = useCallback(() => {
    setDisplayMessages([]);
    setApiMessages([]);
    setError(null);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setError(null);

    // Add user message to display
    const userDisplay: DisplayMessage = { role: "user", text };
    setDisplayMessages((prev) => [...prev, userDisplay]);

    // Add placeholder assistant message
    const assistantPlaceholder: DisplayMessage = {
      role: "assistant",
      text: "",
      pending: true,
    };
    setDisplayMessages((prev) => [...prev, assistantPlaceholder]);

    // Build API messages (include new user turn)
    const newApiMessages: ApiMessage[] = [
      ...apiMessages,
      { role: "user", content: text },
    ];

    setIsStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newApiMessages, useOpus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalContent: ContentBlock[] | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let data: { text?: string; done?: boolean; content?: ContentBlock[]; error?: string };
          try {
            data = JSON.parse(raw);
          } catch {
            continue;
          }

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.text) {
            setDisplayMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  text: last.text + data.text!,
                  pending: true,
                };
              }
              return updated;
            });
          }

          if (data.done && data.content) {
            finalContent = data.content;
          }
        }
      }

      // Mark assistant message as complete
      setDisplayMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = { ...last, pending: false };
        }
        return updated;
      });

      // Update API history with full content array
      if (finalContent) {
        setApiMessages(
          trimApiHistory([
            ...newApiMessages,
            { role: "assistant", content: finalContent },
          ])
        );
      } else {
        setApiMessages(trimApiHistory(newApiMessages));
      }
    } catch (err) {
      // Remove the pending assistant message
      setDisplayMessages((prev) => prev.filter((m) => !m.pending));
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }, [input, isStreaming, apiMessages, useOpus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
            <p className="text-xs text-gray-500">
              {useOpus ? "Claude Opus · deep analysis" : "Claude Sonnet · fast responses"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model toggle */}
          <button
            onClick={() => setUseOpus((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              useOpus
                ? "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
                : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
            title={useOpus ? "Switch to Sonnet (faster, cheaper)" : "Switch to Opus (deeper reasoning)"}
          >
            {useOpus ? (
              <>
                <Brain className="h-3.5 w-3.5" />
                Opus
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                Sonnet
              </>
            )}
          </button>

          {/* Clear */}
          {displayMessages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* GDPR notice */}
      {!gdprAgreed && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-900">Data notice</p>
            <p className="mt-1 text-amber-800 leading-relaxed">
              All input is sent to Anthropic&apos;s API. Do not paste personal data — staff or
              contractor names, NI numbers, medical records, home addresses, or
              client-confidential financial data — unless PRL has a zero-retention
              agreement with Anthropic.
            </p>
          </div>
          <button
            onClick={handleAgree}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            Understood
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        {displayMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400 py-16">
            <Bot className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Ask anything about PRL operations</p>
            <p className="mt-1 text-xs max-w-sm">
              Contracts, RAMS, HR queries, compliance, contractor onboarding, pay
              queries, GDPR, Cyber Essentials.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "Draft a RAMS overdue reminder email",
                "What does UK law say about right-to-work checks?",
                "Summarise ISO 9001 clause 8 for a groundworks contractor",
                "Draft a fixed-term contract termination clause",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-50 border border-gray-200 text-gray-800"
              }`}
            >
              {msg.role === "assistant" && msg.text === "" && msg.pending ? (
                <span className="flex items-center gap-1 text-gray-400">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce [animation-delay:0.15s]">●</span>
                  <span className="animate-bounce [animation-delay:0.3s]">●</span>
                </span>
              ) : (
                <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex justify-center">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming || !gdprAgreed}
          placeholder={
            !gdprAgreed
              ? "Acknowledge the data notice above to start"
              : isStreaming
              ? "Waiting for response…"
              : "Ask anything… (Enter to send, Shift+Enter for new line)"
          }
          rows={3}
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming || !gdprAgreed}
          className="flex h-auto items-end rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
          title="Send (Enter)"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] text-gray-400">
        {useOpus ? "Opus 4.7 · adaptive thinking" : "Sonnet 4.6 · fast"} ·{" "}
        {apiMessages.length / 2 | 0}/{MAX_TURNS} turns used
      </p>
    </div>
  );
}
