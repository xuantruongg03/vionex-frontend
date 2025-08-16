import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { X } from "lucide-react";
import { toast } from "sonner";
import CONSTANT from "@/lib/constant";

interface User {
    peerId: string;
    username?: string;
    isCreator?: boolean;
}

interface WhiteboardPermissionsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    allowedUsers: string[];
    onUpdatePermissions: (allowedUsers: string[]) => void;
}

export const WhiteboardPermissionsDialog = ({
    isOpen,
    onClose,
    users,
    allowedUsers,
    onUpdatePermissions,
}: WhiteboardPermissionsDialogProps) => {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([
        ...allowedUsers,
    ]);

    useEffect(() => {
        console.log(
            "🎨 [WhiteboardPermissionsDialog] allowedUsers updated:",
            allowedUsers
        );
        setSelectedUsers([...allowedUsers]);
    }, [allowedUsers]);

    useEffect(() => {
        console.log(
            "🎨 [WhiteboardPermissionsDialog] Dialog opened with users:",
            {
                usersCount: users?.length || 0,
                users: users,
                allowedUsers: allowedUsers,
                isOpen: isOpen,
            }
        );
    }, [isOpen, users, allowedUsers]);

    const handleCheckboxChange = (peerId: string, checked: boolean) => {
        if (checked) {
            if (selectedUsers.length >= CONSTANT.MAX_PERMISSION_WHITEBOARD) {
                toast.error(
                    "Number of users allowed to draw on the whiteboard has reached the limit."
                );
                return;
            }
            setSelectedUsers((prev) => [...prev, peerId]);
        } else {
            setSelectedUsers((prev) => prev.filter((id) => id !== peerId));
        }
    };

    const handleRemoveUser = (peerId: string) => {
        setSelectedUsers((prev) => prev.filter((id) => id !== peerId));
    };

    const handleRemoveAll = () => {
        setSelectedUsers([]);
    };

    const handleSave = () => {
        onUpdatePermissions(selectedUsers);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Manager Whiteboard Permissions</DialogTitle>
                    <DialogDescription>
                        Select users who are allowed to draw on the whiteboard. Users
                        not selected will only be able to view.
                        <br />
                        <span className="text-sm text-blue-600 mt-1 block">
                            Max {CONSTANT.MAX_PERMISSION_WHITEBOARD} persons.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium">
                        Users allowed to draw ({selectedUsers.length}/
                        {CONSTANT.MAX_PERMISSION_WHITEBOARD})
                    </span>
                    {selectedUsers.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveAll}
                            className="text-red-600 hover:text-red-700"
                        >
                            Remove all permissions
                        </Button>
                    )}
                </div>
                <ScrollArea className="mt-2 max-h-[300px]">
                    {!users || users.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            No users in the room
                        </div>
                    ) : (
                        users.map((user) => {
                            // Room creator always has drawing permissions and cannot be changed
                            if (user.isCreator) {
                                return (
                                    <div
                                        key={user.peerId}
                                        className="flex items-center justify-between py-2 opacity-75"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={user.peerId}
                                                checked={true}
                                                disabled={true}
                                            />
                                            <label
                                                htmlFor={user.peerId}
                                                className="text-sm font-medium leading-none"
                                            >
                                                {user.username || user.peerId}
                                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    Room creator
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                );
                            }

                            const isChecked = selectedUsers.includes(
                                user.peerId
                            );

                            return (
                                <div
                                    key={user.peerId}
                                    className="flex items-center justify-between py-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={user.peerId}
                                            checked={isChecked}
                                            onCheckedChange={(checked) =>
                                                handleCheckboxChange(
                                                    user.peerId,
                                                    checked === true
                                                )
                                            }
                                        />
                                        <label
                                            htmlFor={user.peerId}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {user.username || user.peerId}
                                        </label>
                                    </div>

                                    {isChecked && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() =>
                                                handleRemoveUser(user.peerId)
                                            }
                                            title="Remove drawing permission"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </ScrollArea>

                <DialogFooter className="flex justify-between">
                    <div className="text-xs text-gray-500">
                        Room creator always has drawing permissions
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={
                                selectedUsers.length === 0 &&
                                allowedUsers.length === 0
                            }
                        >
                            Save changes
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
