# Warzone art direction and interface overhaul

## Direction

AAA-inspired stylized military: painterly warfront key art, sculpted armor,
charcoal command surfaces, warm brass, ivory typography and blue/red tactical
identity. The title is cinematic; the battle interface prioritizes readable
information and unobstructed command areas.

| Role | Color |
|---|---|
| Deep surfaces | `#101b20` |
| Command panels | `#17262b` |
| Main text | `#eee8d7` |
| Brass accent | `#cfaa67` |
| Allied cues | `#83b7d2` |
| Threat cues | `#db8378` |

## Shipped assets and integration

- `assets/art/warzone-keyart.webp`: original generated title artwork, optimized
  from the original PNG without changing its composition. Also used behind
  briefing and loading screens. Built-in ImageGen was used; no API-key CLI.
- `css/art-direction.css`: interface tokens, cinematic menu, briefing, HUD,
  selection/production/command panels, minimap frame, tutorial and settings.
- `js/ui/UIIcons.js`: original vector tactical icon system used in resource
  displays, command buttons, unit inspection and production.
- `js/ui/ArtDirection.js`: resource icons and keyboard-accessible nation cards.

The title menu exposes the main play modes immediately and groups secondary
features under More operations. Existing action IDs and game event handlers
remain connected. Command buttons now have visible labels, hotkeys and accessible
names. Nation cards support Enter and Space with announced selection state.
Reduced-motion users receive a static title illustration.

## Battlefield readability

The post-processing chain now ends with Three.js OutputPass for correct display
color conversion. The vignette no longer uses reversed smoothstep edges or
blacks out the periphery. Outlines are subtler. Day zero now matches the documented
noon phase, with balanced fill lighting and filmic tone mapping. Terrain palette
values are converted into linear vertex colors. Three corrupt neutral PNG fallback
textures were re-encoded correctly; this does not restore the original model
texture atlases. The starting camera is closer, and edge-pan ignores UI panels.

`npm start` now runs under the repository's ES-module package configuration and
serves WebP with its correct MIME type. Use `PORT` to override port 8000.

## Artwork provenance and final generation prompt

Generated using the built-in ImageGen tool. Final production asset:
`assets/art/warzone-keyart.webp`.

```text
Use case: stylized-concept. Asset type: production title-screen background art for WARZONE, an alternate-WWII real-time strategy game. Create a premium AAA stylized hand-painted 3D cinematic key art, widescreen landscape 16:9. A heroic olive drab WWII-inspired medium tank with cast rounded turret occupies the right foreground in a dramatic low three-quarter view; two infantry silhouettes accompany it, distant heavy armor advances toward a war-torn European hill town, tiny propeller aircraft cross a huge storm cloud sky. High-end sculptural shapes, convincing mechanical details, painterly textures, atmospheric depth, cohesive art-directed composition, not toy-like or blocky. Warm amber sunlight breaks through smoke and illuminates armor edges against deep desaturated petrol-blue shadows, muted olive and stone, subtle sparks and drifting dust. Epic, resolute, strategic, rich contrast with restrained saturation. Crucial UI composition: keep LEFT 40 percent dark, atmospheric, low-detail negative space for a large title and vertical menu; focus tank and golden light in RIGHT 60 percent, keep central-left calm. Landscape fills whole canvas edge to edge. No text, no logos, no watermarks, no UI, no swastikas or real-world insignia, no gore. This is finished game marketing art, not a mockup or screenshot.
```

## Validation and limits

Run `npm run test:interface`, `npm run test:armor`, and `npm test`.
Browser checks cover title, briefing, tutorial launch, actual infantry selection,
command labels and Stop activation, plus a 390px mobile breakpoint. This is an art
and interface overhaul, not a claim that every legacy game asset is AAA quality.
All unit and building manifest entries now use original Blender GLBs (see ROSTER_ASSETS.md). Environment trees and props retain mixed-source art;
large-army performance is not benchmarked. Existing gameplay test failures are
tracked separately from the graphics and interface work.


## Camera orientation and view controls

The default battlefield view is north-up and matches the tactical map (+X right, -Z up). Rotate continuously with Q/E or middle-mouse drag; the buttons above the minimap step by 45 degrees. Home or N / Reset restores north without changing focus or zoom. Shift + middle-drag pans; arrow keys and edge panning follow screen directions at every heading. Touch twist/pinch controls remain available. The minimap stays north-up while its projected camera footprint rotates, and minimap picking respects its displayed size.

Run `npm run test:camera` for real Three.js projection and input checks. Browser testing verified rotation to 45 degrees, reset to north, and the fully visible tactical map in a separate tutorial session.
