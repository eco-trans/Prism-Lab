# Prism Lab - Online Space-time Prism Visualizer

Prism Lab explores network-constrained space-time prisms using GTFS transit schedules and OpenStreetMap streets. It links a 3D prism with a 2D Time Slice for walking, biking, driving, and transit with walking.

## Getting started

1. Open **Tutorial** for a guided walkthrough.
2. Choose Columbus or Auburn under **Data → Example city**, or import your own data.
3. Select a travel mode and service date.
4. Set anchors using coordinates or **Place on map**. Specify each anchor’s stay start and duration; zero minutes means an exact-time visit.
5. Adjust travel settings and click **Calculate prism**. Leave the walking limit blank for unlimited walking.
6. Drag the time slider to preview the slice plane; release to update reachability. Click a 3D feature to select its time, or drag to rotate.

**Network / Smooth** switches between network links and an approximate envelope. **Layers** controls visibility.

## Data

Import a GTFS ZIP and matching OSM PBF. Set the 2D map extent before importing the PBF to define the study area. Use **Apply PBF to map area** to update it. Smaller city extracts are recommended.

| Example | GTFS | Street network |
| --- | --- | --- |
| Columbus, Ohio | `data/cota.gtfs.zip` | `data/columbus.osm.pbf` |
| Auburn, Alabama | `data/auburn.gtfs.zip` | `data/auburn.osm.pbf` |

Files are processed locally in the browser. Basemap tiles require internet access.

## Save and share

- **PNG image:** export the 3D view.
- **View JSON:** save a view and reopen it through **Data → Import View JSON** without recalculating. Load matching source files to calculate a different journey.
- **Model data:** export calculation results for analysis.
- **URL:** copy the address to share settings. Example-city links load their data automatically; custom source files must be imported separately.

## Methods

Forward earliest-arrival and backward latest-departure searches identify feasible travel between ordered anchors, enforcing exact stays and the total walking budget. Coordinates connect to an eligible road node within 150 m.

Walking and biking use configured speeds, defaulting to 1.4 m/s and 4.5 m/s. Driving uses road speed limits or road-class defaults multiplied by a speed factor. Transit uses GTFS arrival and departure times, walking connections, and a boarding buffer. Times follow the agency’s service-day clock, including times beyond 24:00.

Network bands show feasible travel times along roads. The smooth envelope approximates their shape and can include unreachable gaps. Transit positions between stops are interpolated along GTFS shapes.

## Credits

- Luyu Liu · EcoTrans Lab.
- Streets: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), under ODbL; extracts from [Geofabrik](https://download.geofabrik.de/).
- Transit: Central Ohio Transit Authority and Auburn University.
- Libraries: Plotly.js, Leaflet, fflate, OSM PBF tooling, and Intro.js. Preserve bundled license notices and map attribution. Intro.js licensing details are in `vendor/introjs-license.md`.
