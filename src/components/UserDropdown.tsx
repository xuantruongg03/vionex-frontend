import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useLogout from "@/hooks/auth/use-logout";
import { ActionAuthType } from "@/interfaces/action";
import ROUTES from "@/lib/routes";
import {
    Building,
    ChevronDown,
    Edit,
    Key,
    LogOut,
    Settings,
    Shield,
    User,
} from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface RootState {
    auth: {
        isAuthenticated: boolean;
        user: {
            id: string;
            email: string;
            name: string;
            avatar?: string;
        } | null;
    };
}

const UserDropdown = () => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useSelector(
        (state: RootState) => state.auth
    );
    const { logout, isPending } = useLogout();

    if (!isAuthenticated || !user) {
        return (
            <Button variant='outline' size='sm' asChild>
                <a href={ROUTES.AUTH}>Sign In</a>
            </Button>
        );
    }

    const handleLogout = async () => {
        setIsLoggingOut(true);
        // await authService.logout();
        await logout().then((res) => {
            if (res.data.success) {
                // Clear localStorage
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");

                // Dispatch logout action
                dispatch({
                    type: ActionAuthType.LOGOUT,
                });

                toast.success("Logout successful!");
                navigate(ROUTES.HOME);
            }
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant='ghost'
                    className='flex items-center space-x-2 h-auto p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                >
                    <Avatar className='h-8 w-8'>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className='bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium'>
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className='hidden md:flex flex-col items-start'>
                        <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {user.name}
                        </span>
                        <span className='text-xs text-gray-500 dark:text-gray-400'>
                            {user.email}
                        </span>
                    </div>
                    <ChevronDown className='h-4 w-4 text-gray-500 dark:text-gray-400' />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align='end'
                className='w-64 mt-2'
                sideOffset={8}
            >
                {/* User Info Header */}
                <div className='flex items-center space-x-3 p-3 border-b border-gray-200 dark:border-gray-700'>
                    <Avatar className='h-10 w-10'>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className='bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium'>
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                            {user.name}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                            {user.email}
                        </p>
                    </div>
                </div>

                {/* Menu Items */}
                <DropdownMenuItem
                    className='cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800'
                    onClick={() => navigate(ROUTES.ORGANIZATION)}
                >
                    <Building className='mr-2 h-4 w-4' />
                    <span>Organization</span>
                </DropdownMenuItem>

                <DropdownMenuItem className='cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800'>
                    <User className='mr-2 h-4 w-4' />
                    <span>Thông tin cá nhân</span>
                </DropdownMenuItem>

                <DropdownMenuItem className='cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800'>
                    <Shield className='mr-2 h-4 w-4' />
                    <span>Quản lý tài khoản</span>
                </DropdownMenuItem>

                <DropdownMenuItem className='cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800'>
                    <Key className='mr-2 h-4 w-4' />
                    <span>Đổi mật khẩu</span>
                </DropdownMenuItem>

                <DropdownMenuItem className='cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800'>
                    <Edit className='mr-2 h-4 w-4' />
                    <span>Cập nhật thông tin</span>
                </DropdownMenuItem>

                <DropdownMenuItem className='cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800'>
                    <Settings className='mr-2 h-4 w-4' />
                    <span>Cài đặt</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className='cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/20 focus:text-red-700 dark:focus:text-red-300'
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    <LogOut className='mr-2 h-4 w-4' />
                    <span>
                        {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                    </span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserDropdown;
