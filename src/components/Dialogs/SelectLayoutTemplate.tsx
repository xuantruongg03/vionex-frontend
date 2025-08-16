import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Grid, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import LAYOUT_TEMPLATES from "../Templates/LayoutTemplate";

interface SelectLayoutTemplateProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectLayout?: (layoutId: string) => void;
}

export const SelectLayoutTemplate = ({
    isOpen,
    onClose,
    onSelectLayout,
}: SelectLayoutTemplateProps) => {
    const [selectedLayout, setSelectedLayout] = useState("auto");

    const handleSelectLayout = (layoutId: string) => {
        setSelectedLayout(layoutId);
    };

    const handleConfirm = () => {
        if (onSelectLayout) {
            onSelectLayout(selectedLayout);
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-center flex items-center justify-center gap-2">
                        <Grid className="h-5 w-5" /> Choose Layout Template
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Select a layout template for your video call arrangement
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-3 py-4">
                    {LAYOUT_TEMPLATES && LAYOUT_TEMPLATES.length > 0 ? (
                        LAYOUT_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleSelectLayout(template.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-4 ${
                                    selectedLayout === template.id
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                                }`}
                            >
                                <span className="text-2xl">
                                    {template.icon}
                                </span>
                                <div className="flex-1">
                                    <div className="font-medium text-base dark:text-gray-200">
                                        {template.name}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {template.description}
                                    </div>
                                </div>
                                {selectedLayout === template.id && (
                                    <Check className="h-5 w-5 text-blue-500" />
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No templates available
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-center gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={handleConfirm}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus-visible:outline-blue-400 focus-visible:ring-0"
                    >
                        Apply Layout
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
