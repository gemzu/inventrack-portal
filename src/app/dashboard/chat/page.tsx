"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/AdminGuard";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
  }, [userId, orgId]);

  // Build conversation list grouped by other user
  function buildConversations(msgs: Message[]) {
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
  }

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
  }, [orgId, userId, scrollToBottom]);

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
      <div className="animate-page-enter">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>

        <Card><CardContent className="overflow-hidden flex p-0 h-[calc(100vh-220px)] min-h-[400px]"
        >
          {/* Left panel - Conversation list */}
          <div
            className="w-1/3 flex flex-col border-r border-border"
          >
            <div
              className="p-4 font-semibold text-sm border-b border-border"
            >
              Conversations
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                  <MessageCircle className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No conversations yet
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => {
                      setActiveChat(conv.userId);
                      setActiveChatName(conv.userName);
                    }}
                    className={`w-full text-left p-4 transition hover:bg-black/5 dark:hover:bg-white/5 border-b border-border ${
                      activeChat === conv.userId ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm truncate">
                        {conv.userName}
                      </span>
                      <span
                        className="text-[10px] shrink-0 ml-2 text-muted-foreground"
                      >
                        {formatTime(conv.lastTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className="text-xs truncate text-muted-foreground"
                      >
                        {conv.lastMessage}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 shrink-0 bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right panel - Active chat */}
          <div className="flex-1 flex flex-col">
            {activeChat ? (
              <>
                {/* Chat header */}
                <div
                  className="p-4 font-semibold text-sm flex items-center gap-2 border-b border-border"
                >
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                    {activeChatName.charAt(0).toUpperCase()}
                  </div>
                  {activeChatName}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeChatMessages.map((msg) => {
                    const isMine = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMine
                              ? "bg-primary text-white rounded-br-md"
                              : "rounded-bl-md bg-muted border border-border text-foreground"
                          }`}
                        >
                          <p>{msg.text}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isMine ? "text-white/60" : "text-muted-foreground"
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

                {/* Input bar */}
                <div
                  className="p-4 flex items-center gap-3 border-t border-border"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none bg-muted border border-border text-foreground"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <MessageCircle className="w-12 h-12 mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Select a conversation to start messaging
                </p>
              </div>
            )}
          </div>
        </CardContent></Card>
      </div>
    </AdminGuard>
  );
}
