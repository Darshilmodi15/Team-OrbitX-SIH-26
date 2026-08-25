# ORCA Frontend - Tactical Marine GIS Dashboard 🌊🗺️

The **ORCA Frontend** is a modern, responsive single-page tactical GIS dashboard built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, and **Leaflet / React-Leaflet**.

## 🚀 Quickstart

```bash
# Install dependencies
npm install

# Run Vite dev server (defaults to http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run Oxlint
npm run lint
```

## 🌟 Key Components & Features

- **Interactive Tactical Nautical Chart (`MarineMap.tsx`)**: Leaflet-based map with custom markers, vessel tracking, EEZ boundaries, international maritime borders, and dynamic GIS overlay layers.
- **GIS Layer Controls (`GisLayersPanel.tsx`)**: Toggle Potential Fishing Zones (PFZ), Geofences, EEZ Polygons, Sea Surface Temperature (SST) heatmaps, Chlorophyll distributions, Wave vectors, and Wind barbs.
- **Conversational Marine Advisory (`ChatPanel.tsx`, `QueryInput.tsx`)**: Multi-turn AI chat with regional voice recording (Microphone -> Sarvam Saaras STT) and audio response playback (Sarvam Bulbul TTS).
- **Reasoning Trace Inspector (`AgentTraceModal.tsx`)**: Deep visibility into multi-agent task execution plans, reasoning chains, and data source attributions.
- **Maritime Emergency SOS Hub (`EmergencySOSModal.tsx`)**: Instant distress trigger, MRCC routing, IMO MAYDAY VHF Channel 16 transcript generator, and 24x7 emergency contacts.
- **Government Circulars Portal (`GovernmentPortalModal.tsx`)**: Gazette circulars, monsoon fishing ban updates, PMMSY subsidies, and policy documents.
- **Super Admin Diagnostics (`SuperAdminModal.tsx`)**: Service latency monitoring, fleet management with RBAC, and Before-vs-After historical oceanographic comparisons.
- **11-Language Regional Localization (`i18n.ts`)**: Instant UI translation across English, Gujarati, Hindi, Marathi, Tamil, Telugu, Malayalam, Bengali, Odia, Kannada, and Punjabi.

