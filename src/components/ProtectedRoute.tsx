import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAuth?: boolean; // true = cần đăng nhập, false = không cần đăng nhập (trang auth)
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireAuth = true,
}) => {
    const { isAuthenticated, user } = useSelector((state: any) => state.auth);

    // Nếu trang yêu cầu đăng nhập
    if (requireAuth) {
        if (!isAuthenticated || !user) {
            return <Navigate to='/auth' replace />;
        }
        return <>{children}</>;
    }

    // Nếu trang không yêu cầu đăng nhập (trang auth)
    if (isAuthenticated && user) {
        return <Navigate to='/' replace />; // redirect về trang chính
    }

    return <>{children}</>;
};

export default ProtectedRoute;
