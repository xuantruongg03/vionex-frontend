import orgService from "@/services/orgService";
import { useMutation } from "@tanstack/react-query";

const removeMemberReq = async (params: {memberId: string}) => {
    const res = await orgService.removeMember(params.memberId);
    return res;
}

const useRemoveMember = () => {
    const { mutateAsync: removeMember, isPending } = useMutation({
        mutationFn: (params: {memberId: string}) => removeMemberReq(params),
    })

    return { removeMember, isPending };
};

export default useRemoveMember;