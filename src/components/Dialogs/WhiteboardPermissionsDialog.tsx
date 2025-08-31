import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
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

const WhiteboardPermissionsDialog = React.memo(({ isOpen, onClose, users, allowedUsers, onUpdatePermissions }: WhiteboardPermissionsDialogProps) => {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([...allowedUsers]);

    // Sync selected users when allowedUsers prop changes
    useEffect(() => {
        setSelectedUsers([...allowedUsers]);
    }, [allowedUsers]);

    // Memoized handlers to prevent unnecessary re-renders
    const handleCheckboxChange = useCallback(
        (peerId: string, checked: boolean) => {
            if (checked) {
                if (selectedUsers.length >= CONSTANT.MAX_PERMISSION_WHITEBOARD) {
                    toast.error("Number of users allowed to draw on the whiteboard has reached the limit.");
                    return;
                }
                setSelectedUsers((prev) => [...prev, peerId]);
            } else {
                setSelectedUsers((prev) => prev.filter((id) => id !== peerId));
            }
        },
        [selectedUsers.length]
    );

    const handleRemoveUser = useCallback((peerId: string) => {
        setSelectedUsers((prev) => prev.filter((id) => id !== peerId));
    }, []);

    const handleRemoveAll = useCallback(() => {
        setSelectedUsers([]);
    }, []);

    const handleSave = useCallback(() => {
        onUpdatePermissions(selectedUsers);
        onClose();
    }, [onUpdatePermissions, selectedUsers, onClose]);

    // Memoized computed values
    const computedValues = useMemo(
        () => ({
            hasSelectedUsers: selectedUsers.length > 0,
            selectedCount: selectedUsers.length,
            maxUsers: CONSTANT.MAX_PERMISSION_WHITEBOARD,
            isSaveDisabled: selectedUsers.length === 0 && allowedUsers.length === 0,
        }),
        [selectedUsers.length, allowedUsers.length]
    );

    // Memoized user list to prevent unnecessary re-renders - Creator excluded from list
    const userListItems = useMemo(() => {
        if (!users || users.length === 0) {
            return <div className='text-center py-4 text-gray-500'>No users in the room</div>;
        }

        // Filter out creator from the list - creator always has permission by default
        const nonCreatorUsers = users.filter((user) => !user.isCreator);

        if (nonCreatorUsers.length === 0) {
            return <div className='text-center py-4 text-gray-500'>No other users to manage permissions for</div>;
        }

        return nonCreatorUsers.map((user) => {
            const isChecked = selectedUsers.includes(user.peerId);

            return (
                <div key={user.peerId} className='flex items-center justify-between py-2'>
                    <div className='flex items-center space-x-2'>
                        <Checkbox id={user.peerId} checked={isChecked} onCheckedChange={(checked) => handleCheckboxChange(user.peerId, checked === true)} />
                        <label htmlFor={user.peerId} className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                            {user.username || user.peerId}
                        </label>
                    </div>

                    {isChecked && (
                        <Button variant='ghost' size='sm' className='h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50' onClick={() => handleRemoveUser(user.peerId)} title='Remove drawing permission'>
                            <X className='h-4 w-4' />
                        </Button>
                    )}
                </div>
            );
        });
    }, [users, selectedUsers, handleCheckboxChange, handleRemoveUser]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className='sm:max-w-[425px]' aria-describedby='whiteboard-permissions-description'>
                <DialogHeader>
                    <DialogTitle>Manager Whiteboard Permissions</DialogTitle>
                    <DialogDescription id='whiteboard-permissions-description'>
                        Select users who are allowed to draw on the whiteboard. Users not selected will only be able to view.
                        <br />
                        <span className='text-sm text-blue-600 mt-1 block'>Max {computedValues.maxUsers} persons.</span>
                    </DialogDescription>
                </DialogHeader>

                <div className='flex justify-between items-center mb-4'>
                    <span className='text-sm font-medium'>
                        Users allowed to draw ({computedValues.selectedCount}/{computedValues.maxUsers})
                    </span>
                    {computedValues.hasSelectedUsers && (
                        <Button variant='outline' size='sm' onClick={handleRemoveAll} className='text-red-600 hover:text-red-700'>
                            Remove all permissions
                        </Button>
                    )}
                </div>
                <ScrollArea className='mt-2 max-h-[300px]'>{userListItems}</ScrollArea>

                <DialogFooter className='flex justify-between'>
                    <div className='text-xs text-gray-500'>Room creator has permanent drawing permissions</div>
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={computedValues.isSaveDisabled}>
                            Save changes
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

WhiteboardPermissionsDialog.displayName = "WhiteboardPermissionsDialog";

export { WhiteboardPermissionsDialog };
