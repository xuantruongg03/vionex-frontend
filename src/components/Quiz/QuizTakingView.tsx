import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "@/contexts/SocketContext";
import {
    QuizResult,
    QuizResultsData,
    QuizSubmission,
    QuizTakingViewProps,
} from "@/interfaces/quiz";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    CircleCheck,
    FileText,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const QuizTakingView = ({
    roomId,
    username,
    quiz,
    onComplete,
}: QuizTakingViewProps) => {
    // Early return if quiz is not properly loaded
    if (
        !quiz ||
        !quiz.questions ||
        !Array.isArray(quiz.questions) ||
        quiz.questions.length === 0
    ) {
        return (
            <div className='p-4 text-center'>
                <p className='dark:text-gray-300'>Loading quiz...</p>
            </div>
        );
    }

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<
        Array<{
            questionId: string;
            selectedOptions: string[];
            essayAnswer: string;
        }>
    >(
        quiz.questions.map((question) => ({
            questionId: question.id,
            selectedOptions: [],
            essayAnswer: "",
        }))
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Use Socket Context
    const { socket } = useSocket();

    const currentQuestion = quiz.questions[currentQuestionIndex];

    const handleSelectOption = (optionId: string) => {
        setAnswers((prev) => {
            const questionId = currentQuestion.id;
            const answerIndex = prev.findIndex(
                (a) => a.questionId === questionId
            );
            const currentAnswer = prev[answerIndex] || {
                questionId,
                selectedOptions: [],
                essayAnswer: "",
            };

            let newSelectedOptions: string[];

            if (currentQuestion.type === "one-choice") {
                newSelectedOptions = [optionId];
            } else {
                if (currentAnswer.selectedOptions.includes(optionId)) {
                    newSelectedOptions = currentAnswer.selectedOptions.filter(
                        (id) => id !== optionId
                    );
                } else {
                    newSelectedOptions = [
                        ...currentAnswer.selectedOptions,
                        optionId,
                    ];
                }
            }

            const newAnswers = [...prev];
            newAnswers[answerIndex] = {
                ...currentAnswer,
                selectedOptions: newSelectedOptions,
            };

            return newAnswers;
        });
    };

    const handleEssayChange = (text: string) => {
        setAnswers((prev) => {
            const questionId = currentQuestion.id;
            const answerIndex = prev.findIndex(
                (a) => a.questionId === questionId
            );

            const newAnswers = [...prev];
            newAnswers[answerIndex] = {
                ...newAnswers[answerIndex],
                essayAnswer: text,
            };

            return newAnswers;
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        }
    };

    const handleComplete = () => {
        setIsSubmitting(true);

        // Submit entire quiz at once using the new quiz:submit event
        const submission: QuizSubmission = {
            roomId,
            quizId: quiz.id,
            participantId: username,
            answers: answers,
        };

        // Set up result handlers
        const handleQuizResult = (data: QuizResult) => {
            setIsSubmitting(false);

            // Create results data for the parent component
            const resultsData: QuizResultsData = {
                quizId: quiz.id,
                score: data.totalScore,
                totalPossibleScore: data.totalPossibleScore,
                startedAt: new Date(),
                finishedAt: new Date(),
                answers: data.questionResults.map((qr) => {
                    const question = quiz.questions.find(
                        (q) => q.id === qr.questionId
                    );
                    const answer = answers.find(
                        (a) => a.questionId === qr.questionId
                    );

                    return {
                        questionId: qr.questionId,
                        text: question?.text || "",
                        type: question?.type || "one-choice",
                        correctAnswers: qr.correctAnswers,
                        selectedOptions: answer?.selectedOptions || [],
                        essayAnswer: answer?.essayAnswer || "",
                        modelAnswer: "",
                        options: question?.options || [],
                    };
                }),
            };

            onComplete(resultsData);
            toast.success(
                `Quiz completed! Score: ${data.totalScore}/${data.totalPossibleScore}`
            );

            // Clean up listeners
            socket.off("quiz:result", handleQuizResult);
            socket.off("quiz:error", handleQuizError);
        };

        const handleQuizError = (error: any) => {
            console.error("[QuizTakingView] Quiz submission error:", error);
            setIsSubmitting(false);
            toast.error(
                "Error while submitting quiz: " +
                    (error.message || "Unknown error")
            );

            // Clean up listeners
            socket.off("quiz:result", handleQuizResult);
            socket.off("quiz:error", handleQuizError);
        };

        // Set up listeners before submitting
        socket.on("quiz:result", handleQuizResult);
        socket.on("quiz:error", handleQuizError);

        // Submit the quiz
        socket.emit("quiz:submit", submission);
    };

    return (
        <div className='space-y-4 sm:space-y-6'>
            <div className='flex justify-between items-center'>
                <h3 className='text-sm sm:text-lg font-semibold dark:text-gray-100'>
                    {quiz.title}
                </h3>
                <div className='text-xs sm:text-sm font-medium dark:text-gray-300'>
                    Câu {currentQuestionIndex + 1}/{quiz.questions.length}
                </div>
            </div>

            <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className='space-y-3 sm:space-y-4'
            >
                <div className='bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-md dark:border dark:border-gray-700'>
                    <div className='flex items-start gap-2 sm:gap-3'>
                        {currentQuestion.type === "multiple-choice" ? (
                            <CheckCircle className='h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400 mt-0.5' />
                        ) : currentQuestion.type === "one-choice" ? (
                            <CircleCheck className='h-4 w-4 sm:h-5 sm:w-5 text-green-500 dark:text-green-400 mt-0.5' />
                        ) : (
                            <FileText className='h-4 w-4 sm:h-5 sm:w-5 text-purple-500 dark:text-purple-400 mt-0.5' />
                        )}
                        <div>
                            <h4 className='font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100'>
                                {currentQuestion.text}
                            </h4>
                            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1'>
                                {currentQuestion.type === "multiple-choice"
                                    ? "Choose one or more correct options"
                                    : currentQuestion.type === "one-choice"
                                    ? "Choose a single correct answer"
                                    : "Enter your answer in the box below"}
                            </p>
                        </div>
                    </div>
                </div>

                {currentQuestion.type === "multiple-choice" &&
                    currentQuestion.options && (
                        <div>
                            {currentQuestion.options.map((option) => {
                                const currentAnswer = answers.find(
                                    (a) => a.questionId === currentQuestion.id
                                );
                                const isSelected =
                                    currentAnswer?.selectedOptions.includes(
                                        option.id
                                    ) || false;

                                return (
                                    <div
                                        key={option.id}
                                        className={`p-2 sm:p-3 border rounded-md mb-2 cursor-pointer transition-colors ${
                                            isSelected
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600"
                                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                        onClick={() =>
                                            handleSelectOption(option.id)
                                        }
                                    >
                                        <div className='flex items-center space-x-2 sm:space-x-3'>
                                            <Checkbox
                                                checked={isSelected}
                                                className='h-4 w-4 sm:h-5 sm:w-5'
                                            />
                                            <span className='text-sm sm:text-base dark:text-gray-200'>
                                                {option.text}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                {currentQuestion.type === "one-choice" &&
                    currentQuestion.options && (
                        <RadioGroup
                            value={
                                answers.find(
                                    (a) => a.questionId === currentQuestion.id
                                )?.selectedOptions[0] || ""
                            }
                            onValueChange={(value) => handleSelectOption(value)}
                            className='space-y-2'
                        >
                            {currentQuestion.options.map((option) => {
                                const currentAnswer = answers.find(
                                    (a) => a.questionId === currentQuestion.id
                                );
                                const isSelected =
                                    currentAnswer?.selectedOptions.includes(
                                        option.id
                                    ) || false;
                                return (
                                    <div
                                        key={option.id}
                                        className={`p-2 sm:p-3 border rounded-md cursor-pointer transition-colors ${
                                            isSelected
                                                ? "border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-600"
                                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                        onClick={() =>
                                            handleSelectOption(option.id)
                                        }
                                    >
                                        <div className='flex items-center space-x-2 sm:space-x-3'>
                                            <RadioGroupItem
                                                value={option.id}
                                                id={option.id}
                                                className='h-4 w-4 sm:h-5 sm:w-5 text-green-600'
                                            />
                                            <span className='text-sm sm:text-base dark:text-gray-200'>
                                                {option.text}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </RadioGroup>
                    )}

                {currentQuestion.type === "essay" && (
                    <div className='space-y-2'>
                        <Textarea
                            placeholder='Enter your answer...'
                            className='min-h-[100px] sm:min-h-[150px] text-sm sm:text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400'
                            value={
                                answers.find(
                                    (a) => a.questionId === currentQuestion.id
                                )?.essayAnswer || ""
                            }
                            onChange={(e) => handleEssayChange(e.target.value)}
                        />
                    </div>
                )}
            </motion.div>

            <div className='flex justify-between pt-2 sm:pt-4'>
                <Button
                    type='button'
                    variant='outline'
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className='flex items-center text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-4 dark:border-gray-700 dark:hover:bg-gray-800'
                >
                    <ArrowLeft className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                    Trước
                </Button>

                {currentQuestionIndex < quiz.questions.length - 1 ? (
                    <Button
                        type='button'
                        onClick={handleNext}
                        className='flex items-center text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-4'
                    >
                        Tiếp
                        <ArrowRight className='h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2' />
                    </Button>
                ) : (
                    <Button
                        type='button'
                        onClick={handleComplete}
                        disabled={isSubmitting}
                        className='bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 dark:from-green-700 dark:to-teal-700 dark:hover:from-green-800 dark:hover:to-teal-800 text-xs sm:text-sm py-1 px-3 sm:py-2 sm:px-4'
                    >
                        {isSubmitting ? "Processing..." : "Complete"}
                    </Button>
                )}
            </div>
        </div>
    );
};
