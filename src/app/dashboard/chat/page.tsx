"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import Mark from "@/components/Mark";
import { Panel, ColHead, CrateSkeleton } from "@/components/console/surfaces";
import { Action, Input } from "@/components/console/controls";
import { Send, Loader2 } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  org_id: string;
  text: string;
  image_url?: string;
  read: boolean;
  created_at: string;
  sender_name?: string;
  receiver_name?: string;
}

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

export default function ChatPage() {
  const { user, orgId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [activeChatName, setActiveChatName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = user?.id;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Build conversation list grouped by other user
  const buildConversations = useCallback((msgs: Message[]) => {
    const convMap = new Map<string, Conversation>();

    for (const msg of msgs) {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const otherUserName = msg.sender_id === userId
        ? msg.receiver_name || "Unknown"
        : msg.sender_name || "Unknown";

      if (!convMap.has(otherUserId)) {
        convMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUserName,
          lastMessage: msg.text,
          lastTime: msg.created_at,
          unreadCount: 0,
        });
      }

      const conv = convMap.get(otherUserId)!;
      // Count unread: messages from other user that are newer
      if (msg.sender_id !== userId && !msg.read) {
        conv.unreadCount++;
      }
    }

    const sorted = Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    );
    setConversations(sorted);
  }, [userId]);

  // Fetch all messages for this user in their org
  const fetchMessages = useCallback(async () => {
    if (!userId || !orgId) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMessages(data);
        buildConversations(data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, orgId, buildConversations]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.org_id !== orgId) return;
          if (newMsg.sender_id !== userId && newMsg.receiver_id !== userId) return;

          setMessages((prev) => [newMsg, ...prev]);
          // Re-build conversations
          setMessages((prev) => {
            buildConversations(prev);
            return prev;
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, userId, scrollToBottom, buildConversations]);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat, scrollToBottom]);

  const activeChatMessages = messages
    .filter(
      (m) =>
        (m.sender_id === activeChat && m.receiver_id === userId) ||
        (m.sender_id === userId && m.receiver_id === activeChat)
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  async function handleSend() {
    if (!newMessage.trim() || !activeChat || !userId || !orgId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: activeChat,
        org_id: orgId,
        text: newMessage.trim(),
      });
      if (!error) {
        setNewMessage("");
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <AdminGuard>
      <PageShell
        title="Messages"
        eyebrow="Console"
        subtitle="Whoever is asking, and what they asked."
      >
        <div className="grid h-[calc(100vh-22rem)] min-h-[26rem] gap-4 md:grid-cols-[17rem_1fr]">
          {/* ── Who ────────────────────────────────────────────── */}
          <Panel className="flex min-h-0 flex-col">
            <ColHead className="shrink-0 border-b border-border px-4 py-3">
              Conversations
            </ColHead>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => (
                    <CrateSkeleton key={i} className="h-12 w-full border-0" delay={i * 0.08} />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nobody has written yet.</p>
              ) : (
                conversations.map((conv) => {
                  const active = activeChat === conv.userId;
                  return (
                    <button
                      key={conv.userId}
                      onClick={() => {
                        setActiveChat(conv.userId);
                        setActiveChatName(conv.userName);
                      }}
                      className={`row-line relative block w-full px-4 py-3 text-left ${
                        active ? "bg-[color-mix(in_oklab,var(--brand-2)_8%,transparent)]" : ""
                      }`}
                    >
                      {active && (
                        <span className="absolute inset-y-2 left-0 w-0.5 rounded-sm bg-[linear-gradient(to_bottom,var(--brand-1),var(--brand-3))]" />
                      )}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{conv.userName}</span>
                        <span className="mono shrink-0 text-[10px] text-muted-foreground">
                          {formatTime(conv.lastTime)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-2">
                        <p className="truncate text-[13px] text-muted-foreground">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="mono shrink-0 text-[11px] tabular-nums text-[var(--brand-2)]">
                            {conv.unreadCount}
                          </span>
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
                  <p className="truncate text-sm font-medium">{activeChatName}</p>
                </div>

                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-5">
                  {activeChatMessages.map((msg) => {
                    const isMine = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[72%] rounded-md px-3.5 py-2.5 text-sm ${
                            isMine
                              ? "bg-primary text-primary-foreground"
                              : "border border-border"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {msg.text}
                          </p>
                          <p
                            className={`mono mt-1.5 text-[10px] ${
                              isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="flex shrink-0 gap-2 border-t border-border p-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message"
                    aria-label="Message"
                    className="flex-1"
                  />
                  <Action
                    solid
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="px-3.5"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Action>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <Mark
                  className="h-8 w-8 text-[color-mix(in_oklab,var(--brand-2)_45%,transparent)]"
                  strokeWidth={14}
                />
                <p className="mono mt-5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Nothing open
                </p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Pick a conversation on the left.
                </p>
              </div>
            )}
          </Panel>
        </div>
      </PageShell>
    </AdminGuard>
  );
}
