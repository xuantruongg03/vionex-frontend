import { UserEvent } from "./behavior";

export interface ActionRoom {
    type: ActionRoomType;
    payload?: {
        username?: string;
        password?: string;
        isLocked?: boolean;
        isCreator?: boolean;
        pinnedUsers?: string[];
        // Organization room context
        isOrganizationRoom?: boolean;
        organizationId?: string;
        roomId?: string;
        // User info for sharing with other participants
        userInfo?: {
            id: string;
            email: string;
            name: string;
            avatar?: string;
        };
    };
}

export enum ActionRoomType {
    JOIN_ROOM = "JOIN_ROOM",
    LEAVE_ROOM = "LEAVE_ROOM",
    SET_CREATOR = "SET_CREATOR",
    SET_PINNED_USERS = "SET_PINNED_USERS",
    REMOVE_PINNED_USER = "REMOVE_PINNED_USER",
    RESET_PINNED_USER = "RESET_PINNED_USER",
    RESET = "RESET",
    LOCK_ROOM = "LOCK_ROOM",
    UNLOCK_ROOM = "UNLOCK_ROOM",
}

export enum ActionVideoType {
    SET_LOCAL_VIDEO_REF = "SET_LOCAL_VIDEO_REF",
    CLEAR_LOCAL_VIDEO_REF = "CLEAR_LOCAL_VIDEO_REF",
}

export interface ActionVideo {
    type: ActionVideoType;
    payload?: {
        localVideoRef: HTMLVideoElement | null;
    };
}

export enum ActionLogType {
    SET_EVENT_LOG = "SET_EVENT_LOG",
    RESET_EVENT_LOG = "RESET_EVENT_LOG",
    SET_MONITOR_ACTIVE = "SET_MONITOR_ACTIVE",
}

export interface ActionLog {
    type: ActionLogType;
    payload: UserEvent[] | { isActive?: boolean };
}

export enum ActionAuthType {
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGOUT = "LOGOUT",
    UPDATE_USER = "UPDATE_USER",
    UPDATE_TOKENS = "UPDATE_TOKENS",
}

export interface ActionAuth {
    type: ActionAuthType;
    payload?: {
        user?: {
            id: string;
            email: string;
            name: string;
            avatar?: string;
        };
        accessToken?: string;
        refreshToken?: string;
    };
}
