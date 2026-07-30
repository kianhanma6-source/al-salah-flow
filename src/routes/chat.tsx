import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel, SearchBar } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { setDB, uid, useDB } from "@/lib/db";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Group Chat | AL HAYAH AL SALAH System Management" },
      {
        name: "description",
        content: "Live team group chat with sender names, timestamps and saved chat history.",
      },
      { property: "og:title", content: "Group Chat | AL HAYAH AL SALAH" },
      { property: "og:description", content: "Live team group chat with saved history." },
    ],
  }),
  component: () => (
    <AppShell tab="chat">
      <GroupChat />
    </AppShell>
  ),
});

function GroupChat() {
  const db = useDB();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return db.chat
      .filter((m) => (needle ? `${m.sender} ${m.text}`.toLowerCase().includes(needle) : true))
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at));
  }, [db.chat, q]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const t = text.trim();
    if (!t || !user) return;
    setDB((d) => ({
      ...d,
      chat: [
        ...d.chat,
        {
          id: uid(),
          userId: user.id,
          sender: user.name || user.username,
          role: user.role,
          text: t,
          at: new Date().toISOString(),
        },
      ],
    }));
    setText("");
  };

  return (
    <Panel title="Live Group Chat">
      <div className="mb-3">
        <SearchBar value={q} set={setQ} />
      </div>

      <div className="h-[55vh] space-y-3 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => {
          const mine = m.userId === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-md ${
                  mine ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                  {m.sender} · {m.role}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{m.text}</p>
                <p className="mt-1 text-[10px] opacity-70">{new Date(m.at).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="input-3d flex-1"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn-3d" onClick={send}>
          <Send className="size-4" /> Send
        </button>
      </div>
    </Panel>
  );
}
