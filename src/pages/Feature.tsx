import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ROUTES from "@/lib/routes";
import { motion } from "framer-motion";
import {
    BarChart3,
    Bot,
    Cloud,
    Download,
    Headphones,
    Lock,
    MessageSquare,
    Monitor,
    Settings,
    Shield,
    Speaker,
    Users,
    Video,
    Zap,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const Features = () => {
    const coreFeatures = [
        {
            icon: Video,
            title: "HD Video Quality",
            description:
                "Crystal clear video calls with up to 4K resolution and adaptive quality based on your connection.",
            features: [
                "4K resolution support",
                "Adaptive streaming",
                "Bandwidth optimization",
                "Auto quality adjustment",
            ],
        },
        {
            icon: Users,
            title: "Unlimited Participants",
            description:
                "Host meetings with unlimited participants. Scale from intimate 1-on-1s to massive webinars.",
            features: [
                "No participant limits",
                "Breakout rooms",
                "Waiting room controls",
                "Advanced moderation",
            ],
        },
        {
            icon: Shield,
            title: "Enterprise Security",
            description:
                "Military-grade encryption and comprehensive security features to protect your conversations.",
            features: [
                "End-to-end encryption",
                "Secure data centers",
                "Access controls",
                "Compliance ready",
            ],
        },
        {
            icon: Zap,
            title: "Instant Setup",
            description:
                "Join or start meetings instantly with no downloads, accounts, or complex setup required.",
            features: [
                "Browser-based",
                "One-click join",
                "Guest access",
                "Quick scheduling",
            ],
        },
    ];

    const advancedFeatures = [
        {
            icon: Monitor,
            title: "Screen Sharing",
            description:
                "Share your entire screen, specific applications, or browser tabs with perfect clarity.",
            badge: "Popular",
        },
        {
            icon: MessageSquare,
            title: "Live Chat",
            description:
                "Built-in messaging with file sharing, emojis, and private messaging capabilities.",
            badge: "Popular",
        },
        {
            icon: Download,
            title: "Recording & Playback",
            description:
                "Record meetings in HD with automatic transcription and easy sharing options.",
            badge: "Pro",
        },
        {
            icon: Lock,
            title: "Meeting Passwords",
            description:
                "Secure your meetings with passwords, waiting rooms, and advanced access controls.",
            badge: "Security",
        },
        {
            icon: Cloud,
            title: "Cloud Storage",
            description:
                "Automatic cloud storage for recordings, shared files, and meeting transcripts.",
            badge: "Pro",
        },
        {
            icon: Headphones,
            title: "Noise Cancellation",
            description:
                "AI-powered noise cancellation to eliminate background noise and improve audio quality.",
            badge: "AI",
        },
        {
            icon: Settings,
            title: "Custom Backgrounds",
            description:
                "Virtual backgrounds, blur effects, and brand customization for professional meetings.",
            badge: "Premium",
        },
        {
            icon: BarChart3,
            title: "Quiz & Voting",
            description:
                "Engage participants with interactive polls, quizzes, and voting features during meetings.",
            badge: "Business",
        },
        {
            icon: Bot,
            title: "AI Integration",
            description:
                "Leverage AI for meeting summaries, action item extraction, and smart scheduling.",
            badge: "AI",
        },
        {
            icon: Speaker,
            title: "Translate Real-time voice",
            description:
                "Leverage AI for real-time voice translation and transcription during meetings.",
            badge: "AI",
        },
    ];

    const integrations = [
        { name: "Slack", logo: "🔗" },
        { name: "Microsoft Teams", logo: "📊" },
        { name: "Google Workspace", logo: "📧" },
        { name: "Zoom", logo: "📹" },
        { name: "Salesforce", logo: "💼" },
        { name: "Trello", logo: "📋" },
        { name: "Asana", logo: "✅" },
        { name: "Notion", logo: "📝" },
    ];

    const getBadgeVariant = (badge: string) => {
        switch (badge.toLowerCase()) {
            case "new":
                return "default";
            case "popular":
                return "secondary";
            case "pro":
            case "premium":
            case "business":
                return "outline";
            case "security":
                return "destructive";
            case "ai":
                return "default";
            default:
                return "secondary";
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <motion.div
            className="min-h-screen bg-white dark:bg-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
        >
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 py-20">
                <motion.div
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <motion.h1
                        className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        Powerful{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Features
                        </span>
                    </motion.h1>
                    <motion.p
                        className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        Everything you need for seamless video communication.
                        From basic calls to enterprise-grade features, Vionex
                        has you covered.
                    </motion.p>

                    <motion.div
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                    >
                        <Button
                            size="lg"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            asChild
                        >
                            <Link to={ROUTES.ROOM}>Try It Free</Link>
                        </Button>{" "}
                        <Button size="lg" variant="outline" asChild>
                            <Link to={ROUTES.PRICING}>View Pricing</Link>
                        </Button>
                    </motion.div>
                </motion.div>
            </section>{" "}
            {/* Core Features */}
            <section className="py-20 bg-white dark:bg-gray-900">
                <motion.div
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        {" "}
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Core Features
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            The foundation of great video communication, built
                            into every Vionex experience.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {coreFeatures.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.6,
                                    delay: index * 0.1,
                                }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <Card className="hover:shadow-lg transition-shadow duration-300 hover-scale">
                                    <CardContent className="p-8">
                                        <div className="flex items-start space-x-4">
                                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <feature.icon className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                {" "}
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                                    {feature.title}
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                                    {feature.description}
                                                </p>
                                                <ul className="space-y-1">
                                                    {feature.features.map(
                                                        (feat, featIndex) => (
                                                            <li
                                                                key={featIndex}
                                                                className="text-sm text-gray-500 dark:text-gray-400 flex items-center"
                                                            >
                                                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                                                                {feat}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </section>{" "}
            {/* Advanced Features */}
            <section className="py-20 bg-gray-50 dark:bg-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        {" "}
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Advanced Capabilities
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            Professional tools and enterprise features to
                            elevate your video communication experience.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {advancedFeatures.map((feature, index) => (
                            <Card
                                key={index}
                                className="hover:shadow-lg transition-shadow duration-300 hover-scale"
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-10 h-10 rounded-lg flex items-center justify-center">
                                            <feature.icon className="h-5 w-5 text-white" />
                                        </div>
                                        <Badge
                                            variant={getBadgeVariant(
                                                feature.badge
                                            )}
                                            className="text-xs"
                                        >
                                            {feature.badge}
                                        </Badge>
                                    </div>{" "}
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>{" "}
            {/* Integrations */}
            <section className="py-20 bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        {" "}
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Seamless Integrations
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            Connect Vionex with your favorite tools and
                            workflows for a unified experience.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
                        {integrations.map((integration, index) => (
                            <Card
                                key={index}
                                className="hover:shadow-md transition-shadow duration-300 hover-scale"
                            >
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl mb-2">
                                        {integration.logo}
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {integration.name}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>{" "}
            {/* Feature Comparison */}
            <section className="py-20 bg-gray-20 dark:bg-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        {" "}
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Plan Comparison
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            Choose the plan that's right for you and your team.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        {" "}
                        <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                            <thead className="bg-gray-200 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                        Features
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                        Free
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                        Pro
                                    </th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                        Business
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                {[
                                    {
                                        feature: "Meeting Duration",
                                        free: "40 minutes",
                                        pro: "Unlimited",
                                        business: "Unlimited",
                                    },
                                    {
                                        feature: "Participants",
                                        free: "100",
                                        pro: "Unlimited",
                                        business: "Unlimited",
                                    },
                                    {
                                        feature: "Recording",
                                        free: "❌",
                                        pro: "✅",
                                        business: "✅",
                                    },
                                    {
                                        feature: "Custom Backgrounds",
                                        free: "❌",
                                        pro: "✅",
                                        business: "✅",
                                    },
                                    {
                                        feature: "Analytics",
                                        free: "❌",
                                        pro: "❌",
                                        business: "✅",
                                    },
                                    {
                                        feature: "Admin Controls",
                                        free: "❌",
                                        pro: "❌",
                                        business: "✅",
                                    },
                                ].map((row, index) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        {" "}
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {row.feature}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 text-center">
                                            {row.free}
                                        </td>{" "}
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 text-center">
                                            {row.pro}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 text-center">
                                            {row.business}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Ready to Experience These Features?
                    </h2>{" "}
                    <p className="text-xl text-blue-100 dark:text-blue-200 mb-8">
                        Start using Vionex today and discover why millions trust
                        us for their video communication needs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {" "}
                        <Button
                            size="lg"
                            className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            asChild
                        >
                            <Link to={ROUTES.ROOM}>Start Free Meeting</Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-white text-blue-600  hover:bg-white dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
                            asChild
                        >
                            <Link to={ROUTES.PRICING}>See Pricing</Link>
                        </Button>{" "}
                    </div>
                </div>
            </section>
        </motion.div>
    );
};

export default Features;
