import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrowserQRCodeReader } from "@zxing/browser";
import { QRCodeCanvas as QRCode } from "qrcode.react";
import { useEffect, useRef } from "react";

interface QRCodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
}

export const QRCodeDialog = ({ isOpen, onClose, roomId }: QRCodeDialogProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const roomUrl = `${window.location.origin}/room?idroom=${roomId}`;

    useEffect(() => {
        if (isOpen && videoRef.current) {
            const codeReader = new BrowserQRCodeReader();
            codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
                if (result) {
                    const text = result.getText();
                    window.location.href = text;
                }
                if (error) {
                    console.error(error);
                }
            });
        }
    }, [isOpen]);

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>QR Code</DialogTitle>
                </DialogHeader>
                <div className='flex flex-col items-center py-6'>
                    <QRCode value={roomUrl} size={256} />
                    <p className='mt-4 text-center text-sm text-muted-foreground'>Scan the QR code to join the meeting</p>
                    <p className='mt-2 px-4 text-center text-xs font-medium break-all'>{roomUrl}</p>
                    <video ref={videoRef} className='hidden' />
                </div>
            </DialogContent>
        </Dialog>
    );
};
