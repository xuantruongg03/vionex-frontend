import orgService from "@/services/orgService";
import { useMutation } from "@tanstack/react-query";

const verifyOrgRoomAccessReq = async (roomId: string) => {
    const response = await orgService.verifyOrgRoomAccess(roomId);
    return response;
};

const useVerifyOrgRoomAccess = () => {
    const mutation = useMutation({
        mutationFn: verifyOrgRoomAccessReq,
        retry: 1,
    });

    const verifyAccess = async (roomId: string) => {
        return await mutation.mutateAsync(roomId);
    };

    return {
        verifyAccess,
        isLoading: mutation.isPending,
        error: mutation.error,
        isError: mutation.isError,
        reset: mutation.reset,
    };
};

export default useVerifyOrgRoomAccess;
