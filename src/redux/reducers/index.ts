import { combineReducers } from "redux";
import roomReducer from "./room";
import videoReducer from "./video";
import logReducer from "./log";
import authReducer from "./auth";
import layoutReducer from "./layout";
import chatReducer from "./chat";

const rootReducer = combineReducers({
    room: roomReducer,
    video: videoReducer,
    log: logReducer,
    auth: authReducer,
    layout: layoutReducer,
    chat: chatReducer,
});

export default rootReducer;
