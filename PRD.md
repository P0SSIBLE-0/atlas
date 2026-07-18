# Historical Atlas App Plan

## 1) Product vision

Build a geography-first history explorer where a user clicks any place on Earth and immediately sees:

* the place overview
* a connected history timeline
* related people, events, and nearby historical locations
* a map that can change by time period

The key idea is not “search history.” It is “travel through history by location.”

---

## 2) Product principles

1. **Map first, content second**
   The map is the doorway. The timeline and story content should unfold after a place is selected.

2. **Small amounts of information at once**
   Keep the first panel simple. Let advanced detail expand gradually.

3. **Every entity is a node**
   Places, people, events, empires, and monuments should all be connected as a graph.

4. **Theme system from day one**
   Build one map engine, but multiple visual themes:

   * vintage
   * modern
   * minimal

5. **Free-only stack**
   Prefer open-source libraries and public data sources so the app can grow without paid APIs.

6. **Client-first architecture**
   Everything runs in the browser using static data. No backend, no authentication, no database for now. Use SSR/SSG only for preloading static content.

---

## 3) Recommended tech stack

### Core app

* **Next.js App Router** for routing and optional SSR/SSG for static data loading.
* **TypeScript** for safety and cleaner data modeling.
* **Tailwind CSS v4** for fast UI styling.
* **Motion** for smooth UI transitions and animations.

### Map engine

* **MapLibre GL JS** as the map core.
* **react-map-gl/maplibre** for React integration.
* **PMTiles** for serving map tiles as static assets.

### State and data

* **Zustand** for client-side state (selected place, theme, timeline, etc.).
* **TanStack Query** for caching static JSON fetches.
* **Zod** for validating local data.

### Forms and UI helpers

* **React Hook Form** for any local editing or contribution UI.
* **Lucide React** for icons.

---

## 4) Suggested package install set

```bash
npm install next react react-dom typescript

npm install maplibre-gl react-map-gl pmtiles
npm install motion
npm install @tanstack/react-query zustand
npm install react-hook-form
npm install lucide-react
```

Optional later:

* `@turf/turf` for geo calculations
* `miniSearch` or `flexsearch` for local search
* `date-fns` for timeline formatting

---

## 5) Best free data sources

### A) Map and place geometry

* **OpenStreetMap** for geographic data
* **Overpass API** for querying OSM
* **Natural Earth** for borders and base layers
* **OpenHistoricalMap** for historical geography

### B) History facts and relationships

* **Wikidata Query Service** for structured data
* **Wikimedia APIs** for summaries
* **Wikimedia Commons API** for images

### C) Tile packaging

* **PMTiles** for static tile delivery

---

## 6) Data strategy (Client-only)

### Local data storage

All data is stored as static JSON files inside the project:

```
public/data/

  places/
  people/
  events/
  empires/
  layers/
```

### Example usage

```
fetch("/data/places/india.json")
```

### Data structure example

```ts
interface Place {
  id: string;
  slug: string;
  name: string;
  type: string;
  coordinates: [number, number];
  summary: string;
  timeline: string[];
  relatedPlaces: string[];
  relatedPeople: string[];
  relatedEvents: string[];
  sources: string[];
}
```

### Best practice

Treat external APIs as data sources during build time or manual import. The app itself runs entirely on static data.

---

## 7) Map layer design

### Base map layers

* oceans
* land
* country borders
* rivers
* coastlines

### Place layer

* cities
* monuments
* forts
* temples
* battlefields

### Historical layer

* empire borders
* trade routes
* historical settlements

### Narrative layer

* selected place
* related nodes
* suggested locations

---

## 8) Vintage look system

### Style elements

* sepia tones
* paper texture
* faded labels
* serif fonts
* hand-drawn borders

### Implementation

* MapLibre style JSON
* texture overlays
* Tailwind theme tokens

### Theme system

* Vintage
* Minimal
* Modern

Switch themes dynamically without changing logic.

---

## 9) UX architecture

### Main flow

1. User opens app
2. Map loads
3. User clicks a place
4. Overview appears
5. Timeline appears
6. Related content loads

### Layout

* Map canvas
* Right-side panel
* Bottom timeline

Mobile:

* Map first
* Bottom sheet
* Horizontal timeline

---

## 10) Feature architecture

### Place page

* name
* coordinates
* summary
* timeline
* related entities

### Event page

* title
* date
* description
* related places and people

### Person page

* name
* lifespan
* roles
* connections

### Empire page

* duration
* territory
* rulers
* events

---

## 11) Suggested folder structure

```text
app/
  (map)/
  place/[slug]/
  person/[slug]/
  event/[slug]/
  empire/[slug]/

components/
  map/
  timeline/
  story/
  cards/
  panels/
  theme/

features/
  places/
  people/
  events/
  search/
  story/
  layers/

lib/
  map/
  data/
  validation/

public/
  data/
  images/
  textures/

styles/
tests/
```

---

## 12) MVP scope

### Phase 1

* interactive map
* clickable places
* timeline
* related entities
* vintage theme
* static JSON data

### Phase 2

* historical layers
* year slider
* search
* favorites (local storage)

### Phase 3

* AI story mode
* guided exploration
* offline caching

---

## 13) Data model suggestion (Client-side)

Use structured JSON instead of database tables.

### Core entities

* places
* events
* people
* empires
* relationships
* media
* timeline entries

### Important rule

Each record should include:

* id
* source reference
* confidence level
* last updated

---

## 14) Best-practice notes

* Use **MapLibre** for full control and no cost
* Use **vector tiles** for performance
* Keep **themes separate from logic**
* Cache data with TanStack Query
* Validate JSON with Zod
* Use local search instead of external services
* Store user preferences in localStorage
* Optimize for mobile interactions

---

## 15) Free resource list

* Next.js App Router
* Tailwind CSS
* Motion
* MapLibre GL JS
* react-map-gl
* PMTiles
* OpenStreetMap
* Overpass API
* Natural Earth
* OpenHistoricalMap
* Wikidata
* Wikimedia APIs
* Wikimedia Commons
* TanStack Query
* Zustand
* Zod
* React Hook Form
* Lucide React

---

## 16) My recommendation for the first build

Start with:

* MapLibre + PMTiles
* Static JSON data
* Next.js App Router (SSG for pages)
* Tailwind CSS
* Motion
* Zustand
* TanStack Query

This gives you a fully functional, fast, and free client-only app.

---

## 17) The one feature that will make it feel special

Add a **“Follow the thread”** feature.

Example:
**Taj Mahal → Shah Jahan → Mughal Empire → India → British Raj → Indian Independence**

This transforms the app into a connected historical journey instead of a static map.
