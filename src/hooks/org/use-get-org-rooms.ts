import orgService from "@/services/orgService";
import { useQuery } from "@tanstack/react-query";

const getOrgRoomsReq = async () => {
    const response = await orgService.getOrgRooms();
    return response;
};

const useGetOrgRooms = (enabled: boolean = true) => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["org-rooms"],
        queryFn: getOrgRoomsReq,
        enabled: enabled,
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return { data, isLoading, error, refetch };
};

export default useGetOrgRooms;
