import { DestroyTranslationCabinRequest } from "@/interfaces";
import { useMutation } from "@tanstack/react-query";
import { useTranslationSocket } from "./use-translation-socket";

export const useDestroyCabin = (roomId: string) => {
    const { destroyTranslationCabin } = useTranslationSocket(roomId);

    const {
        mutateAsync: destroyCabin,
        isPending,
        isError,
    } = useMutation({
        mutationFn: (params: DestroyTranslationCabinRequest) => destroyTranslationCabin(params),
    });

    return {
        loading: isPending,
        error: isError,
        destroyCabin,
    };
};
