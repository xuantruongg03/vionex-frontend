import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { data } from "@/lib/data";
import ROUTES from "@/lib/routes";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Calendar, Check, Lock, Play, Quote, Star, TvMinimalPlay, X } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const Index = () => {
    // Simplified animation variants - only keep essential ones
    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: "easeOut" },
    };

    const slideInLeft = {
        initial: { opacity: 0, x: -30 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.5 },
    };

    const slideInRight = {
        initial: { opacity: 0, x: 30 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.5 },
    };

    const pricingPlans = data.pricingPlans;

    // Helper functions for pricing
    const getPrice = (plan: (typeof pricingPlans)[0]) => {
        if (plan.monthlyPrice === null) return "Custom";
        return `$${plan.monthlyPrice}`;
    };

    const getPeriod = (plan: (typeof pricingPlans)[0]) => {
        if (plan.monthlyPrice === null || plan.monthlyPrice === 0) return "";
        return "/month";
    };
    const getGradient = (plan: (typeof pricingPlans)[0]) => {
        if (plan.name === "Free") return "from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700";
        if (plan.popular) return "from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20";
        return "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20";
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900'>
            {/* Hero Section */}
            <section className='relative overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5 dark:from-blue-400/10 dark:via-purple-400/10 dark:to-pink-400/10'></div>{" "}
                <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32'>
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-16 items-center'>
                        <motion.div {...slideInLeft} className='space-y-8'>
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                                <Badge className=' bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0'>🚀 New: AI-Powered Meeting Assistant</Badge>
                            </motion.div>

                            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className='text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-8 leading-tight'>
                                The Future of <span className='bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'>Vionex</span>
                            </motion.h1>

                            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className='text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed max-w-lg'>
                                Experience next-generation video conferencing with AI-powered features, crystal-clear 4K quality, and enterprise-grade security that scales with your business.
                            </motion.p>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }} className='flex flex-col sm:flex-row gap-6 mb-12'>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button size='lg' className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300' asChild>
                                        <Link to={ROUTES.ROOM}>
                                            <Play className='mr-2 h-5 w-5' />
                                            Start Free Meeting
                                        </Link>
                                    </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button size='lg' variant='outline' className='h-14 px-8 text-lg font-semibold border-2 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-600' asChild>
                                        <Link to={ROUTES.FEATURES}>
                                            Learn More
                                            <ArrowRight className='ml-2 h-5 w-5' />
                                        </Link>
                                    </Button>
                                </motion.div>
                            </motion.div>

                            {/* Trust Indicators */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.9 }} className='flex items-center space-x-8 text-sm text-gray-500 dark:text-gray-400'>
                                <div className='flex items-center space-x-2'>
                                    <Lock className='h-4 w-4' />
                                    <span>Security</span>
                                </div>
                                <div className='flex items-center space-x-2'>
                                    <TvMinimalPlay className='h-4 w-4' />
                                    <span>Higher Quality Video</span>
                                </div>
                                <div className='flex items-center space-x-2'>
                                    <Bot className='h-4 w-4' />
                                    <span>AI Assistant</span>
                                </div>
                            </motion.div>
                        </motion.div>

                        <motion.div {...slideInRight} className='relative'>
                            <div className='relative'>
                                <motion.div
                                    animate={{
                                        rotate: [0, 360],
                                        scale: [1, 1.1, 1],
                                    }}
                                    transition={{
                                        duration: 8,
                                        repeat: Infinity,
                                        ease: "linear",
                                    }}
                                    className='absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-20'
                                />
                                <motion.div
                                    whileHover={{
                                        scale: 1.02,
                                        rotateY: 5,
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className='relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-2'
                                >
                                    <img src='https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=700&h=500&fit=crop' alt='Professional video conference' className='w-full h-96 object-cover rounded-2xl' />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            delay: 1.2,
                                            duration: 0.5,
                                        }}
                                        className='absolute top-6 left-6 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-2 shadow-lg'
                                    >
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                            }}
                                            className='w-2 h-2 bg-white rounded-full'
                                        />
                                        <span>Live Meeting</span>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            delay: 1.5,
                                            duration: 0.5,
                                        }}
                                        className='absolute bottom-6 right-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 shadow-lg'
                                    >
                                        <div className='flex items-center space-x-3'>
                                            <div className='flex -space-x-2'>
                                                <img className='w-8 h-8 rounded-full border-2 border-white' src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face' alt='' />
                                                <img className='w-8 h-8 rounded-full border-2 border-white' src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face' alt='' />
                                                <img className='w-8 h-8 rounded-full border-2 border-white' src='https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face' alt='' />
                                            </div>{" "}
                                            <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>+15 more</span>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>{" "}
            {/* Stats Section */}
            <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true, amount: 0.3 }} className='py-20 bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800'>
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
                        {data.stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.1,
                                    ease: "easeOut",
                                }}
                                viewport={{ once: true, amount: 0.5 }}
                                whileHover={{
                                    scale: 1.05,
                                    transition: { duration: 0.2 },
                                }}
                                className='text-center group'
                            >
                                <div className='bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-lg transition-shadow duration-200'>
                                    <stat.icon className='h-8 w-8 text-white' />
                                </div>
                                <div className='text-4xl font-bold text-gray-900 dark:text-white mb-2'>{stat.value}</div>
                                <div className='text-gray-600 dark:text-gray-300 font-medium'>{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>{" "}
            {/* Features Section */}
            <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true, amount: 0.2 }} className='py-24 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900'>
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className='text-center mb-20'>
                        <h2 className='text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6'>
                            Everything You Need for
                            <span className='block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>Perfect Meetings</span>
                        </h2>
                        <p className='text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto'>From AI-powered features to enterprise-grade security, VideoMeet provides all the tools you need for productive and engaging video conferences.</p>
                    </motion.div>

                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
                        {data.features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.1,
                                    ease: "easeOut",
                                }}
                                viewport={{ once: true, amount: 0.2 }}
                                whileHover={{
                                    y: -8,
                                    transition: { duration: 0.2 },
                                }}
                            >
                                <Card className='group h-full border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300'>
                                    <CardContent className='p-8'>
                                        <div className={`bg-gradient-to-r ${feature.gradient} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200`}>
                                            <feature.icon className='h-8 w-8 text-white' />
                                        </div>
                                        <h3 className='text-2xl font-bold text-gray-900 dark:text-white mb-4'>{feature.title}</h3>
                                        <p className='text-gray-600 dark:text-gray-300 leading-relaxed'>{feature.description}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>{" "}
            {/* Pricing Section */}
            <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true, amount: 0.3 }} className='py-24 bg-white dark:bg-gray-900'>
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className='text-center mb-20'>
                        <h2 className='text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6'>Choose Your Perfect Plan</h2>
                        <p className='text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto'>Start free and scale as you grow. All plans include our core features with advanced options for growing teams and enterprises.</p>
                    </motion.div>

                    <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
                        {pricingPlans.map((plan, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.1,
                                    ease: "easeOut",
                                }}
                                viewport={{ once: true, amount: 0.2 }}
                                whileHover={{
                                    y: -8,
                                    transition: { duration: 0.2 },
                                }}
                                className='h-full'
                            >
                                <Card className={`relative group h-full border-2 transition-all duration-300 ${plan.popular ? "border-purple-200 dark:border-purple-700 transform scale-105" : "border-gray-100 dark:border-gray-700 hover:border-purple-100 dark:hover:border-purple-800 hover:shadow-lg"}`}>
                                    {plan.popular && (
                                        <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
                                            <Badge className='bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-6 py-2'>Most Popular</Badge>
                                        </div>
                                    )}

                                    <CardContent className={`p-8 bg-gradient-to-br ${getGradient(plan)} transition-colors duration-300`}>
                                        <div className='text-center mb-8'>
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 transition-transform duration-200 group-hover:scale-110 ${plan.popular ? "bg-gradient-to-r from-blue-600 to-purple-600" : "bg-gray-100 dark:bg-gray-700"}`}>
                                                <plan.icon className={`h-6 w-6 ${plan.popular ? "text-white" : "text-gray-600 dark:text-gray-300"}`} />
                                            </div>

                                            <h3 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>{plan.name}</h3>
                                            <p className='text-gray-600 dark:text-gray-300 mb-6'>{plan.description}</p>

                                            <div className='mb-6'>
                                                <span className='text-5xl font-bold text-gray-900 dark:text-white'>{getPrice(plan)}</span>
                                                <span className='text-gray-600 dark:text-gray-300 ml-2'>{getPeriod(plan)}</span>
                                            </div>
                                        </div>

                                        <ul className='space-y-4 mb-8'>
                                            {plan.features.map((feature, featureIndex) => (
                                                <li key={featureIndex} className='flex items-center space-x-3'>
                                                    {feature.included ? <Check className='h-5 w-5 text-green-500 flex-shrink-0' /> : <X className='h-5 w-5 text-gray-400 flex-shrink-0' />}
                                                    <span className={feature.included ? "text-gray-700 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"}>{feature.name}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <Button className={`w-full h-12 font-semibold transition-all duration-200 hover:scale-105 ${plan.popular ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" : "bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200"}`} asChild>
                                            <Link to={plan.name === "Free" ? "/call" : "/contact"}>{plan.cta}</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>{" "}
            {/* Testimonials Section */}
            <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true, amount: 0.2 }} className='py-24 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900'>
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className='text-center mb-20'>
                        <Badge className='mb-6 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700'>💬 Customer Stories</Badge>
                        <h2 className='text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6'>Loved by Teams Worldwide</h2>
                        <p className='text-xl text-gray-600 dark:text-gray-300'>Join thousands of satisfied customers who trust VideoMeet for their daily communications.</p>
                    </motion.div>

                    <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
                        {data.testimonials.map((testimonial, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.1,
                                    ease: "easeOut",
                                }}
                                viewport={{ once: true, amount: 0.2 }}
                                whileHover={{
                                    y: -8,
                                    transition: { duration: 0.2 },
                                }}
                            >
                                <Card className='group h-full border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300'>
                                    <CardContent className='p-8'>
                                        <div className='flex items-center mb-6'>
                                            <Quote className='h-8 w-8 text-blue-500 dark:text-blue-400 mr-3' />
                                            <div className='flex text-yellow-400'>
                                                {[...Array(testimonial.rating)].map((_, i) => (
                                                    <Star key={i} className='h-4 w-4 fill-current' />
                                                ))}
                                            </div>
                                        </div>
                                        <p className='text-gray-700 dark:text-gray-200 mb-6 italic leading-relaxed'>"{testimonial.content}"</p>
                                        <div className='flex items-center'>
                                            <img src={testimonial.avatar} alt={testimonial.name} className='w-14 h-14 rounded-full mr-4 border-2 border-white shadow-lg' />
                                            <div>
                                                <div className='font-bold text-gray-900 dark:text-white'>{testimonial.name}</div>
                                                <div className='text-sm text-gray-600 dark:text-gray-300'>{testimonial.role}</div>
                                                <div className='text-xs text-blue-600 dark:text-blue-400 font-medium'>{testimonial.company}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>{" "}
            {/* CTA Section */}
            <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className='py-24 bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900 text-white relative overflow-hidden'>
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.2, 0.3, 0.2],
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className='absolute inset-0'
                >
                    <div
                        className='w-full h-full bg-repeat'
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                    ></div>
                </motion.div>
                <div className='relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
                    <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className='text-4xl sm:text-5xl font-bold mb-6'>
                        Ready to Transform Your Meetings?
                    </motion.h2>{" "}
                    <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className='text-xl text-blue-100 dark:text-blue-200 mb-10 max-w-3xl mx-auto'>
                        Join millions of professionals who have already upgraded their video conferencing experience. Start your free trial today and see the difference quality makes.
                    </motion.p>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className='flex flex-col sm:flex-row gap-6 justify-center'>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                size='lg'
                                // variant="outline"
                                className='bg-white dark:bg-black dark:text-white dark:hover:bg-gray-800 text-gray-900 hover:bg-gray-100 h-14 px-10 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300'
                                asChild
                            >
                                <Link to={ROUTES.ROOM}>
                                    <Play className='mr-2 h-5 w-5' />
                                    Start Free Meeting
                                </Link>
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                size='lg'
                                // variant="outline"
                                className='bg-black text-white dark:bg-white dark:text-black hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 h-14 px-10 text-lg font-semibold transition-all duration-300'
                                asChild
                            >
                                <Link to={ROUTES.PRICING}>
                                    <Calendar className='mr-2 h-5 w-5' />
                                    View All Plans
                                </Link>
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.section>
        </div>
    );
};

export default Index;
