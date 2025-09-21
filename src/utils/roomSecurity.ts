/**
 * Check if a room ID is an organization room
 */
export const isOrganizationRoomToken = (roomId: string): boolean => {
    return roomId.startsWith("org_");
};

/**
 * Extract room session info from room ID (client-side only for routing)
 */
export const getRoomSessionMetadata = (roomId: string) => {
    if (!isOrganizationRoomToken(roomId)) {
        return null;
    }

    // Client side can identify it's an org room
    return {
        isOrganizationRoom: true,
        roomId,
    };
};

/**
 * Generate a display name for organization room (for UI purposes)
 */
export const generateRoomDisplayId = (roomId: string): string => {
    if (!isOrganizationRoomToken(roomId)) {
        return roomId;
    }

    // For org rooms, show first 8 characters
    return roomId.substring(0, 8).toUpperCase();
};

/**
 * Validate room token format (client-side basic validation)
 */
export const isValidRoomToken = (token: string): boolean => {
    if (!token || typeof token !== "string") {
        return false;
    }

    // Regular room ID (6 characters)
    if (/^[a-zA-Z0-9]{6}$/.test(token)) {
        return true;
    }

    // Organization room ID - starts with org_
    if (isOrganizationRoomToken(token)) {
        return /^org_[a-zA-Z0-9_-]+$/.test(token);
    }

    return false;
};
