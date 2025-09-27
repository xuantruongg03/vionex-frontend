import { User } from "@/interfaces/user";

interface LayoutTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    layout: (users: User[], cols: number, remainingCount?: number) => any[];
}

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
    {
        id: "auto",
        name: "Auto",
        description: "Auto layout",
        icon: "⚡",
        layout: (users: User[], cols: number, remainingCount: number = 0) => {
            const layout = users.map((user, idx) => ({
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

            // Add remaining slot if needed
            if (remainingCount > 0) {
                const totalItems = users.length;
                layout.push({
                    i: "remaining",
                    x: totalItems % cols,
                    y: Math.floor(totalItems / cols),
                    w: 1,
                    h: 1,
                    minW: 1,
                    minH: 1,
                    maxW: 1,
                    maxH: 1,
                    static: false,
                });
            }

            return layout;
        },
    },
    {
        id: "sidebar",
        name: "Sidebar",
        description: "Main speaker in the center, others on the side",
        icon: "📱",
        layout: (users: User[], cols: number, remainingCount: number = 0) => {
            if (users.length === 0) return [];

            const layout: any[] = [];

            // Nếu chỉ có 1 user và không có remaining → chiếm hết
            if (users.length === 1 && remainingCount === 0) {
                return [
                    {
                        i: users[0].peerId,
                        x: 0,
                        y: 0,
                        w: cols,
                        h: 3,
                        minW: 1,
                        minH: 1,
                        static: false,
                    },
                ];
            }

            // Đảm bảo có ít nhất 2 cột để có sidebar
            if (cols < 2) {
                // Fallback to auto layout if not enough columns
                return users.map((user, idx) => ({
                    i: user.peerId,
                    x: 0,
                    y: idx,
                    w: 1,
                    h: 1,
                    minW: 1,
                    minH: 1,
                    static: false,
                }));
            }

            // Main speaker chiếm bên trái (cols-1 cột, 3 hàng)
            layout.push({
                i: users[0].peerId,
                x: 0,
                y: 0,
                w: cols - 1,
                h: 3, // chiếm full height
                minW: 1,
                minH: 2,
                static: false,
            });

            // Calculate available slots in sidebar (3 slots max vì grid có 3 rows)
            const maxSidebarSlots = 3;
            const availableUsers = users.slice(1);
            const needRemainingSlot = remainingCount > 0;

            // If we need a remaining slot, reserve the last sidebar position for it
            const maxUsersInSidebar = needRemainingSlot ? maxSidebarSlots - 1 : maxSidebarSlots;
            const usersToShowInSidebar = availableUsers.slice(0, maxUsersInSidebar);

            // Add users to sidebar (cột cuối cùng, xếp dọc)
            usersToShowInSidebar.forEach((user, idx) => {
                layout.push({
                    i: user.peerId,
                    x: cols - 1, // cột cuối cùng
                    y: idx, // row 0, 1, 2
                    w: 1,
                    h: 1,
                    minW: 1,
                    minH: 1,
                    static: false,
                });
            });

            // Add remaining slot if needed (ở sidebar)
            if (needRemainingSlot && usersToShowInSidebar.length < maxSidebarSlots) {
                layout.push({
                    i: "remaining",
                    x: cols - 1,
                    y: usersToShowInSidebar.length, // row tiếp theo trong sidebar
                    w: 1,
                    h: 1,
                    minW: 1,
                    minH: 1,
                    maxW: 1,
                    maxH: 1,
                    static: false,
                });
            }

            return layout;
        },
    },
    {
        id: "spotlight",
        name: "Spotlight",
        description: "Only show the active speaker",
        icon: "🎯",
        layout: (users: User[], cols: number, remainingCount: number = 0) => {
            // Only show the first user (who may be the active speaker)
            if (users.length === 0) return [];

            return [
                {
                    i: users[0].peerId,
                    x: 0,
                    y: 0,
                    w: cols,
                    h: 3,
                    minW: cols,
                    minH: 3,
                    maxW: cols,
                    maxH: 3,
                    static: false,
                },
            ];
        },
    },
    {
        id: "top-hero-bar",
        name: "Top Hero + Bottom Bar",
        description: "Large frame occupies 2 rows on top, up to 4 small frames below",
        icon: "🧊",
        layout: (users: User[], cols: number, remainingCount: number = 0) => {
            const layout: any[] = [];

            // Hero trên cùng chiếm hết width × 2 hàng
            if (users[0]) {
                layout.push({
                    i: users[0].peerId,
                    x: 0,
                    y: 0,
                    w: cols,
                    h: 2, // chiếm 2 rows đầu (0, 1)
                    minW: cols,
                    minH: 2,
                    static: false,
                });
            }

            // Calculate available slots in bottom bar
            // Row 2 có thể chứa tối đa `cols` items
            const availableUsers = users.slice(1);
            const needRemainingSlot = remainingCount > 0;

            // Tính toán số users có thể hiển thị trong bottom bar
            const maxUsersInBottomBar = needRemainingSlot ? cols - 1 : cols;
            const usersToShowInBottomBar = availableUsers.slice(0, maxUsersInBottomBar);

            // Add users to bottom bar (row 2)
            usersToShowInBottomBar.forEach((user, i) => {
                // Đảm bảo không vượt quá số cột
                if (i < cols) {
                    layout.push({
                        i: user.peerId,
                        x: i,
                        y: 2, // hàng thứ 3 (index 2)
                        w: 1,
                        h: 1,
                        minW: 1,
                        minH: 1,
                        static: false,
                    });
                }
            });

            // Add remaining slot if needed
            if (needRemainingSlot && usersToShowInBottomBar.length < cols) {
                layout.push({
                    i: "remaining",
                    x: usersToShowInBottomBar.length, // vị trí tiếp theo trong bottom bar
                    y: 2,
                    w: 1,
                    h: 1,
                    minW: 1,
                    minH: 1,
                    maxW: 1,
                    maxH: 1,
                    static: false,
                });
            }

            return layout;
        },
    },
];

export default LAYOUT_TEMPLATES;
