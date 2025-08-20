import axios from "axios";
import { stringify } from "qs";
import { toast } from "sonner";

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL,
    headers: {
        "content-type": "application/json",
    },
    paramsSerializer: (params) => stringify(params, { encode: false }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleError = (e: any) => {
    // Check if not has internet by error ER_NETWORK ==> show toast
    if (e.code === "ERR_NETWORK") {
        // Show toast notification for network error
        toast.error("Server is unavailable");
    }
    throw e;
};

export const uploadFile = async (
    file: File,
    url: string,
    method: string = "POST"
) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await axiosClient({
            method: method,
            url: url,
            data: formData,
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response;
    } catch (error) {
        handleError(error);
    }
};

export const downloadFile = async (url: string, defaultFileName: string) => {
    const response = await fetch(url, {
        method: "GET",
    });
    const contentDisposition = response.headers.get("Content-Disposition");
    const fileNameMatch =
        contentDisposition && contentDisposition.match(/filename="?(.+)"?/i);
    const fileName =
        fileNameMatch && fileNameMatch[1] ? fileNameMatch[1] : defaultFileName;
    const buffer = await response.arrayBuffer();
    return { buffer, fileName };
};

axiosClient.interceptors.request.use(async (config) => {
    // Use accessToken instead of token
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosClient.interceptors.response.use((response) => {
    if (response && response.data) {
        // Set access token and refresh token if has
        if (response.data?.access_token) {
            localStorage.setItem("accessToken", response.data.access_token);
        }
        if (response.data?.data?.accessToken) {
            localStorage.setItem("accessToken", response.data.data.accessToken);
        }

        if (response.data?.refresh_token) {
            localStorage.setItem("refreshToken", response.data.refresh_token);
        }
        if (response.data?.data?.refreshToken) {
            localStorage.setItem(
                "refreshToken",
                response.data.data.refreshToken
            );
        }
        return response.data;
    }
    return response;
}, handleError);

export default axiosClient;
