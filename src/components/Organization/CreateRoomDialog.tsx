import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VideoPreview from "@/components/VideoPreview";
import useCreateRoomOrg from "@/hooks/org/use-create-room";
import { useCallRefactored as useCall } from "@/hooks/use-call-refactored";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CreateRoomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
}

// Component con để chỉ khởi tạo useCall khi cần thiết
const VideoPreviewSection = ({ user }: { user: any }) => {
    const previewRoomId = "org-preview-mode";
    const { toggleVideo, toggleAudio, localStream } = useCall(previewRoomId);

    return (
        <div className='space-y-4'>
            <div>
                <Label>Preview Your Camera & Audio</Label>
                <VideoPreview
                    userName={user.name}
                    localStream={localStream}
                    toggleVideo={toggleVideo}
                    toggleAudio={toggleAudio}
                />
            </div>
        </div>
    );
};

interface CreateRoomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
}

export const CreateRoomDialog = ({
    open,
    onOpenChange,
    organizationId,
}: CreateRoomDialogProps) => {
    const [roomForm, setRoomForm] = useState({
        name: "",
        description: "",
    });
    const user = useSelector((state: any) => state.auth.user);
    const { createOrgRoom, isPending: isCreatingOrgRoom } = useCreateRoomOrg();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleCreateRoom = async (data: {
        name: string;
        description: string;
    }) => {
        createOrgRoom({
            ...data,
            organizationId: organizationId,
        }).then((response: any) => {
            if (response.success || response.data?.success) {
                const roomId = response.room_id || response.data?.roomId;

                if (!roomId) {
                    toast.error("Room created but failed to get room ID");
                    return;
                }
                dispatch({
                    type: "JOIN_ROOM",
                    payload: {
                        username: user.name,
                        isCreator: true,
                        isOrganizationRoom: true,
                        organizationId: organizationId,
                        roomId: roomId,
                    },
                });

                navigate(`/room/${roomId}`);
                toast.success("Meeting room created successfully!");
            } else {
                toast.error(
                    response.message ||
                        response.data?.message ||
                        "Failed to create room"
                );
            }
        });
    };

    const handleSubmit = async () => {
        if (!roomForm.name.trim()) return;
        await handleCreateRoom(roomForm);
        setRoomForm({ name: "", description: "" });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-6xl'>
                <DialogHeader>
                    <DialogTitle>Create Meeting Room</DialogTitle>
                    <DialogDescription>
                        Create a new secure room for your organization meetings.
                    </DialogDescription>
                </DialogHeader>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    {open && <VideoPreviewSection user={user} />}

                    {/* Right Column - Room Settings */}
                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='room-name'>Room Name</Label>
                            <Input
                                id='room-name'
                                placeholder='Daily Standup'
                                value={roomForm.name}
                                onChange={(e) =>
                                    setRoomForm((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor='room-description'>
                                Description
                            </Label>
                            <Textarea
                                id='room-description'
                                placeholder='Morning team meeting'
                                value={roomForm.description}
                                onChange={(e) =>
                                    setRoomForm((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant='outline'
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                !roomForm.name.trim() || isCreatingOrgRoom
                            }
                            className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        >
                            <CheckCircle className='mr-2 h-4 w-4' />
                            {isCreatingOrgRoom
                                ? "Creating..."
                                : "Create & Join Room"}
                            <ArrowRight className='ml-2 h-4 w-4' />
                        </Button>
                    </motion.div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
