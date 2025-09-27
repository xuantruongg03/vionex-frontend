import { useIsMobile } from "@/hooks/use-mobile";
import { SUPPORTED_LANGUAGES_TRANSLATION } from "@/lib/lang";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, List, Users, X } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Button } from "../ui/button";
import { TranslationCabinList } from "./TranslationCabinList";
import { useTranslationSocket } from "@/hooks/translate-cabin/use-translation-socket";

interface TranslationCabinSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    roomId: string;
    availableUsers: Array<{ id: string; username: string }>;
    onConsumeTranslation?: (streamId: string) => void;
    onRevertTranslation?: (targetUserId: string) => void;
}

export const TranslationCabinSidebar: React.FC<TranslationCabinSidebarProps> = ({ isOpen, setIsOpen, roomId, availableUsers, onConsumeTranslation, onRevertTranslation }) => {
    const { createTranslationCabin, listTranslationCabins, destroyTranslationCabin, isLoading } = useTranslationSocket(roomId);

    const isMobile = useIsMobile();

    // Redux
    const room = useSelector((state: any) => state.room);
    const user = useSelector((state: any) => state.auth.user);

    // Local state for cabins list
    const [cabins, setCabins] = useState([]);
    const [listLoading, setListLoading] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState<"create" | "list">("list");

    // Form state
    const [selectedUserId, setSelectedUserId] = useState("");
    const [sourceLanguage, setSourceLanguage] = useState("vi");
    const [targetLanguage, setTargetLanguage] = useState("en");

    // Function to fetch cabins list
    const refetchCabins = async () => {
        try {
            setListLoading(true);
            const cabinsList = await listTranslationCabins({ roomId, userId: user?.name || room.username });
            setCabins(cabinsList);
        } catch (error) {
            console.error("Failed to fetch cabins:", error);
        } finally {
            setListLoading(false);
        }
    };

    // Initial load and setup
    useEffect(() => {
        if (isOpen) {
            refetchCabins();
        }
    }, [isOpen]);

    // Listen for cabin updates (this is handled by SocketEventHandlerManager automatically)
    // We just need to refresh the list when we detect changes
    // useEffect(() => {
    //     // Auto-refresh cabin list periodically when sidebar is open
    //     if (!isOpen) return;

    //     const interval = setInterval(() => {
    //         refetchCabins();
    //     }, 5000); // Refresh every 5 seconds

    //     return () => clearInterval(interval);
    // }, [isOpen]);

    const handleCreateTranslation = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUserId || !sourceLanguage || !targetLanguage) {
            return;
        }

        if (sourceLanguage === targetLanguage) {
            alert("Source and target languages must be different");
            return;
        }

        try {
            const result = await createTranslationCabin({
                roomId,
                sourceUserId: user?.name || room.username,
                targetUserId: selectedUserId,
                sourceLanguage,
                targetLanguage,
            });

            // Handle data stream ID
            if (result.streamId && onConsumeTranslation) {
                await onConsumeTranslation(result.streamId);
            }

            // Reset form
            setSelectedUserId("");

            // Refresh cabin list
            refetchCabins();

            // Switch to list tab to show the new cabin
            setActiveTab("list");
        } catch (err) {
            console.error("Failed to create translation cabin:", err);
            alert(err.message || "Failed to create translation cabin");
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
                className={`${isMobile ? "fixed inset-0 z-50 bg-white dark:bg-gray-900" : "fixed right-0 top-0 h-screen w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-30"} flex flex-col translation-cabin-sidebar`}
            >
                {/* Header */}
                <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center'>
                    <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                        <Globe className='h-5 w-5' />
                        Translation Cabin
                    </h2>
                    <Button variant='ghost' size='icon' onClick={() => setIsOpen(false)} className='h-8 w-8'>
                        <X className='h-4 w-4' />
                    </Button>
                </div>

                {/* Tab Navigation */}
                <div className='flex border-b border-gray-200 dark:border-gray-700'>
                    <button onClick={() => setActiveTab("list")} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "list" ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                        <div className='flex items-center justify-center gap-2'>
                            <List className='h-4 w-4' />
                            Cabins ({cabins.length})
                        </div>
                    </button>
                    <button onClick={() => setActiveTab("create")} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "create" ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                        <div className='flex items-center justify-center gap-2'>
                            <Users className='h-4 w-4' />
                            Create
                        </div>
                    </button>
                </div>

                {/* Error Message */}
                {/* Show error or loading state */}
                {isLoading && <div className='mx-4 mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm'>Loading...</div>}

                {/* Content */}
                <div className='flex-1 overflow-y-auto'>
                    {activeTab === "list" && (
                        <div className='p-4'>
                            {listLoading ? (
                                <div className='flex items-center justify-center py-8'>
                                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'></div>
                                    <span className='ml-2 text-sm text-gray-600 dark:text-gray-400'>Loading cabins...</span>
                                </div>
                            ) : (
                                <TranslationCabinList roomId={roomId} cabins={cabins} availableUsers={availableUsers} sourceUserId={user?.name || room.username} onCabinDestroyed={refetchCabins} onRevertTranslation={onRevertTranslation} />
                            )}
                        </div>
                    )}

                    {activeTab === "create" && (
                        <div className='p-4 space-y-6'>
                            {/* Create Translation Form */}
                            <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4'>
                                <h3 className='text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                                    <Users className='h-4 w-4' />
                                    Request Translation
                                </h3>

                                <form onSubmit={handleCreateTranslation} className='space-y-4'>
                                    <div>
                                        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Select User to Translate</label>
                                        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} required disabled={isLoading} className='w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white'>
                                            <option value=''>Choose a user...</option>
                                            {availableUsers.map((availableUser) => (
                                                <option key={availableUser.id} value={availableUser.id}>
                                                    {availableUser.username}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className='grid grid-cols-2 gap-3'>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>From</label>
                                            <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)} disabled={isLoading} className='w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white'>
                                                {SUPPORTED_LANGUAGES_TRANSLATION.map((lang) => (
                                                    <option key={lang.code} value={lang.code}>
                                                        {lang.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>To</label>
                                            <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} disabled={isLoading} className='w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white'>
                                                {SUPPORTED_LANGUAGES_TRANSLATION.map((lang) => (
                                                    <option key={lang.code} value={lang.code}>
                                                        {lang.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <Button type='submit' disabled={isLoading || !selectedUserId || sourceLanguage === targetLanguage} className='w-full' size='lg'>
                                        {isLoading ? "Creating Translation..." : "Start Translation"}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* Loading Overlay */}
                {isLoading && (
                    <div className='absolute inset-0 bg-black/20 flex items-center justify-center'>
                        <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg'>
                            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
                            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>Processing...</p>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
