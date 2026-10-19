"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getBuyerContacts,
  getConversations,
  getMessages,
  getPeople,
  markConversationRead,
  sendMessage,
} from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import Mark from "@/components/Mark";
import { Panel, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Input } from "@/components/console/controls";
import { Send, ImagePlus, X, Loader2 } from "lucide-react";
import PhotoViewer from "@/components/PhotoViewer";
import { chatPhotoProblem, uploadChatPhoto } from "@/lib/chatPhoto";

interface OrgUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  /** The supplier organization a conversation with this person belongs to. */
  orgId?: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  /* Photos from either side; this page could neither send nor show them
     (2026-10-19). */
  imageUrl?: string | null;
  read?: boolean;
  createdAt?: string;
}

interface Conversation {
  peerId: string;
  last: {
    text?: string;
    createdAt?: string;
    senderId?: string;
    read?: boolean;
    orgId?: string;
  };
}

function formatTime(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const sameDay =
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate();
  return sameDay
    ? dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : dt.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function BuyerMessagesPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<OrgUser[]>([]);
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<Record<string, OrgUser>>({});
  const [peerId, setPeerId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const clearPhoto = () => {
    setPhoto((p) => { if (p) URL.revokeObjectURL(p.url); return null; });
    if (fileRef.current) fileRef.current.value = "";
  };
  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const problem = chatPhotoProblem(file);
    if (problem) { toast(problem, "error"); return; }
    clearPhoto();
    setPhoto({ file, url: URL.createObjectURL(file) });
  };

  /* The admins of every supplier this buyer is connected to - who they can
     write to, and under which supplier each conversation is filed. A buyer
     has no organization of their own, and this page used to need one: for
     most buyers it could neither name anyone nor send anything. */
  useEffect(() => {
    if (!user) return;
    getBuyerContacts(user.id)
      .then((rows) => {
        setContacts(rows);
        setUsers((prev) => {
          const map = { ...prev };
          for (const u of rows) map[u.id] = { ...map[u.id], ...u };
          return map;
        });
      })
      .catch(() => undefined);
  }, [user]);

  /* Names for anyone in a conversation who is not a current contact - each
     asked for once, so a name that cannot be read is not asked for forever. */
  const askedNames = useRef(new Set<string>());
  useEffect(() => {
    const missing = conversations
      .map((c) => c.peerId)
      .filter((id) => !users[id] && !askedNames.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => askedNames.current.add(id));
    getPeople(missing)
      .then((rows) =>
        setUsers((prev) => {
          const map = { ...prev };
          for (const u of rows as unknown as OrgUser[]) map[u.id] = { ...u, ...map[u.id] };
          return map;
        })
      )
      .catch(() => undefined);
  }, [conversations, users]);

  // Load conversations
  const refreshConvos = useMemo(
    () => async () => {
      if (!user) return;
      try {
        const rows = await getConversations(user.id);
        setConversations(rows as Conversation[]);
      } catch (e) {
        toast((e as Error).message || "Failed to load conversations", "error");
      }
    },
    [user, toast]
  );

  useEffect(() => {
    refreshConvos().finally(() => setLoadingConvos(false));
  }, [refreshConvos]);

  // Load messages for active peer
  useEffect(() => {
    if (!user || !peerId) return;
    getMessages(user.id, peerId)
      .then((rows) => setMessages(rows as unknown as Message[]))
      .catch((e) => toast((e as Error).message || "Failed to load messages", "error"));
    markConversationRead(user.id, peerId).catch(() => undefined);
  }, [user, peerId, toast]);

  // Realtime: new messages addressed to me
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`buyer-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const senderId = String(row.sender_id || "");
          const receiverId = String(row.receiver_id || "");
          if (senderId !== user.id && receiverId !== user.id) return;
          // Update current thread if matching peer
          if (
            peerId &&
            ((senderId === user.id && receiverId === peerId) ||
              (senderId === peerId && receiverId === user.id))
          ) {
            setMessages((prev) => [
              ...prev,
              {
                id: String(row.id),
                senderId,
                receiverId,
                text: String(row.text || ""),
                imageUrl: (row.image_url as string) || null,
                createdAt: String(row.created_at || ""),
                read: Boolean(row.read),
              },
            ]);
          }
          refreshConvos();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, peerId, refreshConvos]);

  // Autoscroll on new message
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const peerName = (id: string) => {
    const u = users[id];
    if (!u) return id.slice(0, 8);
    return u.name || u.email || id.slice(0, 8);
  };

  /* A conversation stays with the supplier it started under; a new one goes
     under the contact's supplier. */
  const threadOrg = (id: string) =>
    conversations.find((c) => c.peerId === id)?.last?.orgId || users[id]?.orgId || "";

  const newContacts = contacts.filter((c) => !conversations.some((v) => v.peerId === c.id));

  const onSend = async () => {
    const org = threadOrg(peerId);
    if (!user || !org || !peerId || (!text.trim() && !photo)) return;
    const body = text.trim();
    setSending(true);
    try {
      const imageUrl = photo ? await uploadChatPhoto(org, user.id, photo.file) : null;
      await sendMessage(org, user.id, peerId, body, imageUrl);
      setText("");
      clearPhoto();
      // Realtime will append; but we also optimistic-refresh as a fallback
      const rows = await getMessages(user.id, peerId);
      setMessages(rows as unknown as Message[]);
      refreshConvos();
    } catch (e) {
      toast((e as Error).message || "Failed to send", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-6xl flex-col px-5 py-8 md:h-[calc(100vh-3.5rem)] lg:px-8 lg:py-10">
      <header className="shrink-0 space-y-5">
        <div>
          <p className="text-[12px] tracking-[0.22em] text-muted-foreground">
            Buying
          </p>
          <h1 className="font-display mt-2 text-[1.7rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[2.2rem]">
            Messages
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Talk to whoever is running the floor you order from.
          </p>
        </div>
        <div className="h-px w-full bg-border" />
      </header>

      <div className="mt-8 grid min-h-0 flex-1 gap-4 md:grid-cols-[17rem_1fr]">
        {/* ── Who ──────────────────────────────────────────────── */}
        <Panel className="flex min-h-0 flex-col">
          <ColHead className="shrink-0 border-b border-border px-4 py-3">
            Conversations
          </ColHead>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingConvos ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => (
                  <CrateSkeleton key={i} className="h-12 w-full border-0" delay={i * 0.08} />
                ))}
              </div>
            ) : conversations.length === 0 && newContacts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nothing yet. Connect to a supplier and their team appears here.
              </p>
            ) : (
              [...conversations, ...newContacts.map((u) => ({ peerId: u.id, last: { text: `Write to ${u.role || "this supplier"}`, read: true } }) as Conversation)].map((c) => {
                const active = peerId === c.peerId;
                const unread = c.last && !c.last.read && c.last.senderId !== user?.id;
                return (
                  <button
                    key={c.peerId}
                    onClick={() => setPeerId(c.peerId)}
                    className={`row-line relative block w-full px-4 py-3 text-left ${
                      active ? "bg-[color-mix(in_oklab,var(--brand-2)_8%,transparent)]" : ""
                    }`}
                  >
                    {/* The lit edge marks the open thread, the same way it
                        marks the live entry on the rail. */}
                    {active && (
                      <span className="absolute inset-y-2 left-0 w-0.5 rounded-sm bg-[linear-gradient(to_bottom,var(--brand-1),var(--brand-3))]" />
                    )}
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{peerName(c.peerId)}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatTime(c.last?.createdAt)}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 truncate text-[13px] ${
                        unread ? "font-medium text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {c.last?.text || (c.last?.createdAt ? "Photo" : "")}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        {/* ── The thread ───────────────────────────────────────── */}
        <Panel className="flex min-h-0 flex-col">
          {!peerId ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <Mark className="h-8 w-8 text-[color-mix(in_oklab,var(--brand-2)_45%,transparent)]" strokeWidth={14} />
              <p className="mt-5 text-[12px] tracking-[0.2em] text-muted-foreground">
                Nothing open
              </p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Pick a conversation on the left.
              </p>
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-border px-5 py-3">
                <p className="truncate text-sm font-medium">{peerName(peerId)}</p>
                {users[peerId]?.role ? (
                  <p className="truncate text-[12px] text-muted-foreground">
                    {users[peerId].role}
                  </p>
                ) : null}
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-5">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Say something.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] overflow-hidden rounded-md text-sm ${
                            mine
                              ? "bg-primary text-primary-foreground"
                              : "border border-border"
                          }`}
                        >
                          {m.imageUrl ? (
                            <button type="button" onClick={() => setViewer(m.imageUrl as string)} className="block cursor-zoom-in" aria-label="View photo">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={m.imageUrl} alt="" className="max-h-64 w-full max-w-xs object-cover" />
                            </button>
                          ) : null}
                          <div className="px-3.5 py-2.5">
                            {m.text ? (
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {m.text}
                              </p>
                            ) : null}
                            <p
                              className={`${m.text ? "mt-1.5" : ""} text-[11px] ${
                                mine ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {formatTime(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {photo ? (
                <div className="flex shrink-0 items-center gap-3 border-t border-border px-3 pt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="h-14 w-14 rounded-md border border-border object-cover" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">{photo.file.name}</span>
                  <button onClick={clearPhoto} aria-label="Remove photo" className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <div className="flex shrink-0 gap-2 border-t border-border p-3">
                <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
                <Action onClick={() => fileRef.current?.click()} disabled={sending} aria-label="Attach a photo" className="px-3">
                  <ImagePlus className="h-4 w-4" />
                </Action>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder={photo ? "Add a caption (optional)" : "Type a message"}
                  aria-label="Message"
                  disabled={sending}
                  className="flex-1"
                />
                <Action solid onClick={onSend} disabled={sending || (!text.trim() && !photo)} className="px-3.5" aria-label="Send">
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Action>
              </div>
            </>
          )}
        </Panel>
      </div>
      {viewer ? <PhotoViewer photos={[viewer]} onClose={() => setViewer(null)} /> : null}
    </div>
  );
}
