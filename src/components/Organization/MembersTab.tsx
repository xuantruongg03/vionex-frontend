import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useCreateMember from "@/hooks/org/use-create-member";
import useRemoveMember from "@/hooks/org/use-remove-member";
import { useUserPermissions } from "@/hooks/org/use-user-permissions";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MemberData {
    id: string;
    email: string;
    name: string;
    role: string;
    password?: string;
    joinedAt: string;
}

export const MembersTab = ({ members }: any) => {
    const [showDialog, setShowDialog] = useState(false);
    const [data, setData] = useState<MemberData | null>(null);
    const [formData, setFormData] = useState({ name: "" });
    const queryClient = useQueryClient();

    const { createMember, isPending: isCreatingMember } = useCreateMember();
    const { removeMember, isPending: isRemovingMember } = useRemoveMember();
    const permissions = useUserPermissions(members?.members || []);

    const copyToClipboard = async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${type} copied to clipboard!`);
        } catch (error) {
            toast.error("Failed to copy to clipboard");
        }
    };

    const handleInviteMember = async (data: { name: string }) => {
        await createMember({
            name: data.name,
        }).then((response: any) => {
            if (response.data.success) {
                toast.success("Member invited successfully!");
                setData({
                    id: response.data.member.id,
                    email: response.data.member.email,
                    name: response.data.member.name,
                    role: response.data.member.role,
                    password: response.data.member?.password,
                    joinedAt: response.data.member.joinedAt,
                });
                setFormData({ name: "" });
                queryClient.invalidateQueries({ queryKey: ["members"] });
                // Don't close dialog immediately - show success state
            } else {
                toast.error(response.message || "Failed to invite member");
            }
        });
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) return;
        await handleInviteMember(formData);
    };

    const handleRemoveMember = async (memberId: string) => {
        await removeMember({ memberId }).then((response: any) => {
            if (response.success) {
                toast.success("Member removed successfully!");
                queryClient.invalidateQueries({ queryKey: ["members"] });
            } else {
                toast.error(response.message || "Failed to remove member");
            }
        });
    };

    const handleCloseDialog = () => {
        setShowDialog(false);
        setData(null); // Clear success data when closing dialog
        setFormData({ name: "" }); // Reset form
    };

    return (
        <div className='space-y-6'>
            <div className='flex justify-between items-center'>
                <h2 className='text-2xl font-bold dark:text-white'>Team Members</h2>
                {permissions.canInviteMembers && (
                    <Dialog open={showDialog} onOpenChange={setShowDialog}>
                        <DialogTrigger asChild>
                            <Button className='bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white'>
                                <UserPlus className='w-4 h-4 mr-2' />
                                Invite Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent className='dark:bg-slate-800 dark:border-slate-700'>
                            <DialogHeader>
                                <DialogTitle className='dark:text-white'>{data ? "Member Invited Successfully!" : "Invite Team Member"}</DialogTitle>
                                <DialogDescription className='dark:text-slate-300'>{data ? "Member has been successfully added to your organization." : "Send an invitation to join your organization."}</DialogDescription>
                            </DialogHeader>

                            {data ? (
                                // Success state - show member details
                                <div className='space-y-4'>
                                    <Card className='border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-600'>
                                        <CardContent className='p-4'>
                                            <h3 className='font-medium text-slate-800 dark:text-slate-200 mb-3'>Member Details</h3>
                                            <div className='space-y-2'>
                                                <div className='grid grid-cols-2 gap-2'>
                                                    <span className='font-medium text-sm dark:text-slate-300'>Name:</span>
                                                    <span className='text-sm dark:text-slate-200'>{data.name}</span>
                                                </div>
                                                <div className='flex items-center justify-between gap-2'>
                                                    <span className='font-medium text-sm dark:text-slate-300'>Email:</span>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='text-sm dark:text-slate-200'>{data.email}</span>
                                                        <Button variant='ghost' size='sm' className='h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700' onClick={() => copyToClipboard(data.email, "Email")}>
                                                            <Copy className='w-3 h-3' />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className='grid grid-cols-2 gap-2'>
                                                    <span className='font-medium text-sm dark:text-slate-300'>Role:</span>
                                                    <span className='text-sm dark:text-slate-200'>{data.role}</span>
                                                </div>
                                                <div className='flex items-center justify-between gap-2'>
                                                    <span className='font-medium text-sm dark:text-slate-300'>Temp Password:</span>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='text-sm dark:text-slate-200'>{data?.password}</span>
                                                        <Button variant='ghost' size='sm' className='h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-600' onClick={() => copyToClipboard(data.password!, "Password")}>
                                                            <Copy className='w-3 h-3' />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className='grid grid-cols-2 gap-2'>
                                                    <span className='font-medium text-sm dark:text-slate-300'>Joined:</span>
                                                    <span className='text-sm dark:text-slate-200'>{new Date(data.joinedAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                // Form state - show invite form
                                <div className='space-y-6'>
                                    <div className='space-y-2'>
                                        <Label htmlFor='member-name' className='dark:text-slate-300'>
                                            Name
                                        </Label>
                                        <Input
                                            id='member-name'
                                            placeholder='John Doe'
                                            value={formData.name}
                                            className='dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400'
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                {data ? (
                                    // Success state buttons
                                    <Button onClick={handleCloseDialog} className='bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white'>
                                        Close
                                    </Button>
                                ) : (
                                    // Form state buttons
                                    <>
                                        <Button variant='outline' onClick={handleCloseDialog} className='border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-300'>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleSubmit} disabled={!formData.name || isCreatingMember} className='bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white disabled:bg-slate-400 disabled:dark:bg-slate-600'>
                                            {isCreatingMember ? "Sending..." : "Send Invitation"}
                                        </Button>
                                    </>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {data && (
                <Card className='mb-6 border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-600'>
                    <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <h3 className='font-medium text-slate-800 dark:text-slate-200'>Recently Added Member</h3>
                                <div className='mt-2 space-y-1'>
                                    <p className='text-sm dark:text-slate-300'>
                                        <span className='font-medium'>Name:</span> {data.name}
                                    </p>
                                    <div className='flex items-center justify-between'>
                                        <p className='text-sm dark:text-slate-300'>
                                            <span className='font-medium'>Email:</span> {data.email}
                                        </p>
                                        <Button variant='ghost' size='sm' className='h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700' onClick={() => copyToClipboard(data.email, "Email")}>
                                            <Copy className='w-3 h-3' />
                                        </Button>
                                    </div>
                                    <p className='text-sm dark:text-slate-300'>
                                        <span className='font-medium'>Role:</span> {data.role}
                                    </p>
                                    <p className='text-sm dark:text-slate-300'>
                                        <span className='font-medium'>ID:</span> {data.id}
                                    </p>
                                    {data.password && (
                                        <div className='flex items-center justify-between'>
                                            <p className='text-sm dark:text-slate-300'>
                                                <span className='font-medium'>Password:</span> <span className='font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded'>{data.password}</span>
                                            </p>
                                            <Button variant='ghost' size='sm' className='h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700' onClick={() => copyToClipboard(data.password!, "Password")}>
                                                <Copy className='w-3 h-3' />
                                            </Button>
                                        </div>
                                    )}
                                    <p className='text-xs text-muted-foreground dark:text-slate-400'>Joined {new Date(data.joinedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <Button variant='outline' size='sm' onClick={() => setData(null)} className='border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-300'>
                                ✕
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className='space-y-3'>
                {members.members.map((member) => (
                    <Card key={member.id} className='dark:bg-slate-800 dark:border-slate-700'>
                        <CardContent className='p-4'>
                            {/* Mobile view - stacked layout */}
                            <div className='flex flex-col gap-3 md:hidden'>
                                <h3 className='font-medium dark:text-white'>{member.name}</h3>
                                <div className='flex items-center justify-between gap-2'>
                                    <span className='text-sm text-muted-foreground dark:text-slate-300'>{member.email}</span>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <Badge variant={member.role === "owner" ? "default" : "secondary"} className={member.role === "owner" ? "bg-slate-600 text-white dark:bg-slate-600" : "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200"}>
                                        {member.role}
                                    </Badge>
                                    {member.role !== "owner" && permissions.canRemoveMembers && (
                                        <Button variant='outline' size='sm' className='border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-300' onClick={() => handleRemoveMember(member.id)}>
                                            <Trash2 className='w-4 h-4' />
                                        </Button>
                                    )}
                                </div>
                                <p className='text-xs text-muted-foreground dark:text-slate-400'>Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                            </div>

                            {/* Desktop view - single row layout */}
                            <div className='hidden md:grid md:grid-cols-12 gap-4 items-center'>
                                {/* Name */}
                                <div className='col-span-2'>
                                    <span className='font-medium dark:text-white text-sm'>{member.name}</span>
                                </div>

                                {/* Email with copy button */}
                                <div className='col-span-3 flex items-center gap-2'>
                                    <span className='text-sm text-muted-foreground dark:text-slate-300 truncate'>{member.email}</span>
                                </div>

                                {/* Role */}
                                <div className='col-span-2'>
                                    <Badge variant={member.role === "owner" ? "default" : "secondary"} className={member.role === "owner" ? "bg-slate-600 text-white dark:bg-slate-600" : "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200"}>
                                        {member.role}
                                    </Badge>
                                </div>

                                {/* Joined date */}
                                <div className='col-span-1'>
                                    <span className='text-xs text-muted-foreground dark:text-slate-400'>{new Date(member.joinedAt).toLocaleDateString()}</span>
                                </div>

                                <div className='col-span-3 flex items-center gap-2'></div>
                                {/* Action button */}
                                <div className='col-span-1 flex justify-end'>
                                    {member.role !== "owner" && permissions.canRemoveMembers && (
                                        <>
                                            {isRemovingMember ? (
                                                <>Removing...</>
                                            ) : (
                                                <>
                                                    <Button variant='outline' size='sm' className='border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-300' onClick={() => handleRemoveMember(member.id)}>
                                                        <Trash2 className='w-4 h-4' />
                                                    </Button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
