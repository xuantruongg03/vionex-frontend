import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import useLogin from "@/hooks/auth/use-login";
import useRegister from "@/hooks/auth/use-register";
import useGoogleLogin from "@/hooks/auth/use-google-login";
import { GoogleOAuthProvider, useGoogleLogin as useGoogleOAuth } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Component con để sử dụng useGoogleLogin hook bên trong GoogleOAuthProvider
const GoogleLoginButton = ({ isLogin, isGoogleLoggingIn, onGoogleLogin }: { isLogin: boolean; isGoogleLoggingIn: boolean; onGoogleLogin: (userInfo: any) => void }) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Custom Google login function with select_account prompt
    const handleGoogleLogin = () => {
        const google = (window as any).google;
        if (google) {
            google.accounts.oauth2
                .initTokenClient({
                    client_id: clientId,
                    scope: "openid email profile",
                    prompt: "select_account", // Luôn hiện màn hình chọn tài khoản
                    callback: async (response: any) => {
                        try {
                            // Lấy thông tin người dùng từ Google
                            const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${response.access_token}`, {
                                headers: {
                                    Authorization: `Bearer ${response.access_token}`,
                                    Accept: "application/json",
                                },
                            });

                            const userInfo = await userInfoResponse.json();
                            onGoogleLogin(userInfo);
                        } catch (error) {
                            console.error("Google login error:", error);
                            toast.error("Google login failed");
                        }
                    },
                })
                .requestAccessToken();
        } else {
            toast.error("Google OAuth not loaded");
        }
    };

    return (
        <Button type='button' variant='outline' className='w-full h-12 google-login-custom border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 font-roboto' onClick={handleGoogleLogin} disabled={isGoogleLoggingIn}>
            <div className='flex items-center justify-center gap-3'>
                <svg className='w-5 h-5 flex-shrink-0' viewBox='0 0 24 24'>
                    <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
                    <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                    <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                    <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
                </svg>
                <span className='font-medium text-gray-700 dark:text-gray-200 text-sm'>{isGoogleLoggingIn ? "Signing in..." : `${isLogin ? "Sign in" : "Sign up"} with Google`}</span>
            </div>
        </Button>
    );
};

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        confirmPassword: "",
    });
    const { login, isPending: isLoggingIn } = useLogin();
    const { register, isPending: isRegistering } = useRegister();
    const { googleLogin, isPending: isGoogleLoggingIn } = useGoogleLogin();

    // Handler để xử lý thông tin từ Google
    const handleGoogleLogin = async (userInfo: any) => {
        try {
            await googleLogin({
                email: userInfo.email,
                name: userInfo.name,
                avatar: userInfo.picture,
                googleId: userInfo.id,
            });
        } catch (error) {
            console.error("Google login error:", error);
            toast.error("Google login failed");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLogin) {
            login({
                email: formData.email,
                password: formData.password,
            });
        } else {
            if (formData.password !== formData.confirmPassword) {
                alert("Passwords do not match!");
                return;
            }
            register({
                name: formData.name,
                email: formData.email,
                password: formData.password,
            });
        }
    };

    return (
        <GoogleOAuthProvider clientId={clientId} onScriptLoadError={() => console.error("Google OAuth script load error")} onScriptLoadSuccess={() => console.log("Google OAuth script loaded successfully")}>
            <div className='h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 dark:from-slate-900 dark:via-blue-900/30 dark:to-purple-900/30 flex items-center justify-center p-4'>
                {/* Background decoration */}
                <div className='absolute inset-0 overflow-hidden'>
                    <div className='absolute -top-1/2 -right-1/2 w-96 h-96 bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-800/40 dark:to-purple-800/40 rounded-full opacity-30 animate-pulse'></div>
                    <div className='absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-gradient-to-tr from-purple-200 to-blue-200 dark:from-purple-800/40 dark:to-blue-800/40 rounded-full opacity-30 animate-pulse' style={{ animationDelay: "1s" }}></div>
                </div>

                <div className='relative w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar'>
                    <Card className='backdrop-blur-sm bg-white/95 dark:bg-slate-800/95 shadow-2xl border border-blue-100 dark:border-slate-700/50 rounded-2xl'>
                        <CardHeader className='text-center pb-4'>
                            <Link to='/' className='inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2'>
                                <ArrowLeft className='h-4 w-4' />
                                Back to Home
                            </Link>
                            <div className='w-20 h-20 mx-auto flex items-center justify-center mb-3'>
                                <img src='/logo.png' alt='Vionex Logo' className='w-full h-full object-contain' />
                            </div>
                            <div>
                                <CardTitle className='text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 dark:from-blue-400 dark:via-blue-300 dark:to-purple-400 bg-clip-text text-transparent'>{isLogin ? "Sign In" : "Sign Up"}</CardTitle>
                                <CardDescription className='mt-2 text-sm text-gray-600 dark:text-gray-300'>{isLogin ? "Welcome back!" : "Create a new account to get started."}</CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className='space-y-4 pt-0'>
                            <form onSubmit={handleSubmit} className='space-y-3'>
                                {!isLogin && (
                                    <div className='space-y-1'>
                                        <Label htmlFor='name' className='text-sm'>
                                            Full Name
                                        </Label>
                                        <div className='relative'>
                                            <User className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                            <Input id='name' name='name' type='text' placeholder='Enter your full name' value={formData.name} onChange={handleInputChange} className='pl-10 h-10' required />
                                        </div>
                                    </div>
                                )}

                                <div className='space-y-1'>
                                    <Label htmlFor='email' className='text-sm'>
                                        Email
                                    </Label>
                                    <div className='relative'>
                                        <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                        <Input id='email' name='email' type='email' placeholder='Enter your email address' value={formData.email} onChange={handleInputChange} className='pl-10 h-10' required />
                                    </div>
                                </div>

                                <div className='space-y-1'>
                                    <Label htmlFor='password' className='text-sm'>
                                        Password
                                    </Label>
                                    <div className='relative'>
                                        <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                        <Input id='password' name='password' type={showPassword ? "text" : "password"} placeholder='Enter your password' value={formData.password} onChange={handleInputChange} className='pl-10 pr-10 h-10' required />
                                        <Button type='button' variant='ghost' size='sm' className='absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0' onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                                        </Button>
                                    </div>
                                </div>

                                {!isLogin && (
                                    <div className='space-y-1'>
                                        <Label htmlFor='confirmPassword' className='text-sm'>
                                            Confirm Password
                                        </Label>
                                        <div className='relative'>
                                            <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                            <Input id='confirmPassword' name='confirmPassword' type='password' placeholder='Confirm your password' value={formData.confirmPassword} onChange={handleInputChange} className='pl-10 h-10' required />
                                        </div>
                                    </div>
                                )}

                                {isLogin && (
                                    <div className='text-right'>
                                        <Button variant='link' className='p-0 h-auto text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'>
                                            Forgot password?
                                        </Button>
                                    </div>
                                )}

                                <Button type='submit' disabled={isLoggingIn || isRegistering || isGoogleLoggingIn} className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-10'>
                                    {isLoggingIn || isRegistering ? <>Loading...</> : <>{isLogin ? "Sign In" : "Sign Up"}</>}
                                </Button>
                            </form>

                            <div className='relative py-2'>
                                <Separator />
                                <span className='absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 px-2 text-xs text-muted-foreground'>OR</span>
                            </div>

                            <div className='w-full'>
                                <GoogleLoginButton isLogin={isLogin} isGoogleLoggingIn={isGoogleLoggingIn} onGoogleLogin={handleGoogleLogin} />
                            </div>

                            <div className='text-center text-sm'>
                                <span className='text-muted-foreground'>{isLogin ? "Not a member?" : "Already have an account?"}</span>
                                <Button variant='link' className='p-0 h-auto ml-1 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300' onClick={() => setIsLogin(!isLogin)}>
                                    {isLogin ? "Sign Up" : "Sign In"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};

export default Auth;
