import { useMutation } from "@tanstack/react-query";
import { CreateTranslationCabinRequest } from "@/interfaces";
import { useTranslationSocket } from "./use-translation-socket";

export const useTranslationCabin = (roomId: string) => {
    const { createTranslationCabin } = useTranslationSocket(roomId);

    const {
        mutateAsync: createCabin,
        isPending,
        isError,
    } = useMutation({
        mutationFn: (request: CreateTranslationCabinRequest) => createTranslationCabin(request),
    });

    return {
        loading: isPending,
        error: isError,
        createCabin,
    };
};
