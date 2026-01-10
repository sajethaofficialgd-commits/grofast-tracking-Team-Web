import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Users } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

// Input validation schema
const messageSchema = z.object({
  text: z.string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be less than 5000 characters")
    .trim()
    .refine(
      (val) => !/<script|javascript:|onerror=|onclick=/i.test(val),
      "Message contains invalid content"
    ),
});

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

const TeamChatPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [generalGroupId, setGeneralGroupId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch or create general chat group
  useEffect(() => {
    const getOrCreateGeneralGroup = async () => {
      // Try to find existing general group
      const { data: existingGroup } = await supabase
        .from("chat_groups")
        .select("id")
        .eq("is_general", true)
        .maybeSingle();

      if (existingGroup) {
        setGeneralGroupId(existingGroup.id);
        return;
      }

      // Create general group if it doesn't exist
      const { data: newGroup, error } = await supabase
        .from("chat_groups")
        .insert({
          name: "General",
          description: "General team chat",
          is_general: true,
          created_by: user?.id,
        })
        .select("id")
        .single();

      if (!error && newGroup) {
        setGeneralGroupId(newGroup.id);
      }
    };

    if (user?.id) {
      getOrCreateGeneralGroup();
    }
  }, [user?.id]);

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", generalGroupId],
    queryFn: async () => {
      if (!generalGroupId) return [];
      
      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .eq("group_id", generalGroupId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!messagesData) return [];

      // Fetch sender names
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return messagesData.map(m => ({
        ...m,
        sender_name: profileMap.get(m.sender_id) || "Unknown User",
      }));
    },
    enabled: !!generalGroupId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!generalGroupId) return;

    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${generalGroupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", generalGroupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [generalGroupId, queryClient]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || !user?.id || !generalGroupId) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastMessageTime < 1000) {
      toast.error("Please wait before sending another message");
      return;
    }

    // Validate input
    const result = messageSchema.safeParse({ text: trimmedInput });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || "Invalid message");
      return;
    }

    setLastMessageTime(now);
    setInput("");

    const { error } = await supabase.from("messages").insert({
      content: result.data.text,
      sender_id: user.id,
      group_id: generalGroupId,
    });

    if (error) {
      toast.error("Failed to send message");
      setInput(trimmedInput); // Restore input on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-card rounded-xl border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Team Chat</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            General Channel
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] ${isMe ? "order-2" : ""}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? "justify-end" : ""}`}>
                    {!isMe && (
                      <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-medium">
                        {getInitials(message.sender_name || "U")}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {isMe ? "You" : message.sender_name} · {format(new Date(message.created_at), "h:mm a")}
                    </span>
                  </div>
                  <div
                    className={`px-4 py-2.5 rounded-2xl ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-4 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Type a message..."
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamChatPanel;
