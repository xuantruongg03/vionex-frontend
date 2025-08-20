import ROUTES from "@/lib/routes";
import { loginSuccess } from "@/redux/actions/auth";
import authService from "@/services/auth";
import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

const registerReq = async (params: {
    email: string;
    password: string;
    name: string;
}) => {
    const response = await authService.register(params);
    return response;
};

const useRegister = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { mutateAsync: register, isPending } = useMutation({
        mutationFn: (params: {
            email: string;
            password: string;
            name: string;
        }) => registerReq(params),
        onSuccess: async (response) => {
            if (response.data.success) {
                // Fetch user information from server
                const userInfo = await authService.getUserInfo();
                if (userInfo.data.success) {
                    // Dispatch login success action
                    dispatch(loginSuccess(userInfo.data.user) as any);

                    toast.success("Register successful!");

                    // Redirect to the page user was trying to access, or home
                    const from =
                        (location.state as any)?.from?.pathname || ROUTES.HOME;
                    navigate(from, { replace: true });
                } else {
                    toast.error(
                        "Registration successful but failed to get user information"
                    );
                    navigate(ROUTES.AUTH);
                }
            } else {
                toast.error(response.data.message || "Register failed");
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Register failed");
        },
    });

    return { register, isPending };
};

export default useRegister;
