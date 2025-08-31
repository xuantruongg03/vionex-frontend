import { combineReducers } from "redux";
import roomReducer from "./room";
import videoReducer from "./video";
import logReducer from "./log";
import authReducer from "./auth";
import layoutReducer from "./layout";

const rootReducer = combineReducers({
    room: roomReducer,
    video: videoReducer,
    log: logReducer,
    auth: authReducer,
    layout: layoutReducer,
});

export default rootReducer;
