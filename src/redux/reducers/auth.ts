import { ActionAuth, ActionAuthType } from "../../interfaces/action";

interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
}

const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
};

const authReducer = (state = initialState, action: ActionAuth): AuthState => {
    switch (action.type) {
        case ActionAuthType.LOGIN_SUCCESS:
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload?.user || null,
                accessToken: action.payload?.accessToken || null,
                refreshToken: action.payload?.refreshToken || null,
            };

        case ActionAuthType.LOGOUT:
            return {
                ...initialState,
            };

        case ActionAuthType.UPDATE_USER:
            return {
                ...state,
                user: action.payload?.user || state.user,
            };

        case ActionAuthType.UPDATE_TOKENS:
            return {
                ...state,
                accessToken: action.payload?.accessToken || state.accessToken,
                refreshToken:
                    action.payload?.refreshToken || state.refreshToken,
            };

        default:
            return state;
    }
};

export default authReducer;
