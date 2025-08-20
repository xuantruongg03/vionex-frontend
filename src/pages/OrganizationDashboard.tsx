import { CreateOrganizationForm } from "@/components/Organization/CreateOrganizationForm";
import { DashboardOverview } from "@/components/Organization/DashboardOverview";
import { MembersTab } from "@/components/Organization/MembersTab";
import { RoomList } from "@/components/Organization/RoomList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import useCreateOrg from "@/hooks/org/use-create-org";
import { useUserPermissions } from "@/hooks/org/use-user-permissions";
import {
    default as orgService
} from "@/services/orgService";
import { useQueries } from "@tanstack/react-query";
import { Edit } from "lucide-react";
import { toast } from "sonner";

const getMembersReq = async () => {
    const response = await orgService.getMembers();
    return response.data;
};

const getOrgReq = async () => {
    const response = await orgService.getOrganizationInfo();
    return response.data.organization;
};

const getOrgRoomsReq = async () => {
    const response = await orgService.getOrgRooms();
    return response.data;
};

const OrganizationDashboard = () => {
    // Use useQueries to combine all 3 queries
    const [
        { data: organization, isLoading: isLoadingOrg, error: orgError },
        { data: members, isLoading: isLoadingMembers, error: membersError },
        { data: orgRoomsData, isLoading: isLoadingRooms, error: roomsError }
    ] = useQueries({
        queries: [
            {
                queryKey: ["organization"],
                queryFn: getOrgReq,
                retry: 2,
                staleTime: 5 * 60 * 1000, // 5 minutes
            },
            {
                queryKey: ["members"],
                queryFn: getMembersReq,
                // enabled: !!organization, // Only fetch when organization exists
                retry: 2,
                staleTime: 5 * 60 * 1000, // 5 minutes
            },
            {
                queryKey: ["orgRooms"],
                queryFn: getOrgRoomsReq,
                // enabled: !!organization, // Only fetch when organization exists
                retry: 2,
                staleTime: 5 * 60 * 1000, // 5 minutes
            }
        ]
    });

    // Hook
    const { createOrg, isPending: isCreatingOrganization } = useCreateOrg();
    
    // Get user permissions
    const permissions = useUserPermissions(members?.members || []);

    if (isLoadingMembers || isLoadingOrg || isLoadingRooms) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='text-center'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
                    <p>Loading organization...</p>
                </div>
            </div>
        );
    }

    // If no organization exists, show create organization form
    if (!organization) {
        return (
            <CreateOrganizationForm
                onSubmit={async (formData) => {
                    try {
                        const response: any = await createOrg(formData);
                        if (response.success) {
                            toast.success("Organization created successfully!");
                        } else {
                            toast.error(
                                response.message ||
                                    "Failed to create organization"
                            );
                        }
                    } catch (error) {
                        toast.error("Failed to create organization");
                        console.error(error);
                    }
                }}
                isLoading={isCreatingOrganization}
            />
        );
    }

    // Organization dashboard
    return (
        <div className='container mx-auto px-4 py-8'>
            <div className='flex justify-between items-center mb-8'>
                <div>
                    <h1 className='text-3xl font-bold'>{organization.name}</h1>
                    <p className='text-muted-foreground'>
                        {organization.description}
                    </p>
                </div>
                <Badge variant='secondary'>{organization.domain}.vionex</Badge>
            </div>

            <Tabs defaultValue='overview' className='space-y-6'>
                <TabsList className={`grid w-full ${permissions.canManageOrganization ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    <TabsTrigger value='overview'>Overview</TabsTrigger>
                    <TabsTrigger value='members'>Members</TabsTrigger>
                    <TabsTrigger value='rooms'>Rooms</TabsTrigger>
                    {permissions.canManageOrganization && (
                        <TabsTrigger value='settings'>Settings</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value='overview' className='space-y-6'>
                    <DashboardOverview
                        organization={organization}
                        membersCount={members?.members.length}
                        roomsCount={orgRoomsData.length}
                    />
                </TabsContent>

                <TabsContent value='members' className='space-y-6'>
                    <MembersTab members={members || []} />
                </TabsContent>

                <TabsContent value='rooms' className='space-y-6'>
                    <RoomList
                        sessions={orgRoomsData}
                        organizationId={organization.id}
                        members={members?.members || []}
                    />
                </TabsContent>

                {permissions.canManageOrganization && (
                    <TabsContent value='settings' className='space-y-6'>
                        <Card>
                            <CardHeader>
                                <CardTitle>Organization Settings</CardTitle>
                                <CardDescription>
                                    Manage your organization details and
                                    preferences.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                <div>
                                    <Label>Organization Name</Label>
                                    <Input value={organization.name} readOnly />
                                </div>
                                <div>
                                    <Label>Domain</Label>
                                    <Input
                                        value={`${organization.domain}.vionex`}
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <Label>Description</Label>
                                    <Textarea
                                        value={organization.description || ""}
                                        readOnly
                                    />
                                </div>
                                <Button variant='outline'>
                                    <Edit className='w-4 h-4 mr-2' />
                                    Edit Organization
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

export default OrganizationDashboard;
