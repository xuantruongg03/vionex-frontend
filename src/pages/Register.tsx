import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Register = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // const { register, isAuthenticated } = useAuth();

    // if (isAuthenticated) {
    //   return <Navigate to="/room" />;
    // }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // register(email, password);
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                    Đăng ký
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full">
                        Đăng ký
                    </Button>
                </form>
                <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                    Đã có tài khoản?{" "}
                    <Link
                        to="/login"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
