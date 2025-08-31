import { QuizResultsData } from "@/interfaces/quiz";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface QuizResultsViewProps {
    results: QuizResultsData;
}

export const QuizResultsView = ({ results }: QuizResultsViewProps) => {
    const scorePercentage =
        results.totalPossibleScore > 0
            ? Math.round((results.score / results.totalPossibleScore) * 100)
            : 0;

    const getScoreColor = () => {
        if (scorePercentage >= 80) return "text-green-600";
        if (scorePercentage >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    const getOptionText = (
        answer: QuizResultsData["answers"][number],
        optionId: string
    ) => {
        if (answer.options) {
            const option = answer.options.find((opt) => opt.id === optionId);
            if (option) return option.text;
        }
        return optionId;
    };

    const multipleChoiceAnswers = results.answers.filter(
        (a) => a.type === "multiple-choice" || a.type === "one-choice"
    );

    const essayAnswers = results.answers.filter((a) => a.type === "essay");

    return (
        <div className='space-y-4 sm:space-y-6'>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className='text-center py-2 sm:py-4'
            >
                {/* <h3 className="text-base sm:text-xl font-semibold mb-1 sm:mb-2">Kết quả</h3> */}

                {results.totalPossibleScore > 0 ? (
                    <>
                        <div
                            className={`text-xl sm:text-3xl font-bold ${getScoreColor()}`}
                        >
                            {results.score}/{results.totalPossibleScore}
                        </div>
                        <div className='mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
                            Accuracy: {scorePercentage}%
                        </div>
                        <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-2.5 mt-3 sm:mt-4'>
                            <motion.div
                                className={`h-2 sm:h-2.5 rounded-full ${
                                    scorePercentage >= 80
                                        ? "bg-green-600 dark:bg-green-500"
                                        : scorePercentage >= 60
                                        ? "bg-yellow-500 dark:bg-yellow-400"
                                        : "bg-red-500 dark:bg-red-400"
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${scorePercentage}%` }}
                                transition={{
                                    duration: 0.8,
                                    ease: "easeOut",
                                    delay: 0.2,
                                }}
                            ></motion.div>
                        </div>
                    </>
                ) : (
                    <div className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
                        No has any multiple-choice questions to grade
                    </div>
                )}
            </motion.div>

            {/* Show message if no detailed question data available */}
            {results.answers.length === 0 && (
                <div className='mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md'>
                    <p className='text-xs sm:text-sm text-yellow-700 dark:text-yellow-400'>
                        No detailed question data available. Only total score is
                        displayed.
                    </p>
                </div>
            )}

            {multipleChoiceAnswers.length > 0 && (
                <div className='mt-4 sm:mt-8'>
                    <h4 className='text-sm sm:text-lg font-medium mb-2 sm:mb-4 text-gray-900 dark:text-white'>
                        Multiple Choice Questions
                    </h4>
                    <div className='space-y-3 sm:space-y-4'>
                        {multipleChoiceAnswers.map((answer, index) => {
                            const isCorrect =
                                answer.correctAnswers &&
                                answer.selectedOptions.length ===
                                    answer.correctAnswers.length &&
                                answer.selectedOptions.every((option) =>
                                    answer.correctAnswers?.includes(option)
                                );

                            return (
                                <motion.div
                                    key={`multiple-choice-${answer.questionId}-${index}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.3,
                                        delay: index * 0.1,
                                    }}
                                    className='border border-gray-200 dark:border-gray-700 rounded-md p-3 sm:p-4 bg-white dark:bg-gray-800'
                                >
                                    <div className='flex items-start gap-2 sm:gap-3'>
                                        {isCorrect ? (
                                            <CheckCircle className='h-4 w-4 sm:h-5 sm:w-5 text-green-500 dark:text-green-400 mt-0.5' />
                                        ) : (
                                            <XCircle className='h-4 w-4 sm:h-5 sm:w-5 text-red-500 dark:text-red-400 mt-0.5' />
                                        )}
                                        <div className='flex-1'>
                                            <h5 className='text-sm sm:text-base font-medium text-gray-900 dark:text-white'>
                                                Question {index + 1}:{" "}
                                                {answer.text}
                                            </h5>
                                            <div className='mt-2 text-xs sm:text-sm'>
                                                <div className='text-gray-500 dark:text-gray-400 mb-1'>
                                                    Selected Answer:
                                                </div>
                                                {answer.selectedOptions.length >
                                                0 ? (
                                                    <ul className='list-disc list-inside'>
                                                        {answer.selectedOptions.map(
                                                            (optionId, idx) => {
                                                                const option =
                                                                    answer.correctAnswers?.includes(
                                                                        optionId
                                                                    );
                                                                return (
                                                                    <li
                                                                        key={`selected-${answer.questionId}-${idx}-${optionId}`}
                                                                        className={
                                                                            option
                                                                                ? "text-green-600 dark:text-green-400"
                                                                                : "text-red-600 dark:text-red-400"
                                                                        }
                                                                    >
                                                                        {getOptionText(
                                                                            answer,
                                                                            optionId
                                                                        )}
                                                                    </li>
                                                                );
                                                            }
                                                        )}
                                                    </ul>
                                                ) : (
                                                    <div className='text-gray-500 dark:text-gray-400 italic'>
                                                        No answer provided
                                                    </div>
                                                )}
                                            </div>
                                            {/* {!isCorrect && answer.correctAnswers && answer.correctAnswers.length > 0 && (
                        <div className="mt-2 text-xs sm:text-sm">
                          <div className="text-gray-500 mb-1">Đáp án đúng:</div>
                          <ul className="list-disc list-inside text-green-600">
                            {answer.correctAnswers.map((optionId, idx) => (
                              <li key={`correct-${idx}-${optionId}`}>{getOptionText(answer, optionId)}</li>
                            ))}
                          </ul>
                        </div>
                      )} */}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {essayAnswers.length > 0 && (
                <div className='mt-4 sm:mt-8'>
                    <h4 className='text-sm sm:text-lg font-medium mb-2 sm:mb-4 text-gray-900 dark:text-white'>
                        Essay Questions
                    </h4>
                    <div className='space-y-3 sm:space-y-4'>
                        {essayAnswers.map((answer, index) => (
                            <motion.div
                                key={`essay-${answer.questionId}-${index}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: index * 0.1,
                                }}
                                className='border border-gray-200 dark:border-gray-700 rounded-md p-3 sm:p-4 bg-white dark:bg-gray-800'
                            >
                                <div className='flex items-start gap-2 sm:gap-3'>
                                    <AlertCircle className='h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400 mt-0.5' />
                                    <div className='flex-1'>
                                        <h5 className='text-sm sm:text-base font-medium text-gray-900 dark:text-white'>
                                            Question{" "}
                                            {multipleChoiceAnswers.length +
                                                index +
                                                1}
                                            : {answer.text}
                                        </h5>
                                        <div className='mt-2 text-xs sm:text-sm'>
                                            <div className='text-gray-500 dark:text-gray-400 mb-1'>
                                                Your answer:
                                            </div>
                                            {answer.essayAnswer ? (
                                                <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-xs sm:text-sm text-gray-900 dark:text-white'>
                                                    {answer.essayAnswer}
                                                </div>
                                            ) : (
                                                <div className='text-gray-500 dark:text-gray-400 italic'>
                                                    No answer provided
                                                </div>
                                            )}

                                            {answer.modelAnswer && (
                                                <div className='mt-2 sm:mt-3'>
                                                    <div className='text-gray-500 dark:text-gray-400 mb-1'>
                                                        Model answer:
                                                    </div>
                                                    <div className='p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700 text-xs sm:text-sm text-gray-900 dark:text-white'>
                                                        {answer.modelAnswer}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
