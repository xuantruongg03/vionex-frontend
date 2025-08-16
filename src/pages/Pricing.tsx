import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { data } from "@/lib/data";
import ROUTES from "@/lib/routes";
import { motion } from "framer-motion";
import { Building, Check, Crown, Star, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Pricing = () => {
    const [isYearly, setIsYearly] = useState(false);

    const plans = data.plansFull;

    const getPrice = (plan: (typeof plans)[0]) => {
        if (plan.monthlyPrice === null) return "Custom";
        const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
        return `$${price}`;
    };

    const getSavings = (plan: (typeof plans)[0]) => {
        if (plan.monthlyPrice === null || plan.monthlyPrice === 0) return null;
        const yearlySavings = (plan.monthlyPrice - plan.yearlyPrice) * 12;
        return Math.round((yearlySavings / (plan.monthlyPrice * 12)) * 100);
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
                        Simple{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Pricing
                        </span>
                    </motion.h1>
                    <motion.p
                        className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        Choose the plan that fits your team's needs. Start free
                        and upgrade as you grow. All plans include our core
                        features with no hidden fees.
                    </motion.p>

                    {/* Billing Toggle */}
                    <motion.div
                        className="flex items-center justify-center space-x-4 mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                    >
                        <span
                            className={`text-lg ${
                                !isYearly
                                    ? "text-gray-900 dark:text-white font-semibold"
                                    : "text-gray-600 dark:text-gray-400"
                            }`}
                        >
                            Monthly
                        </span>
                        <Switch
                            checked={isYearly}
                            onCheckedChange={setIsYearly}
                            className="data-[state=checked]:bg-blue-600"
                        />
                        <span
                            className={`text-lg ${
                                isYearly
                                    ? "text-gray-900 dark:text-white font-semibold"
                                    : "text-gray-600 dark:text-gray-400"
                            }`}
                        >
                            Yearly
                        </span>{" "}
                        <Badge variant="secondary" className="ml-2">
                            Save up to 30%
                        </Badge>
                    </motion.div>
                </motion.div>
            </section>{" "}
            {/* Pricing Cards */}
            <section className="py-20 bg-white dark:bg-gray-900">
                <motion.div
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        {plans.map((plan, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.6,
                                    delay: index * 0.1,
                                }}
                                whileHover={{
                                    scale: plan.popular ? 1.02 : 1.05,
                                    y: -5,
                                }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Card
                                    className={`relative hover:shadow-xl transition-all duration-300 hover-scale ${
                                        plan.popular
                                            ? "ring-2 ring-blue-600 transform scale-105"
                                            : ""
                                    }`}
                                >
                                    {" "}
                                    {plan.popular && (
                                        <motion.div
                                            className="absolute -top-3 left-1/2 transform -translate-x-1/2"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{
                                                duration: 0.5,
                                                delay: 0.3,
                                            }}
                                        >
                                            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-1">
                                                Most Popular
                                            </Badge>
                                        </motion.div>
                                    )}
                                    <CardHeader className="text-center pb-6">
                                        <motion.div
                                            className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${
                                                plan.popular
                                                    ? "bg-gradient-to-r from-blue-600 to-purple-600"
                                                    : "bg-gray-100 dark:bg-gray-700"
                                            }`}
                                            whileHover={{
                                                scale: 1.1,
                                                rotate: plan.popular
                                                    ? 360
                                                    : 180,
                                            }}
                                            transition={{ duration: 0.6 }}
                                        >
                                            {" "}
                                            <plan.icon
                                                className={`h-6 w-6 ${
                                                    plan.popular
                                                        ? "text-white"
                                                        : "text-gray-600 dark:text-gray-300"
                                                }`}
                                            />
                                        </motion.div>{" "}
                                        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {plan.name}
                                        </CardTitle>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                                            {plan.description}
                                        </p>
                                        <div className="mt-4">
                                            {" "}
                                            <div className="text-4xl font-bold text-gray-900 dark:text-white">
                                                {getPrice(plan)}
                                                {plan.monthlyPrice !== null && (
                                                    <span className="text-lg font-normal text-gray-600 dark:text-gray-300">
                                                        /
                                                        {isYearly
                                                            ? "year"
                                                            : "month"}
                                                    </span>
                                                )}
                                            </div>
                                            {isYearly && getSavings(plan) && (
                                                <div className="text-sm text-green-600 font-medium">
                                                    Save {getSavings(plan)}%
                                                    annually
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3 mb-8">
                                            {plan.features.map(
                                                (feature, featureIndex) => (
                                                    <li
                                                        key={featureIndex}
                                                        className="flex items-center text-sm"
                                                    >
                                                        {feature.included ? (
                                                            <Check className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
                                                        ) : (
                                                            <X className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                                                        )}{" "}
                                                        <span
                                                            className={
                                                                feature.included
                                                                    ? "text-gray-900 dark:text-white"
                                                                    : "text-gray-500 dark:text-gray-400"
                                                            }
                                                        >
                                                            {feature.name}
                                                        </span>
                                                    </li>
                                                )
                                            )}
                                        </ul>

                                        <Button
                                            className={`w-full ${
                                                plan.popular
                                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                                    : ""
                                            }`}
                                            variant={
                                                plan.popular
                                                    ? "default"
                                                    : "outline"
                                            }
                                            size="lg"
                                            asChild
                                        >
                                            <Link
                                                to={
                                                    plan.name === "Free"
                                                        ? "/call"
                                                        : "/contact"
                                                }
                                            >
                                                {plan.cta}
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </section>{" "}
            {/* Features Comparison */}
            <section className="py-20 bg-gray-50 dark:bg-gray-800">
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
                            Compare All Features
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            Detailed breakdown of what's included in each plan
                            to help you make the right choice.
                        </p>
                    </motion.div>

                    <motion.div
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                {" "}
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Features
                                        </th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                            Free
                                        </th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20">
                                            Pro
                                        </th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                            Business
                                        </th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                            Enterprise
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {[
                                        {
                                            feature: "Meeting Duration",
                                            free: "40 min",
                                            pro: "Unlimited",
                                            business: "Unlimited",
                                            enterprise: "Unlimited",
                                        },
                                        {
                                            feature: "Participants",
                                            free: "100",
                                            pro: "Unlimited",
                                            business: "Unlimited",
                                            enterprise: "Unlimited",
                                        },
                                        {
                                            feature: "Video Quality",
                                            free: "HD",
                                            pro: "4K",
                                            business: "4K",
                                            enterprise: "4K",
                                        },
                                        {
                                            feature: "Cloud Recording",
                                            free: "❌",
                                            pro: "100GB",
                                            business: "Unlimited",
                                            enterprise: "Unlimited",
                                        },
                                        {
                                            feature: "Custom Backgrounds",
                                            free: "❌",
                                            pro: "✅",
                                            business: "✅",
                                            enterprise: "✅",
                                        },
                                        {
                                            feature: "Analytics",
                                            free: "❌",
                                            pro: "Basic",
                                            business: "Advanced",
                                            enterprise: "Custom",
                                        },
                                        {
                                            feature: "API Access",
                                            free: "❌",
                                            pro: "❌",
                                            business: "✅",
                                            enterprise: "✅",
                                        },
                                        {
                                            feature: "SSO Integration",
                                            free: "❌",
                                            pro: "❌",
                                            business: "✅",
                                            enterprise: "✅",
                                        },
                                        {
                                            feature: "White Labeling",
                                            free: "❌",
                                            pro: "❌",
                                            business: "❌",
                                            enterprise: "✅",
                                        },
                                        {
                                            feature: "Support",
                                            free: "Community",
                                            pro: "Email",
                                            business: "Priority",
                                            enterprise: "24/7 Premium",
                                        },
                                    ].map((row, index) => (
                                        <tr
                                            key={index}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-600"
                                        >
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                {row.feature}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 text-center">
                                                {row.free}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 text-center bg-blue-50/50 dark:bg-blue-900/20">
                                                {row.pro}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 text-center">
                                                {row.business}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 text-center">
                                                {row.enterprise}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>{" "}
                        </div>
                    </motion.div>
                </motion.div>
            </section>{" "}
            {/* FAQ Section */}
            <section className="py-20 bg-white dark:bg-gray-900">
                <motion.div
                    className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
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
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">
                            Got questions? We've got answers. Can't find what
                            you're looking for? Contact our support team.
                        </p>
                    </motion.div>

                    <motion.div
                        className="space-y-6"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        {data.faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.6,
                                    delay: index * 0.1,
                                }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <Card className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            {faq.question}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            {faq.answer}
                                        </p>{" "}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </section>{" "}
            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <motion.div
                    className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.h2
                        className="text-3xl sm:text-4xl font-bold mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        Ready to Get Started?
                    </motion.h2>
                    <motion.p
                        className="text-xl text-blue-100 mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        Join millions of users who trust Vionex for their video
                        communication needs.
                    </motion.p>
                    <motion.div
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Button
                            size="lg"
                            className="bg-white text-blue-600 hover:bg-gray-100"
                            asChild
                        >
                            <Link to={ROUTES.ROOM}>Start Free Meeting</Link>
                        </Button>{" "}
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-white text-blue-600 hover:bg-white hover:text-blue-600"
                            asChild
                        >
                            <Link to={ROUTES.CONTACT}>Contact Sales</Link>
                        </Button>
                    </motion.div>
                </motion.div>
            </section>
        </motion.div>
    );
};

export default Pricing;
