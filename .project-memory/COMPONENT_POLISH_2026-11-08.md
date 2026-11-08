# Header, ornament workshop and atlas — 8 November 2026

## Authorized scope

Voice-session request: align theme and English controls inside the existing header; make generated amulets more beautiful; make the atlas more detailed and colourful. Preserve the rest of the site, its text, photographs, voice and overall design. Do not apply the previously reverted full visual redesign or the generated mockups globally.

## Rollback

Baseline tag: `codex-before-header-workshop-atlas-2026-11-08`, at the existing rollback commit `e3fe684`. Revert the dedicated component-polish commit to undo only this work. The untracked team document was left untouched.

## Implementation

- `component-polish.css` affects header, workshop and atlas only. Theme/language controls are 36px high and nowrap. Navigation can scroll within its own allocated space when all nine labels do not fit; the controls never get pushed outside the bar. Existing single-row layout retained.
- `ornament-renderer.js` provides local 1024px vector artwork with legible tulip, horse, bird, rhombus and lyre forms, alternating selected motifs rather than overprinting them. Existing three palettes, three symmetry choices, completion callback and PNG handler retained. No API calls or audio modifications.
- Atlas now uses Natural Earth I 50m shaded relief, reprojected offline to a Eurasian Lambert azimuthal equal-area view. SVG grid and eight representative locality points use the same projection. Fixed hitboxes and constant marker radii avoid hover-boundary oscillation. Mobile view scrolls within the map instead of widening the page.
- Source, public-domain licence and rebuild instructions are recorded in `images/atlas/SOURCE.md`; the offline builder is `studio/build_atlas_basemap.py`. Source TIFF/ZIP is not tracked. Existing marker identifiers, translated labels, selection handlers and dossier content retained.

## Verification

- Theme and language buttons have identical top coordinates and height and fit within the header at 320, 375, 390, 768, 1080, 1280, 1366 and 1920px in Russian; repeated at 320, 390, 1080 and 1366px in English.
- All eight map markers selected through actual browser clicks; each updates the matching region dossier.
- Workshop rendered default tulip/horse composition, all five selected motifs, three palette choices, and 8/12/16 symmetry settings; 1024px canvas attribute verified. Both themes inspected.
- PNG download button produces its completion UI. Automated capture of the download event timed out in the browser tool, so filesystem delivery was not certified by that check. The original PNG download implementation is unchanged.
- Mobile atlas has a 720px internal scroll surface and no page-wide overflow. Horizontal and vertical native pan are enabled on the map.
- Final browser log inspection returned no warnings/errors in this session. This is not an iOS device/audio compatibility certification.
- Source comparison proves that outside the map SVG the original HTML/inline JS differs only by the CSS and renderer script includes and renderer dispatch call. Audio implementation, routing, source photographs, translated datasets and other content are unchanged. JS syntax checks and `git diff --check` passed.
- Screenshots are outside the repository in `/home/sema/.gemini/antigravity/scratch/projecthistory-component-review/`.

## Solo vs Team

Codex implemented and checked the work. One consultation attempt with AI STAR `claude-sonnet-5-5` failed because both direct and proxy connections failed; no model answer was received or used. No other model calls, Sonar searches, image generation or TTS calls were made. Token statistics were not returned. Natural Earth rights were checked on the official source page.
