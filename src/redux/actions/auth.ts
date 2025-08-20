import { ActionAuth, ActionAuthType } from "@/interfaces/action";

export const loginSuccess = (
    user: { id: string; email: string; name: string; avatar?: string },
): ActionAuth => ({
    type: ActionAuthType.LOGIN_SUCCESS,
    payload: {
        user,
    },
});

export const logout = (): ActionAuth => ({
    type: ActionAuthType.LOGOUT,
});

export const updateUser = (user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
}): ActionAuth => ({
    type: ActionAuthType.UPDATE_USER,
    payload: {
        user,
    },
});

export const updateTokens = (
    accessToken: string,
    refreshToken: string
): ActionAuth => ({
    type: ActionAuthType.UPDATE_TOKENS,
    payload: {
        accessToken,
        refreshToken,
    },
});
