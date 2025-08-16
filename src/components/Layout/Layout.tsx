import Footer from "../Footer";
import Header from "../Header";

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Header />
            <main className="flex-1 overflow-y-auto bg-background">
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
