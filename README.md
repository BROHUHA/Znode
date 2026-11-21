<div align="center">

# 🎵 Znode Music (Znode) (ZN)

**A next-generation, high-fidelity music streaming client inspired by Apple Music's liquid glass design.**  
Built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Vite**.

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38b2ac.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Deployment](#-deployment) • [Architecture](#-architecture)

---

</div>

## ✨ Features

### 🎧 Apple Music-Style Now Playing Experience
- **Ambient Artwork Reflection**: Dynamic vertically inverted artwork reflection with Gaussian blur that seamlessly blends album artwork into the player background with smooth, color-accurate gradients.
- **Liquid Glass iOS 26 UI**: Frosted glass controls with real-time backdrop blur, light refraction borders, and tactile tap-scale animations.
- **Fluid Spring-Physics Gestures**:
  - **Swipe Down**: Dismisses the Now Playing screen or returns from queue/lyrics with iOS-style rubber-band damping.
  - **Swipe Up**: Instantly opens the Up Next Queue.
- **Full Artwork Visibility**: Intelligent artwork presentation that keeps 100% of album art visible without aggressive cropping.

### 🔊 Studio-Grade Audio & Playback
- **Dual-Engine Streaming**: Seamless integration with YouTube Music catalog and automatic audio matching with JioSaavn up to **320kbps Lossless AAC/M4A**.
- **10-Band Equalizer & 2D Tone Pad**: Pro-audio shaping presets (Bass Boost, Vocal, Acoustic, Club, etc.) with custom decibel tuning.
- **Offline Downloads**: 1-click high-fidelity track download for offline listening.
- **Gapless Playback & Queue Management**: Drag-to-reorder, shuffle, clear, and automatic related track recommendations.

### 🎤 Real-Time Synchronized Lyrics
- **Word-by-word & Line-synced**: Powered by LRCLIB and Musixmatch with tap-to-seek support.
- **Instrumental Intro Indicators**: Visual pulsation during musical intros before lyrics begin.

### 👥 Listen Together (Party Mode)
- **Real-Time Shared Rooms**: Synchronized playback across multiple devices with clock-drift compensation.
- **Room Codes & Direct Links**: Hop into parties with friends with zero setup.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons
- **State Management**: Zustand with persistent storage
- **Audio Core**: Web Audio API, HTML5 Audio, InnerTube API, JioSaavn Service
- **Build Tooling**: Vite 5, PostCSS, Autoprefixer
- **Deployment**: Vercel Serverless Functions (`/api` CORS proxies)

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm`

### Installation

```bash
# Clone the repository
git clone https://github.com/BROHUHA/Znode.git
cd Znode

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Building for Production

```bash
# Type-check and create optimized production build
npm run build

# Preview production build locally
npm run preview
```

Output is bundled into the `dist/` directory.

---

## ☁️ Deployment

### One-Click Deploy on Vercel

Znode Music is pre-configured with `vercel.json` rewrites and serverless proxy routes in `/api`:

1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Framework Preset: **Vite**
4. Click **Deploy**.

All reverse proxy endpoints (`/api/innertube`, `/api/jiosaavn`, `/api/avatar`, `/api/download`) run automatically as Vercel Edge/Serverless functions.

---

## 📂 Project Structure

```text
├── api/                   # Vercel serverless proxy functions (CORS handling)
│   ├── auth/              # Google OAuth device flow & library sync
│   ├── innertube/         # InnerTube API proxy for YouTube Music
│   ├── avatar.js          # Google User Content avatar proxy
│   ├── download.js        # High-res direct audio download helper
│   └── jiosaavn.js        # JioSaavn API proxy (320kbps streams)
├── public/                # Static brand assets, favicons, logos
├── src/
│   ├── audio/             # Web Audio API engine & 10-band equalizer
│   ├── components/        # React components
│   │   ├── layout/        # Sidebar, TopBar, Mobile Navigation
│   │   ├── player/        # NowPlayingScreen, MeshGradient, MiniPlayer
│   │   └── common/        # Buttons, cards, modals
│   ├── services/          # InnerTube, JioSaavn, Lyrics & Party sync
│   ├── stores/            # Zustand stores (player, auth, search, settings)
│   ├── types/             # TypeScript interfaces
│   ├── utils/             # Palette extraction & thumbnail upscaling
│   ├── views/             # Home, Explore, Search, Library views
│   ├── App.tsx            # Root component
│   └── index.css          # Liquid Glass design system & animations
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind design system configuration
└── vite.config.ts         # Vite bundler & development proxies
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">
Crafted with ❤️ for music lovers everywhere.
</div>
