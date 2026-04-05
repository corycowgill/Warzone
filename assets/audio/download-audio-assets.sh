#!/bin/bash
# ============================================================================
# Warzone Audio Asset Downloader
# Downloads free CC0/royalty-free audio packs for the Warzone RTS game
# ============================================================================
# Usage: bash assets/audio/download-audio-assets.sh
# Run from the project root directory
# ============================================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUDIO_DIR="$SCRIPT_DIR"
TMP_DIR="/tmp/warzone-audio-downloads"

mkdir -p "$TMP_DIR"
mkdir -p "$AUDIO_DIR/sfx/weapons"
mkdir -p "$AUDIO_DIR/sfx/explosions"
mkdir -p "$AUDIO_DIR/sfx/vehicles"
mkdir -p "$AUDIO_DIR/sfx/ui"
mkdir -p "$AUDIO_DIR/sfx/ambient"
mkdir -p "$AUDIO_DIR/music"
mkdir -p "$AUDIO_DIR/kenney"

echo "============================================"
echo "  Warzone Audio Asset Downloader"
echo "============================================"
echo ""

# -------------------------------------------------------
# 1. KENNEY AUDIO PACKS (CC0 - Public Domain)
# -------------------------------------------------------
echo "[1/6] Downloading Kenney Impact Sounds (130 assets)..."
curl -sL -o "$TMP_DIR/kenney_impact-sounds.zip" \
  "https://kenney.nl/media/pages/assets/impact-sounds/8aa7b545c9-1677589768/kenney_impact-sounds.zip"
echo "      Done: $(ls -lh "$TMP_DIR/kenney_impact-sounds.zip" | awk '{print $5}')"

echo "[2/6] Downloading Kenney Interface Sounds (100 assets)..."
curl -sL -o "$TMP_DIR/kenney_interface-sounds.zip" \
  "https://kenney.nl/media/pages/assets/interface-sounds/d23a84242e-1677589452/kenney_interface-sounds.zip"
echo "      Done: $(ls -lh "$TMP_DIR/kenney_interface-sounds.zip" | awk '{print $5}')"

echo "[3/6] Downloading Kenney Sci-Fi Sounds (70 assets)..."
curl -sL -o "$TMP_DIR/kenney_sci-fi-sounds.zip" \
  "https://kenney.nl/media/pages/assets/sci-fi-sounds/e3af5f7ed7-1677589334/kenney_sci-fi-sounds.zip"
echo "      Done: $(ls -lh "$TMP_DIR/kenney_sci-fi-sounds.zip" | awk '{print $5}')"

echo "[4/6] Downloading Kenney UI Audio (50 assets)..."
curl -sL -o "$TMP_DIR/kenney_ui-audio.zip" \
  "https://kenney.nl/media/pages/assets/ui-audio/e19c9b1814-1677590494/kenney_ui-audio.zip"
echo "      Done: $(ls -lh "$TMP_DIR/kenney_ui-audio.zip" | awk '{print $5}')"

echo "[5/6] Downloading Kenney Digital Audio (60 assets)..."
curl -sL -o "$TMP_DIR/kenney_digital-audio.zip" \
  "https://kenney.nl/media/pages/assets/digital-audio/7492b26e77-1677590265/kenney_digital-audio.zip"
echo "      Done: $(ls -lh "$TMP_DIR/kenney_digital-audio.zip" | awk '{print $5}')"

echo "[6/6] Downloading Kenney RPG Audio (50 assets)..."
curl -sL -o "$TMP_DIR/kenney_rpg-audio.zip" \
  "https://kenney.nl/media/pages/assets/rpg-audio/706161bc16-1677590336/kenney_rpg-audio.zip"
echo "      Done: $(ls -lh "$TMP_DIR/kenney_rpg-audio.zip" | awk '{print $5}')"

# -------------------------------------------------------
# Extract all Kenney packs
# -------------------------------------------------------
echo ""
echo "Extracting Kenney audio packs..."

for zipfile in "$TMP_DIR"/kenney_*.zip; do
  packname=$(basename "$zipfile" .zip)
  echo "  Extracting $packname..."
  unzip -qo "$zipfile" -d "$AUDIO_DIR/kenney/$packname"
done

echo ""
echo "============================================"
echo "  Kenney packs downloaded and extracted!"
echo "============================================"
echo ""

# -------------------------------------------------------
# Organize files into game categories
# -------------------------------------------------------
echo "Organizing audio files into game categories..."

# Impact Sounds -> explosions and weapons
IMPACT_DIR="$AUDIO_DIR/kenney/kenney_impact-sounds"
if [ -d "$IMPACT_DIR" ]; then
  find "$IMPACT_DIR" -name "*.ogg" -exec cp {} "$AUDIO_DIR/sfx/explosions/" \; 2>/dev/null || true
  echo "  Impact sounds -> sfx/explosions/"
fi

# Interface Sounds -> ui
INTERFACE_DIR="$AUDIO_DIR/kenney/kenney_interface-sounds"
if [ -d "$INTERFACE_DIR" ]; then
  find "$INTERFACE_DIR" -name "*.ogg" -exec cp {} "$AUDIO_DIR/sfx/ui/" \; 2>/dev/null || true
  echo "  Interface sounds -> sfx/ui/"
fi

# UI Audio -> ui
UI_DIR="$AUDIO_DIR/kenney/kenney_ui-audio"
if [ -d "$UI_DIR" ]; then
  find "$UI_DIR" -name "*.ogg" -exec cp {} "$AUDIO_DIR/sfx/ui/" \; 2>/dev/null || true
  echo "  UI audio -> sfx/ui/"
fi

# Sci-Fi Sounds -> weapons (lasers, energy weapons, sci-fi vehicles)
SCIFI_DIR="$AUDIO_DIR/kenney/kenney_sci-fi-sounds"
if [ -d "$SCIFI_DIR" ]; then
  find "$SCIFI_DIR" -name "*laser*" -o -name "*shot*" -o -name "*weapon*" -o -name "*fire*" | \
    xargs -I{} cp {} "$AUDIO_DIR/sfx/weapons/" 2>/dev/null || true
  find "$SCIFI_DIR" -name "*explosion*" | \
    xargs -I{} cp {} "$AUDIO_DIR/sfx/explosions/" 2>/dev/null || true
  find "$SCIFI_DIR" -name "*engine*" -o -name "*vehicle*" -o -name "*thrust*" | \
    xargs -I{} cp {} "$AUDIO_DIR/sfx/vehicles/" 2>/dev/null || true
  echo "  Sci-fi sounds -> sfx/weapons/, sfx/explosions/, sfx/vehicles/"
fi

# Digital Audio -> ui and ambient
DIGITAL_DIR="$AUDIO_DIR/kenney/kenney_digital-audio"
if [ -d "$DIGITAL_DIR" ]; then
  find "$DIGITAL_DIR" -name "*.ogg" -exec cp {} "$AUDIO_DIR/sfx/ambient/" \; 2>/dev/null || true
  echo "  Digital audio -> sfx/ambient/"
fi

# RPG Audio -> weapons and ambient
RPG_DIR="$AUDIO_DIR/kenney/kenney_rpg-audio"
if [ -d "$RPG_DIR" ]; then
  find "$RPG_DIR" -name "*sword*" -o -name "*hit*" -o -name "*attack*" | \
    xargs -I{} cp {} "$AUDIO_DIR/sfx/weapons/" 2>/dev/null || true
  find "$RPG_DIR" -name "*ambient*" -o -name "*wind*" -o -name "*rain*" -o -name "*nature*" | \
    xargs -I{} cp {} "$AUDIO_DIR/sfx/ambient/" 2>/dev/null || true
  echo "  RPG audio -> sfx/weapons/, sfx/ambient/"
fi

echo ""
echo "============================================"
echo "  Audio organization complete!"
echo "============================================"
echo ""
echo "Directory structure:"
echo "  assets/audio/sfx/weapons/    - $(find "$AUDIO_DIR/sfx/weapons" -type f 2>/dev/null | wc -l) files"
echo "  assets/audio/sfx/explosions/ - $(find "$AUDIO_DIR/sfx/explosions" -type f 2>/dev/null | wc -l) files"
echo "  assets/audio/sfx/vehicles/   - $(find "$AUDIO_DIR/sfx/vehicles" -type f 2>/dev/null | wc -l) files"
echo "  assets/audio/sfx/ui/         - $(find "$AUDIO_DIR/sfx/ui" -type f 2>/dev/null | wc -l) files"
echo "  assets/audio/sfx/ambient/    - $(find "$AUDIO_DIR/sfx/ambient" -type f 2>/dev/null | wc -l) files"
echo "  assets/audio/music/          - $(find "$AUDIO_DIR/music" -type f 2>/dev/null | wc -l) files"
echo "  assets/audio/kenney/         - Raw Kenney packs (full archives)"
echo ""
echo "All Kenney assets are CC0 (public domain) - no attribution required."
echo ""
echo "============================================"
echo "  Additional sources (manual download):"
echo "============================================"
echo ""
echo "See assets/audio/AUDIO_SOURCES.md for more free audio sources"
echo "including Sonniss GDC Bundle, Freesound.org, Pixabay, and Mixkit."
echo ""

# Cleanup
echo "Cleaning up temp files..."
rm -rf "$TMP_DIR"
echo "Done!"
