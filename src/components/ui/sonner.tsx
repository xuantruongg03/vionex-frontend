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
                <div className='fixed top-4 right-4 z-[100]'>
                    <Button variant='secondary' size='sm' onClick={clearAllToasts} className='shadow-lg'>
                        <X className='h-4 w-4 mr-1' />
                        Clear All ({toastCount})
                    </Button>
                </div>
            )}
            <Sonner
                theme={theme as ToasterProps["theme"]}
                className='toaster group'
                position='top-right'
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
