
import { Building, Users, VideoIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Organization } from "@/services/orgService";

interface DashboardOverviewProps {
    organization: Organization;
    membersCount: number;
    roomsCount: number;
}

export const DashboardOverview = ({
    organization,
    membersCount,
    roomsCount,
}: DashboardOverviewProps) => {
    return (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                        Total Members
                    </CardTitle>
                    <Users className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                    <div className='text-2xl font-bold'>{membersCount}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                        Meeting Rooms
                    </CardTitle>
                    <VideoIcon className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                    <div className='text-2xl font-bold'>{roomsCount}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                        Domain
                    </CardTitle>
                    <Building className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                    <div className='text-lg font-mono'>
                        {organization.domain}.vionex
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
