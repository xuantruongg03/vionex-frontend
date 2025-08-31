export interface User {
    peerId: string;
    isCreator: boolean;
    timeArrive: Date;
    userInfo?: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
    };
}
