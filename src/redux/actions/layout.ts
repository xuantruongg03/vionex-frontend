import { ActionLayout, ActionLayoutType } from "../../interfaces/action";

// Action creators for layout management
export const setSelectedLayout = (
    layoutId: string,
    autoSaveToStorage: boolean = true
): ActionLayout => ({
    type: ActionLayoutType.SET_SELECTED_LAYOUT,
    payload: {
        selectedLayoutTemplate: layoutId,
        autoSaveToStorage,
    },
});

export const setLayoutPreferences = (preferences: {
    preferredLayout?: string;
    enableAutoLayout?: boolean;
    saveToStorage?: boolean;
}): ActionLayout => ({
    type: ActionLayoutType.SET_LAYOUT_PREFERENCES,
    payload: {
        preferences,
    },
});

export const resetLayout = (): ActionLayout => ({
    type: ActionLayoutType.RESET_LAYOUT,
});

// Utility action creators
export const setPreferredLayout = (layoutId: string): ActionLayout =>
    setLayoutPreferences({ preferredLayout: layoutId });

export const toggleAutoLayout = (enabled: boolean): ActionLayout =>
    setLayoutPreferences({ enableAutoLayout: enabled });

export const toggleStorageSave = (enabled: boolean): ActionLayout =>
    setLayoutPreferences({ saveToStorage: enabled });
