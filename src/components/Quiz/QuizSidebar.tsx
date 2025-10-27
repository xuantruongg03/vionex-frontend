import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "@/contexts/SocketContext";
import { useQuizValidation } from "@/hooks/useQuizValidation";
import useBehaviorMonitor from "@/hooks/use-behavior-monitor";
import {
    QuizOption,
    QuizResultsData,
    QuizSession,
    QuizSidebarProps,
} from "@/interfaces/quiz";
import CONSTANT from "@/lib/constant";
import { compareAnswer, getQuizType } from "@/lib/utils";
import { quizSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    CheckCircle,
    ChevronRight,
    FileText,
    Plus,
    Trash,
    Upload,
    User,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { z } from "zod";
import { QuizResultsView } from "./QuizResultsView";
import { QuizTakingView } from "./QuizTakingView";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "../ui/sheet";

export const QuizSidebar = ({ isOpen, onClose, roomId }: QuizSidebarProps) => {
    const [activeTab, setActiveTab] = useState<"create" | "take" | "results">(
        "create"
    );
    const [activeQuiz, setActiveQuiz] = useState<QuizSession | null>(null);
    const [quizResults, setQuizResults] = useState<QuizResultsData | null>(
        null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const user = useSelector((state: any) => state.room);

    const [isQuizInProgress, setIsQuizInProgress] = useState(false);
    const [allStudentResults, setAllStudentResults] = useState<
        { participantId: string; results: QuizResultsData }[]
    >([]);
    const [hasSubmittedQuiz, setHasSubmittedQuiz] = useState(false);
    const [submittedQuizzes, setSubmittedQuizzes] = useState<Set<string>>(
        new Set()
    );

    // Use Socket Context
    const { socket } = useSocket();
    const { validateQuizAccess } = useQuizValidation();

    // Determine if user is in exam mode (taking quiz)
    const isUserTakingQuiz =
        activeQuiz && !hasSubmittedQuiz && activeTab === "take";

    // Initialize Behavior Monitoring - simple mode detection
    useBehaviorMonitor({
        roomId,
        isExamMode: !!isUserTakingQuiz,
        activeQuiz: isUserTakingQuiz ? activeQuiz : null,
    });

    // Load submitted quizzes from localStorage on component mount
    useEffect(() => {
        const savedSubmittedQuizzes = localStorage.getItem(
            `submittedQuizzes_${user?.username || "unknown"}_${roomId}`
        );
        if (savedSubmittedQuizzes) {
            try {
                const parsed = JSON.parse(savedSubmittedQuizzes);
                setSubmittedQuizzes(new Set(parsed));
            } catch (error) {
                console.error(
                    "Error parsing submitted quizzes from localStorage:",
                    error
                );
            }
        }
    }, [user?.username, roomId]);

    // Helper function to mark quiz as submitted and save to localStorage
    const markQuizAsSubmitted = useCallback(
        (quizId: string) => {
            setSubmittedQuizzes((prev) => {
                const newSet = new Set(prev);
                newSet.add(quizId);

                // Save to localStorage
                try {
                    localStorage.setItem(
                        `submittedQuizzes_${
                            user?.username || "unknown"
                        }_${roomId}`,
                        JSON.stringify(Array.from(newSet))
                    );
                } catch (error) {
                    console.error(
                        "Error saving submitted quizzes to localStorage:",
                        error
                    );
                }

                return newSet;
            });
            setHasSubmittedQuiz(true);
        },
        [user?.username, roomId]
    );

    // Helper function to check if user has submitted a specific quiz
    const hasUserSubmittedQuiz = useCallback(
        (quizId: string) => {
            return submittedQuizzes.has(quizId);
        },
        [submittedQuizzes]
    );

    const defaultFormValues = useMemo(
        () => ({
            title: "",
            questions: [
                {
                    text: "",
                    type: "one-choice" as const,
                    options: [
                        { text: "", isCorrect: false },
                        { text: "", isCorrect: false },
                    ],
                    answer: "",
                },
            ],
        }),
        []
    );

    const form = useForm<z.infer<typeof quizSchema>>({
        resolver: zodResolver(quizSchema),
        defaultValues: defaultFormValues,
    });

    const {
        fields: questionFields,
        append: appendQuestion,
        remove: removeQuestion,
    } = useFieldArray({
        control: form.control,
        name: "questions",
    });

    const addQuestion = (type: "multiple-choice" | "essay" | "one-choice") => {
        if (type === "multiple-choice") {
            appendQuestion({
                text: "",
                type: "multiple-choice",
                options: [
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false },
                ],
            });
        } else if (type === "one-choice") {
            appendQuestion({
                text: "",
                type: "one-choice",
                options: [
                    { text: "", isCorrect: true },
                    { text: "", isCorrect: false },
                ],
            });
        } else {
            appendQuestion({
                text: "",
                type: "essay",
                answer: "",
            });
        }
    };

    const addOption = (questionIndex: number) => {
        const options =
            form.getValues(`questions.${questionIndex}.options`) || [];
        if (options.length >= CONSTANT.MAX_OPTIONS_QUIZ) return;

        const questionType = form.getValues(`questions.${questionIndex}.type`);
        const newOption = {
            text: "",
            isCorrect: false,
        };

        if (
            questionType === "one-choice" &&
            !options.some((opt) => opt.isCorrect)
        ) {
            newOption.isCorrect = true;
        }

        form.setValue(`questions.${questionIndex}.options`, [
            ...options,
            newOption,
        ]);
    };

    const removeOption = (questionIndex: number, optionIndex: number) => {
        const options =
            form.getValues(`questions.${questionIndex}.options`) || [];
        if (options.length <= CONSTANT.MIN_OPTIONS_QUIZ) return;

        const newOptions = [...options];
        newOptions.splice(optionIndex, 1);
        form.setValue(`questions.${questionIndex}.options`, newOptions);
    };

    const handleOptionCorrectChange = (
        questionIndex: number,
        optionIndex: number,
        value: boolean
    ) => {
        const questionType = form.getValues(`questions.${questionIndex}.type`);
        const options =
            form.getValues(`questions.${questionIndex}.options`) || [];

        if (questionType === "one-choice" && value) {
            const updatedOptions = options.map((opt, idx) => ({
                ...opt,
                isCorrect: idx === optionIndex,
            }));
            form.setValue(`questions.${questionIndex}.options`, updatedOptions);
        } else {
            form.setValue(
                `questions.${questionIndex}.options.${optionIndex}.isCorrect`,
                value
            );
        }
    };

    const handleFileUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                const type = getQuizType(jsonData[0]["Loại câu hỏi"]);
                if (type === "unknown") {
                    toast.error("File format is not valid");
                    return;
                }
                let options = [];

                let questions = jsonData.map((row: any) => {
                    if (row.__EMPTY_4) {
                        return null;
                    }
                    if (type === "one-choice") {
                        options = [
                            {
                                text: row["Đáp án A"],
                                isCorrect: row["Đáp án đúng"] === "A",
                            },
                            {
                                text: row["Đáp án B"],
                                isCorrect: row["Đáp án đúng"] === "B",
                            },
                        ];
                        if (row["Đáp án C"] !== "") {
                            options.push({
                                text: row["Đáp án C"],
                                isCorrect: row["Đáp án đúng"] === "C",
                            });
                        }
                        if (row["Đáp án D"] !== "") {
                            options.push({
                                text: row["Đáp án D"],
                                isCorrect: row["Đáp án đúng"] === "D",
                            });
                        }
                    } else if (type === "multiple-choice") {
                        options = [
                            {
                                id: nanoid(),
                                text: row["Đáp án A"],
                                isCorrect: compareAnswer(
                                    row["Đáp án đúng"],
                                    "a"
                                ),
                            },
                            {
                                id: nanoid(),
                                text: row["Đáp án B"],
                                isCorrect: compareAnswer(
                                    row["Đáp án đúng"],
                                    "b"
                                ),
                            },
                            {
                                id: nanoid(),
                                text: row["Đáp án C"],
                                isCorrect: compareAnswer(
                                    row["Đáp án đúng"],
                                    "c"
                                ),
                            },
                        ];
                        if (row["Đáp án D"].toLowerCase().trim() !== "") {
                            options.push({
                                id: nanoid(),
                                text: row["Đáp án D"],
                                isCorrect: compareAnswer(
                                    row["Đáp án đúng"],
                                    "d"
                                ),
                            });
                        }
                    }

                    return {
                        id: nanoid(),
                        text: row["Câu hỏi"],
                        type: type,
                        options: options,
                    };
                });
                questions = questions.filter((question) => question !== null);

                form.setValue("questions", questions as any);
                toast.success(
                    `Successfully uploaded ${questions.length} questions`
                );
            } catch (error) {
                console.error("Error parsing Excel file:", error);
                toast.error(
                    "An error occurred while reading the file. Please check the file format."
                );
            }
        };

        reader.onerror = () => {
            toast.error("An error occurred while reading the file");
        };

        reader.readAsBinaryString(file);
    };

    const handleCreateQuiz = (values: z.infer<typeof quizSchema>) => {
        if (!user.isCreator) {
            toast.error("Only the organizer can create a quiz");
            return;
        }

        setIsSubmitting(true);

        const questions = values.questions.map((question) => {
            const newQuestion: any = {
                id: nanoid(),
                text: question.text,
                type: question.type,
            };

            if (question.type === "multiple-choice" && question.options) {
                newQuestion.options = question.options.map((option) => ({
                    id: nanoid(),
                    text: option.text,
                    isCorrect: option.isCorrect,
                }));
                newQuestion.correctAnswers = newQuestion.options
                    .filter((option: QuizOption) => option.isCorrect)
                    .map((option: QuizOption) => option.id);
            } else if (question.type === "essay") {
                newQuestion.answer = question.answer || "";
            } else if (question.type === "one-choice") {
                newQuestion.options =
                    question.options?.map((option) => ({
                        id: nanoid(),
                        text: option.text,
                        isCorrect: option.isCorrect,
                    })) || [];
                newQuestion.correctAnswers = newQuestion.options
                    .filter((option: QuizOption) => option.isCorrect)
                    .map((option: QuizOption) => option.id);
            }
            return newQuestion;
        });

        if (!socket || !socket.connected) {
            setIsSubmitting(false);
            toast.error("Socket connection is lost, unable to create quiz");
            return;
        }

        // Add a small delay to ensure join is processed
        setTimeout(() => {
            const payload = {
                roomId,
                title: values.title,
                questions,
                creatorId: user?.username,
            };

            socket.emit("quiz:create", payload);
        }, CONSTANT.QUIZ_SOCKET_DELAY);

        // Set up timeout for response
        const timeout = setTimeout(() => {
            setIsSubmitting(false);
            toast.error("Timeout: Unable to create quiz");
        }, CONSTANT.QUIZ_CREATE_TIMEOUT);

        const handleQuizCreated = (data: any) => {
            clearTimeout(timeout);
            setIsSubmitting(false);

            // Transform backend response to match frontend interface
            const quizSession = {
                ...data,
                creatorId: (data as any).creator_id || data.creatorId,
            };

            setActiveQuiz(quizSession);
            setActiveTab("results"); // Creator should see results after creating
            socket.off("quiz:created", handleQuizCreated);
            socket.off("quiz:error", handleQuizError);
        };

        const handleQuizError = (error: any) => {
            console.error("[QuizSidebar] Quiz creation error:", error);
            clearTimeout(timeout);
            setIsSubmitting(false);
            toast.error(error.message || "Unable to create quiz");
            socket.off("quiz:created", handleQuizCreated);
            socket.off("quiz:error", handleQuizError);
        };

        socket.on("quiz:created", handleQuizCreated);
        socket.on("quiz:error", handleQuizError);
    };

    const handleQuizComplete = useCallback(
        (results: QuizResultsData) => {
            setQuizResults(results);
            setIsQuizInProgress(false);
            if (results.quizId) {
                markQuizAsSubmitted(results.quizId); // Use the new helper function
            }
            setActiveTab("results");
        },
        [markQuizAsSubmitted]
    );

    useEffect(() => {
        if (!socket || !socket.connected) {
            return;
        }

        const onQuizCreated = (data: QuizSession) => {
            // Transform backend response to match frontend interface
            const quizSession = {
                ...data,
                creatorId: (data as any).creator_id || data.creatorId,
            };

            setActiveQuiz(quizSession);
            setHasSubmittedQuiz(false); // Reset submission status for new quiz

            // Check if current user is the quiz creator
            const isQuizCreator = quizSession.creatorId === user.username;

            // For non-creators, check if they've already submitted this quiz
            if (!isQuizCreator && hasUserSubmittedQuiz(quizSession.id)) {
                setHasSubmittedQuiz(true);
                setActiveTab("results");
                toast.info(
                    `You have already submitted this quiz: "${quizSession.title}"`
                );
                return;
            }

            // Set appropriate tab for non-quiz-creators
            if (!isQuizCreator) {
                setActiveTab("take");
            } else {
                // Quiz creator should see results tab after creating
                setActiveTab("results");
            }
        };

        const onQuizEnded = (data: { quiz_session: any }) => {
            // Use functional updates to avoid stale closure issues
            setActiveQuiz((currentActiveQuiz) => {
                if (
                    currentActiveQuiz &&
                    currentActiveQuiz.id === data.quiz_session?.id
                ) {
                    setIsQuizInProgress(false);
                    setHasSubmittedQuiz(false); // Reset submission status when quiz ends

                    // Check if current user was the quiz creator
                    const wasQuizCreator =
                        currentActiveQuiz.creatorId === user.username;

                    if (wasQuizCreator) {
                        setActiveTab("create");
                    } else {
                        setActiveTab("take");
                    }
                    return null;
                }
                return currentActiveQuiz;
            });

            // Check if we should switch to results tab
            setQuizResults((currentResults) => {
                if (
                    currentResults &&
                    currentResults.quizId === data.quiz_session?.id
                ) {
                    setActiveTab("results");
                }
                return currentResults;
            });
        };

        const onQuizError = (error: any) => {
            console.error("[QuizSidebar] Quiz error received:", error);
            toast.error(error.message || "Quiz error occurred");
        };

        const onQuizSubmission = (data: any) => {
            setActiveQuiz((currentActiveQuiz) => {
                // Notify the quiz creator that someone submitted
                const isQuizCreator =
                    currentActiveQuiz?.creatorId === user.username;

                if (isQuizCreator && data.participantId) {
                    toast.info(`${data.participantId} submitted the quiz`);

                    // Create a simple result entry for the list
                    const simpleResult = {
                        participantId: data.participantId,
                        results: {
                            quizId: currentActiveQuiz?.id || "",
                            score: data.results?.score || 0,
                            totalPossibleScore:
                                data.results?.totalPossibleScore || 0,
                            startedAt: data.results?.startedAt,
                            finishedAt: data.results?.finishedAt,
                            answers: [], // We don't need detailed answers for the list view
                        },
                    };

                    // Update allStudentResults immediately
                    setAllStudentResults((prev) => {
                        const updated = prev.filter(
                            (s) => s.participantId !== data.participantId
                        );
                        const newResults = [...updated, simpleResult];

                        return newResults;
                    });
                }
                return currentActiveQuiz;
            });
        };

        const onQuizResult = (data: any) => {
            // Use functional update to get current activeQuiz value
            setActiveQuiz((currentActiveQuiz) => {
                // Handle individual quiz result (for non-quiz-creators)
                const isQuizCreator =
                    currentActiveQuiz?.creatorId === user.username;

                if (!isQuizCreator && data) {
                    // Convert the backend result format to our QuizResultsData format
                    const resultsData: QuizResultsData = {
                        quizId: currentActiveQuiz?.id || "",
                        score: data.totalScore || 0,
                        totalPossibleScore: data.totalPossibleScore || 0,
                        startedAt: new Date(),
                        finishedAt: new Date(),
                        answers:
                            data.questionResults?.map((qr: any) => {
                                const question =
                                    currentActiveQuiz?.questions?.find(
                                        (q) => q.id === qr.questionId
                                    );
                                return {
                                    questionId: qr.questionId,
                                    text: question?.text || "",
                                    type: question?.type || "one-choice",
                                    correctAnswers: qr.correctAnswers || [],
                                    selectedOptions: qr.selectedOptions || [],
                                    essayAnswer: qr.essayAnswer || "",
                                    modelAnswer: "",
                                    options: question?.options || [],
                                };
                            }) || [],
                    };

                    setQuizResults(resultsData);
                    setHasSubmittedQuiz(true);
                    setActiveTab("results");
                    toast.success("Submission successful!");
                }

                // Return the same activeQuiz (no change)
                return currentActiveQuiz;
            });
        };

        socket.on("quiz:created", onQuizCreated);
        socket.on("quiz:ended", onQuizEnded);
        socket.on("quiz:error", onQuizError);
        socket.on("quiz:submission", onQuizSubmission);
        socket.on("quiz:result", onQuizResult);

        // Get active quiz when opening sidebar
        if (isOpen && socket?.connected) {
            // Request active quiz from server
            socket.emit("quiz:get-active", {
                roomId,
                requesterId:
                    user?.username ||
                    user?.displayName ||
                    user?.peerId ||
                    "unknown",
            });
        }

        // Set up listener for active quiz response
        const handleActiveQuiz = (data: any) => {
            if (data && data.quiz_session) {
                // Transform backend response to match frontend interface
                const quizSession = {
                    ...data.quiz_session,
                    creatorId:
                        data.quiz_session.creator_id ||
                        data.quiz_session.creatorId,
                };

                // Check if this is a different quiz than what we had before
                const isDifferentQuiz =
                    !activeQuiz || activeQuiz.id !== quizSession.id;
                setActiveQuiz(quizSession);

                // Check if current user is the quiz creator
                const isQuizCreator = quizSession.creatorId === user.username;

                // Set appropriate tab based on user role and quiz state
                if (isQuizCreator) {
                    // Quiz creator should see results tab if quiz exists
                    setActiveTab("results");
                } else {
                    // For non-quiz-creators, reset submission state for new/different quiz
                    if (isDifferentQuiz) {
                        setHasSubmittedQuiz(false);
                        setActiveTab("take");
                    } else {
                        if (!hasSubmittedQuiz) {
                            setActiveTab("take");
                        } else {
                            setActiveTab("results");
                        }
                    }
                }
            } else {
                setActiveQuiz(null);

                // Set default tab when no active quiz
                // For now, all room creators can create quizzes, so we still use user.isCreator
                if (user.isCreator) {
                    setActiveTab("create");
                } else {
                    // Non-creators can't create, so set to take tab (will be disabled)
                    setActiveTab("take");
                }
            }
        };

        socket.on("quiz:active", handleActiveQuiz);

        return () => {
            socket.off("quiz:created", onQuizCreated);
            socket.off("quiz:ended", onQuizEnded);
            socket.off("quiz:error", onQuizError);
            socket.off("quiz:submission", onQuizSubmission);
            socket.off("quiz:result", onQuizResult);
            socket.off("quiz:active", handleActiveQuiz);
        };
    }, [
        roomId,
        user.isCreator,
        user.username,
        isOpen,
        hasSubmittedQuiz,
        socket,
        // activeQuiz removed to prevent infinite loop
    ]);

    const handleEndQuiz = () => {
        const isQuizCreator = activeQuiz?.creatorId === user.username;
        if (!activeQuiz || !isQuizCreator) return;
        setIsSubmitting(true);

        socket.emit("quiz:end", {
            roomId,
            quizId: activeQuiz.id,
            creatorId: user.username,
        });

        const handleQuizEnded = (data: any) => {
            setIsSubmitting(false);
            setActiveQuiz(null);
            setActiveTab("create");
            toast.success("Ended quiz successfully");
            socket.off("quiz:ended", handleQuizEnded);
            socket.off("quiz:error", handleQuizError);
        };

        const handleQuizError = (error: any) => {
            console.error("[QuizSidebar] Quiz end error:", error);
            setIsSubmitting(false);
            toast.error(error.message || "Unable to end quiz");
            socket.off("quiz:ended", handleQuizEnded);
            socket.off("quiz:error", handleQuizError);
        };

        socket.on("quiz:ended", handleQuizEnded);
        socket.on("quiz:error", handleQuizError);
    };

    const handleTabChange = useCallback(
        (value: string) => {
            if (
                !validateQuizAccess(
                    value,
                    activeTab,
                    activeQuiz,
                    user,
                    isQuizInProgress,
                    hasSubmittedQuiz,
                    quizResults
                )
            ) {
                return;
            }

            setActiveTab(value as any);
        },
        [
            validateQuizAccess,
            activeTab,
            activeQuiz,
            user,
            isQuizInProgress,
            hasSubmittedQuiz,
            quizResults,
        ]
    );

    const handleStartQuiz = useCallback(() => {
        setIsQuizInProgress(true);
    }, []);

    const disabledResultsTab = useMemo(() => {
        const isQuizCreator = activeQuiz?.creatorId === user.username;

        if (isQuizCreator) {
            // Quiz creator can see results if there's an active quiz
            return !activeQuiz;
        } else {
            // Non-quiz-creator can only see results if they have submitted the quiz
            return !quizResults || isQuizInProgress || !hasSubmittedQuiz;
        }
    }, [
        activeQuiz,
        user.username,
        quizResults,
        isQuizInProgress,
        hasSubmittedQuiz,
    ]);

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent
                    side='right'
                    className='w-full sm:max-w-[750px] md:max-w-[900px] p-0 border-l'
                >
                    <div className='h-full flex flex-col'>
                        <SheetHeader className='p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700'>
                            <div className='flex justify-between items-center'>
                                <div>
                                    <SheetTitle className='text-base sm:text-lg text-gray-900 dark:text-white'>
                                        Quiz
                                    </SheetTitle>
                                    <SheetDescription className='text-xs sm:text-sm text-gray-600 dark:text-gray-400'>
                                        Create or join a quiz to test your
                                        knowledge.
                                    </SheetDescription>
                                </div>
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={onClose}
                                    className='border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                >
                                    <ChevronRight className='h-4 w-4 sm:h-5 sm:w-5' />
                                </Button>
                            </div>
                        </SheetHeader>

                        <div className='flex-1 overflow-y-auto p-3 sm:p-6 scrollbar-sm'>
                            <Tabs
                                value={activeTab}
                                onValueChange={handleTabChange}
                                className='w-full'
                            >
                                <TabsList className='grid w-full grid-cols-3 mb-4 sm:mb-6'>
                                    <TabsTrigger
                                        value='create'
                                        disabled={
                                            !user.isCreator || !!activeQuiz // Disable if there's any active quiz
                                        }
                                        className='text-xs sm:text-sm'
                                    >
                                        Create Quiz
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value='take'
                                        disabled={(() => {
                                            // Check if current user is the quiz creator
                                            const isQuizCreator =
                                                activeQuiz?.creatorId ===
                                                user.username;

                                            const isDisabled =
                                                !activeQuiz ||
                                                hasSubmittedQuiz ||
                                                isQuizCreator; // Quiz creator cannot take their own quiz
                                            return isDisabled;
                                        })()}
                                        className='text-xs sm:text-sm'
                                    >
                                        Take Quiz
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value='results'
                                        disabled={disabledResultsTab}
                                        className='text-xs sm:text-sm'
                                    >
                                        Results
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value='create'>
                                    <form
                                        onSubmit={form.handleSubmit(
                                            handleCreateQuiz
                                        )}
                                        className='space-y-4 sm:space-y-8 py-2 sm:py-4 max-w-4xl mx-auto focus-within:ring-0'
                                    >
                                        {activeQuiz ? (
                                            <div className='bg-orange-50 dark:bg-orange-900/20 p-4 rounded-md border border-orange-200 dark:border-orange-800 mb-4'>
                                                <div className='text-center'>
                                                    <h3 className='text-base sm:text-lg font-medium text-orange-700 dark:text-orange-400'>
                                                        Has an active quiz
                                                    </h3>
                                                    <p className='text-sm text-orange-600 dark:text-orange-300 mt-1'>
                                                        Please go to the
                                                        "Results" tab to manage
                                                        the current quiz.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className='space-y-2 sm:space-y-3'>
                                                    <Label
                                                        htmlFor='title'
                                                        className='text-sm sm:text-lg text-gray-900 dark:text-white'
                                                    >
                                                        Quiz Title
                                                    </Label>
                                                    <Input
                                                        id='title'
                                                        placeholder='Enter quiz title'
                                                        className='text-sm sm:text-lg py-2 sm:py-6 focus-visible:outline-blue-400 dark:focus-visible:outline-blue-500 focus-visible:ring-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400'
                                                        {...form.register(
                                                            "title"
                                                        )}
                                                    />
                                                    {form.formState.errors
                                                        .title && (
                                                        <p className='text-xs sm:text-sm text-red-500 dark:text-red-400'>
                                                            {
                                                                form.formState
                                                                    .errors
                                                                    .title
                                                                    .message
                                                            }
                                                        </p>
                                                    )}
                                                </div>

                                                <div className='space-y-4 sm:space-y-6'>
                                                    <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0'>
                                                        <Label className='text-sm sm:text-lg text-gray-900 dark:text-white'>
                                                            Question List
                                                        </Label>
                                                        <div className='flex flex-wrap gap-2 sm:space-x-3'>
                                                            <Button
                                                                type='button'
                                                                size='sm'
                                                                variant='outline'
                                                                onClick={() => {
                                                                    const input =
                                                                        document.createElement(
                                                                            "input"
                                                                        );
                                                                    input.type =
                                                                        "file";
                                                                    input.accept =
                                                                        ".xlsx, .xls";
                                                                    input.onchange =
                                                                        (e) => {
                                                                            const file =
                                                                                (
                                                                                    e.target as HTMLInputElement
                                                                                )
                                                                                    .files?.[0];
                                                                            if (
                                                                                file
                                                                            )
                                                                                handleFileUpload(
                                                                                    file
                                                                                );
                                                                        };
                                                                    input.click();
                                                                }}
                                                                className='text-xs sm:text-sm py-1 px-2 sm:py-5 sm:px-4 flex-1 sm:flex-auto border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                            >
                                                                <Upload className='h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2' />
                                                                <span className='whitespace-nowrap'>
                                                                    Import file
                                                                </span>
                                                            </Button>
                                                            <Button
                                                                type='button'
                                                                size='sm'
                                                                variant='outline'
                                                                onClick={() =>
                                                                    addQuestion(
                                                                        "multiple-choice"
                                                                    )
                                                                }
                                                                className='text-xs sm:text-sm py-1 px-2 sm:py-5 sm:px-4 flex-1 sm:flex-auto border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                            >
                                                                <CheckCircle className='h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2' />
                                                                <span className='whitespace-nowrap'>
                                                                    Add
                                                                    multiple-choice
                                                                    question
                                                                </span>
                                                            </Button>
                                                            <Button
                                                                type='button'
                                                                size='sm'
                                                                variant='outline'
                                                                onClick={() =>
                                                                    addQuestion(
                                                                        "essay"
                                                                    )
                                                                }
                                                                className='text-xs sm:text-sm py-1 px-2 sm:py-5 sm:px-4 flex-1 sm:flex-auto border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                            >
                                                                <FileText className='h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2' />
                                                                <span className='whitespace-nowrap'>
                                                                    Add essay
                                                                    question
                                                                </span>
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {questionFields.map(
                                                        (
                                                            field,
                                                            questionIndex
                                                        ) => (
                                                            <div
                                                                key={field.id}
                                                                className='border border-gray-200 dark:border-gray-700 p-3 sm:p-6 rounded-md space-y-3 sm:space-y-4 bg-gray-50 dark:bg-gray-800'
                                                            >
                                                                <div className='flex justify-between items-start'>
                                                                    <Label
                                                                        htmlFor={`question-${questionIndex}`}
                                                                        className='text-sm sm:text-base font-medium text-gray-900 dark:text-white'
                                                                    >
                                                                        Question{" "}
                                                                        {questionIndex +
                                                                            1}
                                                                    </Label>
                                                                    {questionFields.length >
                                                                        1 && (
                                                                        <Button
                                                                            type='button'
                                                                            size='sm'
                                                                            variant='destructive'
                                                                            onClick={() =>
                                                                                removeQuestion(
                                                                                    questionIndex
                                                                                )
                                                                            }
                                                                            className='h-7 w-7 sm:h-8 sm:w-8 p-0 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
                                                                        >
                                                                            <Trash className='h-3 w-3 sm:h-4 sm:w-4' />
                                                                        </Button>
                                                                    )}
                                                                </div>

                                                                <div className='space-y-2 sm:space-y-3'>
                                                                    <Input
                                                                        id={`question-${questionIndex}`}
                                                                        placeholder='Enter question content'
                                                                        className='text-sm sm:text-base py-2 sm:py-5 focus-visible:outline-blue-400 dark:focus-visible:outline-blue-500 focus-visible:ring-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400'
                                                                        {...form.register(
                                                                            `questions.${questionIndex}.text`
                                                                        )}
                                                                    />
                                                                    {form
                                                                        .formState
                                                                        .errors
                                                                        .questions?.[
                                                                        questionIndex
                                                                    ]?.text && (
                                                                        <p className='text-xs sm:text-sm text-red-500 dark:text-red-400'>
                                                                            {
                                                                                form
                                                                                    .formState
                                                                                    .errors
                                                                                    .questions?.[
                                                                                    questionIndex
                                                                                ]
                                                                                    ?.text
                                                                                    ?.message
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <div className='space-y-1 sm:space-y-2'>
                                                                    <Label className='text-sm sm:text-base text-gray-900 dark:text-white'>
                                                                        Question
                                                                        type
                                                                    </Label>
                                                                    <Controller
                                                                        control={
                                                                            form.control
                                                                        }
                                                                        name={`questions.${questionIndex}.type`}
                                                                        render={({
                                                                            field,
                                                                        }) => (
                                                                            <Select
                                                                                onValueChange={(
                                                                                    value
                                                                                ) => {
                                                                                    field.onChange(
                                                                                        value
                                                                                    );
                                                                                    if (
                                                                                        value ===
                                                                                        "multiple-choice"
                                                                                    ) {
                                                                                        form.setValue(
                                                                                            `questions.${questionIndex}.options`,
                                                                                            [
                                                                                                {
                                                                                                    text: "",
                                                                                                    isCorrect:
                                                                                                        false,
                                                                                                },
                                                                                                {
                                                                                                    text: "",
                                                                                                    isCorrect:
                                                                                                        false,
                                                                                                },
                                                                                            ]
                                                                                        );
                                                                                        form.setValue(
                                                                                            `questions.${questionIndex}.answer`,
                                                                                            undefined
                                                                                        );
                                                                                    } else if (
                                                                                        value ===
                                                                                        "one-choice"
                                                                                    ) {
                                                                                        form.setValue(
                                                                                            `questions.${questionIndex}.options`,
                                                                                            [
                                                                                                {
                                                                                                    text: "",
                                                                                                    isCorrect:
                                                                                                        false,
                                                                                                },
                                                                                                {
                                                                                                    text: "",
                                                                                                    isCorrect:
                                                                                                        false,
                                                                                                },
                                                                                            ]
                                                                                        );
                                                                                        form.setValue(
                                                                                            `questions.${questionIndex}.answer`,
                                                                                            undefined
                                                                                        );
                                                                                    } else {
                                                                                        form.setValue(
                                                                                            `questions.${questionIndex}.options`,
                                                                                            undefined
                                                                                        );
                                                                                        form.setValue(
                                                                                            `questions.${questionIndex}.answer`,
                                                                                            ""
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                value={
                                                                                    field.value
                                                                                }
                                                                            >
                                                                                <SelectTrigger className='w-full focus:ring-1 focus:ring-blue-500 sm:w-[250px] text-xs sm:text-sm focus-visible:outline-blue-400 dark:focus-visible:outline-blue-500 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-800'>
                                                                                    <SelectValue placeholder='Choose question type' />
                                                                                </SelectTrigger>
                                                                                <SelectContent className='dark:bg-slate-900 dark:border-slate-700'>
                                                                                    <SelectItem
                                                                                        value='one-choice'
                                                                                        className='text-xs sm:text-sm'
                                                                                    >
                                                                                        Choice
                                                                                        1
                                                                                        answer
                                                                                    </SelectItem>
                                                                                    <SelectItem
                                                                                        value='multiple-choice'
                                                                                        className='text-xs sm:text-sm'
                                                                                    >
                                                                                        Multiple
                                                                                        choice
                                                                                        answers
                                                                                    </SelectItem>
                                                                                    <SelectItem
                                                                                        value='essay'
                                                                                        className='text-xs sm:text-sm'
                                                                                    >
                                                                                        Essay
                                                                                        question
                                                                                    </SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        )}
                                                                    />
                                                                </div>

                                                                {/* Render multiple choice options or essay answer based on question type */}
                                                                {(form.watch(
                                                                    `questions.${questionIndex}.type`
                                                                ) ===
                                                                    "multiple-choice" ||
                                                                    form.watch(
                                                                        `questions.${questionIndex}.type`
                                                                    ) ===
                                                                        "one-choice") && (
                                                                    <div className='space-y-3 sm:space-y-4 mt-3 sm:mt-4'>
                                                                        <div className='flex justify-between items-center'>
                                                                            <Label className='text-sm sm:text-base text-gray-900 dark:text-white'>
                                                                                Options
                                                                            </Label>
                                                                            <Button
                                                                                type='button'
                                                                                size='sm'
                                                                                variant='outline'
                                                                                onClick={() =>
                                                                                    addOption(
                                                                                        questionIndex
                                                                                    )
                                                                                }
                                                                                className='text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-3 dark:border-slate-700 dark:hover:bg-slate-800'
                                                                            >
                                                                                <Plus className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                                                                                Add
                                                                            </Button>
                                                                        </div>

                                                                        <div className='grid gap-2 sm:gap-4'>
                                                                            {form
                                                                                .watch(
                                                                                    `questions.${questionIndex}.options`
                                                                                )
                                                                                ?.map(
                                                                                    (
                                                                                        option,
                                                                                        optionIndex
                                                                                    ) => (
                                                                                        <div
                                                                                            key={
                                                                                                optionIndex
                                                                                            }
                                                                                            className='flex items-start space-x-2 sm:space-x-3 bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-md dark:border dark:border-slate-700'
                                                                                        >
                                                                                            <div className='mt-2 sm:mt-3'>
                                                                                                <Controller
                                                                                                    control={
                                                                                                        form.control
                                                                                                    }
                                                                                                    name={`questions.${questionIndex}.options.${optionIndex}.isCorrect`}
                                                                                                    render={({
                                                                                                        field,
                                                                                                    }) => (
                                                                                                        <Checkbox
                                                                                                            checked={
                                                                                                                field.value
                                                                                                            }
                                                                                                            onCheckedChange={(
                                                                                                                checked
                                                                                                            ) =>
                                                                                                                handleOptionCorrectChange(
                                                                                                                    questionIndex,
                                                                                                                    optionIndex,
                                                                                                                    checked as boolean
                                                                                                                )
                                                                                                            }
                                                                                                            className='h-4 w-4 sm:h-5 sm:w-5 dark:border-slate-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500'
                                                                                                        />
                                                                                                    )}
                                                                                                />
                                                                                            </div>
                                                                                            <div className='flex-1'>
                                                                                                <Input
                                                                                                    placeholder={`Lựa chọn ${
                                                                                                        optionIndex +
                                                                                                        1
                                                                                                    }`}
                                                                                                    className='text-sm sm:text-base py-1 sm:py-4 focus-visible:outline-blue-400 dark:focus-visible:outline-blue-500 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-900'
                                                                                                    {...form.register(
                                                                                                        `questions.${questionIndex}.options.${optionIndex}.text`
                                                                                                    )}
                                                                                                />
                                                                                                {form
                                                                                                    .formState
                                                                                                    .errors
                                                                                                    .questions?.[
                                                                                                    questionIndex
                                                                                                ]
                                                                                                    ?.options?.[
                                                                                                    optionIndex
                                                                                                ]
                                                                                                    ?.text && (
                                                                                                    <p className='text-xs sm:text-sm text-red-500 dark:text-red-400 mt-1'>
                                                                                                        {
                                                                                                            form
                                                                                                                .formState
                                                                                                                .errors
                                                                                                                .questions?.[
                                                                                                                questionIndex
                                                                                                            ]
                                                                                                                ?.options?.[
                                                                                                                optionIndex
                                                                                                            ]
                                                                                                                ?.text
                                                                                                                ?.message
                                                                                                        }
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                            {form.watch(
                                                                                                `questions.${questionIndex}.options`
                                                                                            )
                                                                                                ?.length >
                                                                                                2 && (
                                                                                                <Button
                                                                                                    type='button'
                                                                                                    size='sm'
                                                                                                    variant='destructive'
                                                                                                    onClick={() =>
                                                                                                        removeOption(
                                                                                                            questionIndex,
                                                                                                            optionIndex
                                                                                                        )
                                                                                                    }
                                                                                                    className='h-7 w-7 sm:h-8 sm:w-8 p-0 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
                                                                                                >
                                                                                                    <Trash className='h-3 w-3 sm:h-4 sm:w-4' />
                                                                                                </Button>
                                                                                            )}
                                                                                        </div>
                                                                                    )
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {form.watch(
                                                                    `questions.${questionIndex}.type`
                                                                ) ===
                                                                    "essay" && (
                                                                    <div className='space-y-2 sm:space-y-3 mt-3 sm:mt-4'>
                                                                        <Label
                                                                            htmlFor={`answer-${questionIndex}`}
                                                                            className='text-sm sm:text-base text-gray-900 dark:text-white'
                                                                        >
                                                                            Example
                                                                            answer
                                                                            (optional)
                                                                        </Label>
                                                                        <Textarea
                                                                            id={`answer-${questionIndex}`}
                                                                            placeholder='Enter example answer (if any)'
                                                                            className='min-h-[100px] sm:min-h-[150px] text-sm sm:text-base focus-visible:outline-blue-400 dark:focus-visible:outline-blue-500 focus-visible:ring-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400'
                                                                            {...form.register(
                                                                                `questions.${questionIndex}.answer`
                                                                            )}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    )}
                                                </div>

                                                <div className='flex justify-end'>
                                                    <Button
                                                        type='submit'
                                                        disabled={isSubmitting}
                                                        className='bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 py-2 px-4 sm:py-6 sm:px-8 text-sm sm:text-base'
                                                    >
                                                        {isSubmitting
                                                            ? "Processing..."
                                                            : "Create Quiz"}
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </form>
                                </TabsContent>

                                <TabsContent value='take'>
                                    <div className='space-y-4 py-2 sm:py-4 max-w-4xl mx-auto'>
                                        {activeQuiz ? (
                                            <div>
                                                {isQuizInProgress ? (
                                                    <div className='bg-gray-50 dark:bg-gray-800 p-3 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700'>
                                                        <QuizTakingView
                                                            roomId={roomId}
                                                            username={
                                                                user.username
                                                            }
                                                            quiz={activeQuiz}
                                                            onComplete={
                                                                handleQuizComplete
                                                            }
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className='text-center py-8 sm:py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                                                        <h3 className='text-base sm:text-xl font-semibold mb-1 sm:mb-2 text-gray-900 dark:text-white'>
                                                            Quiz:{" "}
                                                            {activeQuiz.title}
                                                        </h3>
                                                        <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6'>
                                                            The quiz consists of{" "}
                                                            {
                                                                activeQuiz
                                                                    .questions
                                                                    .length
                                                            }{" "}
                                                            questions. Get
                                                            ready.
                                                        </p>
                                                        {!user.isCreator &&
                                                            !quizResults && (
                                                                <Button
                                                                    onClick={
                                                                        handleStartQuiz
                                                                    }
                                                                    className='bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-2 px-4 sm:py-4 sm:px-6 text-sm sm:text-base'
                                                                >
                                                                    Start Quiz
                                                                </Button>
                                                            )}
                                                        {!user.isCreator &&
                                                            quizResults && (
                                                                <div className='mt-2 text-green-600 text-sm'>
                                                                    You have
                                                                    completed
                                                                    this quiz.
                                                                </div>
                                                            )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className='text-center py-8 sm:py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                                                <p className='text-gray-500 dark:text-gray-400 text-sm sm:text-lg'>
                                                    No quizzes have been created
                                                    yet.
                                                </p>
                                                {user.isCreator && (
                                                    <Button
                                                        className='mt-4 sm:mt-6 py-2 px-4 sm:py-5 sm:px-6 text-xs sm:text-base'
                                                        onClick={() =>
                                                            setActiveTab(
                                                                "create"
                                                            )
                                                        }
                                                    >
                                                        Create Quiz
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value='results'>
                                    <div className='space-y-4 py-2 sm:py-4 max-w-4xl mx-auto'>
                                        {/* End Quiz Button for Creator */}
                                        {activeQuiz &&
                                            activeQuiz.creatorId ===
                                                user.username && (
                                                <div className='bg-orange-50 p-4 rounded-md border border-orange-200 mb-4'>
                                                    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2'>
                                                        <div>
                                                            <h3 className='text-base sm:text-lg font-medium text-orange-700'>
                                                                Quiz:{" "}
                                                                {
                                                                    activeQuiz.title
                                                                }
                                                            </h3>
                                                            <p className='text-sm text-orange-600 mt-1'>
                                                                End the quiz to
                                                                complete the
                                                                exam process.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            type='button'
                                                            variant='destructive'
                                                            size='sm'
                                                            onClick={
                                                                handleEndQuiz
                                                            }
                                                            disabled={
                                                                isSubmitting
                                                            }
                                                            className='whitespace-nowrap text-xs sm:text-sm'
                                                        >
                                                            {isSubmitting
                                                                ? "Processing..."
                                                                : "End Quiz"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                        {/* Results Display for Creator: List all students and scores */}
                                        {user.isCreator &&
                                        allStudentResults.length > 0 ? (
                                            <div className='bg-gray-50 dark:bg-gray-800 p-3 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700'>
                                                <h4 className='text-sm sm:text-base font-semibold mb-4 text-gray-900 dark:text-white'>
                                                    List of users who have
                                                    submitted their work
                                                </h4>
                                                <ul className='divide-y divide-gray-200 dark:divide-gray-700'>
                                                    {allStudentResults.map(
                                                        (student) => (
                                                            <li
                                                                key={
                                                                    student.participantId
                                                                }
                                                                className='flex items-center justify-between py-2'
                                                            >
                                                                <div className='flex items-center'>
                                                                    <User className='h-4 w-4 mr-2' />
                                                                    <span className='font-medium'>
                                                                        {
                                                                            student.participantId
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <span className='text-sm text-gray-700 dark:text-white font-semibold'>
                                                                    {
                                                                        student
                                                                            .results
                                                                            .score
                                                                    }{" "}
                                                                    /{" "}
                                                                    {
                                                                        student
                                                                            .results
                                                                            .totalPossibleScore
                                                                    }
                                                                </span>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </div>
                                        ) : user.isCreator && activeQuiz ? (
                                            <div className='text-center py-8 sm:py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                                                <p className='text-gray-500 dark:text-gray-400 text-sm sm:text-lg mb-4'>
                                                    No users have completed the
                                                    quiz yet.
                                                </p>
                                            </div>
                                        ) : quizResults ? (
                                            <div className='bg-gray-50 dark:bg-gray-800 p-3 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700'>
                                                <QuizResultsView
                                                    results={quizResults}
                                                />
                                            </div>
                                        ) : (
                                            <div className='text-center py-8 sm:py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                                                <p className='text-gray-500 dark:text-gray-400 text-sm sm:text-lg'>
                                                    {user.isCreator
                                                        ? "No users have completed the quiz yet."
                                                        : "You have not completed any quizzes yet."}
                                                </p>
                                                {activeQuiz &&
                                                    !user.isCreator && (
                                                        <Button
                                                            className='mt-4 sm:mt-6 py-2 px-4 sm:py-5 sm:px-6 text-xs sm:text-base'
                                                            onClick={() =>
                                                                setActiveTab(
                                                                    "take"
                                                                )
                                                            }
                                                        >
                                                            Back to Quiz
                                                        </Button>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};
