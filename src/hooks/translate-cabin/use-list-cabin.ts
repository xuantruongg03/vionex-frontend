import { TranslationCabin } from "@/interfaces";
import translationCabinService from "@/services/translationCabinService";
import { useQuery } from "@tanstack/react-query";

export const useListCabin = (roomId: string, userId: string) => {
    const {
        data: cabins = [],
        isLoading: loading,
        isError: error,
        refetch,
    } = useQuery({
        queryKey: ["translation-cabins", roomId, userId],
        queryFn: () =>
            translationCabinService.getListTranslationCabin({ roomId, userId }),
        enabled: !!(roomId && userId),
    });

    return {
        cabins: cabins as TranslationCabin[],
        loading,
        error,
        refetch,
    };
};
