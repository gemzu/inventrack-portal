"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/page-shell";
import { useAuth } from "@/context/AuthContext";
import { getConversations, getMessages, markConversationRead, sendMessage } from "@/lib/dataService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/Toast";

export default function BuyerMessagesPage() {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Array<Record<string, unknown>>>([]);
  const [peerId, setPeerId] = useState<string>("");
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!user) return;
    getConversations(user.id).then((rows) => setConversations(rows as Array<Record<string, unknown>>)).catch((e) => toast((e as Error).message || "Failed to load conversations", "error"));
  }, [user, toast]);

  useEffect(() => {
    if (!user || !peerId) return;
    getMessages(user.id, peerId).then((rows) => setMessages(rows as Array<Record<string, unknown>>)).catch((e) => toast((e as Error).message || "Failed to load messages", "error"));
    markConversationRead(user.id, peerId).catch(() => undefined);
  }, [user, peerId, toast]);

  return (
    <PageShell title="Messages" subtitle="Buyer conversations">
      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card><CardContent className="p-2 space-y-1">
          {conversations.map((c) => (
            <Button key={String(c.peerId)} variant={peerId === String(c.peerId) ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setPeerId(String(c.peerId))}>
              {String(c.peerId).slice(0, 8)}
            </Button>
          ))}
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-3">
          <div className="max-h-[55vh] overflow-y-auto space-y-2">
            {messages.map((m, i) => (
              <div key={String(m.id || i)} className={`rounded-md px-3 py-2 text-sm ${String(m.senderId) === user?.id ? "bg-primary text-primary-foreground ml-8" : "bg-muted mr-8"}`}>
                {String(m.text || "")}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
            <Button
              onClick={async () => {
                if (!user || !orgId || !peerId || !text.trim()) return;
                await sendMessage(orgId, user.id, peerId, text.trim());
                setText("");
                const rows = await getMessages(user.id, peerId);
                setMessages(rows as Array<Record<string, unknown>>);
              }}
            >
              Send
            </Button>
          </div>
        </CardContent></Card>
      </div>
    </PageShell>
  );
}

