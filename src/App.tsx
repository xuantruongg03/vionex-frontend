import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMediaStreamCleanup } from "@/hooks/use-media-stream-cleanup";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import { ThemeProvider } from "./components/theme-provider";
import { VADDebugPage } from "./components/VADDebugPage";
import ROUTES from "./lib/routes";
import Contact from "./pages/Contact";
import Features from "./pages/Feature";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Room from "./pages/Room";
import VideoCallRoom from "./pages/VideoCallRoom";

const queryClient = new QueryClient();

const AppContent = () => {
    useMediaStreamCleanup();

    return (
        <Routes>
            <Route
                path={ROUTES.HOME}
                element={
                    <Layout>
                        <Index />
                    </Layout>
                }
            />
            <Route
                path={ROUTES.ROOM}
                element={
                    <Layout>
                        <Room />
                    </Layout>
                }
            />
            <Route
                path={ROUTES.PRICING}
                element={
                    <Layout>
                        <Pricing />
                    </Layout>
                }
            />
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route
                path={ROUTES.FEATURES}
                element={
                    <Layout>
                        <Features />
                    </Layout>
                }
            />
            <Route
                path={ROUTES.CONTACT}
                element={
                    <Layout>
                        <Contact />
                    </Layout>
                }
            />
            <Route path={`${ROUTES.ROOM}/:roomId`} element={<VideoCallRoom />} />
            <Route
                path={ROUTES.VAD_DEBUG}
                element={
                    <Layout>
                        <VADDebugPage />
                    </Layout>
                }
            />
            <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        </Routes>
    );
};

const App = () => (
    <ThemeProvider defaultTheme='system' storageKey='vionex-ui-theme'>
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                    <AppContent />
                </BrowserRouter>
            </TooltipProvider>
        </QueryClientProvider>
    </ThemeProvider>
);

export default App;
