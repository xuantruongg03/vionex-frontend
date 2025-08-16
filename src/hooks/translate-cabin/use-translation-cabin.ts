import { useMutation } from "@tanstack/react-query";
import translationCabinService from "../../services/translationCabinService";
import { CreateTranslationCabinRequest } from "@/interfaces";

const createTranslationCabinReq = async (
    request: CreateTranslationCabinRequest
) => {
    const res = await translationCabinService.createTranslationCabin(request);
    return res;
};

export const useTranslationCabin = () => {
    const {
        mutateAsync: createTranslate,
        isPending,
        isError,
    } = useMutation({
        mutationFn: createTranslationCabinReq,
    });

    return {
        loading: isPending,
        error: isError,
        createCabin: createTranslate,
    };
};
