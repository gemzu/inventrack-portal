"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getConversations, getMessages,
  markConversationRead, sendMessage, getMyStorefronts,
} from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/Toast";
import {
  Send, MessageSquare, User as UserIcon,
  Plus, Store, X as XIcon,
} from "lucide-react";

interface OrgUser { id: string; name?: string; email?: string; role?: string; orgId?: string; }
interface Message { id: string; senderId: string; receiverId: string; text: string; read?: boolean; createdAt?: string; }
interface Conversation {
  peerId: string;
  last: { text?: string; createdAt?: string; senderId?: string; read?: boolean; };
}
interface StorefrontInfo { id: string; name?: string; orgId?: string; }

function formatTime(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  return dt.toDateString() === now.toDateString()
    ? dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : dt.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function BuyerMessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Conversations & messages
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [peerId, setPeerId] = useState("");
  const [peerOrgId, setPeerOrgId] = useState("");      // org to use when sending
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Storefront admins (people the buyer can contact)
  const [storefrontAdmins, setStorefrontAdmins] = useState<OrgUser[]>([]);
  const [storefronts, setStorefronts] = useState<StorefrontInfo[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);

  // Peer → orgId map (so we know which org to use per conversation)
  const [peerOrgMap, setPeerOrgMap] = useState<Record<string, string>>({});

  // ── Load connected storefronts + their admins ───────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const my = await getMyStorefronts(user.id);
        const sfs = (my as Array<{ storefront?: { id?: string; name?: string; orgId?: string } }>)
          .map((s) => s.storefront)
          .filter((s): s is { id: string; name?: string; orgId?: string } => !!s?.id);
        setStorefronts(sfs as StorefrontInfo[]);

        // For each storefront org, load admin/owner users
        const orgIds = [...new Set(sfs.map((s) => s.orgId).filter(Boolean))] as string[];
        if (orgIds.length === 0) return;

        const { data: adminRows } = await supabase
          .from("users")
          .select("id, name, email, role, org_id")
          .in("org_id", orgIds)
          .in("role", ["admin", "owner"]);

        const admins: OrgUser[] = (adminRows || []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          orgId: u.org_id,
        }));
        setStorefrontAdmins(admins);

        // Build initial peerOrgMap from admins
        const map: Record<string, string> = {};
        for (const a of admins) if (a.orgId) map[a.id] = a.orgId;
        setPeerOrgMap(map);
      } catch {
        // Non-fatal
      }
    })();
  }, [user]);

  // ── Auto-select peer from URL query params (?peer=ID&org=ORGID) ─
  useEffect(() => {
    const paramPeer = searchParams.get("peer");
    const paramOrg  = searchParams.get("org");
    if (paramPeer) {
      setPeerId(paramPeer);
      if (paramOrg) {
        setPeerOrgId(paramOrg);
        setPeerOrgMap((prev) => ({ ...prev, [paramPeer]: paramOrg }));
      }
    }
  }, [searchParams]);

  // ── Load conversations ───────────────────────────────────────
  const refreshConvos = useMemo(() => async () => {
    if (!user) return;
    try {
      const rows = await getConversations(user.id);
      setConversations(rows as unknown as Conversation[]);
    } catch (e) {
      toast((e as Error).message || "Failed to load conversations", "error");
    }
  }, [user, toast]);

  useEffect(() => { refreshConvos().finally(() => setLoadingConvos(false)); }, [refreshConvos]);

  // ── Load messages when peer changes ─────────────────────────
  useEffect(() => {
    if (!user || !peerId) return;
    getMessages(user.id, peerId)
      .then((rows) => setMessages(rows as unknown as Message[]))
      .catch((e) => toast((e as Error).message || "Failed to load messages", "error"));
    markConversationRead(user.id, peerId).catch(() => undefined);
  }, [user, peerId, toast]);

  // ── Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || storefronts.length === 0) return;
    const orgIds = [...new Set(storefronts.map((s) => s.orgId).filter(Boolean))] as string[];
    if (orgIds.length === 0) return;

    // Subscribe to messages in all connected orgs
    const channels = orgIds.map((orgId) =>
      supabase
        .channel(`buyer-msg-${user.id}-${orgId}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "messages",
          filter: `org_id=eq.${orgId}`,
        }, (payload) => {
          const row = payload.new as Record<string, unknown>;
          const senderId = String(row.sender_id || "");
          const receiverId = String(row.receiver_id || "");
          if (senderId !== user.id && receiverId !== user.id) return;

          if (peerId && (
            (senderId === user.id && receiverId === peerId) ||
            (senderId === peerId && receiverId === user.id)
          )) {
            setMessages((prev) => [...prev, {
              id: String(row.id),
              senderId, receiverId,
              text: String(row.text || ""),
              createdAt: String(row.created_at || ""),
              read: Boolean(row.read),
            }]);
          }
          refreshConvos();
        })
        .subscribe()
    );
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [user, storefronts, peerId, refreshConvos]);

  // ── Autoscroll ────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Peer name / role helpers ──────────────────────────────────
  const adminMap = useMemo(() => {
    const m: Record<string, OrgUser> = {};
    for (const a of storefrontAdmins) m[a.id] = a;
    return m;
  }, [storefrontAdmins]);

  const peerName = (id: string) => {
    const u = adminMap[id];
    if (!u) return id.slice(0, 8);
    return u.name || u.email || id.slice(0, 8);
  };

  const peerStorefront = (id: string) => {
    const orgId = peerOrgMap[id];
    return storefronts.find((s) => s.orgId === orgId)?.name;
  };

  // Admins not yet in any conversation (for "New chat" list)
  const unconversedAdmins = useMemo(() => {
    const existingPeers = new Set(conversations.map((c) => c.peerId));
    return storefrontAdmins.filter((a) => !existingPeers.has(a.id));
  }, [storefrontAdmins, conversations]);

  // ── Select peer (from conversation or new chat) ───────────────
  const selectPeer = (id: string, orgId?: string) => {
    setPeerId(id);
    if (orgId) {
      setPeerOrgId(orgId);
      setPeerOrgMap((prev) => ({ ...prev, [id]: orgId }));
    } else {
      setPeerOrgId(peerOrgMap[id] || "");
    }
    setShowNewChat(false);
  };

  // ── Send ──────────────────────────────────────────────────────
  const onSend = async () => {
    if (!user || !peerId || !text.trim()) return;
    const orgId = peerOrgId || peerOrgMap[peerId];
    if (!orgId) {
      toast("Cannot determine which storefront to message", "error");
      return;
    }
    const body = text.trim();
    setSending(true);
    try {
      await sendMessage(orgId, user.id, peerId, body);
      setText("");
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
    <div className="h-screen bg-background flex flex-col animate-page-enter overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Messages</h1>
              <p className="text-xs text-muted-foreground">Chat with storefront admins</p>
            </div>
          </div>
          {storefrontAdmins.length > 0 && (
            <button
              onClick={() => setShowNewChat((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden max-w-7xl w-full mx-auto px-4 py-4 grid md:grid-cols-[280px_1fr] gap-4 min-h-0">

        {/* ── Conversation list ── */}
        <div className="card-luxury overflow-hidden flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Conversations</p>
            {conversations.length > 0 && (
              <span className="text-xs text-muted-foreground">{conversations.length}</span>
            )}
          </div>

          {/* New chat picker */}
          {showNewChat && (
            <div className="border-b border-border bg-secondary/30 shrink-0">
              <div className="px-3 py-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Start a conversation
                </p>
                <button onClick={() => setShowNewChat(false)} className="text-muted-foreground hover:text-foreground">
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              {unconversedAdmins.length === 0 ? (
                <p className="px-3 pb-3 text-xs text-muted-foreground">
                  You&apos;ve already started chats with all admins.
                </p>
              ) : (
                unconversedAdmins.map((a) => {
                  const sf = storefronts.find((s) => s.orgId === a.orgId);
                  return (
                    <button
                      key={a.id}
                      onClick={() => selectPeer(a.id, a.orgId)}
                      className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <UserIcon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {a.name || a.email || a.id.slice(0, 8)}
                        </div>
                        {sf && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Store className="w-2.5 h-2.5" />
                            {sf.name}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Conversation rows */}
          <div className="overflow-y-auto flex-1">
            {loadingConvos ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No conversations yet</p>
                {storefrontAdmins.length > 0 && (
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Start a chat →
                  </button>
                )}
              </div>
            ) : (
              conversations.map((c) => {
                const active = peerId === c.peerId;
                const unread = c.last && !c.last.read && c.last.senderId !== user?.id;
                const sf = peerStorefront(c.peerId);
                return (
                  <button
                    key={c.peerId}
                    onClick={() => selectPeer(c.peerId)}
                    className={`w-full text-left px-3 py-3 border-b border-border/50 last:border-0 transition-all duration-150 ${
                      active ? "bg-primary/10" : "hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        active ? "bg-primary" : "bg-secondary"
                      }`}>
                        <UserIcon className={`w-4 h-4 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-sm font-medium truncate ${active ? "text-primary" : "text-foreground"}`}>
                            {peerName(c.peerId)}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTime(c.last?.createdAt)}
                          </span>
                        </div>
                        {sf && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Store className="w-2.5 h-2.5" />
                            {sf}
                          </div>
                        )}
                        <div className={`text-xs truncate mt-0.5 ${unread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {c.last?.text || ""}
                        </div>
                      </div>
                      {unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 pulse-dot" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Thread ── */}
        <div className="card-luxury overflow-hidden flex flex-col min-h-0">
          {!peerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No conversation selected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {storefronts.length === 0
                  ? "Connect to a storefront first to start chatting."
                  : "Pick a conversation or start a new one."}
              </p>
              {storefrontAdmins.length > 0 && (
                <button
                  onClick={() => setShowNewChat(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  New chat
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground text-sm truncate">{peerName(peerId)}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {adminMap[peerId]?.role && (
                      <span className="capitalize">{adminMap[peerId].role}</span>
                    )}
                    {peerStorefront(peerId) && (
                      <>
                        {adminMap[peerId]?.role && <span>·</span>}
                        <Store className="w-2.5 h-2.5" />
                        {peerStorefront(peerId)}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Say hello! This is the start of your conversation.
                  </div>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                        }`}>
                          <div className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</div>
                          <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatTime(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Composer */}
              <div className="p-3 border-t border-border flex gap-2 shrink-0">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
                  }}
                  placeholder="Type a message… (Enter to send)"
                  disabled={sending}
                  className="flex-1"
                />
                <button
                  onClick={onSend}
                  disabled={sending || !text.trim()}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
