import { useListCabin } from "./translate-cabin/use-list-cabin";
import { useTranslationCabin } from "./translate-cabin/use-translation-cabin";
import {
    getSocket,
    setGlobalSocket,
    useCall as useCallHybrid,
} from "./use-call-hybrid-new";
import useCheckRoomStatus from "./use-check-room-status";
import useCheckUsername from "./use-check-username";
import useUser from "./use-user";
import useVerifyRoom from "./use-verify-room";

export {
    getSocket,
    setGlobalSocket, useCallHybrid, useCheckRoomStatus,
    useCheckUsername, useListCabin, useTranslationCabin, useUser, useVerifyRoom
};

// Alias for backward compatibility
export const getSharedSocket = getSocket;
