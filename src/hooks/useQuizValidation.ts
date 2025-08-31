import { useCallback } from "react";
import { toast } from "sonner";

export const useQuizValidation = () => {
    const validateQuizAccess = useCallback(
        (
            value: string,
            activeTab: string,
            activeQuiz: any,
            user: any,
            isQuizInProgress: boolean,
            hasSubmittedQuiz: boolean,
            quizResults: any
        ) => {
            const isQuizCreator = activeQuiz?.creatorId === user.username;

            // Prevent tab switching during quiz
            if (
                isQuizInProgress &&
                !isQuizCreator &&
                value !== activeTab &&
                value !== "results"
            ) {
                toast.error("Cannot switch tabs while quiz is in progress");
                return false;
            }

            // Prevent non-creators from accessing create tab
            if (!user.isCreator && value === "create") {
                toast.error("Only the organizer can create quizzes");
                return false;
            }

            // Prevent accessing take tab when no quiz or already submitted
            if (!activeQuiz && value === "take") {
                toast.error("No quiz has been created");
                return false;
            }

            if (hasSubmittedQuiz && value === "take" && !isQuizCreator) {
                toast.error("You have submitted the quiz and cannot retake it");
                return false;
            }

            // Prevent creating new quiz when one is active
            if (activeQuiz && value === "create" && isQuizCreator) {
                toast.error(
                    "There is an ongoing quiz. Please end the current quiz first"
                );
                return false;
            }

            // Prevent accessing results when no results available
            if (
                !quizResults &&
                !(isQuizCreator && activeQuiz) &&
                value === "results"
            ) {
                toast.error("No quiz results available");
                return false;
            }

            return true;
        },
        []
    );

    return { validateQuizAccess };
};
