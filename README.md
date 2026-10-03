# Prism Lab - Online Space-time Prism Visualizer

Prism Lab is a browser-based tool for exploring network-constrained space-time prisms. It combines GTFS transit schedules and OpenStreetMap streets with ordered location-and-time anchors, linking a 3D prism to a 2D potential path area at a selected time.

[Meet the team](https://luyuliu.github.io)

## Features

- Transit with walking access, transfers and egress, plus separate walking, biking and driving modes.
- Coordinate-based anchors with an exact stay start and duration; add, remove or reorder anchors.
- A total walking-time budget shared across the journey. Leave it blank for unlimited walking.
- Linked 2D and 3D views, basemap and layer controls, grayscale basemaps, PNG images and model-data exports.
- Local GTFS ZIP and OSM PBF imports, with loading and calculation progress.

## Getting started

1. Open the hosted website. A precomputed Columbus COTA prism opens automatically, without parsing the source data or running the solver. COTA GTFS and streets then load automatically in the background, enabling **Calculate prism** when ready. Change settings and calculate normally, or import your own sources.
2. Choose a travel mode and service date.
3. Set anchor coordinates directly, or select an anchor's **Place on map** control and click the 2D map.
4. Set each anchor's stay start and duration, in journey order. A zero-minute stay is an exact-time visit. Use the arrows to adjust start times by one minute.
5. Adjust **Travel settings** and the walking limit as needed, then select **Calculate prism**.
6. Drag the time slider to preview the time and 3D slice plane. Release it to update reachability. Cached slices are shared with animation. Click a 3D prism feature to select its time; dragging rotates the view.
7. Use **Export → View JSON** to save a reopenable view, or export a PNG image or JSON model data.

Walking defaults to 1.4 m/s and biking to 4.5 m/s. Driving uses road speed limits or road-class defaults multiplied by the driving-speed factor. Times use the GTFS agency's local service-day clock and may exceed 24:00 for overnight service.

## Saved views

Use **Export → View JSON** to save the calculated prism, its compact street network, anchors and travel settings, selected time slice, camera, 2D map extent and layer visibility. Open it with **Data → Import View JSON**. Import runs in a background worker and restores the view without rerunning routing. The bundled default uses the same saved-view format, compressed for faster loading.

Saved views contain the calculated journey, not the original GTFS and full road network. For an explicitly imported saved view, load matching GTFS and PBF sources before calculating a different journey. The startup preview automatically prepares its COTA sources in the background. **Model JSON** remains a separate analysis export and is not a reopenable view.

A fixed status and progress box remains visible during data loading, view import/export and calculation. Clicking Calculate before the default sources finish loading queues the calculation automatically. Both map panels fit the window; the settings pane scrolls independently. The default prism is displayed before background basemap tiles finish loading.
## Importing data

Open **Data** and choose a GTFS ZIP and a matching OSM PBF. Importing a GTFS feed recenters the map and selects an available service date. Set the 2D map extent before importing the PBF: this extent determines the retained study area. Use **Apply PBF to map area** after changing the extent.

There is no hard PBF file-size limit. Files above 25 MB show advisory text recommending a smaller extract. Large files can still require substantial processing time and memory; clipping them to the study area before import is recommended. Study areas are limited to 60 km across, with additional node, way and graph-capacity checks. GTFS imports allow up to 80 MB compressed and 250 MB of expanded selected tables.

Bundled examples:

| Area | GTFS | Street network |
| --- | --- | --- |
| Columbus, Ohio (default) | `data/cota.gtfs.zip` | `data/columbus.osm.pbf` |
| Auburn, Alabama | `data/auburn.gtfs.zip` | `data/auburn.osm.pbf` |

Select both Auburn files through the import controls to explore Auburn. The full state extracts are not included.

Files are processed locally in the browser. Basemap tile requests are sent to OpenStreetMap and require internet access.

## Methods and interpretation

Forward earliest-arrival and backward latest-departure searches determine feasible travel along the network. Each ordered anchor enforces its exact start and full stay duration. When a finite walking limit is set, the calculation retains alternative time-and-walking labels so that the budget applies across the whole journey.

Coordinates connect to an eligible road vertex within 150 m. Transit journeys use the selected GTFS service day, walking connections and a boarding buffer. Waiting is allowed at network vertices. GTFS shapes position vehicles between timed stops using distance-proportional interpolation.

Use **View: Network / View: Smooth** inside the 3D map to switch between network geometry and a tighter envelope built from 61 time slices plus anchor boundaries, with 96 directional sectors per slice. This preserves more directional and temporal structure than a global convex hull. The interpolated surface remains illustrative: enclosed gaps may not be reachable and fine changes between sampled times may be missed. Required-stay cross sections collapse to the anchor. Click the smooth surface to select its time. The 2D PPA continues to show actual network reachability. View JSON preserves this choice.

The 3D bands represent feasible travel times along individual network links, rather than a filled geographic hull. The 2D view shows feasible positions at the selected time. Walking prisms are green, biking prisms purple and driving prisms gray. Required stays appear as vertical lines at the anchor location.

## Data and credits

- Street data: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), distributed under the ODbL; source extracts from [Geofabrik](https://download.geofabrik.de/).
- Transit data: Central Ohio Transit Authority and Auburn University; agency metadata is retained in the GTFS archives.
- Visualization and processing libraries include Plotly.js, Leaflet, fflate and the bundled OSM PBF schema tooling. Preserve the included library notices and map attribution when redistributing.

The Auburn street extract was prepared from the Alabama OSM extract downloaded September 27, 2026.

Use **Animate / Pause** to the right of the time slider to play time slices from the current position. At the end, Animate replays from the beginning. Frames are cached in memory (with a bounded segment budget) for faster replay; calculations and imports clear the cache. Dragging the slider or clicking the prism stops playback. Credits: Luyu Liu · EcoTrans Lab.
`nThe animation increment selector beside Animate defaults to 1 minute, with 15-second, 30-second, 2-minute and 5-minute options. The time plane interpolates smoothly between computed slices; reachability updates at the selected increment.

The Tutorial button starts an Intro.js walkthrough with highlighted controls, Next, Back, progress and an exit button. Intro.js 8.3.2 is bundled locally; its AGPLv3/commercial licensing notice is included in vendor/introjs-license.md. See https://introjs.com/ for licensing details.
