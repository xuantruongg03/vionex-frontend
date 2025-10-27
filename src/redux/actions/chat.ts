import { ActionChat, ActionChatType } from "../../interfaces/action";

export const incrementUnreadCount = (): ActionChat => ({
    type: ActionChatType.INCREMENT_UNREAD,
});

export const resetUnreadCount = (): ActionChat => ({
    type: ActionChatType.RESET_UNREAD,
});

export const setUnreadCount = (count: number): ActionChat => ({
    type: ActionChatType.SET_UNREAD,
    payload: { count },
});
