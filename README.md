# NudgeMail

An internal-use Electron desktop application for managing contacts, building HTML marketing emails with merge fields, and sending them via Outlook (Microsoft Graph) or any SMTP provider.

## Tech Stack

- **Electron** with React + TypeScript
- **Vite** (via `electron-vite`) for bundling main, preload and renderer
- **Tailwind CSS v3** for styling
- **Zustand** for state management
- **better-sqlite3** local database
- **SheetJS (xlsx)** for spreadsheet import
- **Nodemailer + @azure/msal-node** for sending
- **MJML** for responsive email compilation
- **TipTap** WYSIWYG editor
- **Framer Motion** for animations
- **Lucide React** for icons

## Getting Started

```bash
npm install
npm run dev
```

This will launch the Electron window in development mode with hot-reloading for the renderer.

## Building

```bash
npm run build         # Compile main, preload and renderer
npm run dist          # Build installers for current platform
npm run dist:win      # Windows NSIS installer
npm run dist:mac      # macOS DMG
npm run dist:linux    # Linux AppImage
```

## Project Layout

```
electron/              Electron main + preload + services + IPC
src/                   React renderer (components, stores, hooks)
build/                 App icons (add your own icon.ico / icon.icns / icon.png)
dist-electron/         Compiled main & preload (generated)
dist/                  Compiled renderer (generated)
release/               Packaged installers (generated)
```

## Configuration

OAuth client credentials for Outlook should be provided via environment variables at build/runtime:

```
MS_OAUTH_CLIENT_ID=...
MS_OAUTH_TENANT_ID=...  # your tenant GUID, or `common` for multi-tenant apps
```

Tokens are stored encrypted via Electron's `safeStorage` API. SMTP credentials offer a fallback for accounts where OAuth is not practical.

## First Run

On first launch, NudgeMail presents a three-step welcome flow:

1. Connect Outlook (or skip to configure later)
2. Set sender defaults (display name, company, signature)
3. Import your first contact spreadsheet (or skip)

All data is stored locally in a SQLite database under the app's user-data directory. A rolling 5-backup rotation is created on each launch.
