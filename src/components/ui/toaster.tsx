import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function Toaster() {
    const { toasts, dismiss } = useToast();

    return (
        <ToastProvider>
            {toasts.length > 1 && (
                <div className='fixed top-4 right-4 z-[101]'>
                    <Button variant='secondary' size='sm' onClick={() => dismiss()} className='shadow-lg'>
                        <X className='h-4 w-4 mr-1' />
                        Clear All ({toasts.length})
                    </Button>
                </div>
            )}
            {toasts.map(function ({ id, title, description, action, ...props }) {
                return (
                    <Toast key={id} {...props}>
                        <div className='grid gap-1'>
                            {title && <ToastTitle>{title}</ToastTitle>}
                            {description && <ToastDescription>{description}</ToastDescription>}
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                );
            })}
            <ToastViewport />
        </ToastProvider>
    );
}
