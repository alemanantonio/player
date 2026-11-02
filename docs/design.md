# Zenith listening experience — Phase 10

## Direction

The supplied player.html is visual inspiration only. Zenith keeps its own real four-blade mark from public/favicon.svg, its native audio engine, existing data, independent source policy and all workflows implemented in phases 1–9. No example songs, simulated provider connections or phase checklists appear in the product.

The design centers on a plum listening space, album artwork and restrained lavender controls. The large artwork is the visual focus; navigation and editing controls stay quiet. Content is left-aligned, except the compact player and narrow-window artwork presentation.

- Dark palette: canvas #0e0916, sidebar #130d1e, surface #170f23, text #f6f0fa, secondary #b3a2c1, accent #d0afe5.
- Light palette: canvas #f9f6fc, sidebar #f0eaf6, surface #ffffff, text #2a1937, secondary #71607e, accent #80509d.
- Brand selection: #8b56a5. The existing icon is reused rather than redrawn.
- Typography: Segoe UI Variable / Segoe UI on Windows, system equivalents elsewhere. Light 30–56px listening titles, 21px collection headings, 13–14px controls and track titles. No external font dependency.
- Motion: short responses to interaction; the playing indicator follows actual audio state. Existing artwork visibility, battery and reduced-motion rules remain in force.

## Layout and navigation

Sidebar | Page heading and global search
        | Home / collection / focused listening view
--------+--------------------------------------------
Artwork and favorite | Transport and seek | Volume, lyrics and queue

The app opens on Inicio. Navigation groups Inicio/Buscar, the library (songs, albums, artists, genres, favorites, playlists, history), downloads/sources, and settings. The bottom player stays mounted across navigation, as does the audio controller. Settings remains accessible in the scrolling sidebar. Narrow windows use an icon rail with accessible labels and a two-row player that retains seeking and previous/next controls.

Phase reviews and development shortcuts are removed from the product. Roadmap tracking stays in documentation and src/phases.ts. The user reported phases 1–9 validated on 2026-11-02; that report is recorded without inferring which platform-specific checks they performed.

## Listening flows

- Inicio uses real recent listens, recent additions, favorites and play counts. Album shelves preserve phase 6 identity keys. An empty library provides import/source actions and the Zenith mark.
- Buscar groups songs, albums, artists and saved playlists with explicit filters. A source action carries the query into Fuentes; external queries still require the user's existing opt-in and provider selection. No network search runs merely because a user types.
- Canciones retains file/folder import, favorite toggles, internal metadata editing, explicitly requested tag writing, locations, duplicate inspection and metadata JSON import. Secondary track actions live in an accessible More disclosure. Organizar biblioteca holds advanced import/rescan actions.
- Álbumes, Artistas and Géneros open collection galleries, then the underlying tracks. Playback from an opened collection uses that collection's playable entries.
- Ahora suena combines large/animated artwork, metadata, artwork-derived background color, existing synchronized lyrics and the independent queue. Cambiar portada opens the complete artwork manager. The bottom player opens this view through its cover or title.
- Lyrics retains four modes, word synchronization, offsets, typography/colors, external opt-in, search/import/edit/export/select/reject/delete. Editing and presentation options sit in a disclosure below the reading surface.
- The player provides current track metadata, a persistent library favorite toggle, previous/play/next, seek, volume/mute, repeat/shuffle, lyrics and queue access. All commands use the previous audio controller. Queue controls retain every operation from phase 5.
- Descargas lists existing completed audio files in cache/audio without external opt-in or credentials. Partial files and directories are excluded. Playback uses their actual local paths. Cache cleanup may remove them, as the UI explains.
- Configuración groups appearance, library/data, audio and privacy. Light/dark/system themes use the existing persisted appearance contract. Backups, export/import, recovery details, cache cleanup, audio output restart and source management remain available. Future integrations are not presented as working controls.

## Verification

Automated checks: frontend types/lint/format, production build, 31 frontend tests, 98 Rust tests, rustfmt and Clippy. New regressions verify album identity preservation in discovery, Unicode search, exclusion of unavailable media from playback, and offline cache enumeration without credential access.

Browser review: Inicio and its honest empty state; navigation to settings; changing light/dark themes; search with no matches; Ahora suena; minimum 640×480 window and normal 1100×720 window. Native imports, real-provider credentials and physical audio output were not exercised by browser-only review. Existing native regression tests cover their contracts; the redesigned installed application still needs the user's final visual/interaction acceptance.
