/// <reference types="vite/client" />

import type { NudgeMailAPI } from "./types/api";

declare global {
  interface Window {
    api: NudgeMailAPI;
  }
}

export {};
