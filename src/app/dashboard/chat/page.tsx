"use client";

/**
 * Messages, on the website.
 *
 * Rebuilt 2026-10-19 after "I can't send photos" and "I'm not sure I can start
 * a conversation". Both were true, and there was more:
 *   - no way to message anyone you had not already heard from;
 *   - no photo button, and photos sent from the phone did not show at all;
 *   - names read from columns the messages table does not have, so every
 *     conversation was "Unknown";
 *   - nothing was ever marked read, so unread counts only went up;
 *   - a refused send cleared the box as if it had gone.
 * It now works the way the phone's chat does: same table, same photo storage
 * (chat-images), same people you can write to.
 */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import Mark from "@/components/Mark";
import PhotoViewer from "@/components/PhotoViewer";
import { useToast } from "@/components/Toast";
import { Panel, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Input, Modal, SearchInput } from "@/components/console/controls";
import { Send, Loader2, ImagePlus, X, PenSquare } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  org_id: string;
  text: string | null;
  image_url?: string | null;
  read: boolean;
  created_at: string;
}

interface Person {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  permissions?: string | null;
}

interface Conversation {
  userId: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function roleLabel(p?: Person | null) {
  if (!p) return "";
  if (p.permissions === "owner") return "Owner";
  if (p.permissions === "superadmin") return "Super admin";
  if (p.role === "admin") return "Admin";
  if (p.role === "buyer") return "Buyer";
  return "Worker";
}

function preview(m: Message) {
  const t = (m.text || "").trim();
  if (t) return t;
  return m.image_url ? "Photo" : "";
}

function randomName(n = 12) {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => a[b % a.length]).join("");
}

export default function ChatPage() {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const userId = user?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [contacts, setContacts] = useState<Person[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Everyone you can write to: your team, and as an admin the buyers
     connected to your storefronts - the phone's list (utils/messaging.js). */
  const loadContacts = useCallback(async () => {
    if (!userId || !orgId) return;
    const found: Person[] = [];
    const { data: mates } = await supabase
      .from("users")
      .select("id, name, email, role, permissions")
      .eq("org_id", orgId)
      .neq("id", userId)
      .eq("active", true)
      .neq("role", "buyer")
      .order("name");
    for (const m of mates || []) found.push(m as Person);
    const { data: buyers } = await supabase
      .from("users")
      .select("id, name, email, role, permissions")
      .eq("role", "buyer")
      .eq("active", true)
      .order("name");
    for (const b of buyers || []) if (b.id !== userId) found.push(b as Person);
    setContacts(found);
    setPeople((prev) => {
      const next = { ...prev };
      for (const p of found) next[p.id] = { ...p, name: p.name || p.email || "Unnamed" };
      return next;
    });
  }, [userId, orgId]);

  /* Names for anyone in a conversation who is not in the list above (someone
     since switched off, a buyer from another storefront). */
  const loadNames = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => id && !people[id]);
    if (!missing.length) return;
    const { data } = await supabase.from("users").select("id, name, email, role, permissions").in("id", missing);
    setPeople((prev) => {
      const next = { ...prev };
      for (const p of data || []) next[p.id] = { ...(p as Person), name: p.name || p.email || "Unnamed" };
      for (const id of missing) if (!next[id]) next[id] = { id, name: "Someone outside this company" };
      return next;
    });
  }, [people]);

  const fetchMessages = useCallback(async () => {
    if (!userId || !orgId) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch {
      toast("Could not load messages", "error");
    } finally {
      setLoading(false);
    }
  }, [userId, orgId, toast]);

  useEffect(() => { fetchMessages(); loadContacts(); }, [fetchMessages, loadContacts]);

  const conversations = useMemo<Conversation[]>(() => {
    const map = new Map<string, Conversation>();
    for (const m of messages) {
      const other = m.sender_id === userId ? m.receiver_id : m.sender_id;
      if (!map.has(other)) map.set(other, { userId: other, lastMessage: preview(m), lastTime: m.created_at, unreadCount: 0 });
      if (m.sender_id !== userId && !m.read) map.get(other)!.unreadCount++;
    }
    return [...map.values()].sort((a, b) => +new Date(b.lastTime) - +new Date(a.lastTime));
  }, [messages, userId]);

  useEffect(() => { loadNames(conversations.map((c) => c.userId)); }, [conversations, loadNames]);

  /* Live: new messages to or from me in this company. */
  useEffect(() => {
    if (!orgId || !userId) return;
    const channel = supabase
      .channel(`messages-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if (m.org_id !== orgId) return;
        if (m.sender_id !== userId && m.receiver_id !== userId) return;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, userId]);

  const thread = useMemo(
    () => messages
      .filter((m) => (m.sender_id === activeChat && m.receiver_id === userId) || (m.sender_id === userId && m.receiver_id === activeChat))
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
    [messages, activeChat, userId]
  );

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.length, activeChat]);

  /* Opening a conversation reads it. Nothing was ever marked read here. */
  useEffect(() => {
    if (!activeChat || !userId) return;
    const unread = thread.filter((m) => m.sender_id === activeChat && !m.read).map((m) => m.id);
    if (!unread.length) return;
    supabase.from("messages").update({ read: true }).in("id", unread).then(({ error }) => {
      if (!error) setMessages((prev) => prev.map((m) => (unread.includes(m.id) ? { ...m, read: true } : m)));
    });
  }, [activeChat, thread, userId]);

  const openChat = (id: string) => {
    setActiveChat(id);
    setNewMessage("");
    clearPhoto();
  };

  function clearPhoto() {
    setPhoto((p) => { if (p) URL.revokeObjectURL(p.url); return null; });
    if (fileRef.current) fileRef.current.value = "";
  }

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("That is not a photo", "error"); return; }
    if (file.size > MAX_PHOTO_BYTES) { toast("Photo is over 10 MB", "error"); return; }
    clearPhoto();
    setPhoto({ file, url: URL.createObjectURL(file) });
  }

  async function handleSend() {
    const text = newMessage.trim();
    if ((!text && !photo) || !activeChat || !userId || !orgId || sending) return;
    setSending(true);
    try {
      let imageUrl: string | null = null;
      if (photo) {
        const raw = (photo.file.name.split(".").pop() || "jpg").toLowerCase();
        const ext = /^[a-z0-9]{2,5}$/.test(raw) ? raw : "jpg";
        /* Same place and naming as the phone; the name is unguessable
           because the link is public. */
        const path = `${orgId}/${userId}_${Date.now()}_${randomName()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat-images")
          .upload(path, photo.file, { contentType: photo.file.type, upsert: false });
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("chat-images").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase
        .from("messages")
        .insert({ sender_id: userId, receiver_id: activeChat, org_id: orgId, text, image_url: imageUrl })
        .select()
        .single();
      if (error) throw error;
      if (data) setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [data as Message, ...prev]));
      setNewMessage("");
      clearPhoto();
    } catch (err) {
      const why = err instanceof Error ? err.message : String((err as { message?: string })?.message || "");
      toast(`Not sent${why ? `: ${why}` : ""}`, "error");
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const nameOf = (id: string | null) => (id ? people[id]?.name || "Loading..." : "");
  const q = pickerQuery.trim().toLowerCase();
  const pickable = contacts.filter((p) => !q || `${p.name} ${p.email || ""} ${roleLabel(p)}`.toLowerCase().includes(q));

  return (
    <AdminGuard>
      <PageShell
        title="Messages"
        subtitle="Your team and your buyers, in one place - the same conversations as the app."
        actions={
          <Action solid onClick={() => { setPickerQuery(""); setPickerOpen(true); }}>
            <PenSquare className="h-3.5 w-3.5" /> New message
          </Action>
        }
      >
        <div className="grid h-[calc(100vh-22rem)] min-h-[26rem] gap-4 md:grid-cols-[17rem_1fr]">
          {/* ── Who ────────────────────────────────────────────── */}
          <Panel className="flex min-h-0 flex-col">
            <ColHead className="shrink-0 border-b border-border px-4 py-3">Conversations</ColHead>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => (
                    <CrateSkeleton key={i} className="h-12 w-full border-0" delay={i * 0.08} />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  <p>No conversations yet.</p>
                  <button
                    onClick={() => { setPickerQuery(""); setPickerOpen(true); }}
                    className="mt-2 text-[13px] text-[var(--brand-2)] hover:underline"
                  >
                    Start one
                  </button>
                </div>
              ) : (
                conversations.map((conv) => {
                  const active = activeChat === conv.userId;
                  return (
                    <button
                      key={conv.userId}
                      onClick={() => openChat(conv.userId)}
                      className={`row-line relative block w-full px-4 py-3 text-left ${
                        active ? "bg-[color-mix(in_oklab,var(--brand-2)_8%,transparent)]" : ""
                      }`}
                    >
                      {active && (
                        <span className="absolute inset-y-2 left-0 w-0.5 rounded-sm bg-[linear-gradient(to_bottom,var(--brand-1),var(--brand-3))]" />
                      )}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{nameOf(conv.userId)}</span>
                        <span className="mono shrink-0 text-[10px] text-muted-foreground">{formatTime(conv.lastTime)}</span>
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-2">
                        <p className="truncate text-[13px] text-muted-foreground">{conv.lastMessage}</p>
                        {conv.unreadCount > 0 && (
                          <span className="mono shrink-0 text-[11px] tabular-nums text-[var(--brand-2)]">{conv.unreadCount}</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Panel>

          {/* ── The thread ─────────────────────────────────────── */}
          <Panel className="flex min-h-0 flex-col">
            {activeChat ? (
              <>
                <div className="shrink-0 border-b border-border px-5 py-3">
                  <p className="truncate text-sm font-medium">{nameOf(activeChat)}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{roleLabel(people[activeChat])}</p>
                </div>

                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-5">
                  {thread.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">No messages yet - say hello.</p>
                  ) : null}
                  {thread.map((msg) => {
                    const mine = msg.sender_id === userId;
                    return (
                      <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[72%] overflow-hidden rounded-md text-sm ${
                            mine ? "bg-primary text-primary-foreground" : "border border-border"
                          }`}
                        >
                          {msg.image_url ? (
                            <button
                              type="button"
                              onClick={() => setViewer(msg.image_url as string)}
                              className="block cursor-zoom-in"
                              aria-label="View photo"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={msg.image_url} alt="" className="max-h-64 w-full max-w-xs object-cover" />
                            </button>
                          ) : null}
                          <div className="px-3.5 py-2.5">
                            {msg.text ? (
                              <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                            ) : null}
                            <p className={`mono ${msg.text ? "mt-1.5" : ""} text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
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
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder={photo ? "Add a caption (optional)" : "Type a message"}
                    aria-label="Message"
                    className="flex-1"
                  />
                  <Action solid onClick={handleSend} disabled={(!newMessage.trim() && !photo) || sending} className="px-3.5" aria-label="Send">
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Action>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <Mark className="h-8 w-8 text-[color-mix(in_oklab,var(--brand-2)_45%,transparent)]" strokeWidth={14} />
                <p className="mono mt-5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Nothing open</p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Pick a conversation on the left, or start a new one.
                </p>
                <Action className="mt-4" onClick={() => { setPickerQuery(""); setPickerOpen(true); }}>
                  <PenSquare className="h-3.5 w-3.5" /> New message
                </Action>
              </div>
            )}
          </Panel>
        </div>

        {/* ── Who to write to ─────────────────────────────────── */}
        <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="New message" subtitle="Your team, and buyers connected to your storefronts">
          <SearchInput
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search by name, email or role"
            autoFocus
          />
          <div className="mt-3 max-h-80 overflow-y-auto">
            {pickable.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {contacts.length ? "Nobody matches." : "Nobody to message yet - invite your team first."}
              </p>
            ) : (
              pickable.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPickerOpen(false); openChat(p.id); }}
                  className="row-line flex w-full items-center gap-3 px-2 py-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name || p.email || "Unnamed"}</span>
                    {p.email ? <span className="block truncate text-[12px] text-muted-foreground">{p.email}</span> : null}
                  </span>
                  <span className="mono shrink-0 text-[11px] text-muted-foreground">{roleLabel(p)}</span>
                </button>
              ))
            )}
          </div>
        </Modal>

        {viewer ? <PhotoViewer photos={[viewer]} onClose={() => setViewer(null)} /> : null}
      </PageShell>
    </AdminGuard>
  );
}
