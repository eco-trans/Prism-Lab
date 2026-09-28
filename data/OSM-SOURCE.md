# Columbus default road source

- Source: OpenStreetMap contributors, downloaded from https://download.geofabrik.de/north-america/us/ohio-latest.osm.pbf on 2026-09-27.
- PBF replication timestamp: 2026-09-26T20:22:51Z.
- License: Open Database License 1.0; https://www.openstreetmap.org/copyright.
- Ohio source SHA-256: `7CC10B6226F9B542D7FDA6C7769624F505226FFC3A028C3A844F8879B2206945`.
- Columbus PBF SHA-256: `B58AD36423A5BB34843EA3B1117DB21926A99BEA2A4E23D2BFF0BE64C18887BF`.
- Subset preparation: `prepare-pbf.py` retains highway ways touching [south 39.79, west -83.21, north 40.20, east -82.73] and every node referenced by those ways. This is a PBF-to-PBF extraction, not a JSON conversion.
- Default runtime reads this PBF directly and constructs a graph in memory within the stated study area. Result: 444,483 road vertices and 1,109,238 directed edges.
