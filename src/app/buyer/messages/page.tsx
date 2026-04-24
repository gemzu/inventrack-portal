"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getConversations,
  getMessages,
  getOrgUsers,
  markConversationRead,
  sendMessage,
} from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/Toast";
import { Send, MessageSquare, User as UserIcon } from "lucide-react";

interface OrgUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
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
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<Record<string, OrgUser>>({});
  const [peerId, setPeerId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load org users (for peer name resolution)
  useEffect(() => {
    if (!orgId) return;
    getOrgUsers(orgId)
      .then((rows) => {
        const map: Record<string, OrgUser> = {};
        for (const u of rows as unknown as OrgUser[]) map[u.id] = u;
        setUsers(map);
      })
      .catch(() => undefined);
  }, [orgId]);

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

  // Realtime: subscribe to new messages in this org where I'm sender or receiver
  useEffect(() => {
    if (!user || !orgId) return;
    const channel = supabase
      .channel(`buyer-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `org_id=eq.${orgId}`,
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
  }, [user, orgId, peerId, refreshConvos]);

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

  const onSend = async () => {
    if (!user || !orgId || !peerId || !text.trim()) return;
    const body = text.trim();
    setSending(true);
    try {
      await sendMessage(orgId, user.id, peerId, body);
      setText("");
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Chat with admins about your orders
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid md:grid-cols-[300px_1fr] gap-4 min-h-0">
        {/* Conversation list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Conversations</h2>
          </div>
          <div className="overflow-y-auto flex-1">
            {loadingConvos ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No conversations yet.
              </div>
            ) : (
              conversations.map((c) => {
                const active = peerId === c.peerId;
                const unread = c.last && !c.last.read && c.last.senderId !== user?.id;
                return (
                  <button
                    key={c.peerId}
                    onClick={() => setPeerId(c.peerId)}
                    className={`w-full text-left p-3 border-b border-border/60 hover:bg-muted/40 transition-colors ${
                      active ? "bg-muted/60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium truncate">
                            {peerName(c.peerId)}
                          </div>
                          <div className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTime(c.last?.createdAt)}
                          </div>
                        </div>
                        <div
                          className={`text-sm truncate ${
                            unread ? "text-foreground font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {c.last?.text || ""}
                        </div>
                      </div>
                      {unread ? (
                        <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-0">
          {!peerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <h3 className="font-semibold mb-1">Select a conversation</h3>
              <p className="text-sm text-muted-foreground">
                Pick a conversation on the left to view messages.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{peerName(peerId)}</div>
                  {users[peerId]?.role ? (
                    <div className="text-xs text-muted-foreground capitalize">
                      {users[peerId].role}
                    </div>
                  ) : null}
                </div>
              </div>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Start the conversation.
                  </div>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                            mine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">{m.text}</div>
                          <div
                            className={`text-[10px] mt-1 ${
                              mine
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder="Type a message..."
                  disabled={sending}
                />
                <Button onClick={onSend} disabled={sending || !text.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
