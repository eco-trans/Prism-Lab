# Prism Lab - Online Space-time Prism Visualizer

Prism Lab is a browser-based tool for exploring network-constrained space-time prisms; it currently supports transit, walking, biking, and driving mode with travel time and restrictions setting available. It combines GTFS transit schedules and OpenStreetMap streets with ordered location-and-time anchors, linking a 3D prism to a 2D potential path area at a selected time.

## Features

- Transit with walking access, transfers and egress, plus separate walking, biking and driving modes.
- Coordinate-based anchors with an exact stay start and duration; add, remove or reorder anchors.
- A total walking-time budget shared across the journey. Leave it blank for unlimited walking.
- Linked 2D and 3D views, basemap and layer controls, PNG images and model-data exports.
- Local GTFS ZIP and OSM PBF imports, with loading and calculation progress.

## Getting started

1. Open the hosted website. Columbus COTA data loads automatically.
2. Choose a travel mode and service date.
3. Set anchor coordinates directly, or select an anchor's **Place on map** control and click the 2D map.
4. Set each anchor's stay start and duration, in journey order. A zero-minute stay is an exact-time visit. Use the arrows to adjust start times by one minute.
5. Adjust **Travel settings** and the walking limit as needed, then select **Calculate prism**.
6. Drag the time slider to preview the time and 3D slice plane. Release it to update reachability. Click a 3D prism feature to select its time; dragging rotates the view.
7. Use **Export** to save a PNG image or JSON model data.

Walking defaults to 1.4 m/s and biking to 4.5 m/s. Driving uses road speed limits or road-class defaults multiplied by the driving-speed factor. Times use the GTFS agency's local service-day clock and may exceed 24:00 for overnight service.

## Importing data

Open **Data** and choose a GTFS ZIP and a matching OSM PBF. Importing a GTFS feed recenters the map and selects an available service date. Set the 2D map extent before importing the PBF: this extent determines the retained study area. Use **Apply PBF to map area** after changing the extent.

Large files can still require substantial processing time and memory; clipping them to the study area before import is recommended. Study areas are limited to 60 km across, with additional node, way and graph-capacity checks. GTFS imports allow up to 80 MB compressed and 250 MB of expanded selected tables.

Files are processed locally in the browser. No data uploaded.

## Methods and interpretation

Forward earliest-arrival and backward latest-departure searches determine feasible travel along the network. Each ordered anchor enforces its exact start and full stay duration. When a finite walking limit is set, the calculation retains alternative time-and-walking labels so that the budget applies across the whole journey.

Coordinates connect to an eligible road vertex within 150 m. Transit journeys use the selected GTFS service day, walking connections and a boarding buffer. Waiting is allowed at network vertices. GTFS shapes position vehicles between timed stops using distance-proportional interpolation.

The 3D bands represent feasible travel times along individual network links, rather than a filled geographic hull. The 2D view shows feasible positions at the selected time. Walking prisms are green, biking prisms purple and driving prisms gray. Required stays appear as vertical lines at the anchor location.

## Data and credits

- Street data: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), distributed under the ODbL; source extracts from [Geofabrik](https://download.geofabrik.de/).
- Transit data: Central Ohio Transit Authority and Auburn University; agency metadata is retained in the GTFS archives.
- Visualization and processing libraries include Plotly.js, Leaflet, fflate and the bundled OSM PBF schema tooling. Preserve the included library notices and map attribution when redistributing.
