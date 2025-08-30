import { VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OrgRoomSession } from "@/services/orgService";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { useState } from "react";
import { useVerifyOrgRoomAccess } from "@/hooks/org";
import { useUserPermissions } from "@/hooks/org/use-user-permissions";

interface RoomListProps {
    sessions: OrgRoomSession[];
    organizationId: string;
    members?: any[];
}

export const RoomList = ({
    sessions,
    organizationId,
    members = [],
}: RoomListProps) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { verifyAccess, isLoading: isVerifying } = useVerifyOrgRoomAccess();
    const permissions = useUserPermissions(members);

    const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
    const user = useSelector((state: any) => state.auth.user);

    const handleJoinRoom = async (roomId: string) => {
        try {
            // Verify room access first using hook
            const verifyResponse = await verifyAccess(roomId);

            if (!verifyResponse.data?.success) {
                toast.error("You don't have access to this room");
                return;
            }

            // Set organization room context in Redux
            dispatch({
                type: "JOIN_ROOM",
                payload: {
                    username: user.name,
                    isOrganizationRoom: true,
                    organizationId: organizationId,
                    roomId: roomId,
                    userInfo: user,
                },
            });

            // Navigate to room with room ID
            navigate(`/room/${roomId}`);
        } catch (error) {
            toast.error(
                "Failed to join room. Please check your access permissions."
            );
            console.error("Join room error:", error);
        }
    };

    if (sessions.length === 0) {
        return (
            <>
                <Card>
                    <CardContent className='text-center py-8'>
                        <VideoIcon className='w-12 h-12 mx-auto mb-4 text-muted-foreground' />
                        <p className='text-muted-foreground'>
                            No meeting rooms created yet
                        </p>
                        {permissions.canCreateRooms && (
                            <Button
                                className='mt-4'
                                onClick={() => setShowCreateRoomDialog(true)}
                            >
                                Create Your Organization Room
                            </Button>
                        )}
                    </CardContent>
                </Card>
                {permissions.canCreateRooms && (
                    <CreateRoomDialog
                        open={showCreateRoomDialog}
                        onOpenChange={setShowCreateRoomDialog}
                        organizationId={organizationId}
                    />
                )}
            </>
        );
    }

    return (
        <div className='grid gap-4'>
            {sessions.map((session) => (
                <Card key={session.roomId}>
                    <CardContent className='flex items-center justify-between p-4'>
                        <div>
                            <h3 className='font-medium'>{session.roomName}</h3>
                            <p className='text-sm text-muted-foreground'>
                                {session.description}
                            </p>
                            <div className='flex items-center gap-4 mt-1'>
                                <p className='text-xs text-muted-foreground'>
                                    ID: {session.displayId}
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                    Created{" "}
                                    {new Date(
                                        session.createdAt
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className='flex items-center gap-2'>
                            <Badge
                                variant={
                                    session.isPublic ? "default" : "secondary"
                                }
                            >
                                {session.isPublic ? "Organization" : "Private"}
                            </Badge>
                            <Button
                                onClick={() => handleJoinRoom(session.roomId)}
                                disabled={isVerifying}
                            >
                                <VideoIcon className='w-4 h-4 mr-2' />
                                {isVerifying ? "Joining..." : "Join"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
            {permissions.canCreateRooms && (
                <CreateRoomDialog
                    open={showCreateRoomDialog}
                    onOpenChange={setShowCreateRoomDialog}
                    organizationId={organizationId}
                />
            )}
        </div>
    );
};
