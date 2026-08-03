import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Languages, Paperclip, Send, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Panel, SearchBar, Select } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { setDB, uid, useDB, type ChatAttachment } from "@/lib/db";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Group Chat | AL HAYAH AL SALAH System Management" },
      {
        name: "description",
        content:
          "Live team group chat with photos, file sharing, emoji, stickers and per-user auto-translation.",
      },
      { property: "og:title", content: "Group Chat | AL HAYAH AL SALAH" },
      { property: "og:description", content: "Live team chat with attachments and translation." },
    ],
  }),
  component: () => (
    <AppShell tab="chat">
      <GroupChat />
    </AppShell>
  ),
});

const EMOJIS = ["😀", "😂", "😊", "😍", "👍", "🙏", "🔥", "🎉", "✅", "❌", "💪", "😢", "😎", "🤝", "⚡", "📦"];
const STICKERS = [
  "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif",
  "https://media.giphy.com/media/xT9IgDEI1iZyb2wqo8/giphy.gif",
];

const LANGS = [
  { code: "", label: "No translation" },
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "tl", label: "Filipino" },
  { code: "hi", label: "Hindi" },
  { code: "ur", label: "Urdu" },
  { code: "bn", label: "Bengali" },
  { code: "ne", label: "Nepali" },
];

const LANG_KEY = "ahas_chat_lang";
const MAX_FILE = 3 * 1024 * 1024;

const readFile = (file: File) =>
  new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });

/** Free translation endpoint — cached per message + language. */
async function translate(text: string, target: string) {
  const r = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 480))}&langpair=auto|${target}`,
  );
  const j = (await r.json()) as { responseData?: { translatedText?: string } };
  return j.responseData?.translatedText ?? text;
}

function download(name: string, data: string) {
  const a = document.createElement("a");
  a.href = data;
  a.download = name;
  a.click();
}

function GroupChat() {
  const db = useDB();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<ChatAttachment | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [lang, setLang] = useState("");
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ChatAttachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLang(localStorage.getItem(LANG_KEY) ?? "");
  }, []);

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

  // auto-translate every message into the language this user picked
  useEffect(() => {
    if (!lang) return;
    let cancelled = false;
    (async () => {
      for (const m of messages) {
        const key = `${m.id}|${lang}`;
        if (!m.text.trim() || translated[key]) continue;
        try {
          const out = await translate(m.text, lang);
          if (cancelled) return;
          setTranslated((t) => ({ ...t, [key]: out }));
        } catch {
          /* ignore network failures */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, messages, translated]);

  const pickFile = async (f: File) => {
    if (f.size > MAX_FILE) return toast.error("File too large (max 3 MB).");
    const data = await readFile(f);
    setPending({
      kind: f.type.startsWith("image/") ? "image" : "file",
      name: f.name,
      data,
      size: f.size,
    });
  };

  const send = (sticker?: string) => {
    const t = text.trim();
    if (!t && !pending && !sticker) return;
    if (!user) return;
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
          attachment: pending ?? undefined,
          sticker,
        },
      ],
    }));
    setText("");
    setPending(null);
    setShowEmoji(false);
  };

  return (
    <Panel
      title="Live Group Chat"
      actions={
        <div className="flex items-center gap-2">
          <Languages className="size-4 text-primary" />
          <Select
            value={lang}
            onChange={(e) => {
              setLang(e.target.value);
              localStorage.setItem(LANG_KEY, e.target.value);
            }}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      <div className="mb-3">
        <SearchBar value={q} set={setQ} />
      </div>

      <div className="h-[55vh] space-y-3 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => {
          const mine = m.userId === user?.id;
          const tr = lang ? translated[`${m.id}|${lang}`] : "";
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
                {m.text && <p className="mt-1 whitespace-pre-wrap break-words">{m.text}</p>}
                {tr && tr !== m.text && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-[12px] italic opacity-80">{tr}</p>
                )}
                {m.sticker && (
                  <img src={m.sticker} alt="sticker" className="mt-2 h-28 w-auto rounded-lg" loading="lazy" />
                )}
                {m.attachment?.kind === "image" && (
                  <button className="mt-2 block" onClick={() => setPreview(m.attachment!)}>
                    <img
                      src={m.attachment.data}
                      alt={m.attachment.name}
                      className="max-h-44 rounded-lg object-cover"
                      loading="lazy"
                    />
                  </button>
                )}
                {m.attachment?.kind === "file" && (
                  <button
                    className="btn-ghost-3d mt-2 text-[11px]"
                    onClick={() => download(m.attachment!.name, m.attachment!.data)}
                  >
                    <Download className="size-3.5" /> {m.attachment.name}
                  </button>
                )}
                <p className="mt-1 text-[10px] opacity-70">{new Date(m.at).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {showEmoji && (
        <div className="mt-3 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button key={e} className="rounded p-1 text-lg hover:bg-white/10" onClick={() => setText(text + e)}>
                {e}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {STICKERS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-lg border border-border p-0.5">
                <img src={s} alt="sticker" className="h-16 w-16 rounded object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {pending && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-xs">
          {pending.kind === "image" ? (
            <img src={pending.data} alt={pending.name} className="h-10 w-10 rounded object-cover" />
          ) : (
            <Paperclip className="size-4" />
          )}
          <span className="truncate">{pending.name}</span>
          <button className="btn-ghost-3d px-2" onClick={() => setPending(null)}>
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button className="btn-ghost-3d" onClick={() => setShowEmoji(!showEmoji)} aria-label="Emoji and stickers">
          <Smile className="size-4" />
        </button>
        <button className="btn-ghost-3d" onClick={() => fileRef.current?.click()} aria-label="Attach photo or file">
          <Paperclip className="size-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) pickFile(f);
          }}
        />
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
        <button className="btn-3d" onClick={() => send()}>
          <Send className="size-4" /> Send
        </button>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreview(null)}
        >
          <div className="max-h-full max-w-3xl space-y-3 text-center" onClick={(e) => e.stopPropagation()}>
            <img src={preview.data} alt={preview.name} className="max-h-[70vh] w-auto rounded-xl" />
            <div className="flex justify-center gap-2">
              <button className="btn-3d" onClick={() => download(preview.name, preview.data)}>
                <Download className="size-4" /> Download
              </button>
              <button className="btn-ghost-3d" onClick={() => setPreview(null)}>
                <X className="size-4" /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
