import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { updateUser } from "@/redux/actions/auth";
import authService from "@/services/auth";

const updateProfileReq = async (params: { name: string; avatar: string }) => {
    const response = await authService.updateProfile(params);
    return response;
};

const useUpdateProfile = () => {
    const dispatch = useDispatch();

    const { mutateAsync: updateProfile, isPending } = useMutation({
        mutationFn: (params: { name: string; avatar: string }) =>
            updateProfileReq(params),
        onSuccess: (response) => {
            if (response.data.success) {
                // Update user in Redux store
                const updatedUser = response.data.user;
                dispatch(updateUser(updatedUser) as any);
            }
        },
    });

    return { updateProfile, isPending };
};

export default useUpdateProfile;
