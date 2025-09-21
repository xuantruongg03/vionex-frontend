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
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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

    // Google OAuth success handler
    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            const decoded: any = jwtDecode(credentialResponse.credential);

            await googleLogin({
                email: decoded.email,
                name: decoded.name,
                avatar: decoded.picture,
                googleId: decoded.sub,
            });
        } catch (error) {
            console.error("Google login error:", error);
        }
    };

    const handleGoogleError = () => {
        toast.error("Google login failed");
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
        <GoogleOAuthProvider clientId={clientId}>
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
                                {/* Use GoogleLogin directly with custom container */}
                                <div className='google-login-container w-full'>
                                    <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} theme='outline' size='large' width='100%' text='signin_with' shape='rectangular' logo_alignment='left' useOneTap={false} />
                                </div>
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
