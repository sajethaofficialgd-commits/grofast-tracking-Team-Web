import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

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
  id: number;
  text: string;
  sender: "user" | "other";
  name: string;
  timestamp: string;
}

const ChatPanel = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hey team! How's the project going?",
      sender: "other",
      name: "Sarah",
      timestamp: "10:30 AM",
    },
    {
      id: 2,
      text: "Great progress! Just finished the API integration.",
      sender: "other",
      name: "Mike",
      timestamp: "10:32 AM",
    },
    {
      id: 3,
      text: "Awesome work everyone! Let's sync up at 2 PM.",
      sender: "other",
      name: "Sarah",
      timestamp: "10:35 AM",
    },
  ]);
  const [lastMessageTime, setLastMessageTime] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Rate limiting - prevent spam (1 message per second)
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

    const newMessage: Message = {
      id: Date.now(),
      text: result.data.text,
      sender: "user",
      name: "You",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages([...messages, newMessage]);
    setInput("");
    setLastMessageTime(now);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="section-card flex flex-col h-[400px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="panel-header mb-0">Team Chat</h3>
          <p className="text-xs text-muted-foreground">3 members online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
          >
            <div className={`max-w-[75%] ${message.sender === "user" ? "order-2" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                {message.sender === "other" && (
                  <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-medium">
                    {message.name[0]}
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {message.name} · {message.timestamp}
                </span>
              </div>
              <div
                className={`px-4 py-2.5 ${
                  message.sender === "user"
                    ? "chat-bubble-sent"
                    : "chat-bubble-received"
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="input-styled flex-1"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="btn-primary px-4 rounded-lg flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
