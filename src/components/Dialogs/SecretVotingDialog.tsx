import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getSocket } from "@/hooks/use-call-hybrid-new";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    BarChart3,
    Check,
    Plus,
    Trash2,
    Vote,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";

interface SecretVotingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
}

const voteSchema = z.object({
    question: z.string().min(1, "Question not be empty"),
    options: z
        .array(z.string().min(1, "Option cannot be empty"))
        .min(2, "At least 2 options are required"),
});

interface VoteOption {
    id: string;
    text: string;
    votes: number;
}

interface VoteSession {
    id: string;
    creatorId?: string; // camelCase for frontend compatibility
    creator_id?: string; // snake_case from backend
    question: string;
    options: VoteOption[];
    participants: string[]; // For backward compatibility
    voters?: string[]; // New field from backend
    isActive: boolean;
    createdAt: Date;
}

// Animation variants
const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
};

const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const listItem = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const progressBar = {
    hidden: { width: 0 },
    visible: (width) => ({
        width: `${width}%`,
        transition: { duration: 0.6, ease: "easeOut" },
    }),
};

export const SecretVotingDialog = ({
    isOpen,
    onClose,
    roomId,
}: SecretVotingDialogProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"create" | "vote" | "results">(
        "create"
    );
    const [activeVote, setActiveVote] = useState<VoteSession | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const user = useSelector((state: any) => state.room);
    const [voteResults, setVoteResults] = useState<VoteOption[]>([]);
    const [totalVotes, setTotalVotes] = useState(0);

    // Get socket instance
    const socket = getSocket();

    // Helper function to get creator ID from vote session (handles both formats)
    const getCreatorId = (voteSession: VoteSession | null): string => {
        if (!voteSession) return "";
        return voteSession.creatorId || voteSession.creator_id || "";
    };

    // Helper function to check if current user is creator
    const isCurrentUserCreator = (voteSession: VoteSession | null): boolean => {
        const creatorId = getCreatorId(voteSession);
        const result = creatorId === user.username;
        return result;
    };

    const form = useForm<z.infer<typeof voteSchema>>({
        resolver: zodResolver(voteSchema),
        defaultValues: {
            question: "",
            options: ["Option 1", "Option 2"],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "options" as never,
    });

    useEffect(() => {
        if (!socket) {
            console.warn("[SecretVoting] Socket is null");
            return;
        }

        if (!socket.connected) {
            console.warn("[SecretVoting] Socket not connected, attempting to connect...");
            socket.connect();
            return;
        }

        const handleVoteCreated = (data: VoteSession) => {
            setActiveVote(data);
            setActiveTab("vote");
            // Check if current user has already voted using voters array
            const voters = data.voters || data.participants || [];
            setHasVoted(voters.includes(user.username));
        };

        const handleVoteResults = (data: VoteSession) => {
            if (data && data.options) {
                setVoteResults(data.options);
                const voters = data.voters || data.participants || [];
                setTotalVotes(voters.length);
                setActiveTab("results");
            }
        };

        const handleActiveVote = (data: VoteSession | null) => {
            if (data) {
                setActiveVote(data);
                const voters = data.voters || data.participants || [];
                setHasVoted(voters.includes(user.username));

                if (voters.includes(user.username)) {
                    socket.emit("sfu:get-vote-results", {
                        roomId,
                        voteId: data.id,
                    });
                } else {
                    setActiveTab("vote");
                }
            }
        };

        const handleVoteError = (error: { message: string; code: string }) => {
            // Clear timeouts if they exist
            if ((window as any).voteTimeoutId) {
                clearTimeout((window as any).voteTimeoutId);
                (window as any).voteTimeoutId = null;
            }
            if ((window as any).endVoteTimeoutId) {
                clearTimeout((window as any).endVoteTimeoutId);
                (window as any).endVoteTimeoutId = null;
            }

            toast.error(error.message || "Has error with voting session");
            setIsSubmitting(false);
        };

        const handleVoteUpdated = (data: VoteSession) => {
            console.log("[SecretVoting] Received sfu:vote-updated:", data);

            // Clear timeout if exists
            if ((window as any).voteTimeoutId) {
                clearTimeout((window as any).voteTimeoutId);
                (window as any).voteTimeoutId = null;
            }

            setIsSubmitting(false);
            setHasVoted(true);
            toast.success("Submit vote successfully");

            // Request updated vote results
            socket.emit("sfu:get-vote-results", {
                roomId,
                voteId: data.id,
            });
        };

        const handleVoteEnded = (data: VoteSession) => {
            // Clear timeout if exists
            if ((window as any).endVoteTimeoutId) {
                clearTimeout((window as any).endVoteTimeoutId);
                (window as any).endVoteTimeoutId = null;
            }

            setIsSubmitting(false);
            toast.success("Session vote ended successfully");
            setActiveVote(null);
            setActiveTab("create");
            setHasVoted(false);
            setVoteResults([]);
            setTotalVotes(0);
        };

        socket.on("sfu:vote-created", handleVoteCreated);
        socket.on("sfu:vote-results", handleVoteResults);
        socket.on("sfu:active-vote", handleActiveVote);
        socket.on("sfu:vote-error", handleVoteError);
        socket.on("sfu:vote-updated", handleVoteUpdated);
        socket.on("sfu:vote-ended", handleVoteEnded);

        // Get active vote when dialog opens
        socket.emit("sfu:get-active-vote", { roomId });

        return () => {
            socket.off("sfu:vote-created", handleVoteCreated);
            socket.off("sfu:vote-results", handleVoteResults);
            socket.off("sfu:active-vote", handleActiveVote);
            socket.off("sfu:vote-error", handleVoteError);
            socket.off("sfu:vote-updated", handleVoteUpdated);
            socket.off("sfu:vote-ended", handleVoteEnded);
        };
    }, [roomId, socket, user.username, isOpen]);

    const handleSubmit = (values: z.infer<typeof voteSchema>) => {
        if (values.options.length < 2) {
            toast.error("At least 2 options are required");
            return;
        }
        if (!user.isCreator) {
            toast.error("Only the creator can create a voting session");
            return;
        }

        if (!socket) {
            toast.error("Socket is not available");
            return;
        }

        if (!socket.connected) {
            toast.error("Cannot connect to server");
            return;
        }

        setIsSubmitting(true);

        const options = values.options.map((option) => ({
            id: Math.random().toString(36).substring(2, 9),
            text: option,
            votes: 0,
        }));

        const payload = {
            roomId,
            question: values.question,
            options,
            creatorId: user.username,
        };

        // Define event handlers first
        const handleVoteCreatedOnce = (data: VoteSession) => {
            clearTimeout(timeoutId);
            setIsSubmitting(false);
            setActiveVote(data);
            setActiveTab("vote");
            toast.success("Vote created successfully");
            socket.off("sfu:vote-created", handleVoteCreatedOnce);
            socket.off("sfu:vote-error", handleVoteErrorOnce);
        };

        // Listen for error response
        const handleVoteErrorOnce = (error: {
            message: string;
            code: string;
        }) => {
            clearTimeout(timeoutId);
            setIsSubmitting(false);
            toast.error(error.message || "Has error with voting session");
            socket.off("sfu:vote-created", handleVoteCreatedOnce);
            socket.off("sfu:vote-error", handleVoteErrorOnce);
        };

        // Add timeout to handle no response
        const timeoutId = setTimeout(() => {
            setIsSubmitting(false);
            toast.error("Timeout - Server no response");
            // Clean up event listeners
            socket.off("sfu:vote-created", handleVoteCreatedOnce);
            socket.off("sfu:vote-error", handleVoteErrorOnce);
        }, 10000); // 10 second timeout

        // Set up event listeners
        socket.on("sfu:vote-created", handleVoteCreatedOnce);
        socket.on("sfu:vote-error", handleVoteErrorOnce);

        // Emit the create vote event (no callback expected)
        socket.emit("sfu:create-vote", payload);
    };

    const handleVote = () => {
        if (!selectedOption || !activeVote) return;

        if (!socket || !socket.connected) {
            toast.error("Cannot connect to server");
            return;
        }

        setIsSubmitting(true);

        // Emit the vote without callback - will get response via sfu:vote-updated event
        socket.emit("sfu:submit-vote", {
            roomId,
            voteId: activeVote.id,
            optionId: selectedOption,
            voterId: user.username,
        });
    };

    const handleEndVote = () => {
        if (!activeVote) return;

        if (!socket || !socket.connected) {
            toast.error("Cannot connect to server");
            return;
        }

        setIsSubmitting(true);

        // Emit the end vote without callback - will get response via sfu:vote-ended event
        socket.emit("sfu:end-vote", {
            roomId,
            voteId: activeVote.id,
            creatorId: user.username,
        });
    };

    const addOption = () => {
        if (fields.length >= 5) return;
        append("");
    };

    const removeOption = (index: number) => {
        if (fields.length <= 2) return;
        remove(index);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md overflow-hidden">
                <DialogHeader>
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <DialogTitle className="text-center flex items-center justify-center gap-2">
                            <motion.div
                                initial={{ rotate: -10, scale: 0.9 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ duration: 0.4, type: "spring" }}
                            >
                                <Vote className="h-5 w-5" />
                            </motion.div>
                            Secret Voting
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            {activeTab === "create" &&
                                "Create a secret vote to gather opinions"}
                            {activeTab === "vote" && "Participate in the vote"}
                            {activeTab === "results" && "Vote results"}
                        </DialogDescription>
                    </motion.div>
                </DialogHeader>

                {/* Show connection status */}
                {(!socket || !socket.connected) && (
                    <motion.div
                        className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-center gap-2 text-yellow-800">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">
                                Connecting to server... Voting feature may not be available.
                            </span>
                        </div>
                    </motion.div>
                )}

                <motion.div
                    className="flex border-b mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                >
                    <button
                        className={`px-4 py-2 relative ${
                            activeTab === "create"
                                ? "border-b-2 border-blue-500"
                                : ""
                        }`}
                        onClick={() => !activeVote && setActiveTab("create")}
                        disabled={!!activeVote}
                    >
                        Create
                        {activeTab === "create" && (
                            <motion.div
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                                layoutId="activeTab"
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                }}
                            />
                        )}
                    </button>
                    <button
                        className={`px-4 py-2 relative ${
                            activeTab === "vote"
                                ? "border-b-2 border-blue-500"
                                : ""
                        }`}
                        onClick={() => activeVote && setActiveTab("vote")}
                        disabled={!activeVote}
                    >
                        Voting
                        {activeTab === "vote" && (
                            <motion.div
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                                layoutId="activeTab"
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                }}
                            />
                        )}
                    </button>
                    <button
                        className={`px-4 py-2 relative ${
                            activeTab === "results"
                                ? "border-b-2 border-blue-500"
                                : ""
                        }`}
                        onClick={() => hasVoted && setActiveTab("results")}
                        disabled={!hasVoted}
                    >
                        Result
                        {activeTab === "results" && (
                            <motion.div
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                                layoutId="activeTab"
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                }}
                            />
                        )}
                    </button>
                </motion.div>

                <AnimatePresence mode="wait">
                    {activeTab === "create" && (
                        <motion.div
                            key="create"
                            initial="visible"
                            animate="visible"
                            exit={{ opacity: 0, y: -10 }}
                            variants={fadeIn}
                        >
                            {!user.isCreator ? (
                                <motion.div
                                    className="flex flex-col items-center justify-center py-6 text-center"
                                    variants={slideUp}
                                >
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 17,
                                        }}
                                    >
                                        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
                                    </motion.div>
                                    <h3 className="text-lg font-medium mb-2">
                                        No permission to create a voting session
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Only the meeting host can create a voting session.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                    >
                                        Đóng
                                    </Button>
                                </motion.div>
                            ) : (
                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(
                                            handleSubmit
                                        )}
                                        className="space-y-4"
                                    >
                                        <motion.div variants={slideUp}>
                                            <FormField
                                                control={form.control}
                                                name="question"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Question
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter voting question"
                                                                className="w-full focus-visible:outline-blue-400 focus-visible:ring-0"
                                                                {...field}
                                                                autoFocus
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </motion.div>

                                        <motion.div
                                            className="space-y-2"
                                            variants={staggerContainer}
                                            initial="visible"
                                            animate="visible"
                                        >
                                            <FormLabel>Options</FormLabel>
                                            {fields.map((field, index) => (
                                                <motion.div
                                                    key={field.id}
                                                    className="flex items-center gap-2"
                                                    variants={listItem}
                                                >
                                                    <FormField
                                                        control={form.control}
                                                        name={`options.${index}`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder={`Option ${
                                                                            index +
                                                                            1
                                                                        }`}
                                                                        className="w-full focus-visible:outline-blue-400 focus-visible:ring-0"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            removeOption(index)
                                                        }
                                                        disabled={
                                                            fields.length <= 2
                                                        }
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </motion.div>
                                            ))}
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                            >
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={addOption}
                                                    className="w-full mt-2"
                                                    disabled={
                                                        fields.length >= 5
                                                    }
                                                    title="Add option"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />{" "}
                                                    Add option
                                                </Button>
                                            </motion.div>
                                        </motion.div>

                                        <motion.div
                                            variants={fadeIn}
                                            className="pt-2"
                                        >
                                            <DialogFooter className="sm:justify-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={onClose}
                                                >
                                                    Cancel
                                                </Button>
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <Button
                                                        type="submit"
                                                        disabled={
                                                            isSubmitting ||
                                                            form.getValues(
                                                                "options"
                                                            ).length < 2 ||
                                                            !socket ||
                                                            !socket.connected
                                                        }
                                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus-visible:outline-blue-400 focus-visible:ring-0"
                                                    >
                                                        {isSubmitting
                                                            ? "Processing..."
                                                            : !socket ||
                                                              !socket.connected
                                                            ? "Connecting..."
                                                            : "Create voting session"}
                                                    </Button>
                                                </motion.div>
                                            </DialogFooter>
                                        </motion.div>
                                    </form>
                                </Form>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "vote" && activeVote && (
                        <motion.div
                            key="vote"
                            className="space-y-4"
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, y: -10 }}
                            variants={fadeIn}
                        >
                            <motion.div
                                className="text-center font-medium text-lg"
                                variants={slideUp}
                            >
                                {activeVote.question}
                            </motion.div>

                            {hasVoted ? (
                                <motion.div
                                    className="text-center text-green-600 flex items-center justify-center gap-2"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 17,
                                    }}
                                >
                                    <Check className="h-5 w-5" /> You have voted
                                </motion.div>
                            ) : (
                                <motion.div
                                    className="space-y-2"
                                    variants={staggerContainer}
                                >
                                    {activeVote.options.map((option) => (
                                        <motion.div
                                            key={option.id}
                                            className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
                                                selectedOption === option.id
                                                    ? "border-blue-500 bg-blue-50"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                setSelectedOption(option.id)
                                            }
                                            variants={listItem}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {option.text}
                                            {selectedOption === option.id && (
                                                <motion.span
                                                    initial={{
                                                        scale: 0,
                                                        opacity: 0,
                                                    }}
                                                    animate={{
                                                        scale: 1,
                                                        opacity: 1,
                                                    }}
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 500,
                                                        damping: 30,
                                                    }}
                                                >
                                                    <Check className="h-4 w-4 inline-block ml-2 text-blue-500" />
                                                </motion.span>
                                            )}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

                            <motion.div variants={fadeIn}>
                                <DialogFooter className="sm:justify-center gap-2">
                                    {isCurrentUserCreator(activeVote) && (
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={handleEndVote}
                                                className="flex items-center gap-2"
                                                disabled={
                                                    isSubmitting ||
                                                    !socket ||
                                                    !socket.connected
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />{" "}
                                                End
                                            </Button>
                                        </motion.div>
                                    )}

                                    {!hasVoted && (
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Button
                                                type="button"
                                                disabled={
                                                    !selectedOption ||
                                                    isSubmitting ||
                                                    !socket ||
                                                    !socket.connected
                                                }
                                                onClick={handleVote}
                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus-visible:outline-blue-400 focus-visible:ring-0"
                                            >
                                                {isSubmitting
                                                    ? "Processing..."
                                                    : !socket ||
                                                      !socket.connected
                                                    ? "Connecting..."
                                                    : "Vote"}
                                            </Button>
                                        </motion.div>
                                    )}

                                    {hasVoted && (
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    setActiveTab("results")
                                                }
                                                className="flex items-center gap-2"
                                            >
                                                <BarChart3 className="h-4 w-4" />{" "}
                                                View results
                                            </Button>
                                        </motion.div>
                                    )}
                                </DialogFooter>
                            </motion.div>
                        </motion.div>
                    )}

                    {activeTab === "results" && activeVote && (
                        <motion.div
                            key="results"
                            className="space-y-4"
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, y: -10 }}
                            variants={fadeIn}
                        >
                            <motion.div
                                className="text-center font-medium text-lg"
                                variants={slideUp}
                            >
                                {activeVote.question}
                            </motion.div>
                            <motion.div
                                className="text-sm text-gray-500 text-center"
                                variants={slideUp}
                            >
                                {totalVotes} votes
                            </motion.div>

                            <motion.div
                                className="space-y-3"
                                variants={staggerContainer}
                            >
                                {voteResults.map((option) => {
                                    const percentage =
                                        totalVotes > 0
                                            ? Math.round(
                                                  (option.votes / totalVotes) *
                                                      100
                                              )
                                            : 0;

                                    return (
                                        <motion.div
                                            key={option.id}
                                            className="space-y-1"
                                            variants={listItem}
                                        >
                                            <div className="flex justify-between text-sm">
                                                <span>{option.text}</span>
                                                <motion.span
                                                    className="font-medium"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{
                                                        delay: 0.5,
                                                        duration: 0.3,
                                                    }}
                                                >
                                                    {percentage}%
                                                </motion.span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                <motion.div
                                                    className="bg-blue-600 h-2.5 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{
                                                        width: `${percentage}%`,
                                                    }}
                                                    transition={{
                                                        delay: 0.2,
                                                        duration: 0.8,
                                                        ease: "easeOut",
                                                    }}
                                                ></motion.div>
                                            </div>
                                            <motion.div
                                                className="text-xs text-gray-500"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{
                                                    delay: 0.7,
                                                    duration: 0.3,
                                                }}
                                            >
                                                {option.votes} votes
                                            </motion.div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>

                            <motion.div variants={fadeIn}>
                                <DialogFooter className="sm:justify-center gap-2">
                                    {isCurrentUserCreator(activeVote) && (
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={handleEndVote}
                                                className="flex items-center gap-2"
                                                disabled={
                                                    !socket || !socket.connected
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />{" "}
                                                End voting session
                                            </Button>
                                        </motion.div>
                                    )}
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={onClose}
                                        >
                                            Close
                                        </Button>
                                    </motion.div>
                                </DialogFooter>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};
