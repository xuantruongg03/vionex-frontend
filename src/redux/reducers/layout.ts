import { ActionLayout, ActionLayoutType } from "../../interfaces/action";

// LocalStorage keys
const LAYOUT_STORAGE_KEY = "videoGrid_layoutPreferences";

// Helper function to load from localStorage
const loadLayoutFromStorage = () => {
    try {
        const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                selectedLayoutTemplate: parsed.selectedLayoutTemplate || "auto",
                preferences: parsed.preferences || {},
            };
        }
    } catch (error) {
        console.warn("[Layout] Failed to load from localStorage:", error);
    }
    return {
        selectedLayoutTemplate: "auto",
        preferences: {},
    };
};

// Helper function to save to localStorage
const saveLayoutToStorage = (state: any) => {
    try {
        const toSave = {
            selectedLayoutTemplate: state.selectedLayoutTemplate,
            preferences: state.preferences,
            lastUpdated: Date.now(),
        };
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
        console.warn("[Layout] Failed to save to localStorage:", error);
    }
};

// Load initial state from localStorage
const storageData = loadLayoutFromStorage();

const initialState = {
    selectedLayoutTemplate: storageData.selectedLayoutTemplate,
    preferences: {
        preferredLayout: storageData.selectedLayoutTemplate,
        enableAutoLayout: true,
        saveToStorage: true,
        ...storageData.preferences,
    },
    lastUpdated: Date.now(),
};

const layoutReducer = (state = initialState, action: ActionLayout) => {
    let newState;

    switch (action.type) {
        case ActionLayoutType.SET_SELECTED_LAYOUT:
            newState = {
                ...state,
                selectedLayoutTemplate:
                    action.payload?.selectedLayoutTemplate || "auto",
                lastUpdated: Date.now(),
            };

            // Auto-save to localStorage if enabled
            if (
                state.preferences.saveToStorage ||
                action.payload?.autoSaveToStorage
            ) {
                saveLayoutToStorage(newState);
            }

            return newState;

        case ActionLayoutType.SET_LAYOUT_PREFERENCES:
            newState = {
                ...state,
                preferences: {
                    ...state.preferences,
                    ...action.payload?.preferences,
                },
                lastUpdated: Date.now(),
            };

            // Update selected layout if preferredLayout changed
            if (action.payload?.preferences?.preferredLayout) {
                newState.selectedLayoutTemplate =
                    action.payload.preferences.preferredLayout;
            }

            // Save to localStorage if enabled
            if (newState.preferences.saveToStorage) {
                saveLayoutToStorage(newState);
            }

            return newState;

        case ActionLayoutType.RESET_LAYOUT:
            newState = {
                selectedLayoutTemplate: "auto",
                preferences: {
                    preferredLayout: "auto",
                    enableAutoLayout: true,
                    saveToStorage: true,
                },
                lastUpdated: Date.now(),
            };

            // Clear localStorage
            try {
                localStorage.removeItem(LAYOUT_STORAGE_KEY);
            } catch (error) {
                console.warn("[Layout] Failed to clear localStorage:", error);
            }

            return newState;

        default:
            return state;
    }
};

export default layoutReducer;
