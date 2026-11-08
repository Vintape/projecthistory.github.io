# Atlas basemap

- Dataset: Natural Earth I, 1:50 million shaded relief with water, `NE1_50M_SR_W`.
- Download: https://naturalearth.s3.amazonaws.com/50m_raster/NE1_50M_SR_W.zip
- Source TIFF: 10800 × 5400, geographic coordinates, WGS84 (projection information supplied in the archive).
- Authors: Natural Earth contributors, including Tom Patterson and Nathaniel Vaughn Kelso.
- Rights: public domain; verified against https://www.naturalearthdata.com/about/terms-of-use/ on 2026-11-08.
- Display: offline spherical Lambert azimuthal equal-area reprojection centred at 57°N, 95°E, exported to 2200 × 1240 WebP. The SVG grid and markers use the same equations. This is a regional overview, not a navigation map or a delineation of cultural boundaries.
- Eight marker points indicate representative localities: Arkhangelsk, Kazan, Derbent, the Altai region, Yakutsk, Petropavlovsk-Kamchatsky, Turkestan and Samarkand. They do not claim to represent the full extent of each culture.
- Rebuild with `python3 studio/build_atlas_basemap.py /path/to/NE1_50M_SR_W.zip`; paste the generated SVG fragment into the existing atlas SVG slot if rebuilding geometry. The source ZIP/TIFF is intentionally not committed.

No runtime map service, API token or third-party tile request is required.
