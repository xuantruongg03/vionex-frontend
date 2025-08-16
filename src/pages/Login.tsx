import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        confirmPassword: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission here
        console.log("Form submitted:", formData);
    };

    return (
        <div className='h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 dark:from-slate-900 dark:via-blue-900/30 dark:to-purple-900/30 flex items-center justify-center p-4'>
            {/* Background decoration */}
            <div className='absolute inset-0 overflow-hidden'>
                <div className='absolute -top-1/2 -right-1/2 w-96 h-96 bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-800/40 dark:to-purple-800/40 rounded-full opacity-30 animate-pulse'></div>
                <div
                    className='absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-gradient-to-tr from-purple-200 to-blue-200 dark:from-purple-800/40 dark:to-blue-800/40 rounded-full opacity-30 animate-pulse'
                    style={{ animationDelay: "1s" }}
                ></div>
            </div>

            <div className='relative w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar'>
                <Card className='backdrop-blur-sm bg-white/95 dark:bg-slate-800/95 shadow-2xl border border-blue-100 dark:border-slate-700/50 rounded-2xl'>
                    <CardHeader className='text-center pb-4'>
                        <Link
                            to='/'
                            className='inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2'
                        >
                            <ArrowLeft className='h-4 w-4' />
                            Quay lại trang chủ
                        </Link>
                        <div className='w-20 h-20 mx-auto flex items-center justify-center mb-3'>
                            <img
                                src='/src/assets/logo.png'
                                alt='Vionex Logo'
                                className='w-full h-full object-contain'
                            />
                        </div>
                        <div>
                            <CardTitle className='text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 dark:from-blue-400 dark:via-blue-300 dark:to-purple-400 bg-clip-text text-transparent'>
                                {isLogin ? "Đăng nhập" : "Đăng ký"}
                            </CardTitle>
                            <CardDescription className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                                {isLogin
                                    ? "Chào mừng bạn quay trở lại!"
                                    : "Tạo tài khoản mới để bắt đầu."}
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className='space-y-4 pt-0'>
                        <form onSubmit={handleSubmit} className='space-y-3'>
                            {!isLogin && (
                                <div className='space-y-1'>
                                    <Label htmlFor='name' className='text-sm'>
                                        Họ và tên
                                    </Label>
                                    <div className='relative'>
                                        <User className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                        <Input
                                            id='name'
                                            name='name'
                                            type='text'
                                            placeholder='Nhập họ và tên'
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className='pl-10 h-10'
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className='space-y-1'>
                                <Label htmlFor='email' className='text-sm'>
                                    Email
                                </Label>
                                <div className='relative'>
                                    <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                    <Input
                                        id='email'
                                        name='email'
                                        type='email'
                                        placeholder='Nhập địa chỉ email'
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className='pl-10 h-10'
                                        required
                                    />
                                </div>
                            </div>

                            <div className='space-y-1'>
                                <Label htmlFor='password' className='text-sm'>
                                    Mật khẩu
                                </Label>
                                <div className='relative'>
                                    <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                    <Input
                                        id='password'
                                        name='password'
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder='Nhập mật khẩu'
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className='pl-10 pr-10 h-10'
                                        required
                                    />
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        className='absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0'
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff className='h-4 w-4' />
                                        ) : (
                                            <Eye className='h-4 w-4' />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {!isLogin && (
                                <div className='space-y-1'>
                                    <Label
                                        htmlFor='confirmPassword'
                                        className='text-sm'
                                    >
                                        Xác nhận mật khẩu
                                    </Label>
                                    <div className='relative'>
                                        <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                        <Input
                                            id='confirmPassword'
                                            name='confirmPassword'
                                            type='password'
                                            placeholder='Nhập lại mật khẩu'
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className='pl-10 h-10'
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {isLogin && (
                                <div className='text-right'>
                                    <Button
                                        variant='link'
                                        className='p-0 h-auto text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                                    >
                                        Quên mật khẩu?
                                    </Button>
                                </div>
                            )}

                            <Button
                                type='submit'
                                className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-10'
                            >
                                {isLogin ? "Đăng nhập" : "Đăng ký"}
                            </Button>
                        </form>

                        <div className='relative py-2'>
                            <Separator />
                            <span className='absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 px-2 text-xs text-muted-foreground'>
                                HOẶC
                            </span>
                        </div>

                        <Button
                            variant='outline'
                            className='w-full h-10 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/50 dark:hover:to-purple-950/50 transition-all duration-200'
                        >
                            <svg className='w-4 h-4 mr-2' viewBox='0 0 24 24'>
                                <path
                                    fill='currentColor'
                                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                                />
                                <path
                                    fill='currentColor'
                                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                                />
                                <path
                                    fill='currentColor'
                                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                                />
                                <path
                                    fill='currentColor'
                                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                                />
                            </svg>
                            Tiếp tục với Google
                        </Button>

                        <div className='text-center text-sm'>
                            <span className='text-muted-foreground'>
                                {isLogin
                                    ? "Chưa có tài khoản?"
                                    : "Đã có tài khoản?"}
                            </span>
                            <Button
                                variant='link'
                                className='p-0 h-auto ml-1 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                                onClick={() => setIsLogin(!isLogin)}
                            >
                                {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Login;
