# Atlas

Atlas is a geography-first history explorer designed to visualize historical data through an interactive, map-based interface. Built with Next.js and React, the application integrates advanced mapping capabilities to provide users with a seamless, spatial exploration of historical events and locations.

## Features

*   **Interactive Mapping**: Powered by `maplibre-gl` and `react-map-gl` for high-performance, responsive geospatial visualization.
*   **Historical Data Integration**: Structured data handling for historical timelines and geographic layers.
*   **Modern UI/UX**: Built with Tailwind CSS and Motion for smooth transitions and a clean, professional aesthetic.
*   **Modular Architecture**: Organized codebase with dedicated utilities for geo-processing, API interaction, and timeline management.

## Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/), React
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Mapping**: MapLibre GL, React Map GL
*   **Animation**: Motion
*   **Tooling**: ESLint, PostCSS

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/P0SSIBLE-0/atlas.git
   cd atlas
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Project Structure

```text
.
├── app/                # Next.js App Router directory
│   ├── components/     # Reusable UI and Atlas-specific components
│   ├── lib/            # Core logic (geo, historic-api, timeline, types)
│   ├── globals.css     # Global styles
│   └── layout.tsx      # Root layout
├── public/             # Static assets and data files
│   └── data/           # Historical data JSON files
├── eslint.config.mjs   # ESLint configuration
├── next.config.ts      # Next.js configuration
├── postcss.config.mjs  # PostCSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the development server. |
| `npm run build` | Builds the application for production. |
| `npm run start` | Starts the production server. |
| `npm run lint` | Runs ESLint to check for code quality. |

## Environment Variables

If the application requires specific API keys or configuration, create a `.env.local` file in the root directory based on your environment requirements.

## License

This project is licensed under the terms available in the repository. Please check the LICENSE file for more details.