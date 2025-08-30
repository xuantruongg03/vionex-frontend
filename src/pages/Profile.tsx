import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, Save, X } from "lucide-react";
import { toast } from "sonner";
import useUpdateProfile from "@/hooks/auth/use-update-profile";
import useCloudinaryUpload from "@/hooks/use-cloudinary-upload";

interface RootState {
    auth: {
        isAuthenticated: boolean;
        user: {
            id: string;
            email: string;
            name: string;
            avatar?: string;
        } | null;
    };
}

const Profile = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const { updateProfile, isPending: isUpdating } = useUpdateProfile();
    const { uploadImage, isUploading } = useCloudinaryUpload();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || "",
        avatar: user?.avatar || "",
    });

    if (!user) {
        return (
            <div className='min-h-screen flex items-center justify-center'>
                <p>Please log in to view your profile information</p>
            </div>
        );
    }

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error("Max size 10MB");
            return;
        }

        try {
            const imageUrl = await uploadImage(file);
            setFormData((prev) => ({ ...prev, avatar: imageUrl }));
            toast.success("Image uploaded successfully!");
        } catch (error) {
            toast.error("Error uploading image");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Name is required");
            return;
        }

        try {
            await updateProfile({
                name: formData.name.trim(),
                avatar: formData.avatar,
            });
            setIsEditing(false);
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error("Error updating profile");
        }
    };

    const handleCancel = () => {
        setFormData({
            name: user.name,
            avatar: user.avatar || "",
        });
        setIsEditing(false);
    };

    return (
        <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
            <div className='max-w-2xl mx-auto px-4'>
                <div className='mb-8'>
                    <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
                        Profile Settings
                    </h1>
                    <p className='text-gray-600 dark:text-gray-400 mt-2'>
                        Manage your account information
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center justify-between'>
                            <span>Account Information</span>
                            {!isEditing && (
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit
                                </Button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className='space-y-6'>
                            {/* Avatar Section */}
                            <div className='flex flex-col items-center space-y-4'>
                                <div className='relative'>
                                    <Avatar className='h-24 w-24'>
                                        <AvatarImage
                                            src={formData.avatar}
                                            alt={formData.name}
                                        />
                                        <AvatarFallback className='bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-medium'>
                                            {getInitials(formData.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {isEditing && (
                                        <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer'>
                                            <Camera className='h-6 w-6 text-white' />
                                            <input
                                                type='file'
                                                accept='image/*'
                                                onChange={handleFileChange}
                                                className='absolute inset-0 opacity-0 cursor-pointer'
                                                disabled={isUploading}
                                            />
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full'>
                                            <Loader2 className='h-6 w-6 text-white animate-spin' />
                                        </div>
                                    )}
                                </div>
                                {isEditing && (
                                    <p className='text-sm text-gray-500 dark:text-gray-400 text-center'>
                                        Click on the avatar to change the image
                                        <br />
                                        (Max 5MB, JPG, PNG format)
                                    </p>
                                )}
                            </div>

                            {/* User ID */}
                            <div className='space-y-2'>
                                <Label htmlFor='userId'>User ID</Label>
                                <Input
                                    id='userId'
                                    value={user.id}
                                    disabled
                                    className='bg-gray-100 dark:bg-gray-800'
                                />
                            </div>

                            {/* Email */}
                            <div className='space-y-2'>
                                <Label htmlFor='email'>Email</Label>
                                <Input
                                    id='email'
                                    type='email'
                                    value={user.email}
                                    disabled
                                    className='bg-gray-100 dark:bg-gray-800'
                                />
                            </div>

                            {/* Name */}
                            <div className='space-y-2'>
                                <Label htmlFor='name'>Display Name</Label>
                                <Input
                                    id='name'
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    disabled={!isEditing}
                                    className={
                                        !isEditing
                                            ? "bg-gray-100 dark:bg-gray-800"
                                            : ""
                                    }
                                    placeholder='Enter display name'
                                />
                            </div>

                            {/* Action Buttons */}
                            {isEditing && (
                                <div className='flex space-x-3 pt-4'>
                                    <Button
                                        type='submit'
                                        disabled={isUpdating || isUploading}
                                        className='flex-1'
                                    >
                                        {isUpdating ? (
                                            <>
                                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                <Save className='mr-2 h-4 w-4' />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        onClick={handleCancel}
                                        disabled={isUpdating || isUploading}
                                        className='flex-1'
                                    >
                                        <X className='mr-2 h-4 w-4' />
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Profile;
