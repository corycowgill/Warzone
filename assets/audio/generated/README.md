# Warzone generated soundtrack and effects

25 original recordings generated locally on 2026-10-23 with the installed ComfyUI audio setup and an RTX 4060:

- Music model: [Stable Audio 3 Small Music](https://huggingface.co/stabilityai/stable-audio-3-small-music).
- Effects model: [Stable Audio 3 Small SFX](https://huggingface.co/stabilityai/stable-audio-3-small-sfx).
- ComfyUI checkpoint packaging and text encoder: [Comfy-Org Stable Audio 3](https://huggingface.co/Comfy-Org/stable-audio-3), `t5gemma_b_b_ul2.safetensors`.
- Inference: ComfyUI 0.37.0, eight LCM steps, simple scheduler, CFG 1. Each prompt and seed is recorded in `manifest.json` and `scripts/audio-prompts.json`.

The model and encoder retain their upstream license terms. This pack documents generated outputs, not a redistribution of model weights. No cloud inference or paid generation service was used.

## Contents

| Asset | Duration | Use |
| --- | ---: | --- |
| menu | 57.50 s | Orchestral title theme |
| game | 77.56 s | Atmospheric planning underscore |
| combat | 77.56 s | Combat intensity layer |
| victory / defeat | 7.99 s each | End-of-match cues |
| 17 short effects | 0.25–3.20 s | Weapons, impacts, casualty equipment, interface, production, construction and abilities |
| wind / water / distant | 17.02 s each | Environmental loops |

The final Vorbis files total 5.30 MiB. Music and ambience are stereo; short effects are mono for positional playback. Files use 44.1 kHz audio and Vorbis quality 5.

## Preparation and runtime

Generated FLAC sources were trimmed and DC-corrected. Short effects receive attack/tail ramps. Music loops overlap by 2.5 seconds and ambience by one second to remove abrupt wrap boundaries. Levels are normalized, then the actual encoded files are decoded and checked for codec overshoot; the largest decoded peak in this pack is 0.931 full scale. SHA-256 hashes, durations, levels and byte counts are stored in the manifest.

The game loads and decodes effects once, retains camera-relative panning, throttling and the 24-voice budget, and lazily loads music/ambience. Music changes fade briefly, and cancellation prevents a delayed download from starting an obsolete track. Stopped loops release their cached decoded buffer. Decoded audio uses more RAM than the compressed download size; inactive menu/game loops are not deliberately retained together.

The normal music, combat, interface and ambience paths now use these recordings. Legacy synthesis functions remain available for diagnostics/older callers. Existing browser speech voice lines and their independent volume control remain in place. A failed recording load is logged once and stays silent until reload, rather than repeatedly retrying on every shot.

## Reproduce and review

Start the existing ComfyUI audio installation with the two checkpoints and text encoder available. Point the generator at its local API:

```powershell
python scripts/generate-ai-audio.py --url http://127.0.0.1:8188
python scripts/prepare-ai-audio.py
npm run test:generated-audio
```

The generator records workflows and copies FLAC outputs into the ignored `.tmp/audio-generation` directory. Existing per-asset completion records are skipped; use a fresh workspace to regenerate everything. Preparation requires NumPy and FFmpeg. The existing compatible ComfyUI Python environment was reused; no shared Python dependencies were upgraded.

Open `/docs/audio-preview.html` through the game server for the actual mixer and individual recordings. Browser checks confirmed menu/game decoding, all 19 mixer effects, the combat-layer control and cannon dispatch without console warnings or errors. All 25 files also passed full FFmpeg decoding and finite-sample checks. Objective checks do not substitute for subjective listening; the preview is provided for final mix review.

Validation: 148 Vitest tests plus `test:audio` and `test:generated-audio` pass, including loading deduplication, failure throttling, pending-loop cancellation, voice limits, asset hashes, channel layouts and sample rates.
