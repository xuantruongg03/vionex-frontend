import orgService, { CreateOrgRoomRequest } from "@/services/orgService";
import { useMutation } from "@tanstack/react-query";

const createOrgRoomReq = async (params: CreateOrgRoomRequest) => {
    const response = await orgService.createOrgRoom(params);
    return response;
};

const useCreateRoomOrg = () => {
    const { mutateAsync: createOrgRoom, isPending } = useMutation({
        mutationFn: (params: CreateOrgRoomRequest) => createOrgRoomReq(params),
    });

    return { createOrgRoom, isPending };
};

export default useCreateRoomOrg;
