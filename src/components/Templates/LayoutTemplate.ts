// ...existing code...

import { User } from "@/interfaces/user";

// Thêm interface và types
interface LayoutTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    layout: (users: User[], cols: number) => any[];
}

// Định nghĩa các layout templates
const LAYOUT_TEMPLATES: LayoutTemplate[] = [
    {
        id: "auto",
        name: "Auto",
        description: "Tự động sắp xếp tối ưu",
        icon: "⚡",
        layout: (users: User[], cols: number) => {
            // Layout mặc định hiện tại
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
        },
    },
    {
        id: "sidebar",
        name: "Sidebar",
        description: "Người chính ở giữa, phụ ở cạnh",
        icon: "📱",
        layout: (users: User[], cols: number) => {
            if (users.length === 0) return [];

            const layout = [];

            if (users.length === 1) {
                return [
                    {
                        i: users[0].peerId,
                        x: 0,
                        y: 0,
                        w: cols,
                        h: 2,
                        minW: 1,
                        minH: 1,
                        maxW: cols,
                        maxH: 3,
                        static: false,
                    },
                ];
            }

            // Người đầu tiên chiếm phần lớn bên trái
            layout.push({
                i: users[0].peerId,
                x: 0,
                y: 0,
                w: cols - 1,
                h: 2,
                minW: 2,
                minH: 2,
                maxW: cols - 1,
                maxH: 3,
                static: false,
            });

            // Những người còn lại xếp dọc bên phải
            users.slice(1).forEach((user, idx) => {
                layout.push({
                    i: user.peerId,
                    x: cols - 1,
                    y: idx,
                    w: 1,
                    h: 1,
                    minW: 1,
                    minH: 1,
                    maxW: 1,
                    maxH: 1,
                    static: false,
                });
            });

            return layout;
        },
    },
    {
        id: "spotlight",
        name: "Spotlight",
        description: "Chỉ hiện người đang nói",
        icon: "🎯",
        layout: (users: User[], cols: number) => {
            // Chỉ hiện người đầu tiên (có thể là người đang nói)
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
        description: "Khung lớn chiếm 2 hàng trên, 4 khung nhỏ hàng dưới",
        icon: "🧊",
        layout: (users: User[], cols: number) => {
            const layout: any[] = [];

            if (users[0])
                layout.push({
                    i: users[0].peerId,
                    x: 0,
                    y: 0,
                    w: 4,
                    h: 2,
                    minW: 4,
                    minH: 2,
                    maxW: 4,
                    maxH: 2,
                    static: false,
                });

            // Hàng thứ 3: user[1] đến user[4]
            for (let i = 1; i <= 4; i++) {
                if (!users[i]) break;
                layout.push({
                    i: users[i].peerId,
                    x: i - 1,
                    y: 2,
                    w: 1,
                    h: 1,
                    minW: 1,
                    minH: 1,
                    static: false,
                });
            }
            return layout;
        },
    },
];

export default LAYOUT_TEMPLATES;