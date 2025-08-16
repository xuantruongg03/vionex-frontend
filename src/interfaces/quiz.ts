interface QuizSidebarProps {
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface QuizOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface QuizQuestion {
    id: string;
    text: string;
    type: "multiple-choice" | "essay" | "one-choice";
    options?: QuizOption[];
    correctAnswers?: string[];
    answer?: string;
}

interface QuizSession {
    id: string;
    creatorId: string;
    title: string;
    questions: QuizQuestion[];
    isActive: boolean;
    createdAt: Date;
    roomId?: string;
    endedAt?: Date;
}

interface QuizResultsData {
    quizId: string;
    score: number;
    totalPossibleScore: number;
    startedAt: Date;
    finishedAt: Date;
    answers: {
        questionId: string;
        text: string;
        type: "multiple-choice" | "essay" | "one-choice";
        correctAnswers?: string[];
        selectedOptions: string[];
        essayAnswer: string;
        modelAnswer: string;
        options?: QuizOption[];
    }[];
}

interface QuizSubmission {
    roomId: string;
    quizId: string;
    participantId: string;
    answers: Array<{
        questionId: string;
        selectedOptions: string[];
        essayAnswer: string;
    }>;
}

interface QuizResult {
    totalScore: number;
    totalPossibleScore: number;
    questionResults: Array<{
        questionId: string;
        isCorrect: boolean;
        pointsEarned: number;
        correctAnswers: string[];
    }>;
}

interface QuizTakingViewProps {
    roomId: string;
    username: string;
    quiz: QuizSession;
    onComplete: (results: QuizResultsData) => void;
}

interface QuizParticipantResponse {
    participantId: string;
    quizId: string;
    questions: {
        questionId: string;
        type: 'multiple-choice' | 'essay' | 'one-choice';
        selectedOptions?: string[];
        essayAnswer?: string;
    }[];
  } 

export type {
    QuizSidebarProps,
    QuizOption,
    QuizQuestion,
    QuizSession,
    QuizResultsData,
    QuizTakingViewProps,
    QuizSubmission,
    QuizResult,
    QuizParticipantResponse
};
