import fs from "fs";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    server: {
        host: "::",
        port: 5173,
        https: {
            key: fs.readFileSync("secrets/private-key.pem"),
            cert: fs.readFileSync("secrets/public-certificate.pem"),
        },
        allowedHosts: ["localhost"],
    },
    define: {
        "process.env.IS_PREACT": JSON.stringify("true"),
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
}));
