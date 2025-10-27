export interface User {
    peerId: string;
    isCreator: boolean;
    timeArrive: Date;
    isHandRaised?: boolean;
    handRaisedAt?: Date;
    userInfo?: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
    };
}
