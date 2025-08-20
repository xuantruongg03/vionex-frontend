import Footer from "../Footer";
import Header from "../Header";

interface LayoutProps {
    children: React.ReactNode;
    requireAuth?: boolean; // Giữ lại prop này để backward compatibility
    redirectTo?: string;
}

const Layout = ({ children }: LayoutProps) => {
    return (
        <div className='flex flex-col min-h-screen bg-background text-foreground'>
            <Header />
            <main className='flex-1 overflow-y-auto bg-background'>
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
