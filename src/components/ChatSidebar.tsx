import { useChat } from "@/hooks/use-chat";
import { useIsMobile } from "@/hooks/use-mobile";
import CONSTANT from "@/lib/constant";
import dayjs from "dayjs";
import {
    File,
    Image,
    Paperclip,
    Send,
    X,
    MessageCircle,
    Bot,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { Chatbot } from "./ChatBotUI";

interface ChatSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    roomId: string;
}

type TabType = "normal" | "ai";

export const ChatSidebar = ({
    isOpen,
    setIsOpen,
    roomId,
}: ChatSidebarProps) => {
    const [activeTab, setActiveTab] = useState<TabType>("normal");
    const [newMessage, setNewMessage] = useState("");
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [pastedFile, setPastedFile] = useState<File | null>(null);

    const room = useSelector((state: any) => state.room);
    const { messages, sendMessage, sendFileMessage } = useChat(
        roomId,
        room.username ?? ""
    );
    const isMobile = useIsMobile();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
        } else if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage("");
        }
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
                className={`${
                    isMobile
                        ? "fixed inset-0 z-50 bg-white dark:bg-gray-900"
                        : "fixed right-0 top-0 h-screen w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700"
                } flex flex-col`}
            >
                <div
                    className={`${
                        isMobile
                            ? "fixed inset-0 z-50 bg-white dark:bg-gray-900"
                            : "fixed right-0 top-0 h-screen w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700"
                    } flex flex-col`}
                >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Chat
                            </h2>
                        </div>
                        {isMobile && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => handleTabChange("normal")}
                            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === "normal"
                                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                Group Chat
                            </div>
                        </button>
                        <button
                            onClick={() => handleTabChange("ai")}
                            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === "ai"
                                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Bot className="h-4 w-4" />
                                AI Chat
                            </div>
                        </button>
                    </div>
                    {/* Messages Area */}
                    {activeTab === "normal" ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex flex-col ${
                                        message.sender === room.username
                                            ? "items-end"
                                            : "items-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 ${
                                            message.sender === room.username
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                        }`}
                                    >
                                        <p className="text-sm font-semibold">
                                            {message.sender === room.username
                                                ? "You"
                                                : message.sender}
                                        </p>
                                        {message.isImage ? (
                                            <div className="mt-2">
                                                <p className="text-xs mb-1">
                                                    <Image className="h-3 w-3 inline mr-1" />
                                                    {message.fileName}
                                                </p>
                                                <img
                                                    src={message.fileUrl}
                                                    alt={
                                                        message.fileName ||
                                                        "Hình ảnh"
                                                    }
                                                    className="rounded-md max-w-full max-h-[200px] object-contain"
                                                />
                                            </div>
                                        ) : message.fileUrl ? (
                                            <div className="mt-2">
                                                <a
                                                    href={message.fileUrl}
                                                    download={message.fileName}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs underline"
                                                >
                                                    <File className="h-3 w-3" />
                                                    {message.fileName}(
                                                    {Math.round(
                                                        message.fileSize! / 1024
                                                    )}{" "}
                                                    KB)
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="break-words">
                                                {message.text}
                                            </p>
                                        )}

                                        <p className="text-xs opacity-70 mt-1">
                                            {dayjs(message.timestamp).format(
                                                CONSTANT.TIME_FORMAT
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col relative overflow-hidden">
                            <Chatbot
                                isOpen={true}
                                onClose={() => {}}
                                roomId={roomId}
                                isEmbedded={true}
                            />
                        </div>
                    )}{" "}
                    {/* Input Area - Only for normal chat */}
                    {activeTab === "normal" && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            {previewImage && (
                                <div className="mb-2 relative">
                                    <div className="relative rounded border dark:border-gray-600 p-2">
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -right-2 -top-2 h-5 w-5 rounded-full"
                                            onClick={handleCancelPreview}
                                        >ư
                                            <X className="h-3 w-3" />
                                        </Button>
                                        <img
                                            src={previewImage}
                                            alt="Preview"
                                            className="max-h-[150px] mx-auto object-contain rounded"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Input
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={(e) =>
                                        setNewMessage(e.target.value)
                                    }
                                    placeholder={
                                        pastedFile
                                            ? "Send with description..."
                                            : "Type a message..."
                                    }
                                    onKeyPress={handleKeyPress}
                                    className="flex-1 focus-visible:outline-blue-400 focus-visible:ring-0"
                                />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleFileButtonClick}
                                    title="Đính kèm file"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() && !pastedFile}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
