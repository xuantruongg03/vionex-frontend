import orgService, { CreateMemberRequest } from "@/services/orgService";
import { useMutation } from "@tanstack/react-query";

const createMemberReq = async (params: CreateMemberRequest) => {
    const response = await orgService.createMember(params);
    return response;
};

const useCreateMember = () => {
    const { mutateAsync: createMember, isPending } = useMutation({
        mutationFn: (params: CreateMemberRequest) => createMemberReq(params),
    });

    return { createMember, isPending };
};

export default useCreateMember;
