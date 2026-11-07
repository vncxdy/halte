# Halte

Halte is a minimalist React application for exploring **Transjakarta** routes, stops, route geometry, nearby stops, and data-backed journey estimates in Jakarta.

## Current supported scope

- **Jalur:** 241 Transjakarta routes from the official GTFS feed, including BRT, feeder, and Mikrotrans services where present in the feed.
- **Halte:** 8,143 Transjakarta GTFS stops with coordinates, route memberships, and accessibility fields supplied by the source.
- **Rute:** Graph search across normalized route-stop sequences. Walking access and in-vehicle duration are estimates; schedules and fares are shown only when available in the source.
- **Lacak:** Leaflet route/stop map and explicitly labeled demonstration mode. Live vehicle data is shown only when a valid TiJe REST response is received.
- **Search:** Unified local search over normalized routes and stops, including operator and mode terms.

MRT Jakarta, LRT Jakarta, LRT Jabodebek, KRL Commuter Line, and Railink are **not claimed as supported datasets** in the current build because validated source data has not been integrated here.

## Data sources

The normalized local data is generated from:

```text
https://gtfs.transjakarta.co.id/files/file_gtfs.zip
```

The source archive contains the official GTFS tables used by the normalization script:

- `routes.txt`
- `stops.txt`
- `trips.txt`
- `stop_times.txt`
- `shapes.txt`
- `calendar.txt`
- `fare_attributes.txt`
- `transfers.txt`

Generated source metadata is stored in `src/data/dataSources.json`. Static GTFS data is not live GPS data and must not be interpreted as current vehicle position, speed, occupancy, or arrival prediction.

TiJe REST integration is retained for nearby stops, route details, and optional bus polling. It requires the development proxy or an equivalent production backend proxy. Anonymous MQTT access is not treated as available.

## Development

```bash
cd C:\Users\Administrator\Documents\Halte
npm install
npm run dev
```

## Data regeneration and validation

Place the official GTFS archive contents in `tmp-gtfs/`, then run:

```bash
npm run data:normalize
npm run test:data
```

The normalization script writes `src/data/routes.json`, `src/data/stops.json`, `src/data/shapes.json`, and `src/data/dataSources.json`.

## Production build

```bash
npm run build
npm run preview
```

## Deployment requirements

The Vite development proxy in `vite.config.js` is not a production backend. A deployed application needs an equivalent server-side proxy for TiJe API calls, with rate limiting, timeout handling, and credentials/token management kept outside the browser bundle.