import authService from "@/services/auth";
import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/redux/actions/auth";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import ROUTES from "@/lib/routes";

const loginReq = async (params: {
    email: string;
    name: string;
    avatar?: string;
    googleId: string;
}) => {
    const response = await authService.loginGoogle(params);
    return response;
};

const useGoogleLogin = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { mutateAsync: googleLogin, isPending } = useMutation({
        mutationFn: (params: {
            email: string;
            name: string;
            avatar?: string;
            googleId: string;
        }) => loginReq(params),
        onSuccess: async (response) => {
            if (response.data.success) {
                // Fetch user information from server
                const userInfo = await authService.getUserInfo();
                if (userInfo.data.success) {
                    // Dispatch login success action
                    dispatch(loginSuccess(userInfo.data.user) as any);

                    toast.success("Google login successful!");

                    // Redirect to the page user was trying to access, or home
                    const from =
                        (location.state as any)?.from?.pathname || ROUTES.HOME;
                    navigate(from, { replace: true });
                } else {
                    toast.error("Failed to get user information");
                }
            } else {
                toast.error(response.data.message || "Google login failed");
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Google login failed");
        },
    });

    return { googleLogin, isPending };
};

export default useGoogleLogin;
