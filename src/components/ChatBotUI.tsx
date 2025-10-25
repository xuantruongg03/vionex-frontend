import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Bot, Minimize2, Maximize2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import useAskChatBot from "@/hooks/use-ask-chatbot";

// Typing indicator component with 3 dots animation
const TypingIndicator = ({ theme = "default" }: { theme?: "default" | "green" }) => {
    const dotColor = theme === "green" ? "bg-green-400" : "bg-gray-400";
    const textColor = theme === "green" ? "text-green-600 dark:text-green-300" : "text-gray-500 dark:text-gray-400";

    return (
        <div className='flex items-center space-x-1'>
            <span className={`text-sm ${textColor}`}>AI is thinking</span>
            <div className='flex space-x-1'>
                <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce [animation-delay:-0.3s]`}></div>
                <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce [animation-delay:-0.15s]`}></div>
                <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`}></div>
            </div>
        </div>
    );
};

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

export const Chatbot = ({ isOpen, onClose, roomId, isEmbedded = false }: ChatbotProps) => {
    // Load messages from session storage on mount
    const getStorageKey = useCallback(() => `chatbot-messages-${roomId}`, [roomId]);

    const loadMessages = useCallback(() => {
        try {
            const stored = sessionStorage.getItem(getStorageKey());
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                }));
            }
        } catch (error) {
            console.warn("Failed to load chat history:", error);
        }
        return [
            {
                id: "1",
                content: "How can I help you? \n I can assist you with summary, paraphrasing, and answering questions about meeting.",
                sender: "ai" as const,
                timestamp: new Date(),
            },
        ];
    }, [getStorageKey]);

    const [messages, setMessages] = useState<Message[]>(loadMessages);
    const [inputMessage, setInputMessage] = useState("");
    const [isMinimized, setIsMinimized] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const requestToMessageId = useRef(new Map<string, string>());
    const requestTimeouts = useRef(new Map<string, NodeJS.Timeout>());

    // Save messages to session storage when changed
    useEffect(() => {
        // Don't save if it's just the initial welcome message
        if (messages.length > 1 || messages[0]?.id !== "1") {
            try {
                sessionStorage.setItem(getStorageKey(), JSON.stringify(messages));
            } catch (error) {
                console.warn("Failed to save chat history:", error);
            }
        }
    }, [messages, getStorageKey]);

    // Clear chat history ONLY when roomId changes (switching rooms)
    useEffect(() => {
        const currentKey = getStorageKey();
        
        return () => {
            try {
                sessionStorage.removeItem(currentKey);
            } catch (error) {
                console.warn("Failed to clear previous room chat:", error);
            }
        };
    }, [roomId]);

    const scrollTimeoutRef = useRef<NodeJS.Timeout>();
    const lastScrollTime = useRef<number>(0);

    const throttledScrollToBottom = useCallback(() => {
        const now = Date.now();
        const timeSinceLastScroll = now - lastScrollTime.current;

        // Throttle scrolling to max 30fps for better performance
        if (timeSinceLastScroll < 33) {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                lastScrollTime.current = Date.now();
            }, 33 - timeSinceLastScroll);
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            lastScrollTime.current = now;
        }
    }, []);

    // Performance: Optimized message update with reduced re-renders
    const updateMessage = useCallback(
        (messageId: string, content: string, shouldScroll = true) => {
            setMessages((prev) => {
                const messageIndex = prev.findIndex((m) => m.id === messageId);
                if (messageIndex === -1) return prev;

                // Only update if content actually changed
                if (prev[messageIndex].content === content) return prev;

                const next = [...prev];
                next[messageIndex] = { ...next[messageIndex], content };

                if (shouldScroll) {
                    queueMicrotask(throttledScrollToBottom);
                }

                return next;
            });
        },
        [throttledScrollToBottom]
    );

    const { sendQuestion } = useAskChatBot(roomId, {
        onResponse: ({ requestId, text }) => {
            const aiMsgId = requestToMessageId.current.get(requestId);
            if (!aiMsgId) return;

            // Clear timeout
            const timeoutId = requestTimeouts.current.get(requestId);
            if (timeoutId) {
                clearTimeout(timeoutId);
                requestTimeouts.current.delete(requestId);
            }

            // Update with final response
            updateMessage(aiMsgId, text, true);
            requestToMessageId.current.delete(requestId);

            // Clear pending state
            if (pendingRequestId === requestId) {
                setIsPending(false);
                setPendingRequestId(null);
            }
        },
        onError: ({ requestId, message }) => {
            const aiMsgId = requestToMessageId.current.get(requestId);
            if (!aiMsgId) return;

            // Clear timeout
            const timeoutId = requestTimeouts.current.get(requestId);
            if (timeoutId) {
                clearTimeout(timeoutId);
                requestTimeouts.current.delete(requestId);
            }

            updateMessage(aiMsgId, `Error: ${message}`, true);
            requestToMessageId.current.delete(requestId);

            // Clear pending state
            if (pendingRequestId === requestId) {
                setIsPending(false);
                setPendingRequestId(null);
            }
        },
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isPending) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: inputMessage,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const question = inputMessage.trim();
        setInputMessage("");

        // Create AI message with typing indicator
        const aiMessageId = `${Date.now()}-ai`;
        const aiMessage: Message = {
            id: aiMessageId,
            content: "", // Will be rendered as TypingIndicator
            sender: "ai",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        queueMicrotask(throttledScrollToBottom);

        // Set pending state và send question
        setIsPending(true);
        const { requestId } = await sendQuestion(question);
        setPendingRequestId(requestId);
        requestToMessageId.current.set(requestId, aiMessageId);

        // Timeout fallback: Nếu không có response trong 30s, hiển thị lỗi
        const timeoutId = setTimeout(() => {
            if (requestToMessageId.current.has(requestId)) {
                updateMessage(aiMessageId, "⏰ Request timeout. Please try again.", true);
                requestToMessageId.current.delete(requestId);
                requestTimeouts.current.delete(requestId);
                setIsPending(false);
                setPendingRequestId(null);
            }
        }, 30000);

        // Store timeout để có thể clear khi có response
        requestTimeouts.current.set(requestId, timeoutId);
    };

    // Clear chat history
    const clearChatHistory = useCallback(() => {
        const welcomeMessage = {
            id: "1",
            content: "How can I help you? \n I can assist you with summary, paraphrasing, and answering questions about meeting.",
            sender: "ai" as const,
            timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        try {
            sessionStorage.removeItem(getStorageKey());
            console.log("Chat history manually cleared");
        } catch (error) {
            console.warn("Failed to clear chat history:", error);
        }
    }, [getStorageKey]);

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
            <div className='flex flex-col h-full bg-white dark:bg-gray-900'>
                {/* Messages */}
                <ScrollArea className='flex-1 p-4'>
                    <div className='space-y-4'>
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${message.sender === "user" ? "bg-blue-600 text-white" : "bg-green-100 dark:bg-green-800 text-gray-800 dark:text-white border border-green-200 dark:border-green-700"}`}>
                                    <p className='text-xs font-semibold mb-1'>{message.sender === "user" ? "You" : "AI Assistant"}</p>
                                    {/* Show typing indicator if AI message has empty content and is pending */}
                                    {message.sender === "ai" && !message.content && isPending ? <TypingIndicator theme='green' /> : message.content}
                                </div>
                            </div>
                        ))}
                        {/* Remove the duplicate pending indicator since we handle it in messages */}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center justify-between mb-2'>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>AI can make mistakes, please verify the information</p>
                    </div>
                    <div className='flex gap-2'>
                        <Input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder='Ask AI assistant...' className='flex-1 text-sm border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500' disabled={isPending} />
                        <Button onClick={handleSendMessage} size='icon' className='bg-blue-600 hover:bg-blue-700' disabled={!inputMessage.trim() || isPending}>
                            <Send className='h-4 w-4' />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Original floating mode

    return (
        <div className={`fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-200 ${isMinimized ? "w-64 h-12" : "w-80 h-96"}`}>
            {/* Header */}
            <div className='flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg'>
                <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                        <Bot className='h-4 w-4 text-blue-600' />
                    </div>
                    <span className='font-medium text-gray-900 text-sm'>Vionex AI</span>
                </div>
                <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='icon' className='h-7 w-7 hover:bg-gray-200' onClick={clearChatHistory} title='Clear chat history'>
                        <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                    <Button variant='ghost' size='icon' className='h-7 w-7 hover:bg-gray-200' onClick={() => setIsMinimized(!isMinimized)}>
                        {isMinimized ? <Maximize2 className='h-3.5 w-3.5' /> : <Minimize2 className='h-3.5 w-3.5' />}
                    </Button>
                    <Button variant='ghost' size='icon' className='h-7 w-7 hover:bg-gray-200' onClick={onClose}>
                        <X className='h-3.5 w-3.5' />
                    </Button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <ScrollArea className='flex-1 p-3 h-72'>
                        <div className='space-y-3'>
                            {messages.map((message) => (
                                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800 border border-gray-200"}`}>
                                        {/* Show typing indicator if AI message has empty content and is pending */}
                                        {message.sender === "ai" && !message.content && isPending ? <TypingIndicator /> : message.content}
                                    </div>
                                </div>
                            ))}
                            {/* Remove the duplicate pending indicator since we handle it in messages */}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className='p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg'>
                        <div className='flex gap-2'>
                            <Input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder='Enter your message...' className='flex-1 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500' disabled={isPending} />
                            <Button onClick={handleSendMessage} size='icon' className='h-9 w-9 bg-blue-600 hover:bg-blue-700' disabled={!inputMessage.trim() || isPending}>
                                <Send className='h-4 w-4' />
                            </Button>
                        </div>
                        <span>AI can assist you with various tasks, such as answering questions, providing information, and more.</span>
                    </div>
                </>
            )}
        </div>
    );
};
