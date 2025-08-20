import { useSelector } from "react-redux";
import { useMemo } from "react";

interface RootState {
    auth: {
        user: {
            id: string;
            email: string;
            name: string;
        } | null;
    };
}

interface Member {
    id: string;
    email: string;
    name: string;
    role: "owner" | "member";
    joinedAt: string;
}

interface UserPermissions {
    isOwner: boolean;
    isMember: boolean;
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canCreateRooms: boolean;
    canManageOrganization: boolean;
    userRole: "owner" | "member" | null;
}

/**
 * Hook để lấy quyền của user hiện tại trong organization
 */
export const useUserPermissions = (members: Member[] = []): UserPermissions => {
    const currentUser = useSelector((state: RootState) => state.auth.user);

    const permissions = useMemo((): UserPermissions => {
        if (!currentUser) {
            return {
                isOwner: false,
                isMember: false,
                canInviteMembers: false,
                canRemoveMembers: false,
                canCreateRooms: false,
                canManageOrganization: false,
                userRole: null,
            };
        }

        // Tìm thông tin member của user hiện tại
        const currentMember = members.find(
            (member) =>
                member.email === currentUser.email ||
                member.id === currentUser.id
        );

        const isOwner = currentMember?.role === "owner";
        const isMember = !!currentMember;

        return {
            isOwner,
            isMember,
            canInviteMembers: isOwner, // Chỉ owner mới có thể mời thành viên
            canRemoveMembers: isOwner, // Chỉ owner mới có thể xóa thành viên
            canCreateRooms: isMember, // Cả owner và member đều có thể tạo room
            canManageOrganization: isOwner, // Chỉ owner mới có thể quản lý organization
            userRole: currentMember?.role || null,
        };
    }, [currentUser, members]);

    return permissions;
};

export default useUserPermissions;
