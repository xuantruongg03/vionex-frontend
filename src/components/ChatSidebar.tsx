import { useIsMobile } from "@/hooks/use-mobile";
import CONSTANT from "@/lib/constant";
import dayjs from "dayjs";
import type { Message } from "@/hooks/use-chat";
import { File, Image, Paperclip, Send, X, MessageCircle, Bot, Clock, RotateCcw, Reply } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { Chatbot } from "./ChatBotUI";

interface ChatSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    roomId: string;
    // Chat hook data passed from parent
    messages: Message[];
    sendMessage: (text: string) => void;
    sendFileMessage: (file: File) => void;
    retryMessage: (messageId: string) => void;
    deleteMessage: (messageId: string) => void;
    replyingTo: Message | null;
    setReplyingTo: (message: Message | null) => void;
    cancelReply: () => void;
}

type TabType = "normal" | "ai";

export const ChatSidebar = ({ isOpen, setIsOpen, roomId, messages, sendMessage, sendFileMessage, retryMessage, deleteMessage, replyingTo, setReplyingTo, cancelReply }: ChatSidebarProps) => {
    const [activeTab, setActiveTab] = useState<TabType>("normal");
    const [newMessage, setNewMessage] = useState("");
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [pastedFile, setPastedFile] = useState<File | null>(null);

    const room = useSelector((state: any) => state.room);
    const isMobile = useIsMobile();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (activeTab !== "normal") return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        setPastedFile(file);

                        const reader = new FileReader();
                        reader.onload = (event) => {
                            setPreviewImage(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                    }
                    break;
                }
            }
        };

        document.addEventListener("paste", handlePaste);
        return () => {
            document.removeEventListener("paste", handlePaste);
        };
    }, [activeTab]);

    const handleSend = () => {
        if (pastedFile) {
            sendFileMessage(pastedFile);
            setPreviewImage(null);
            setPastedFile(null);
            setNewMessage("");
            cancelReply();
        } else if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage("");
            cancelReply();
            // Reset textarea height
            if (inputRef.current) {
                inputRef.current.style.height = "auto";
            }
        }
        // Scroll to bottom after sending
        setTimeout(scrollToBottom, 100);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (activeTab !== "normal") return;

        const file = e.target.files?.[0];
        if (file) {
            if (previewImage) {
                setPreviewImage(null);
                setPastedFile(null);
            }

            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setPreviewImage(event.target?.result as string);
                    setPastedFile(file);
                };
                reader.readAsDataURL(file);
            } else {
                sendFileMessage(file);
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleFileButtonClick = () => {
        if (activeTab === "normal" && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleCancelPreview = () => {
        setPreviewImage(null);
        setPastedFile(null);
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        // Clear preview when switching tabs
        if (tab === "ai") {
            setPreviewImage(null);
            setPastedFile(null);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            const textarea = inputRef.current;
            textarea.style.height = "auto";
            textarea.style.height = Math.min(textarea.scrollHeight, 84) + "px";
        }
    }, [newMessage]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{
                    x: isMobile ? 0 : 300,
                    y: isMobile ? 300 : 0,
                    opacity: 0,
                }}
                animate={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                }}
                exit={{
                    x: isMobile ? 0 : 300,
                    y: isMobile ? 300 : 0,
                    opacity: 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`${isMobile ? "fixed inset-0 z-50 bg-white dark:bg-gray-900" : "fixed right-0 top-0 h-screen w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700"} flex flex-col`}
            >
                <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center'>
                    <div className='flex items-center gap-2'>
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Chat</h2>
                    </div>
                    <Button variant='ghost' size='icon' onClick={() => setIsOpen(false)} className='hover:bg-gray-100 dark:hover:bg-gray-800'>
                        <X className='h-5 w-5' />
                    </Button>
                </div>
                {/* Tab Navigation */}
                <div className='flex border-b border-gray-200 dark:border-gray-700'>
                    <button onClick={() => handleTabChange("normal")} className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "normal" ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                        <div className='flex items-center justify-center gap-2'>
                            <MessageCircle className='h-4 w-4' />
                            Group Chat
                        </div>
                    </button>
                    <button onClick={() => handleTabChange("ai")} className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "ai" ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                        <div className='flex items-center justify-center gap-2'>
                            <Bot className='h-4 w-4' />
                            AI Assistant
                        </div>
                    </button>
                </div>
                {/* Messages Area */}
                {activeTab === "normal" ? (
                    <div className='flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent'>
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.sender === room.username ? "justify-end" : "justify-start"} items-center gap-2`}>
                                {/* Failed message controls - show on left */}
                                {message.isFailed && message.sender === room.username && (
                                    <div className='flex items-center gap-1'>
                                        <button onClick={() => retryMessage(message.id)} className='p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-500' title='Retry sending message'>
                                            <RotateCcw className='h-4 w-4' />
                                        </button>
                                        <button onClick={() => deleteMessage(message.id)} className='p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-500' title='Delete message'>
                                            <X className='h-4 w-4' />
                                        </button>
                                    </div>
                                )}

                                <div className={`min-w-[120px] max-w-[66%] rounded-xl shadow-sm relative group ${message.sender === room.username ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"} ${message.isPending ? "opacity-70" : ""} ${message.isFailed ? "border-2 border-red-500" : ""}`}>
                                    {/* Header with sender name only */}
                                    <div className='px-3 pt-2 pb-1 border-b border-black/10 dark:border-white/10'>
                                        <div className='flex items-center justify-between'>
                                            <p className='text-xs font-medium opacity-80'>
                                                {message.sender} {message.sender === room.username ? "(You)" : ""}
                                            </p>
                                            {/* Status Icons - only for pending */}
                                            {message.sender === room.username && !message.isFailed && <>{message.isPending && <Clock className='h-3 w-3 animate-pulse opacity-60' />}</>}
                                        </div>
                                    </div>

                                    {/* Message content box */}
                                    <div className={`mx-2 my-2 p-3 rounded-lg ${message.sender === room.username ? "bg-blue-400/30 text-white" : "bg-white/50 dark:bg-gray-600/50 text-gray-900 dark:text-gray-100"}`}>
                                        {/* Reply Preview */}
                                        {message.replyTo && (
                                            <div className='mb-2 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-800'>
                                                {/* Reply header */}
                                                <div className='px-2 py-1 border-b border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700'>
                                                    <p className='text-xs font-medium text-gray-600 dark:text-gray-300'>Replying to {message.replyTo.senderName}</p>
                                                </div>
                                                {/* Reply content */}
                                                <div className='px-2 py-1.5 bg-gray-50 dark:bg-gray-800'>
                                                    <p className='text-xs truncate text-gray-700 dark:text-gray-400'>{message.replyTo.isFile ? `📎 ${message.replyTo.text}` : message.replyTo.text}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Message content */}
                                        {message.isImage ? (
                                            <div>
                                                <p className='text-sm mb-2 opacity-80'>
                                                    <Image className='h-3 w-3 inline mr-1' />
                                                    {message.fileName}
                                                </p>
                                                <img src={message.fileUrl} alt={message.fileName || "Image"} className='rounded-md max-w-full max-h-[200px] object-contain' />
                                            </div>
                                        ) : message.fileUrl ? (
                                            <div>
                                                <a href={message.fileUrl} download={message.fileName} target='_blank' rel='noopener noreferrer' className='flex items-center gap-2 text-sm underline hover:no-underline'>
                                                    <File className='h-4 w-4' />
                                                    <span>
                                                        {message.fileName}
                                                        <span className='text-xs opacity-70 ml-1'>({Math.round(message.fileSize! / 1024)} KB)</span>
                                                    </span>
                                                </a>
                                            </div>
                                        ) : (
                                            <p className='text-sm leading-relaxed break-words'>{message.text}</p>
                                        )}
                                    </div>

                                    {/* Footer with reply button and timestamp */}
                                    <div className='px-3 pb-2 flex items-center justify-between'>
                                        {/* Reply Button */}
                                        {!message.isPending && !message.isFailed ? (
                                            <button onClick={() => setReplyingTo(message)} className='opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-xs' title='Reply to this message'>
                                                <Reply className='h-3 w-3' />
                                            </button>
                                        ) : (
                                            <div></div>
                                        )}

                                        <p className='text-xs opacity-60'>{dayjs(message.timestamp).format(CONSTANT.TIME_FORMAT)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Invisible element to scroll to */}
                        <div ref={messagesEndRef} />
                    </div>
                ) : (
                    <div className='flex-1 flex flex-col relative overflow-hidden'>
                        <Chatbot isOpen={true} onClose={() => {}} roomId={roomId} isEmbedded={true} />
                    </div>
                )}{" "}
                {/* Input Area - Only for normal chat */}
                {activeTab === "normal" && (
                    <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
                        {previewImage && (
                            <div className='mb-2 relative'>
                                <div className='relative rounded border dark:border-gray-600 p-2'>
                                    <Button variant='destructive' size='icon' className='absolute -right-2 -top-2 h-5 w-5 rounded-full' onClick={handleCancelPreview}>
                                        <X className='h-3 w-3' />
                                    </Button>
                                    <img src={previewImage} alt='Preview' className='max-h-[150px] mx-auto object-contain rounded' />
                                </div>
                            </div>
                        )}

                        {/* Reply Preview */}
                        {replyingTo && (
                            <div className='mb-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600'>
                                <div className='flex items-center justify-between mb-1'>
                                    <p className='text-sm font-medium text-gray-600 dark:text-gray-300'>Replying to {replyingTo.senderName}</p>
                                    <button onClick={cancelReply} className='p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors'>
                                        <X className='h-4 w-4 text-gray-500' />
                                    </button>
                                </div>
                                <div className='p-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600'>
                                    <p className='text-sm text-gray-700 dark:text-gray-400 truncate'>{replyingTo.fileUrl ? `📎 ${replyingTo.fileName || replyingTo.text}` : replyingTo.text}</p>
                                </div>
                            </div>
                        )}

                        <div className='flex gap-2 items-end'>
                            <Textarea
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : pastedFile ? "Send with description..." : "Type a message..."}
                                onKeyPress={handleKeyPress}
                                className='flex-1 focus-visible:outline-blue-400 focus-visible:ring-0 resize-none min-h-[40px] max-h-[84px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent'
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = "auto";
                                    target.style.height = Math.min(target.scrollHeight, 84) + "px";
                                }}
                            />
                            <input type='file' ref={fileInputRef} onChange={handleFileUpload} className='hidden' accept='image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain' />
                            <Button variant='outline' size='icon' onClick={handleFileButtonClick} title='Attach file'>
                                <Paperclip className='h-4 w-4' />
                            </Button>
                            <Button size='icon' onClick={handleSend} disabled={!newMessage.trim() && !pastedFile}>
                                <Send className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
