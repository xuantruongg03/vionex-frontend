import authService from "@/services/auth";
import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/redux/actions/auth";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import ROUTES from "@/lib/routes";

const loginReq = async (params: { email: string; password: string }) => {
    const response = await authService.login(params);
    return response;
};

const useLogin = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { mutateAsync: login, isPending } = useMutation({
        mutationFn: (params: { email: string; password: string }) =>
            loginReq(params),
        onSuccess: async (response) => {
            if (response.data.success) {
                // Fetch user information from server
                const userInfo = await authService.getUserInfo();
                if (userInfo.data.success) {
                    // Dispatch login success action
                    dispatch(loginSuccess(userInfo.data.user) as any);

                    toast.success("Login successful!");

                    // Redirect to the page user was trying to access, or home
                    const from =
                        (location.state as any)?.from?.pathname || ROUTES.HOME;
                    navigate(from, { replace: true });
                } else {
                    toast.error("Failed to get user information");
                }
            } else {
                toast.error(response.data.message || "Login failed");
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Login failed");
        },
    });

    return { login, isPending };
};

export default useLogin;
