import { ActionRoom, ActionRoomType } from "../../interfaces/action";

const initialState = {
    username: "",
    password: "",
    isLocked: false,
    isCreator: false,
    pinnedUsers: [],
    // Organization room context
    isOrganizationRoom: false,
    organizationId: null,
    roomId: null,
    // User info for sharing with other participants
    userInfo: null,
    // NEW: Room key for semantic context isolation
    roomKey: null,
};

const roomReducer = (state = initialState, action: ActionRoom) => {
    switch (action.type) {
        case ActionRoomType.JOIN_ROOM:
            state = {
                ...state,
                username: action.payload?.username || state.username,
                password: action.payload?.password || state.password,
                isLocked: action.payload?.isLocked !== undefined ? action.payload?.isLocked : state.isLocked,
                isCreator: action.payload?.isCreator !== undefined ? action.payload?.isCreator : state.isCreator,
                // Organization room context
                isOrganizationRoom: action.payload?.isOrganizationRoom !== undefined ? action.payload?.isOrganizationRoom : state.isOrganizationRoom,
                organizationId: action.payload?.organizationId || state.organizationId,
                roomId: action.payload?.roomId || state.roomId,
                // User info for sharing with other participants
                userInfo: action.payload?.userInfo || state.userInfo,
                // NEW: Store room_key from server
                roomKey: action.payload?.roomKey || state.roomKey,
            };
            return state;
        case ActionRoomType.LEAVE_ROOM:
            state = {
                ...state,
                username: "",
                password: "",
                isLocked: false,
                isCreator: false,
                // Reset organization context
                isOrganizationRoom: false,
                organizationId: null,
                roomId: null,
                // Reset user info
                userInfo: null,
                // Reset room_key
                roomKey: null,
            };
            return state;
        case ActionRoomType.SET_CREATOR:
            const newIsCreator = action.payload?.isCreator !== undefined ? action.payload.isCreator : state.isCreator;

            state = {
                ...state,
                isCreator: newIsCreator,
            };

            return state;
        case ActionRoomType.SET_PINNED_USERS:
            const pinnedUser = action.payload?.pinnedUsers || action.payload;
            // Ensure we don't add duplicate pins
            const existingPins = Array.isArray(state.pinnedUsers) ? state.pinnedUsers : [];
            if (!existingPins.includes(pinnedUser)) {
                return {
                    ...state,
                    pinnedUsers: [...existingPins, pinnedUser],
                };
            }
            return state;

        case ActionRoomType.REMOVE_PINNED_USER:
            return {
                ...state,
                pinnedUsers: state.pinnedUsers.filter((user) => user !== action.payload),
            };

        case ActionRoomType.RESET_PINNED_USER:
            return {
                ...state,
                pinnedUsers: [],
            };

        case ActionRoomType.LOCK_ROOM:
            return {
                ...state,
                isLocked: true,
            };

        case ActionRoomType.UNLOCK_ROOM:
            return {
                ...state,
                isLocked: false,
            };
        case ActionRoomType.RESET:
            return initialState;
        default:
            return state;
    }
};

export default roomReducer;
