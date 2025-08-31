import { useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import {
    setSelectedLayout,
    setLayoutPreferences,
    resetLayout,
} from "../redux/actions/layout";

/**
 * Custom hook for managing layout state with Redux and localStorage
 * Optimized for performance with memoization
 */
export const useLayoutManager = () => {
    const dispatch = useDispatch();

    // Memoized selectors to prevent unnecessary re-renders
    const layoutState = useSelector((state: RootState) => state.layout);

    const selectedLayoutTemplate = useMemo(
        () => layoutState.selectedLayoutTemplate,
        [layoutState.selectedLayoutTemplate]
    );

    const preferences = useMemo(
        () => layoutState.preferences,
        [layoutState.preferences]
    );

    const lastUpdated = useMemo(
        () => layoutState.lastUpdated,
        [layoutState.lastUpdated]
    );

    // Stable function references with useCallback
    const selectLayout = useCallback(
        (layoutId: string, autoSave: boolean = true) => {
            dispatch(setSelectedLayout(layoutId, autoSave) as any);
        },
        [dispatch]
    );

    const updatePreferences = useCallback(
        (newPreferences: {
            preferredLayout?: string;
            enableAutoLayout?: boolean;
            saveToStorage?: boolean;
        }) => {
            dispatch(setLayoutPreferences(newPreferences) as any);
        },
        [dispatch]
    );

    const resetToDefault = useCallback(() => {
        dispatch(resetLayout() as any);
    }, [dispatch]);

    // Utility functions
    const setPreferredLayout = useCallback(
        (layoutId: string) => {
            updatePreferences({ preferredLayout: layoutId });
        },
        [updatePreferences]
    );

    const toggleAutoLayout = useCallback(
        (enabled: boolean) => {
            updatePreferences({ enableAutoLayout: enabled });
        },
        [updatePreferences]
    );

    const toggleStorageSave = useCallback(
        (enabled: boolean) => {
            updatePreferences({ saveToStorage: enabled });
        },
        [updatePreferences]
    );

    // Computed values
    const isAutoLayout = useMemo(
        () => selectedLayoutTemplate === "auto",
        [selectedLayoutTemplate]
    );

    const canSaveToStorage = useMemo(
        () => preferences.saveToStorage && typeof Storage !== "undefined",
        [preferences.saveToStorage]
    );

    return {
        // State
        selectedLayoutTemplate,
        preferences,
        lastUpdated,

        // Actions
        selectLayout,
        updatePreferences,
        resetToDefault,
        setPreferredLayout,
        toggleAutoLayout,
        toggleStorageSave,

        // Computed
        isAutoLayout,
        canSaveToStorage,
    };
};
