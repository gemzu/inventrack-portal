"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getConversations,
  getMessages,
  getMyStorefronts,
  markConversationRead,
  sendMessage,
} from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/Toast";
import { Send, MessageSquare, Store } from "lucide-react";

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
  storefrontName?: string;
}

function formatTime(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const sameDay = dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
  return sameDay ? dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : dt.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function BuyerMessagesPage() {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [peerNameMap, setPeerNameMap] = useState<Record<string, string>>({});
  const [peerId, setPeerId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshConvos = useMemo(() => async () => {
    if (!user) return;
    try {
      const storefronts = await getMyStorefronts(user.id);
      const rows = await getConversations(user.id);
      const convos = (rows as unknown as Conversation[]).map(c => {
        const sf = storefronts?.find((s: unknown) => (s as unknown as any)?.storefront?.orgId);
        return { ...c, storefrontName: String((sf as unknown as any)?.storefront?.name || "") };
      });
      setConversations(convos);

      const nameMap: Record<string, string> = {};
      for (const sf of storefronts as unknown as any[]) {
        if (sf.storefront?.orgId) {
          const { data: org } = await supabase.from("organizations").select("owner_id").eq("id", sf.storefront.orgId).single();
          const ownerId = org?.owner_id;
          if (ownerId) {
            const { data: ownerUser } = await supabase.from("users").select("name, email").eq("id", ownerId).single();
            nameMap[ownerId] = ownerUser?.name || ownerUser?.email || "Storefront Owner";
          }
        }
      }
      setPeerNameMap(nameMap);
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  }, [user, toast]);

  useEffect(() => {
    refreshConvos().finally(() => setLoadingConvos(false));
  }, [refreshConvos]);

  useEffect(() => {
    if (!user || !peerId) return;
    getMessages(user.id, peerId)
      .then((rows) => setMessages(rows as unknown as Message[]))
      .catch((e) => toast((e as Error).message || "Failed to load messages", "error"));
    markConversationRead(user.id, peerId).catch(() => undefined);
  }, [user, peerId, toast]);

  useEffect(() => {
    if (!user || !orgId) return;
    const channel = supabase
      .channel(`buyer-messages-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `org_id=eq.${orgId}` }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const senderId = String(row.sender_id || "");
        const receiverId = String(row.receiver_id || "");
        if (senderId !== user.id && receiverId !== user.id) return;
        if (peerId && ((senderId === user.id && receiverId === peerId) || (senderId === peerId && receiverId === user.id))) {
          setMessages((prev) => [...prev, { id: String(row.id), senderId, receiverId, text: String(row.text || ""), createdAt: String(row.created_at || ""), read: Boolean(row.read) }]);
        }
        refreshConvos();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, orgId, peerId, refreshConvos]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!user || !orgId || !peerId || !text.trim()) return;
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F2D3E6 0%, #fce4ec 50%, #f8dce8 100%)' }}>
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(227,152,202,0.3) 0%, rgba(255,255,255,0) 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(227,152,202,0.4) 0%, transparent 40%)' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold" style={{ color: '#1f1a1d' }}>Messages</h1>
          <p className="opacity-70 mt-1">Chat with storefront owners</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-[320px_1fr] gap-4 min-h-0 h-[calc(100vh-200px)]">
        <div className="bg-white rounded-2xl overflow-hidden flex flex-col min-h-0" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="p-4 border-b" style={{ borderColor: '#f0e0e8' }}>
            <h2 className="font-semibold" style={{ color: '#1f1a1d' }}>Conversations</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {loadingConvos ? (
              <div className="p-3 space-y-2">
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-100 rounded-xl" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No messages yet.</p>
                <p className="text-xs mt-1">Connect to a storefront to start chatting</p>
              </div>
            ) : (
              conversations.map((c) => {
                const active = peerId === c.peerId;
                const unread = c.last && !c.last.read && c.last.senderId !== user?.id;
                const name = peerNameMap[c.peerId] || c.storefrontName || "Storefront Owner";
                return (
                  <button
                    key={c.peerId}
                    onClick={() => setPeerId(c.peerId)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${active ? 'bg-[#fce4ec]' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #F2D3E6 100%)' }}>
                        <Store className="w-5 h-5" style={{ color: '#E398CA' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium truncate" style={{ color: '#1f1a1d' }}>{name}</div>
                          <div className="text-xs text-gray-400 flex-shrink-0">{formatTime(c.last?.createdAt)}</div>
                        </div>
                        <div className={`text-sm truncate ${unread ? 'font-medium text-gray-700' : 'text-gray-500'}`}>
                          {c.last?.text || "No messages yet"}
                        </div>
                      </div>
                      {unread && <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#E398CA' }} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden flex flex-col min-h-0" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {!peerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #F2D3E6 100%)' }}>
                <MessageSquare className="w-7 h-7" style={{ color: '#E398CA' }} />
              </div>
              <h3 className="font-semibold mb-1" style={{ color: '#1f1a1d' }}>Select a conversation</h3>
              <p className="text-sm text-gray-500">Pick a conversation on the left to view messages.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: '#f0e0e8' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #F2D3E6 100%)' }}>
                  <Store className="w-5 h-5" style={{ color: '#E398CA' }} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate" style={{ color: '#1f1a1d' }}>{peerNameMap[peerId] || "Storefront Owner"}</div>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-8">Start the conversation.</div>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'text-white rounded-br-sm' : 'bg-gray-100 rounded-bl-sm'}`}
                          style={mine ? { background: '#E398CA' } : {}}>
                          <div className="whitespace-pre-wrap break-words">{m.text}</div>
                          <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400'}`}>{formatTime(m.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t flex gap-2" style={{ borderColor: '#f0e0e8' }}>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="h-11"
                />
                <Button onClick={handleSend} disabled={sending || !text.trim()} style={{ background: '#E398CA' }}>
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