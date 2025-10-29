import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "system" } = useTheme();
    const [toastCount, setToastCount] = useState(0);

    useEffect(() => {
        // Listen for toast changes
        const interval = setInterval(() => {
            const toasts = document.querySelectorAll("[data-sonner-toast]");
            setToastCount(toasts.length);
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const clearAllToasts = () => {
        toast.dismiss();
    };

    return (
        <>
            {toastCount > 1 && (
                <div className='fixed bottom-[calc(100vh-100vh+8rem)] right-4 z-[9999] w-[280px]'>
                    <button onClick={clearAllToasts} className='w-full h-8 mb-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md shadow-md flex items-center justify-center text-xs font-medium transition-colors'>
                        <X className='h-3 w-3 mr-1.5' />
                        Clear All ({toastCount})
                    </button>
                </div>
            )}
            <Sonner
                theme={theme as ToasterProps["theme"]}
                className='toaster group'
                position='bottom-right'
                duration={5000}
                visibleToasts={4}
                toastOptions={{
                    classNames: {
                        toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                        description: "group-[.toast]:text-muted-foreground",
                        actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                        cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    },
                }}
                {...props}
            />
        </>
    );
};

export { Toaster };
