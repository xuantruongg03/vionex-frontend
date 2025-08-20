import orgService, { CreateOrganizationRequest } from "@/services/orgService";
import { useMutation } from "@tanstack/react-query";

const createOrgReq = async (params: CreateOrganizationRequest) => {
    const response = await orgService.createOrganization(params);
    return response;
};

const useCreateOrg = () => {
    const { mutateAsync: createOrg, isPending } = useMutation({
        mutationFn: (params: CreateOrganizationRequest) => createOrgReq(params),
    });

    return { createOrg, isPending };
};

export default useCreateOrg;
