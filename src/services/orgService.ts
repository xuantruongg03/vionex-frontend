import axiosClient from "../apis/api-client";

export interface Organization {
    id: string;
    name: string;
    domain: string;
    description?: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Member {
    id: string;
    email: string;
    name: string;
    role: "owner" | "member";
    joinedAt: string;
}

export interface OrganizationRoom {
    id: string;
    name: string;
    description?: string;
    is_public: boolean;
    organization_id: string;
    created_at: string;
    updated_at: string;
}

export interface CreateOrganizationRequest {
    name: string;
    domain: string;
    description?: string;
}

export interface CreateMemberRequest {
    name: string;
}

export interface CreateOrgRoomRequest {
    name: string;
    description?: string;
    isPublic?: boolean;
    password?: string;
    organizationId?: string;
}

export interface OrgRoomSession {
    roomId: string; // Direct room ID (org_xxxx format)
    roomName: string;
    description?: string;
    isPublic: boolean;
    createdAt: string;
    displayId: string;
}

// Organization Management
const createOrganization = (data: CreateOrganizationRequest) => {
    return axiosClient.post("/api/organizations", data);
};

const getOrganizationInfo = () => {
    return axiosClient.get("/api/organizations");
};

const updateOrganization = (data: Partial<CreateOrganizationRequest>) => {
    return axiosClient.put("/api/organizations", data);
};

// Member Management
const createMember = (data: CreateMemberRequest) => {
    return axiosClient.post("/api/organizations/members/create", data);
};

const getMembers = () => {
    return axiosClient.get("/api/organizations/members");
};

const removeMember = (memberId: string) => {
    return axiosClient.delete(`/api/organizations/members/${memberId}/`);
};

// Organization Room Management
const getOrgRooms = () => {
    return axiosClient.get("/api/organizations/rooms");
};

const createOrgRoom = (data: CreateOrgRoomRequest) => {
    return axiosClient.post("/api/room/org/create", {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        password: data.password,
        organizationId: data.organizationId,
    });
};

const joinOrgRoom = (roomId: string, peerId: string) => {
    return axiosClient.post("/api/room/org/join", {
        roomId,
        peerId,
    });
};

const verifyOrgRoomAccess = (roomId: string) => {
    return axiosClient.post("/api/room/org/verify", {
        roomId,
    });
};

export default {
    createOrganization,
    getOrganizationInfo,
    updateOrganization,
    createMember,
    getMembers,
    removeMember,
    getOrgRooms,
    createOrgRoom,
    joinOrgRoom,
    verifyOrgRoomAccess,
};
