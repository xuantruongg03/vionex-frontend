import ROUTES from "@/lib/routes";
import { Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <footer className="bg-gray-900 dark:bg-gray-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <Link
                            to="/"
                            className="flex items-center space-x-2 mb-4"
                        >
                            <img
                                src="src/assets/logo.png"
                                alt="Vionext Logo"
                                className="h-14 w-14"
                            />
                            <span className="text-xl font-bold">Vionex</span>
                        </Link>{" "}
                        <p className="text-gray-400 dark:text-gray-500 mb-4 max-w-md">
                            Connect with anyone, anywhere. Vionex makes video
                            conferencing simple, secure, and accessible for
                            teams of all sizes.
                        </p>
                        <div className="flex space-x-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-400 dark:text-gray-500">
                                <Mail className="h-4 w-4" />
                                <span>support@vionex.com</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-400 dark:text-gray-500">
                                <Phone className="h-4 w-4" />
                                <span>+84 981 793 201</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">
                            Quick Links
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                {" "}
                                <Link
                                    to={ROUTES.HOME}
                                    className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                                >
                                    Home
                                </Link>
                            </li>
                            <li>
                                {" "}
                                <Link
                                    to={ROUTES.FEATURES}
                                    className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                                >
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to={ROUTES.PRICING}
                                    className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                                >
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to={ROUTES.ABOUT}
                                    className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                                >
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to={ROUTES.CONTACT}
                                    className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                                >
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Support</h3>
                        <ul className="space-y-2">
                            {" "}
                            <li>
                                <a
                                    href="#"
                                    className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                                >
                                    Help Center
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                                >
                                    Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                                >
                                    Terms of Service
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>{" "}
                <div className="border-t border-gray-800 dark:border-gray-700 mt-8 pt-8 text-center text-gray-400 dark:text-gray-500">
                    <p>&copy; 2025 Vionex. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
