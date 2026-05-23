# Presentations directory

Each presentation lives in **its own folder** with this layout:

```
Presentations/
├── manifest.json                  # registry of all presentations
└── <presentation-slug>/
    ├── presentation.json          # the slide deck
    ├── images/                    # images referenced by this deck
    │   └── *.png|jpg|webp|svg
    └── assets/                    # fonts, videos, code snippets, other binaries
        └── *
```

## `manifest.json`

Lists every presentation that should appear in the in-app library.
Each entry has:

```json
{ "folder": "my-deck-slug", "title": "My Deck Title" }
```

The loader fetches `Presentations/<folder>/presentation.json`.

## Image / asset references

Inside each `presentation.json`, image and asset URLs should be:

```
Presentations/<folder>/images/<file>
Presentations/<folder>/assets/<file>
```

These are relative to the app root, so they resolve the same in editor,
player, and speaker views.

## Adding a new presentation

1. `mkdir -p Presentations/my-new-deck/{images,assets}`
2. Save the deck JSON as `Presentations/my-new-deck/presentation.json`
3. Add an entry to `manifest.json`:
   ```json
   { "folder": "my-new-deck", "title": "My New Deck" }
   ```

## Backward compatibility

Legacy `manifest.json` entries using `"file": "name.json"` (pointing at a
flat file directly under `Presentations/`) are still loaded by the app.
The shared `Presentations/images/` directory is also retained so older
decks keep rendering.
