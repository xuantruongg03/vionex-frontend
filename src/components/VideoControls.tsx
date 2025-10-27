import { useIsMobile } from "@/hooks/use-mobile";
import * as Icon from "../lib/icon";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface VideoControlsProps {
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isRecording: boolean;
    isProcessing: boolean;
    isCreator?: boolean;
    isMonitorActive?: boolean;
    isHandRaised?: boolean;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onToggleChat: () => void;
    onToggleWhiteboard: () => void;
    onToggleScreenShare: () => void;
    onToggleLockRoom: () => void;
    onToggleNetworkMonitor: () => void;
    onToggleVoting: () => void;
    onToggleQuiz: () => void;
    onToggleRecording: () => void;
    onLeaveRoom: () => void;
    onToggleTranslationCabin: () => void;
    onToggleBehaviorMonitoring: () => void;
    onToggleLayout: () => void;
    onToggleRaiseHand: () => void;
}

export const VideoControls = ({ isMuted, isVideoOff, onToggleMute, onToggleVideo, onToggleChat, onToggleWhiteboard, onToggleScreenShare, onToggleLockRoom, onToggleNetworkMonitor, onToggleVoting, onToggleQuiz, onToggleRecording, onLeaveRoom, onToggleBehaviorMonitoring, onToggleTranslationCabin, onToggleLayout, onToggleRaiseHand, isScreenSharing, isRecording, isProcessing, isCreator = false, isMonitorActive = false, isHandRaised = false }: VideoControlsProps) => {
    const room = useSelector((state: any) => state.room);
    const unreadMessageCount = useSelector((state: any) => state.chat.unreadCount);
    
    const isMobile = useIsMobile();
    const [showControls, setShowControls] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (!showControls) {
        return (
            <Button variant='outline' size='icon' onClick={() => setShowControls(true)} className='absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-xl z-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border dark:border-gray-600 h-10 w-10'>
                <div className='flex items-center justify-center w-5 h-5'>
                    <Icon.ChevronUp className='dark:text-gray-300' />
                </div>
            </Button>
        );
    }

    // Primary controls that are always visible
    const primaryControls = [
        {
            key: "ghost",
            title: "Hidden controls",
            onClick: () => setShowControls(false),
            icon: <Icon.ChevronDown />,
            className: "bg-white hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600",
        },
        {
            key: "mute",
            title: "Microphone",
            onClick: onToggleMute,
            icon: isMuted ? <Icon.MicOff /> : <Icon.Mic />,
            className: isMuted ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-800/60 dark:text-gray-200" : "dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
        },
        {
            key: "video",
            title: "Camera",
            onClick: onToggleVideo,
            icon: isVideoOff ? <Icon.VideoOff /> : <Icon.Video />,
            className: isVideoOff ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-800/60 dark:text-gray-200" : "dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
        },
        {
            key: "screen",
            title: "Screen Share",
            onClick: onToggleScreenShare,
            icon: isScreenSharing ? <Icon.ScreenShareOff /> : <Icon.ScreenShare />,
            className: isScreenSharing ? "bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/50 dark:text-gray-200" : "dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
        },
        {
            key: "raise-hand",
            title: isHandRaised ? "Lower Hand" : "Raise Hand",
            onClick: onToggleRaiseHand,
            icon: <Icon.Hand />,
            className: isHandRaised ? "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-800/60 dark:text-yellow-700 dark:hover:text-yellow-600" : "dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
        },
        ...(isMobile
            ? []
            : [
                  {
                      key: "chat",
                      title: "Chat",
                      onClick: onToggleChat,
                      icon: (
                          <div className='relative'>
                              <Icon.MessageCircle />
                              {unreadMessageCount > 0 && <span className='absolute -top-1 -right-1 bg-red-500 rounded-full h-2 w-2 animate-pulse border border-white dark:border-gray-800' />}
                          </div>
                      ),
                      className: "dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
                  },
              ]),
        {
            key: "leave",
            title: "Leave",
            onClick: onLeaveRoom,
            icon: <Icon.LogOut />,
            className: "bg-red-500 hover:bg-red-600 text-white dark:bg-red-700 dark:hover:bg-red-800",
            variant: "destructive" as const,
        },
    ];

    // Secondary controls that appear in the dropdown on small screens
    const secondaryControls = [
        ...(isMobile
            ? [
                  {
                      key: "chat",
                      title: "Chat",
                      onClick: onToggleChat,
                      icon: (
                          <div className='relative'>
                              <Icon.MessageCircle />
                              {unreadMessageCount > 0 && <span className='absolute -top-1 -right-1 bg-red-500 rounded-full h-2 w-2 border border-white dark:border-gray-700' />}
                          </div>
                      ),
                      className: "",
                      variant: "outline" as const,
                  },
              ]
            : []),
        ...(isCreator
            ? [
                  {
                      key: "behavior",
                      title: "Behavior monitoring",
                      onClick: onToggleBehaviorMonitoring,
                      icon: <Icon.Cctv />,
                      className: isMonitorActive ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-800/60 dark:text-gray-200" : "",
                      variant: "outline" as const,
                  },
              ]
            : []),
        // {
        //     key: "record",
        //     title: "Record meeting",
        //     onClick: isProcessing ? undefined : onToggleRecording,
        //     icon: isProcessing ? (
        //         <Icon.Loader2 className="animate-spin dark:text-gray-300" />
        //     ) : isRecording ? (
        //         <Icon.Disc2
        //             className="dark:text-red-400"
        //             color={isMobile ? "red" : undefined}
        //         />
        //     ) : (
        //         <Icon.DiscAlbum className="dark:text-gray-300" />
        //     ),
        //     className: isProcessing
        //         ? "bg-yellow-100 cursor-not-allowed dark:bg-yellow-900/30 dark:text-gray-300"
        //         : isRecording
        //         ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-800/60 dark:text-gray-200"
        //         : "",
        //     variant: "outline" as const,
        // },
        {
            key: "whiteboard",
            title: "Whiteboard",
            onClick: onToggleWhiteboard,
            icon: <Icon.PenLine />,
            className: "",
            variant: "outline" as const,
        },
        {
            key: "lock",
            title: "Lock/Unlock room",
            onClick: onToggleLockRoom,
            icon: room.isLocked ? <Icon.Lock /> : <Icon.LockOpen />,
            className: "",
            variant: "outline" as const,
        },
        {
            key: "network",
            title: "Network monitoring",
            onClick: onToggleNetworkMonitor,
            icon: <Icon.Activity />,
            className: "",
            variant: "outline" as const,
        },
        {
            key: "voting",
            title: "Voting",
            onClick: onToggleVoting,
            icon: <Icon.Vote />,
            className: "",
            variant: "outline" as const,
        },
        {
            key: "quiz",
            title: "Quiz",
            onClick: onToggleQuiz,
            icon: <Icon.BookCheck />,
            className: "",
            variant: "outline" as const,
        },
        {
            key: "translation",
            title: "Live Translate",
            onClick: onToggleTranslationCabin,
            icon: <Icon.Languages />,
            className: "",
            variant: "outline" as const,
        },
        {
            key: "layout",
            title: "Layout",
            onClick: () => {
                setDropdownOpen(false);
                onToggleLayout();
            },
            icon: <Icon.Grid />,
            className: "",
            variant: "outline" as const,
            isLayoutSelector: true,
        },
    ];

    // Find the Leave Room button and remove it from primary controls for separate rendering
    const leaveRoomButton = primaryControls.find((btn) => btn.key === "leave");
    const otherPrimaryControls = primaryControls.filter((btn) => btn.key !== "leave");

    return (
        <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-white p-3 md:p-3.5 rounded-full shadow-xl z-50 dark:bg-gray-900 dark:border dark:border-gray-700 transition-all duration-300 min-w-[280px]'>
            <div ref={scrollContainerRef} className={`flex items-center justify-between overflow-x-auto snap-x snap-mandatory max-w-[400px] no-scrollbar`}>
                {/* Left side: Primary controls except Leave Room */}
                <div className='flex items-center gap-2 md:gap-3'>
                    {otherPrimaryControls.map((button) => (
                        <div key={button.key} className='snap-start'>
                            {" "}
                            <Button variant={button.variant || "outline"} size='icon' title={button.title} onClick={button.onClick} className={`${button.className} h-10 w-10 md:h-10 md:w-10`} disabled={button.onClick === undefined}>
                                <div className='flex items-center justify-center w-5 h-5'>{button.icon}</div>
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Controls on right side: Three dots menu and Leave Room button */}
                <div className='flex items-center gap-2 md:gap-3'>
                    {/* Three dots dropdown for secondary controls */}
                    {secondaryControls.length > 0 && (
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant='outline' size='icon' className='dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 h-10 w-10 md:h-10 md:w-10 ml-2' aria-label='More video controls' aria-expanded={dropdownOpen} aria-haspopup='menu'>
                                    <div className='flex items-center justify-center w-5 h-5'>
                                        <Icon.MoreVertical aria-hidden='true' />
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='start' side='top' sideOffset={8} className='w-56 p-2 rounded-xl shadow-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700' role='menu' aria-label='Video controls menu'>
                                {secondaryControls.map((item) => {
                                    return (
                                        <DropdownMenuItem key={item.key} onClick={item.onClick} disabled={item.onClick === undefined} className='flex items-center gap-3 py-3 px-3 my-1 cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700 focus:bg-gray-100' role='menuitem'>
                                            <span className='w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-full'>
                                                <div className='flex items-center justify-center w-5 h-5' aria-hidden='true'>
                                                    {item.icon}
                                                </div>
                                            </span>
                                            <span className='text-sm font-medium dark:text-gray-200'>{item.title}</span>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Leave Room button (always at the end) */}
                    {leaveRoomButton && (
                        <div className='snap-start'>
                            <Button variant={leaveRoomButton.variant || "outline"} size='icon' title={leaveRoomButton.title} onClick={leaveRoomButton.onClick} className={`${leaveRoomButton.className} h-10 w-10 md:h-10 md:w-10 ml-1`}>
                                <div className='flex items-center justify-center w-5 h-5'>{leaveRoomButton.icon}</div>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
