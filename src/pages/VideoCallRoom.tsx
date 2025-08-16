import { useParams } from "react-router-dom";
import { VideoCallHybrid } from "@/components";

const VideoCallRoom = () => {
    const { roomId } = useParams();

    return (
        <div className="h-screen">
            <VideoCallHybrid roomId={roomId} />
        </div>
    );
};

export default VideoCallRoom;
