import axiosClient from "@/apis/api-client";
import { CreateTranslationCabinRequest, DestroyTranslationCabinRequest, TranslationCabin } from "@/interfaces";

/*!
 * TranslationCabinService.ts
 * This service handles operations related to translation cabins.
 */

const createTranslationCabin = async (
    request: CreateTranslationCabinRequest
): Promise<{ streamId: string }> => {
    try {
        const response = await axiosClient.post(`/translation-cabin`, request);
        return response.data;
    } catch (error) {
        console.error("[TranslationCabinService] Create cabin error:", error);
        throw error;
    }
};

const destroyTranslationCabin = async (
    request: DestroyTranslationCabinRequest
): Promise<void> => {
    try {
        const res = await axiosClient.post(`/destroy-translation-cabin`, { data: request });
        return res.data;
    } catch (error) {
        console.error("[TranslationCabinService] Destroy cabin error:", error);
        throw error;
    }
};

const getListTranslationCabin = async (
    params: { roomId: string; userId: string; }
): Promise<TranslationCabin[]>  => {
    try {
        const res = await axiosClient.get(`/list-translation-cabin?roomId=${params.roomId}&userId=${params.userId}`);
        return res.data;
    } catch (error) {
        console.error("[TranslationCabinService] List cabin error:", error);
        throw error;
    }
};

const cabinService = {
    createTranslationCabin,
    destroyTranslationCabin,
    getListTranslationCabin
};

export default cabinService;
