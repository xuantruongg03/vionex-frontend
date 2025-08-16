import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import useAskChatBot from "@/hooks/use-ask-chatbot";

interface Message {
    id: string;
    content: string;
    sender: "user" | "ai";
    timestamp: Date;
}

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    isEmbedded?: boolean; // New prop for tab mode
}

export const Chatbot = ({
    isOpen,
    onClose,
    roomId,
    isEmbedded = false,
}: ChatbotProps) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            content: 'How can I help you? \n I can assist you with summary, paraphrasing, and answering questions about meeting.',
            sender: "ai",
            timestamp: new Date(),
        },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { isPending, askChatBot } = useAskChatBot();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: inputMessage,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");

        // Call the chatbot service
        const response = await askChatBot({
            question: inputMessage,
            roomId: roomId,
        })
            .then((res) => res.data)
            .then((data) => {
                if (data && data.answer) {
                    const aiMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        content: data.answer,
                        sender: "ai",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, aiMessage]);
                } else {
                    const aiMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        content: "Sorry, I didn't understand that.",
                        sender: "ai",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, aiMessage]);
                }
            })
            .catch((error) => {
                console.error("Error fetching chatbot response:", error);
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content:
                        "An error occurred while communicating with the chatbot.",
                    sender: "ai",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            })
            .finally(() => {
                scrollToBottom();
            });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isOpen) return null;

    // Embedded mode for tab usage
    if (isEmbedded) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-900">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${
                                    message.sender === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                }`}
                            >
                                <div
                                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                                        message.sender === "user"
                                            ? "bg-blue-600 text-white"
                                            : "bg-green-100 dark:bg-green-800 text-gray-800 dark:text-white border border-green-200 dark:border-green-700"
                                    }`}
                                >
                                    <p className="text-xs font-semibold mb-1">
                                        {message.sender === "user"
                                            ? "You"
                                            : "AI Assistant"}
                                    </p>
                                    {message.content}
                                </div>
                            </div>
                        ))}
                        {isPending && (
                            <div className="flex justify-start">
                                <div className="bg-green-100 dark:bg-green-800 border border-green-200 dark:border-green-700 px-3 py-2 rounded-lg">
                                    <div className="flex items-center gap-1">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"></div>
                                            <div
                                                className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"
                                                style={{
                                                    animationDelay: "0.1s",
                                                }}
                                            ></div>
                                            <div
                                                className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"
                                                style={{
                                                    animationDelay: "0.2s",
                                                }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-green-600 dark:text-green-300 ml-2">
                                            AI is thinking...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        AI can make mistakes, please verify the information
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask AI assistant..."
                            className="flex-1 text-sm border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                            disabled={isPending}
                        />
                        <Button
                            onClick={handleSendMessage}
                            size="icon"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!inputMessage.trim() || isPending}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Original floating mode

    return (
        <div
            className={`fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-200 ${
                isMinimized ? "w-64 h-12" : "w-80 h-96"
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900 text-sm">
                        Vionex AI
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-gray-200"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        {isMinimized ? (
                            <Maximize2 className="h-3.5 w-3.5" />
                        ) : (
                            <Minimize2 className="h-3.5 w-3.5" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-gray-200"
                        onClick={onClose}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <ScrollArea className="flex-1 p-3 h-72">
                        <div className="space-y-3">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${
                                        message.sender === "user"
                                            ? "justify-end"
                                            : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                                            message.sender === "user"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-800 border border-gray-200"
                                        }`}
                                    >
                                        {message.content}
                                    </div>
                                </div>
                            ))}
                            {isPending && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 border border-gray-200 px-3 py-2 rounded-lg">
                                        <div className="flex items-center gap-1">
                                            <div className="flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div
                                                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                                                    style={{
                                                        animationDelay: "0.1s",
                                                    }}
                                                ></div>
                                                <div
                                                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                                                    style={{
                                                        animationDelay: "0.2s",
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-500 ml-2">
                                                Wait a moment...
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                        <div className="flex gap-2">
                            <Input
                                value={inputMessage}
                                onChange={(e) =>
                                    setInputMessage(e.target.value)
                                }
                                onKeyPress={handleKeyPress}
                                placeholder="Enter your message..."
                                className="flex-1 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                disabled={isPending}
                            />
                            <Button
                                onClick={handleSendMessage}
                                size="icon"
                                className="h-9 w-9 bg-blue-600 hover:bg-blue-700"
                                disabled={!inputMessage.trim() || isPending}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                         <span>
                            AI can assist you with various tasks, such as
                            answering questions, providing information, and
                            more.
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};
