/*!
 * Copyright (c) 2025 xuantruongg003
 *
 * This software is licensed for non-commercial use only.
 * You may use, study, and modify this code for educational and research purposes.
 *
 * Commercial use of this code, in whole or in part, is strictly prohibited
 * without prior written permission from the author.
 *
 * Author Contact: lexuantruong098@gmail.com
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Member } from "@/services/orgService";

interface TeamMembersProps {
    members: Member[];
}

export const TeamMembers = ({ members }: TeamMembersProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
                {members.slice(0, 5).map((member) => (
                    <div
                        key={member.id}
                        className='flex items-center justify-between py-2'
                    >
                        <div>
                            <p className='font-medium'>{member.name}</p>
                            <p className='text-sm text-muted-foreground'>
                                {member.email}
                            </p>
                        </div>
                        <Badge
                            variant={
                                member.role === "owner"
                                    ? "default"
                                    : "secondary"
                            }
                        >
                            {member.role}
                        </Badge>
                    </div>
                ))}
                {members.length === 0 && (
                    <p className='text-muted-foreground'>No members yet</p>
                )}
            </CardContent>
        </Card>
    );
};
