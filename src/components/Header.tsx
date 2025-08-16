import { Button } from "@/components/ui/button";
import ROUTES from "@/lib/routes";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ModeToggle } from "./mode-toggle";

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    const navItems = [
        { name: "Home", path: ROUTES.HOME },
        { name: "Features", path: ROUTES.FEATURES },
        { name: "Pricing", path: ROUTES.PRICING },
        // { name: "About", path: ROUTES.ABOUT },
        { name: "Contact", path: ROUTES.CONTACT },
    ];

    const isActive = (path: string) => location.pathname === path;
    return (
        <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                    >
                        <img
                            src="src/assets/logo.png"
                            alt="Vionext Logo"
                            className="h-14 w-14"
                        />
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Vionex
                        </span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`text-sm font-medium transition-colors relative ${
                                    isActive(item.path)
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                                }`}
                            >
                                {item.name}{" "}
                                {isActive(item.path) && (
                                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                                )}
                            </Link>
                        ))}
                    </nav>
                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <ModeToggle />
                        <Button variant="outline" size="sm" asChild>
                            <Link to={ROUTES.LOGIN}>Login</Link>
                        </Button>
                        <Button
                            size="sm"
                            asChild
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            <Link to={ROUTES.ROOM}>Join Room</Link>
                        </Button>
                    </div>
                    {/* Mobile menu button */}{" "}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        {isMenuOpen ? (
                            <X className="h-6 w-6" />
                        ) : (
                            <Menu className="h-6 w-6" />
                        )}
                    </button>
                </div>
                {/* Mobile Navigation */}{" "}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800 animate-fade-in">
                        <nav className="flex flex-col space-y-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
                                        isActive(item.path)
                                            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950"
                                            : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <div className="flex flex-col space-y-2 px-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                                <ModeToggle />
                                <Button variant="outline" size="sm" asChild>
                                    <Link to="/call">Join Meeting</Link>
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                                    asChild
                                >
                                    <Link to="/call">Start Meeting</Link>
                                </Button>
                            </div>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
