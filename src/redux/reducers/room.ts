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
};

const roomReducer = (state = initialState, action: ActionRoom) => {
    switch (action.type) {
        case ActionRoomType.JOIN_ROOM:
            state = {
                ...state,
                username: action.payload?.username || state.username,
                password: action.payload?.password || state.password,
                isLocked:
                    action.payload?.isLocked !== undefined
                        ? action.payload?.isLocked
                        : state.isLocked,
                isCreator:
                    action.payload?.isCreator !== undefined
                        ? action.payload?.isCreator
                        : state.isCreator,
                // Organization room context
                isOrganizationRoom:
                    action.payload?.isOrganizationRoom !== undefined
                        ? action.payload?.isOrganizationRoom
                        : state.isOrganizationRoom,
                organizationId:
                    action.payload?.organizationId || state.organizationId,
                roomId: action.payload?.roomId || state.roomId,
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
            };
            return state;
        case ActionRoomType.SET_CREATOR:
            const newIsCreator =
                action.payload?.isCreator !== undefined
                    ? action.payload.isCreator
                    : state.isCreator;

            state = {
                ...state,
                isCreator: newIsCreator,
            };

            return state;
        case ActionRoomType.SET_PINNED_USERS:
            const newPinnedUsers = [
                ...state.pinnedUsers,
                action.payload?.pinnedUsers,
            ];
            return {
                ...state,
                pinnedUsers: newPinnedUsers,
            };

        case ActionRoomType.REMOVE_PINNED_USER:
            return {
                ...state,
                pinnedUsers: state.pinnedUsers.filter(
                    ([user]) => user !== action.payload
                ),
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
