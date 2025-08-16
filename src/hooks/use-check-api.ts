import axiosClient from "@/apis/api-client";
import { useMutation, useQuery } from "@tanstack/react-query";

const checkApiRequest = async () => {
    const response = await axiosClient.get("/health");
    return response;
};

export function useCheckApi() {
    const { isPending, mutateAsync: checkApi, error } = useMutation({
        mutationKey: ["checkApi"],
        mutationFn: checkApiRequest,
    });

    return { isPending, checkApi, error };
}
