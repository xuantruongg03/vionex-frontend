import {
    Bot,
    Building,
    Crown,
    Globe,
    GlobeIcon,
    MessageCircle,
    Shield,
    Star,
    Users,
    Video,
    Zap,
} from "lucide-react";

const features = [
    {
        icon: Video,
        title: "Ultra HD Video",
        description:
            "Experience crystal-clear 4K video quality with advanced compression technology.",
        gradient: "from-blue-500 to-cyan-500",
    },
    {
        icon: Users,
        title: "Unlimited Participants",
        description:
            "Host meetings with unlimited participants and advanced breakout room management.",
        gradient: "from-purple-500 to-pink-500",
    },
    {
        icon: Shield,
        title: "Enterprise Security",
        description:
            "Bank-level encryption with end-to-end security and compliance certifications.",
        gradient: "from-green-500 to-emerald-500",
    },
    {
        icon: GlobeIcon,
        title: "Translate Real-time",
        description: "Enable real-time translation for multilingual meetings.",
        gradient: "from-orange-500 to-red-500",
    },
    {
        icon: Bot,
        title: "AI Meeting Assistant",
        description:
            "Intelligent AI assistant for meeting summaries, action items, and transcription.",
        gradient: "from-indigo-500 to-purple-500",
    },
    {
        icon: MessageCircle,
        title: "Real-time Chat",
        description:
            "Advanced messaging with file sharing, reactions, and persistent chat history.",
        gradient: "from-teal-500 to-blue-500",
    },
];

const testimonials = [
    {
        name: "Sarah Johnson",
        role: "CEO, TechFlow Inc.",
        content:
            "VideoMeet has revolutionized our remote collaboration. The video quality is exceptional and the platform is incredibly reliable.",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
        rating: 5,
        company: "TechFlow Inc.",
    },
    {
        name: "Michael Chen",
        role: "Remote Team Lead, GlobalCorp",
        content:
            "The best video conferencing solution we've tried. Seamless integration with our existing tools and outstanding support.",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
        rating: 5,
        company: "GlobalCorp",
    },
    {
        name: "Emily Rodriguez",
        role: "Project Manager, InnovateLab",
        content:
            "Crystal-clear video, intuitive interface, and powerful features. VideoMeet has become essential for our daily operations.",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
        rating: 5,
        company: "InnovateLab",
    },
];

const pricingPlans = [
    {
        name: "Free",
        icon: Star,
        description: "Perfect for personal use and small teams",
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: [
            { name: "40-minute meeting limit", included: true },
            { name: "Up to 100 participants", included: true },
            { name: "HD video quality", included: true },
            { name: "Screen sharing", included: true },
            { name: "Basic chat features", included: true },
            { name: "Mobile apps", included: true },
            { name: "Recording", included: false },
            { name: "Custom backgrounds", included: false },
            { name: "Admin controls", included: false },
            { name: "Analytics", included: false },
        ],
        cta: "Get Started Free",
        popular: false,
    },
    {
        name: "Pro",
        icon: Zap,
        description: "For growing teams and businesses",
        monthlyPrice: 14.99,
        yearlyPrice: 12.99,
        features: [
            { name: "Unlimited meeting duration", included: true },
            { name: "Unlimited participants", included: true },
            { name: "4K video quality", included: true },
            { name: "Advanced screen sharing", included: true },
            { name: "Full chat features", included: true },
            { name: "Mobile apps", included: true },
            { name: "Cloud recording (100GB)", included: true },
            { name: "Custom backgrounds", included: true },
            { name: "Waiting room controls", included: true },
            { name: "Basic analytics", included: true },
        ],
        cta: "Start Pro Trial",
        popular: true,
    },
    {
        name: "Business",
        icon: Building,
        description: "For large organizations with advanced needs",
        monthlyPrice: 29.99,
        yearlyPrice: 24.99,
        features: [
            { name: "Everything in Pro", included: true },
            { name: "Unlimited cloud storage", included: true },
            { name: "Advanced admin controls", included: true },
            { name: "Detailed analytics", included: true },
            { name: "Single sign-on (SSO)", included: true },
            { name: "API access", included: true },
            { name: "Priority support", included: true },
            { name: "Custom branding", included: true },
            { name: "Compliance tools", included: true },
            { name: "Dedicated account manager", included: true },
        ],
        cta: "Contact Sales",
        popular: false,
    },
];

const plansFull = [
    {
        name: "Free",
        icon: Star,
        description: "Perfect for personal use and small teams",
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: [
            { name: "40-minute meeting limit", included: true },
            { name: "Up to 100 participants", included: true },
            { name: "HD video quality", included: true },
            { name: "Screen sharing", included: true },
            { name: "Basic chat features", included: true },
            { name: "Mobile apps", included: true },
            { name: "Recording", included: false },
            { name: "Custom backgrounds", included: false },
            { name: "Admin controls", included: false },
            { name: "Analytics", included: false },
        ],
        cta: "Get Started Free",
        popular: false,
    },
    {
        name: "Pro",
        icon: Zap,
        description: "For growing teams and businesses",
        monthlyPrice: 14.99,
        yearlyPrice: 12.99,
        features: [
            { name: "Unlimited meeting duration", included: true },
            { name: "Unlimited participants", included: true },
            { name: "4K video quality", included: true },
            { name: "Advanced screen sharing", included: true },
            { name: "Full chat features", included: true },
            { name: "Mobile apps", included: true },
            { name: "Cloud recording (100GB)", included: true },
            { name: "Custom backgrounds", included: true },
            { name: "Waiting room controls", included: true },
            { name: "Basic analytics", included: true },
        ],
        cta: "Start Pro Trial",
        popular: true,
    },
    {
        name: "Business",
        icon: Building,
        description: "For large organizations with advanced needs",
        monthlyPrice: 29.99,
        yearlyPrice: 24.99,
        features: [
            { name: "Everything in Pro", included: true },
            { name: "Unlimited cloud storage", included: true },
            { name: "Advanced admin controls", included: true },
            { name: "Detailed analytics", included: true },
            { name: "Single sign-on (SSO)", included: true },
            { name: "API access", included: true },
            { name: "Priority support", included: true },
            { name: "Custom branding", included: true },
            { name: "Compliance tools", included: true },
            { name: "Dedicated account manager", included: true },
        ],
        cta: "Contact Sales",
        popular: false,
    },
    {
        name: "Enterprise",
        icon: Crown,
        description: "Custom solutions for enterprise needs",
        monthlyPrice: null,
        yearlyPrice: null,
        features: [
            { name: "Everything in Business", included: true },
            { name: "Custom deployment", included: true },
            { name: "Unlimited everything", included: true },
            { name: "Advanced security features", included: true },
            { name: "Custom integrations", included: true },
            { name: "White-label options", included: true },
            { name: "24/7 premium support", included: true },
            { name: "Training & onboarding", included: true },
            { name: "SLA guarantees", included: true },
            { name: "Custom contracts", included: true },
        ],
        cta: "Contact Us",
        popular: false,
    },
];

const faqs = [
    {
        question: "Can I switch plans anytime?",
        answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate any billing differences.",
    },
    {
        question: "Is there a free trial for paid plans?",
        answer: "Yes! All paid plans come with a 14-day free trial. No credit card required to start your trial.",
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards, PayPal, and bank transfers for annual subscriptions. Enterprise customers can arrange invoicing.",
    },
    {
        question: "Do you offer discounts for non-profits?",
        answer: "Yes, we offer special pricing for qualified non-profit organizations, educational institutions, and startups. Contact our sales team for details.",
    },
    {
        question: "What happens if I exceed my plan limits?",
        answer: "If you exceed your plan limits, we'll notify you and give you options to upgrade or adjust your usage. We never cut off service unexpectedly.",
    },
    {
        question: "Is my data secure and private?",
        answer: "Absolutely. We use end-to-end encryption, secure data centers, and comply with GDPR, HIPAA, and other privacy regulations.",
    },
];

const stats = [
    { value: "10M+", label: "Active Users", icon: Users },
    { value: "99.9%", label: "Uptime SLA", icon: Shield },
    { value: "150+", label: "Countries", icon: Globe },
    { value: "24/7", label: "Support", icon: MessageCircle },
];

const navItems = [
    { name: "Home", path: "/" },
    { name: "Features", path: "/features" },
    { name: "Pricing", path: "/pricing" },
    { name: "About Us", path: "/about" },
    { name: "Contact", path: "/contact" },
];

export const data = {
    features,
    navItems,
    testimonials,
    pricingPlans,
    stats,
    plansFull,
    faqs,
};
