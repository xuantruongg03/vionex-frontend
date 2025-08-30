import axiosClient from "../apis/api-client";

const login = async (params: { email: string; password: string }) => {
    const response = await axiosClient.post(`/api/auth/login`, params);
    return response;
};

const loginGoogle = async (params: {
    email: string;
    name: string;
    avatar?: string;
    googleId: string;
}) => {
    const response = await axiosClient.post(`/api/auth/google`, params);
    return response;
};

const register = async (params: {
    email: string;
    password: string;
    name: string;
}) => {
    const response = await axiosClient.post(`/api/auth/register`, params);
    return response;
};

const getUserInfo = async () => {
    const response = await axiosClient.get(`/api/auth/info`);
    return response;
};

const logout = async () => {
    const response = await axiosClient.post(`/api/auth/logout`);
    return response;
};

const updateProfile = async (params: { name: string; avatar: string }) => {
    const response = await axiosClient.put(`/api/auth/update-profile`, params);
    return response;
};

const authService = {
    login,
    loginGoogle,
    register,
    getUserInfo,
    logout,
    updateProfile,
};

export default authService;
