export interface CreateTranslationCabinRequest {
    roomId: string;
    sourceUserId: string;
    targetUserId: string;
    sourceLanguage: string;
    targetLanguage: string;
}

export interface DestroyTranslationCabinRequest {
    roomId: string;
    sourceUserId: string;
    targetUserId: string;
    sourceLanguage: string;
    targetLanguage: string;
}

export interface TranslationCabin {
    targetUserId: string;
    sourceLanguage: string;
    targetLanguage: string;
}