// Calculate dynamic grid layout based on number of participants
export const getOptimalLayout = (totalParticipants: number) => {
    if (totalParticipants === 1) return { cols: 1, rows: 1 };
    if (totalParticipants === 2) return { cols: 2, rows: 1 };
    if (totalParticipants === 3) return { cols: 3, rows: 1 };
    if (totalParticipants === 4) return { cols: 2, rows: 2 };
    if (totalParticipants <= 6) return { cols: 3, rows: 2 };
    if (totalParticipants <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: 3 };
};

// Calculate grid dimensions and height
export const calculateGridDimensions = (
    totalDisplayItems: number,
    availableHeight: number,
    containerPadding = 16,
    marginSize = 16,
    minRowHeight = 180,
    maxRowHeightLimit = 500
) => {
    const optimalLayout = getOptimalLayout(totalDisplayItems);
    const gridCols = optimalLayout.cols;
    const rowCount = Math.ceil(totalDisplayItems / gridCols);
    const actualRows = rowCount;

    // Calculate dynamic rowHeight
    const maxAvailableHeightForGrid = availableHeight - containerPadding * 2;
    const maxRowHeight = Math.floor(
        (maxAvailableHeightForGrid - (actualRows - 1) * marginSize) / actualRows
    );

    const rowHeight = Math.max(
        minRowHeight,
        Math.min(maxRowHeight, maxRowHeightLimit)
    );
    const actualItemHeight = rowHeight + marginSize;
    const gridHeight = Math.min(
        actualRows * actualItemHeight + containerPadding * 2,
        availableHeight
    );

    return {
        gridCols,
        rowCount,
        actualRows,
        rowHeight,
        actualItemHeight,
        gridHeight,
    };
};

// Create breakpoints for responsive grid
export const createBreakpoints = (
    totalDisplayItems: number,
    gridCols: number
) => {
    return {
        lg: gridCols,
        md: gridCols,
        sm:
            totalDisplayItems === 2
                ? 2
                : totalDisplayItems === 3
                ? 3
                : Math.min(gridCols, 2),
        xs:
            totalDisplayItems === 2
                ? 2
                : totalDisplayItems === 3
                ? 3
                : Math.min(gridCols, 2),
        xxs: totalDisplayItems === 2 ? 2 : totalDisplayItems === 3 ? 3 : 1,
    };
};

// Create default layout for users
export const createDefaultLayout = (users: any[], cols: number) => {
    return users.map((user, idx) => ({
        i: user.peerId,
        x: idx % cols,
        y: Math.floor(idx / cols),
        w: 1,
        h: 1,
        minW: 1,
        minH: 1,
        maxW: 2,
        maxH: 2,
        static: false,
    }));
};
