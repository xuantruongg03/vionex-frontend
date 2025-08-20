import { combineReducers } from "redux";
import roomReducer from "./room";
import videoReducer from "./video";
import logReducer from "./log";
import authReducer from "./auth";

const rootReducer = combineReducers({
    room: roomReducer,
    video: videoReducer,
    log: logReducer,
    auth: authReducer,
});

export default rootReducer;
