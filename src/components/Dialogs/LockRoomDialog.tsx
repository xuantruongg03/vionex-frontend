import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";

interface LockRoomDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSetPassword: (password: string) => void;
}

const passwordSchema = z.object({
    password: z
        .string()
        .min(4, "Password must be at least 4 characters long")
        .max(20, "Password must not exceed 20 characters"),
});

export const LockRoomDialog = ({
    isOpen,
    onClose,
    onSetPassword,
}: LockRoomDialogProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: "",
        },
    });

    const handleSubmit = (values: z.infer<typeof passwordSchema>) => {
        setIsSubmitting(true);
        setTimeout(() => {
            onSetPassword(values.password);
            setIsSubmitting(false);
        }, 500);
    };

    const handleCancel = () => {
        form.reset();
        onClose();
    };

    return (
        <Dialog
            open={isOpen}
            // onOpenChange={(open) => {
            //     if (!open) {
            //         handleCancel();
            //     }
            // }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center flex items-center justify-center gap-2">
                        <Lock className="h-5 w-5" /> Lock room
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Set a password to restrict access to the meeting room
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="Enter meeting room password"
                                            className="w-full focus-visible:outline-blue-400 focus-visible:ring-0"
                                            {...field}
                                            autoFocus
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="sm:justify-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus-visible:outline-blue-400 focus-visible:ring-0"
                            >
                                {isSubmitting ? "Validating..." : "Confirm"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
