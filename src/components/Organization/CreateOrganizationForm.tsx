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

import { useState } from "react";
import { Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface CreateOrganizationFormProps {
    onSubmit: (data: {
        name: string;
        domain: string;
        description: string;
    }) => Promise<void>;
    isLoading: boolean;
}

export const CreateOrganizationForm = ({
    onSubmit,
    isLoading,
}: CreateOrganizationFormProps) => {
    const [formData, setFormData] = useState({
        name: "",
        domain: "",
        description: "",
    });

    const handleSubmit = async () => {
        await onSubmit(formData);
        setFormData({ name: "", domain: "", description: "" });
    };

    return (
        <div className='container mx-auto px-4 py-8 max-w-2xl'>
            <Card>
                <CardHeader className='text-center'>
                    <Building className='w-12 h-12 mx-auto mb-4 text-primary' />
                    <CardTitle className='text-2xl'>
                        Create Your Organization
                    </CardTitle>
                    <CardDescription>
                        Set up your organization to start managing private video
                        calls and team meetings.
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <div>
                        <Label htmlFor='org-name'>Organization Name</Label>
                        <Input
                            id='org-name'
                            placeholder='My Company'
                            value={formData.name}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <Label htmlFor='org-domain'>Domain</Label>
                        <Input
                            id='org-domain'
                            placeholder='mycompany (will be mycompany.vionex)'
                            value={formData.domain}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    domain: e.target.value,
                                }))
                            }
                        />
                        <p className='text-sm text-muted-foreground mt-1'>
                            Member emails will be: name@
                            {formData.domain || "domain"}.vionex
                        </p>
                    </div>
                    <div>
                        <Label htmlFor='org-description'>
                            Description (Optional)
                        </Label>
                        <Textarea
                            id='org-description'
                            placeholder='Brief description of your organization'
                            value={formData.description}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <Button
                        onClick={handleSubmit}
                        className='w-full'
                        disabled={
                            !formData.name || !formData.domain || isLoading
                        }
                    >
                        {isLoading ? (
                            <>Loading...</>
                        ) : (
                            <>
                                <Building className='w-4 h-4 mr-2' />
                                Create Organization
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
