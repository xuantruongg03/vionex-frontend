import authService from "@/services/auth";
import { useMutation } from "@tanstack/react-query";

const logoutReq = async () => {
    const resp = await authService.logout();
    return resp;
}

const useLogout = () => {
    const { mutateAsync: logout, isPending } = useMutation({
        mutationFn: logoutReq,
    });

    return { logout, isPending };
};

export default useLogout;