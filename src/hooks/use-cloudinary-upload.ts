import { useState } from "react";

const useCloudinaryUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const uploadImage = async (file: File): Promise<string> => {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                throw new Error("File must be an image");
            }

            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                throw new Error("File size must be less than 10MB");
            }

            // Create FormData
            const formData = new FormData();
            formData.append("file", file);
            formData.append(
                "upload_preset",
                import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
            );
            formData.append(
                "api_key",
                import.meta.env.VITE_CLOUDINARY_API_KEY
            );

            // Upload to Cloudinary with progress tracking
            const response = await new Promise<Response>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener("progress", (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round(
                            (event.loaded / event.total) * 100
                        );
                        setUploadProgress(progress);
                    }
                });

                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(
                            new Response(xhr.responseText, {
                                status: xhr.status,
                                statusText: xhr.statusText,
                            })
                        );
                    } else {
                        reject(
                            new Error(`HTTP ${xhr.status}: ${xhr.statusText}`)
                        );
                    }
                });

                xhr.addEventListener("error", () => {
                    reject(new Error("Network error occurred"));
                });

                xhr.open(
                    "POST",
                    `https://api.cloudinary.com/v1_1/${
                        import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
                    }/image/upload`
                );
                xhr.send(formData);
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Upload failed");
            }

            const data = await response.json();

            // Return the secure URL
            return data.secure_url;
        } catch (error) {
            console.error("Cloudinary upload error:", error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Failed to upload image");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return {
        uploadImage,
        isUploading,
        uploadProgress,
    };
};

export default useCloudinaryUpload;
