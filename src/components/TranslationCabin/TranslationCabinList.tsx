import { useDestroyCabin } from "@/hooks/translate-cabin/use-destroy-cabin";
import { TranslationCabin } from "@/interfaces";
import React from "react";

interface TranslationCabinListProps {
    roomId: string;
    cabins: TranslationCabin[];
    availableUsers: Array<{ id: string; username: string }>;
    sourceUserId: string;
    onCabinDestroyed?: () => void;
}

const SUPPORTED_LANGUAGES = [
    { code: "vi", name: "Tiếng Việt" },
    { code: "en", name: "English" },
];

export const TranslationCabinList: React.FC<TranslationCabinListProps> = ({
    roomId,
    cabins,
    availableUsers,
    sourceUserId,
    onCabinDestroyed,
}) => {
    const { destroyCabin, loading } = useDestroyCabin();
    const getLanguageName = (code: string) => {
        return (
            SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.name || code
        );
    };

    const getUserName = (userId: string) => {
        return (
            availableUsers.find((user) => user.id === userId)?.username ||
            userId
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "#059669";
            case "stopped":
                return "#dc2626";
            case "error":
                return "#ea580c";
            default:
                return "#6b7280";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "active":
                return "●";
            case "stopped":
                return "■";
            case "error":
                return "⚠";
            default:
                return "○";
        }
    };

    const handleDestroy = async (index: number) => {
        const cabin = cabins[index];
        const data = {
            roomId,
            sourceUserId: sourceUserId,
            targetUserId: cabin.targetUserId,
            sourceLanguage: cabin.sourceLanguage,
            targetLanguage: cabin.targetLanguage,
        };
        if (
            window.confirm(
                "Are you sure you want to destroy this translation cabin?"
            )
        ) {
            try {
                await destroyCabin(data);
                onCabinDestroyed?.(); // Refresh list after destroy
            } catch (error) {
                console.error("Failed to destroy cabin:", error);
            }
        }
    };

    if (cabins.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="mb-4 opacity-50">
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        className="mx-auto"
                    >
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>
                <p>No translation cabins created yet</p>
            </div>
        );
    }

    return (
        <div className="mb-4">
            <h4 className="m-0 mb-4 text-gray-800 dark:text-gray-200 text-lg">
                Translation Cabins
            </h4>
            <div className="space-y-3">
                {cabins.map((cabin, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    🌐
                                </span>
                                <span className="text-sm font-medium capitalize text-gray-600 dark:text-gray-400">
                                    Active
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleDestroy(index)}
                                    disabled={loading}
                                    className="w-8 h-8 border-none rounded cursor-pointer text-sm flex items-center justify-center transition-all duration-200 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Destroy cabin"
                                >
                                    🗑
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    Target User:
                                </span>
                                <span className="text-sm text-gray-800 dark:text-gray-200">
                                    {getUserName(cabin.targetUserId)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    Translation:
                                </span>
                                <span className="text-sm text-gray-800 dark:text-gray-200">
                                    {getLanguageName(cabin.sourceLanguage)} →{" "}
                                    {getLanguageName(cabin.targetLanguage)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
