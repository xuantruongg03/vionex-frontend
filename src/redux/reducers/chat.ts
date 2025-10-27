import { ActionChat, ActionChatType } from "../../interfaces/action";

const initialState = {
    unreadCount: 0,
};

const chatReducer = (state = initialState, action: ActionChat) => {
    switch (action.type) {
        case ActionChatType.INCREMENT_UNREAD:
            return {
                ...state,
                unreadCount: state.unreadCount + 1,
            };
        case ActionChatType.RESET_UNREAD:
            return {
                ...state,
                unreadCount: 0,
            };
        case ActionChatType.SET_UNREAD:
            return {
                ...state,
                unreadCount: action.payload?.count ?? 0,
            };
        default:
            return state;
    }
};

export default chatReducer;
