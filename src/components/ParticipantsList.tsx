import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useSocket } from "@/contexts/SocketContext";
import { User } from "@/interfaces";
import { FileSpreadsheet, Pin, PinOff, Users, UserX } from "lucide-react";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

export const ParticipantsList = React.memo(
    ({
        roomId,
        togglePinUser,
        handleKickUser,
        users,
    }: {
        roomId: string;
        togglePinUser?: (peerId: string) => void;
        handleKickUser?: (peerId: string) => void;
        users: User[];
    }) => {
        const room = useSelector((state: any) => state.room);
        const { isCreator, username: myName, pinnedUsers } = room;
        const log = useSelector((state: any) => state.log);
        const { socket: sfuSocket } = useSocket();
        const { isMonitorActive } = log;

        const usersList = useMemo(() => {
            if (!users) return [];
            return users.map((user) => ({
                ...user,
                isMe: user.peerId === myName,
                isPinned: pinnedUsers.some((arr) => arr.includes(user.peerId)),
                displayName:
                    user.peerId === myName
                        ? user.isCreator
                            ? `${user.peerId} - You (Creator)`
                            : `${user.peerId} - You`
                        : user.isCreator
                        ? `${user.peerId} - Creator`
                        : user.peerId,
            }));
        }, [users, myName, pinnedUsers]);

        const userCount = useMemo(() => {
            return usersList.length;
        }, [usersList]);

        const handleRemoveParticipant = (peerId: string) => {
            if (isCreator) {
                handleKickUser(peerId);
            } else {
                toast.error("You can't remove participants");
            }
        };

        const handleDownloadUserLog = async (userId: string) => {
            if (!isCreator) {
                toast.error("You can't download user logs");
                return;
            }

            try {
                sfuSocket.emit(
                    "sfu:download-user-log",
                    {
                        roomId,
                        peerId: userId,
                        creatorId: myName,
                    },
                    (file: any) => {
                        if (file && file.success) {
                            window.URL.revokeObjectURL(file.file);
                            const blob = new Blob([file.file], {
                                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `behavior-logs-${roomId}-${userId}-${new Date()
                                .toISOString()
                                .slice(0, 10)}.xlsx`;
                            document.body.appendChild(a);
                            a.click();

                            setTimeout(() => {
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                            }, 100);

                            toast.success(
                                `Downloaded log file for user ${userId}`
                            );
                        } else if (file && !file.success) {
                            toast.error(
                                file.error || "Failed to download log file"
                            );
                        }
                    }
                );
            } catch (error) {
                console.error("Download user log error:", error);
                toast.error("Failed to download user logs");
            }
        };

        const handleTogglePin = (peerId: string) => {
            if (togglePinUser) {
                togglePinUser(peerId);
            }
        };

        return (
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant='outline' size='icon' className='relative'>
                        <Users className='h-4 w-4' />
                        <span className='absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center'>
                            {userCount}
                        </span>
                    </Button>
                </SheetTrigger>
                <SheetContent showIcon className='overflow-y-auto'>
                    <SheetHeader>
                        <SheetTitle>Participants ({userCount})</SheetTitle>
                    </SheetHeader>
                    <div className='mt-4 flex flex-col h-[calc(100vh-120px)]'>
                        <div className='overflow-y-auto flex-1 pr-2'>
                            <div className='space-y-2'>
                                {usersList.map((user) => (
                                    <div
                                        key={user.peerId}
                                        className='flex items-center justify-between p-3 rounded-lg hover:bg-secondary'
                                    >
                                        <div className='flex items-center gap-3 min-w-0 flex-1'>
                                            {/* Avatar */}
                                            <div className='w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0'>
                                                {user.userInfo?.avatar ? (
                                                    <img
                                                        src={
                                                            user.userInfo.avatar
                                                        }
                                                        alt={user.peerId}
                                                        className='w-full h-full object-cover rounded-full'
                                                        onError={(e) => {
                                                            // Fallback to initial if image fails to load
                                                            const target =
                                                                e.target as HTMLImageElement;
                                                            const parent =
                                                                target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white text-sm font-semibold">${user.peerId
                                                                    .charAt(0)
                                                                    .toUpperCase()}</div>`;
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className='w-full h-full flex items-center justify-center text-white text-sm font-semibold'>
                                                        {user.peerId
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                )}
                                            </div>

                                            {/* User info */}
                                            <div className='min-w-0 flex-1'>
                                                <div className='text-sm truncate font-medium'>
                                                    {user.displayName}
                                                </div>
                                                {/* Email display with smaller font */}
                                                {user.userInfo?.email && (
                                                    <div className='text-xs text-muted-foreground truncate mt-0.5'>
                                                        {user.userInfo.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {!user.isMe && (
                                            <div className='flex gap-2 flex-shrink-0'>
                                                {togglePinUser && (
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        className={`hover:bg-blue-50 ${
                                                            user.isPinned
                                                                ? "text-blue-500 hover:text-blue-700"
                                                                : "text-gray-500 hover:text-blue-500"
                                                        }`}
                                                        onClick={() =>
                                                            handleTogglePin(
                                                                user.peerId
                                                            )
                                                        }
                                                        title={
                                                            user.isPinned
                                                                ? "Unpin user"
                                                                : "Pin user"
                                                        }
                                                    >
                                                        {user.isPinned ? (
                                                            <PinOff className='h-4 w-4' />
                                                        ) : (
                                                            <Pin className='h-4 w-4' />
                                                        )}
                                                    </Button>
                                                )}
                                                {isCreator &&
                                                    isMonitorActive && (
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            className='text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                                                            onClick={() =>
                                                                handleDownloadUserLog(
                                                                    user.peerId
                                                                )
                                                            }
                                                            title='Download user activity log'
                                                        >
                                                            <FileSpreadsheet className='h-4 w-4' />
                                                        </Button>
                                                    )}
                                                {isCreator && (
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                        onClick={() =>
                                                            handleRemoveParticipant(
                                                                user.peerId
                                                            )
                                                        }
                                                    >
                                                        <UserX className='h-4 w-4' />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }
);
