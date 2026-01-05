# Tab Organizer

A Chrome extension for automatic and manual tab organization with cloud sync - similar to [Skipper.co](https://www.skipper.co).

## Features

- **Automatic Tab Detection** - Detects tabs unused for 8+ hours and prompts to save/close
- **Smart Sessions** - Auto-groups related tabs based on time
- **Folders** - Manual organization by project/topic
- **One-click Restore** - Open all tabs from a session/folder at once
- **Search** - Search across all saved tabs
- **Archive** - Historical tracking of old tabs
- **Cloud Sync** - Sync across devices with Supabase (coming soon)

## Tech Stack

- TypeScript
- React 18
- Vite + CRXJS
- Tailwind CSS v4
- Zustand (state management)
- Supabase (backend - coming soon)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Load Extension in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist` folder

## Project Structure

```
tab-organizer/
├── src/
│   ├── background/          # Service worker (tab tracking, alarms)
│   ├── popup/               # Extension popup UI
│   │   ├── components/      # Reusable UI components
│   │   └── pages/           # Page components (Home, Folders, Archive, Settings)
│   └── shared/              # Shared code
│       ├── types/           # TypeScript types
│       ├── hooks/           # React hooks
│       ├── stores/          # Zustand stores
│       └── lib/             # Utilities (chrome-storage, supabase)
├── public/icons/            # Extension icons
├── manifest.json            # Chrome extension manifest
└── vite.config.ts           # Vite + CRXJS config
```

## Roadmap

- [x] Phase 1: Foundation - Project setup, manifest, service worker
- [ ] Phase 2: Core Features - Tab tracking, save/close, folders, sessions
- [ ] Phase 3: Cloud Integration - Supabase, auth, sync
- [ ] Phase 4: Smart Features - Auto-grouping, archive
- [ ] Phase 5: Polish - UI, onboarding, Chrome Web Store

## License

MIT
