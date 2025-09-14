import { TranslationCabin } from "@/interfaces";
import { useQuery } from "@tanstack/react-query";
import { useTranslationSocket } from "./use-translation-socket";

export const useListCabin = (roomId: string, userId: string) => {
    const { listTranslationCabins } = useTranslationSocket(roomId);

    const {
        data: cabins = [],
        isLoading: loading,
        isError: error,
        refetch,
    } = useQuery<TranslationCabin[]>({
        queryKey: ["translation-cabins", roomId, userId],
        queryFn: () => listTranslationCabins({ roomId, userId }),
        enabled: !!(roomId && userId),
        // refetchInterval: 10000, // Refetch every 10 seconds
    });

    return {
        cabins,
        loading,
        error,
        refetch,
    };
};
