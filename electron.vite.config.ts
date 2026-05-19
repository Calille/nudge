import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import "dotenv/config";

// Vite replaces these expressions in the bundled main code at build time
// (string replacement, before tree-shaking). Empty string fallbacks mean
// the packaged app simply tells the user "Outlook OAuth not configured"
// when the build was produced without .env populated, rather than crashing.
//
// In dev (electron-vite dev) main.ts still calls dotenv.config() at boot,
// so the runtime read works the same way. In production the values are
// already inlined, so process.env is never actually read.
const credentialDefines = {
  "process.env.MS_OAUTH_CLIENT_ID": JSON.stringify(
    process.env.MS_OAUTH_CLIENT_ID ?? ""
  ),
  "process.env.MS_OAUTH_TENANT_ID": JSON.stringify(
    process.env.MS_OAUTH_TENANT_ID ?? "common"
  ),
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: credentialDefines,
    build: {
      outDir: "dist-electron/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/main.ts"),
        },
      },
    },
    resolve: {
      alias: {
        "@electron": resolve(__dirname, "electron"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron/preload",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/preload.ts"),
        },
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [react()],
    build: {
      outDir: "dist",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
        },
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
    },
  },
});
