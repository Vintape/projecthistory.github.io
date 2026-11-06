# Visual refresh — 2026-11-07

## Scope authorized by user

Improve visual design, header, composition, readability, mobile layout and navigation bugs. Preserve information, photographs and voice. Use the five-step Tatarstan expedition as the visual reference. No new content or media generation.

## Rollback

Baseline tag: `codex-before-visual-2026-11-07` at `e738b12`.
The refresh is one dedicated commit. Revert that commit with `git revert` to undo only this change while preserving subsequent work. Do not use `git reset --hard` on shared main. The untracked `AGENT_TEAM_CODEX.md` supplied by another task was read and left intact.

## Implementation

- `visual-refresh.css`: isolated visual layer, two-level desktop header, quieter surfaces, larger readable typography, responsive grids, theme-scoped dark exhibition panels and reduced-motion support.
- `index.html`: stylesheet link and layout wrappers only for content; loupe moved before answer options in DOM and mobile layout.
- Quest step actions push browser history instead of replacing it. History restoration does not write new entries. Invalid step numbers are ignored.
- Route rendering now commits synchronously, eliminating a reproduced race where an old View Transition callback closed a newly opened mobile drawer. Existing CSS provides the short screen fade.
- Drawer Escape/close returns focus to its button; keyboard focus stays inside the opened drawer.
- Existing content claims, photo attribution and folklore destination issues from the previous audit remain deferred because changing information was explicitly excluded.

## Evidence

- Browser header geometry checked at 320, 375, 390, 768, 1080, 1366, 1440 and 1920 px. Visible header controls fit their container at all eight widths.
- Nine desktop sections and eight non-quest mobile sections opened through navigation. An inline four-column atlas statistics row clipped on mobile; fixed with a two-column narrow layout.
- All five Tatarstan steps checked at desktop and 375px mobile; no page-width overflow or clipped step controls in these checks.
- Back from step 5 restores step 4; Forward restores step 5. Also verified step 3 back to step 2.
- Mobile drawer Escape closes the menu and restores focus to `mobileMenuOpenBtn`.
- Light-theme workshop inspected; title/body contrast and share-button contrast corrected on its retained dark panel.
- No captured browser warnings/errors in the final local browser session. Not a certification of every interaction or real iOS Safari compatibility; voice playback was outside scope.
- Static HTML text-token and image-attribute multisets match the baseline. Audio engine and culture database region of inline JS are byte-identical. Existing media, translations and JSON datasets have no changes. Inline JavaScript passed `node --check`.
- Screenshots stored outside the repository in `/home/sema/.gemini/antigravity/scratch/projecthistory-visual-review/`.

## Team — actual calls

- Codex: implementation, source comparison, browser inspection and integration.
- AI STAR (Anthropic Proxy), `claude-sonnet-5-5`: one successful design consultation. Accepted two-row header, restrained gold, readable panel palette and mobile object-first layout. Retained the existing fonts and all nine link labels. Did not adopt content changes or a full vertical desktop expedition.
- OpenRouter, `deepseek/deepseek-chat`: one attempted independent review failed with HTTP 402 both directly and through proxy. No review result was received; Codex performed the code and browser checks.
- No Sonar, media generation or other model calls in this stage. Token usage was not supplied by the gateway; no usage estimate is asserted.
