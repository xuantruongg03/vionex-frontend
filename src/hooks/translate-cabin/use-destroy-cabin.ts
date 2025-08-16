import { DestroyTranslationCabinRequest } from "@/interfaces";
import translationCabinService from "@/services/translationCabinService";
import { useMutation } from "@tanstack/react-query";

const destroyCabinReq = async (
    request: DestroyTranslationCabinRequest
) => {
    const res = await translationCabinService.destroyTranslationCabin(request);
    return res;
};

export const useDestroyCabin = () => {
    const {
        mutateAsync: destroyCabin,
        isPending,
        isError,
    } = useMutation({
        mutationFn: (params: DestroyTranslationCabinRequest) => destroyCabinReq(params),
    });

    return {
        loading: isPending,
        error: isError,
        destroyCabin,
    };
};
