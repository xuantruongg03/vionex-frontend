import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/redux/actions/auth";
import authService from "@/services/auth";

const useAuthRestore = () => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const restoreAuth = async () => {
            try {
                setIsLoading(true);
                const accessToken = localStorage.getItem("accessToken");
                const refreshToken = localStorage.getItem("refreshToken");

                if (accessToken && refreshToken) {
                    // Verify token is still valid by getting user info
                    const userInfo = await authService.getUserInfo();
                    if (userInfo.data.success) {
                        dispatch(loginSuccess(userInfo.data.user) as any);
                        setIsAuthenticated(true);
                    } else {
                        // Clear invalid tokens
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem("refreshToken");
                        setIsAuthenticated(false);
                    }
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error) {
                // Clear tokens on error
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        restoreAuth();
    }, [dispatch]);

    return { isLoading, isAuthenticated };
};

export default useAuthRestore;
