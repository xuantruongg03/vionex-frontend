export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LayoutGenerator = (users: { peerId: string }[]) => GridItem[];

export const predefinedLayouts: Record<string, LayoutGenerator> = {
  classic: (users) =>
    users.slice(0, 12).map((user, idx) => ({
      i: user.peerId,
      x: idx % 4,
      y: Math.floor(idx / 4),
      w: 1,
      h: 1,
    })),

  focus1: (users) => [
    {
      i: users[0]?.peerId || "host",
      x: 0,
      y: 0,
      w: 4,
      h: 2,
    },
    ...users.slice(1, 9).map((user, idx) => ({
      i: user.peerId,
      x: idx % 4,
      y: 2,
      w: 1,
      h: 1,
    })),
  ],

  focus2: (users) => [
    { i: users[0]?.peerId || "host1", x: 0, y: 0, w: 2, h: 2 },
    { i: users[1]?.peerId || "host2", x: 2, y: 0, w: 2, h: 2 },
    ...users.slice(2, 10).map((user, idx) => ({
      i: user.peerId,
      x: idx % 4,
      y: 2,
      w: 1,
      h: 1,
    })),
  ],

  table: (users) => [
    ...users.slice(0, 4).map((u, i) => ({ i: u.peerId, x: i, y: 0, w: 1, h: 1 })),
    { i: users[4]?.peerId || "leader", x: 1, y: 1, w: 2, h: 1 },
    ...users.slice(5, 9).map((u, i) => ({ i: u.peerId, x: i, y: 2, w: 1, h: 1 })),
  ],

  lshape: (users) => [
    { i: users[0]?.peerId || "main", x: 0, y: 0, w: 2, h: 2 },
    ...users.slice(1, 5).map((u, i) => ({
      i: u.peerId,
      x: 2 + (i % 2),
      y: Math.floor(i / 2),
      w: 1,
      h: 1,
    })),
    ...users.slice(5, 8).map((u, i) => ({
      i: u.peerId,
      x: i,
      y: 2,
      w: 1,
      h: 1,
    })),
  ],

  pip: (users) => [
    { i: users[0]?.peerId || "main", x: 1, y: 0, w: 2, h: 2 },
    { i: users[1]?.peerId || "p1", x: 0, y: 0, w: 1, h: 1 },
    { i: users[2]?.peerId || "p2", x: 3, y: 0, w: 1, h: 1 },
    { i: users[3]?.peerId || "p3", x: 0, y: 2, w: 1, h: 1 },
    { i: users[4]?.peerId || "p4", x: 3, y: 2, w: 1, h: 1 },
  ],

  dynamic: (users) => {
    const layout = users.slice(0, 11).map((u, i) => ({
      i: u.peerId,
      x: i % 4,
      y: Math.floor(i / 4),
      w: 1,
      h: 1,
    }));
    layout.push({
      i: "remaining",
      x: 3,
      y: 2,
      w: 1,
      h: 1,
    });
    return layout;
  },
};
