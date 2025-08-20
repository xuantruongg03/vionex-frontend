import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMediaStreamCleanup } from "@/hooks/use-media-stream-cleanup";
import useAuthRestore from "@/hooks/auth/use-auth-restore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/theme-provider";
import { VADDebugPage } from "./components/VADDebugPage";
import ROUTES from "./lib/routes";
import Contact from "./pages/Contact";
import Features from "./pages/Feature";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Room from "./pages/Room";
import VideoCallRoom from "./pages/VideoCallRoom";
import Auth from "./pages/Auth";
import OrganizationDashboard from "./pages/OrganizationDashboard";

const queryClient = new QueryClient();

const AppContent = () => {
    useMediaStreamCleanup();
    useAuthRestore();

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
            <Route
                path={ROUTES.AUTH}
                element={
                    <ProtectedRoute requireAuth={false}>
                        <Auth />
                    </ProtectedRoute>
                }
            />
            <Route
                path={ROUTES.ORGANIZATION}
                element={
                    <ProtectedRoute requireAuth={true}>
                        <Layout requireAuth={true}>
                            <OrganizationDashboard />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path={ROUTES.ORGANIZATION_DASHBOARD}
                element={
                    <ProtectedRoute requireAuth={true}>
                        <Layout requireAuth={true}>
                            <OrganizationDashboard />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path={ROUTES.ORGANIZATION_MEMBERS}
                element={
                    <ProtectedRoute requireAuth={true}>
                        <Layout requireAuth={true}>
                            <OrganizationDashboard />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path={ROUTES.ORGANIZATION_ROOMS}
                element={
                    <ProtectedRoute requireAuth={true}>
                        <Layout requireAuth={true}>
                            <OrganizationDashboard />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path={ROUTES.ORGANIZATION_SETTINGS}
                element={
                    <ProtectedRoute requireAuth={true}>
                        <Layout requireAuth={true}>
                            <OrganizationDashboard />
                        </Layout>
                    </ProtectedRoute>
                }
            />
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
            <Route
                path={`${ROUTES.ROOM}/:roomId`}
                element={<VideoCallRoom />}
            />
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
