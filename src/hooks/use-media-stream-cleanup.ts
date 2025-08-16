import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { mediaStreamService } from "@/services/MediaStreamService";

// Pages that are allowed to use MediaStream
const MEDIA_PAGES = ["/room"];

export const useMediaStreamCleanup = () => {
    const location = useLocation();

    useEffect(() => {
        const currentPath = location.pathname;

        // Check if current path is a media-related page
        const isMediaPage = MEDIA_PAGES.some((page) => {
            // Handle dynamic routes like /room/123
            if (page === "/room") {
                return (
                    currentPath === "/room" || currentPath.startsWith("/room/")
                );
            }
            return currentPath === page;
        });

        // If not on a media page, cleanup the stream
        if (!isMediaPage) {
            mediaStreamService.forceCleanup();
        }
    }, [location.pathname]);

    // Cleanup when component unmounts (app closing)
    useEffect(() => {
        const handleBeforeUnload = () => {
            mediaStreamService.forceCleanup();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);
};
