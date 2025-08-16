import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
    CheckCircle,
    Clock,
    Globe,
    HeadphonesIcon,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    Send,
    Video,
} from "lucide-react";
import { useEffect, useState } from "react";

const Contact = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate form submission
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({ name: "", email: "", subject: "", message: "" });

        // Reset success message after 3 seconds
        setTimeout(() => setIsSubmitted(false), 3000);
    };

    const contactInfo = [
        {
            icon: Mail,
            title: "Email Support",
            content: "support@vionex.com",
            description: "We'll respond within 24 hours",
            gradient: "from-blue-500 to-cyan-500",
        },
        {
            icon: Phone,
            title: "Phone Support",
            content: "+84 981 793 201",
            description: "Mon-Fri, 9AM-6PM EST",
            gradient: "from-green-500 to-emerald-500",
        },
        {
            icon: Video,
            title: "Live Chat",
            content: "Available 24/7",
            description: "Get instant help",
            gradient: "from-purple-500 to-pink-500",
        },
        {
            icon: MapPin,
            title: "Office Location",
            content: "170 An Duong Vuong, Quang Trung",
            description: "Binh Dinh, Vietnam",
            gradient: "from-orange-500 to-red-500",
        },
    ];

    const supportTypes = [
        {
            icon: HeadphonesIcon,
            title: "Technical Support",
            description:
                "Help with video calls, audio issues, and troubleshooting",
        },
        {
            icon: MessageCircle,
            title: "General Inquiries",
            description: "Questions about features, pricing, and services",
        },
        {
            icon: Globe,
            title: "Business Solutions",
            description:
                "Enterprise plans, custom integrations, and partnerships",
        },
    ];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <motion.div
            className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
        >
            <div className="container mx-auto px-4 py-16">
                {/* Header Section */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <motion.h1
                        className="text-4xl md:text-5xl font-bold mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        Get in{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Touch
                        </span>
                    </motion.h1>{" "}
                    <motion.p
                        className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        Have questions about our video calling platform? We're
                        here to help! Reach out to our support team for
                        assistance with your video conferencing needs.
                    </motion.p>
                </motion.div>{" "}
                {/* Contact Info Cards */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                >
                    {contactInfo.map((info, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.6,
                                delay: 0.6 + index * 0.1,
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {" "}
                            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                                <CardContent className="p-6 text-center">
                                    <motion.div
                                        className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${info.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                                        whileHover={{ rotate: 360 }}
                                        transition={{ duration: 0.6 }}
                                    >
                                        <info.icon className="w-8 h-8 text-white" />
                                    </motion.div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                        {info.title}
                                    </h3>
                                    <p className="text-blue-600 dark:text-blue-400 font-medium mb-1">
                                        {info.content}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {info.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>{" "}
                <motion.div
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.0 }}
                >
                    {/* Contact Form */}
                    <motion.div
                        className="lg:col-span-2"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 1.1 }}
                    >
                        {" "}
                        <Card className="border-0 shadow-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                            <CardHeader className="text-center pb-8">
                                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Send us a Message
                                </CardTitle>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Fill out the form below and we'll get back
                                    to you shortly
                                </p>
                            </CardHeader>
                            <CardContent className="p-8">
                                {" "}
                                {isSubmitted && (
                                    <motion.div
                                        className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg flex items-center gap-3"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        <p className="text-green-700 dark:text-green-300 font-medium">
                                            Message sent successfully! We'll get
                                            back to you soon.
                                        </p>
                                    </motion.div>
                                )}
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {" "}
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="name"
                                                className="text-gray-700 dark:text-gray-300 font-medium"
                                            >
                                                Full Name *
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="Enter your full name"
                                                required
                                                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 focus-visible:outline-blue-400 focus-visible:ring-0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="email"
                                                className="text-gray-700 dark:text-gray-300 font-medium"
                                            >
                                                Email Address *
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="Enter your email"
                                                required
                                                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 focus-visible:outline-blue-400 focus-visible:ring-0"
                                            />
                                        </div>
                                    </div>{" "}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="subject"
                                            className="text-gray-700 dark:text-gray-300 font-medium"
                                        >
                                            Subject *
                                        </Label>
                                        <Input
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleInputChange}
                                            placeholder="What's this about?"
                                            required
                                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 focus-visible:outline-blue-400 focus-visible:ring-0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="message"
                                            className="text-gray-700 dark:text-gray-300 font-medium"
                                        >
                                            Message *
                                        </Label>
                                        <Textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleInputChange}
                                            placeholder="Tell us more about your inquiry..."
                                            rows={6}
                                            required
                                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none focus-visible:outline-blue-400 focus-visible:ring-0"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 transition-all duration-300"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>{" "}
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Support Types */}
                    <motion.div
                        className="space-y-6"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 1.2 }}
                    >
                        {" "}
                        <Card className="border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    Support Hours
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        Monday - Friday
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        9:00 AM - 6:00 PM
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        Saturday
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        10:00 AM - 4:00 PM
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        Sunday
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        Closed
                                    </span>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg mt-4">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        <strong>Emergency Support:</strong>{" "}
                                        Available 24/7 for critical issues
                                    </p>
                                </div>
                            </CardContent>
                        </Card>{" "}
                        <Card className="border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                                    How Can We Help?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {" "}
                                {supportTypes.map((type, index) => (
                                    <motion.div
                                        key={index}
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                            duration: 0.5,
                                            delay: 1.4 + index * 0.1,
                                        }}
                                        whileHover={{ x: 5 }}
                                    >
                                        <motion.div
                                            className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0"
                                            whileHover={{
                                                scale: 1.1,
                                                rotate: 5,
                                            }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <type.icon className="w-5 h-5 text-white" />
                                        </motion.div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                                {type.title}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                {type.description}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Contact;
