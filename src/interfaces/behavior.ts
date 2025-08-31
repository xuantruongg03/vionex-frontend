export enum TypeUserEvent {
    MIC = "mic",
    CAM = "cam",
    FOCUS_TAB = "focus_tab",
    ATTENTION = "attention",
    FOCUS = "focus",
    EYE_CLOSED = "eye_closed",
    EYE_OPEN = "eye_open",
}

export interface UserEvent {
    type: TypeUserEvent;
    value: boolean;
    time: Date;
    context?: {
        examMode?: boolean;
        severity?: "LOW" | "MEDIUM" | "HIGH";
        quizId?: string;
        quizTitle?: string;
    };
}
