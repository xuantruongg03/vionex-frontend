import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "system" } = useTheme();

    useEffect(() => {
        // Click any close button to dismiss all toasts
        const handleCloseClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const closeButton = target.closest("[data-close-button]");

            if (closeButton) {
                // Dismiss all toasts
                setTimeout(() => {
                    toast.dismiss();
                }, 50);
            }
        };

        document.addEventListener("click", handleCloseClick, true);
        return () => document.removeEventListener("click", handleCloseClick, true);
    }, []);

    return (
        <>
            <style>{`
                [data-sonner-toast] {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    gap: 0.75rem !important;
                }
                [data-sonner-toast] [data-icon] {
                    order: 1 !important;
                    flex-shrink: 0 !important;
                }
                [data-sonner-toast] [data-content] {
                    order: 2 !important;
                    flex: 1 !important;
                }
                [data-sonner-toast] [data-close-button] {
                    order: 3 !important;
                    position: relative !important;
                    right: auto !important;
                    top: auto !important;
                    left: auto !important;
                    transform: none !important;
                    margin: 0 !important;
                    flex-shrink: 0 !important;
                }
            `}</style>
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
                        closeButton: "group-[.toast]:hover:bg-muted",
                    },
                }}
                {...props}
                closeButton={true}
            />
        </>
    );
};

export { Toaster };
