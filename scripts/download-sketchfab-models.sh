#!/bin/bash
# Sketchfab Model Download Helper for Warzone RTS
# 
# Sketchfab requires authentication for model downloads.
# This script provides the URLs and instructions for each model.
#
# OPTION A: Manual download (recommended)
#   1. Visit each URL below in your browser
#   2. Click "Download 3D Model" → choose "glTF" format
#   3. Extract the ZIP and place the .glb file in the specified directory
#
# OPTION B: Use Sketchfab API with token
#   1. Create account at sketchfab.com
#   2. Get API token from: https://sketchfab.com/settings/password
#   3. Set: export SKETCHFAB_TOKEN="your-token-here"
#   4. Run this script

ASSETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/models"
TOKEN="${SKETCHFAB_TOKEN:-}"

download_model() {
  local uid="$1"
  local dest="$2"
  local name="$3"
  
  if [ -z "$TOKEN" ]; then
    echo "MANUAL: Download '$name' from:"
    echo "  https://sketchfab.com/3d-models/$uid"
    echo "  Save to: $dest"
    echo ""
    return
  fi
  
  echo "Downloading: $name..."
  # Request download URL
  local resp=$(curl -s -H "Authorization: Token $TOKEN" \
    "https://api.sketchfab.com/v3/models/$uid/download")
  local url=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['gltf']['url'])" 2>/dev/null)
  
  if [ -n "$url" ]; then
    curl -L -o "$dest" "$url"
    echo "  Saved: $dest"
  else
    echo "  ERROR: Could not get download URL. Visit manually:"
    echo "  https://sketchfab.com/3d-models/$uid"
  fi
  echo ""
}

echo "=== Warzone RTS - Sketchfab Model Downloader ==="
echo ""

if [ -z "$TOKEN" ]; then
  echo "No SKETCHFAB_TOKEN set. Showing manual download instructions."
  echo "To automate: export SKETCHFAB_TOKEN=your-token-here"
  echo ""
fi

# === TIER 1: CRITICAL REPLACEMENTS ===

echo "--- TIER 1: Critical Replacements ---"
echo ""

# Tiger Tank (Heavy Tank)
download_model "low-poly-tiger-1-673d62cd884d45cba535007b0553f954" \
  "$ASSETS_DIR/units/heavy-tank.glb" \
  "Low Poly Tiger 1 (Heavy Tank) by SGAstudio [CC-BY]"

# Propeller Fighter (replaces modern jet)
download_model "low-poly-propeller-plane-3ca91472b1b64072a0d3a64d86690df8" \
  "$ASSETS_DIR/units/fighter-prop.glb" \
  "Low-poly Propeller Plane (Fighter) by RC-Studios [CC-BY]"

# RTS Soldiers (Infantry) - CC0!
download_model "rts-mercenaries-1-cc0-280b03056863466798bcd92dd012432f" \
  "$ASSETS_DIR/units/rts-soldiers-1.glb" \
  "RTS Mercenaries 1 (Infantry) by britdawgmasterfunk [CC0]"

# RTS Commander - CC0!
download_model "military-rts-character-1-cc0-908065a7006443b29edca30276750a6d" \
  "$ASSETS_DIR/units/rts-commander.glb" \
  "Military RTS Character 1 (Commander) by britdawgmasterfunk [CC0]"

# Submarine
download_model "submarine-low-poly-e363d3575d23495aa79fc8f3d9b88a67" \
  "$ASSETS_DIR/units/submarine-wwii.glb" \
  "Submarine Low Poly by vonBerlichingen [CC-BY]"

# Aircraft Carrier
download_model "german-aircraft-carrier-graf-zeppelin-low-poly-826d09ed54ab425a83ba09e82f082c70" \
  "$ASSETS_DIR/units/carrier-graf-zeppelin.glb" \
  "Graf Zeppelin Aircraft Carrier by vonBerlichingen [CC-BY]"

# V2 Rocket Launch Base (Superweapon)
download_model "rocket-launch-base-low-poly-2d3e9be60c9b4dbf8b5aabb0a60f75cd" \
  "$ASSETS_DIR/buildings/superweapon-v2.glb" \
  "Rocket Launch Base (Superweapon) by vonBerlichingen [CC-BY]"

# WWII Bunker
download_model "u-boot-bunker-ww2-low-poly-0780d3a9092f4dc589bf829db5151150" \
  "$ASSETS_DIR/buildings/bunker-wwii.glb" \
  "U-Boot Bunker WW2 by vonBerlichingen [CC-BY]"

echo "--- TIER 2: Naval Pack ---"
echo ""

# Warships Pack (10+ WWII ships)
download_model "low-poly-warships-b4a24feab803419a8cb8700ae2557bd0" \
  "$ASSETS_DIR/units/warships-pack.glb" \
  "Low Poly Warships Pack by Ascanium [CC-BY]"

# WW2 Destroyer
download_model "low-poly-ww2-destroyer-2514094cc7ba415599e5ffea92395296" \
  "$ASSETS_DIR/units/destroyer-wwii.glb" \
  "Low Poly WW2 Destroyer by PandasEdge [CC-BY]"

echo "--- TIER 3: Aircraft ---"
echo ""

# Spitfire
download_model "low-poly-spitfire-a0d1630c64fc4b808347d7058d85aede" \
  "$ASSETS_DIR/units/spitfire.glb" \
  "Low Poly Spitfire by Daniel Campos [CC-BY]"

# Bf-109
download_model "low-poly-messerschmitt-bf-109-d6827fdbdbc447969523d9d22f60a396" \
  "$ASSETS_DIR/units/bf109.glb" \
  "Low Poly Messerschmitt BF-109 by DLM96 [CC-BY]"

# Bomber
download_model "junkers-ef-132-low-poly-375794303a544ba780c0f73942366d24" \
  "$ASSETS_DIR/units/bomber-junkers.glb" \
  "Junkers EF 132 Bomber by vonBerlichingen [CC-BY]"

echo "--- TIER 4: Vehicles & Buildings ---"
echo ""

# Willys Jeep (Scout Car)
download_model "low-poly-military-jeep-willys-mb-ww2-scene-fcf129444005466ebd6cbbe0685aeec2" \
  "$ASSETS_DIR/units/jeep-willys.glb" \
  "Willys Jeep (Scout Car) by SilkevdSmissen [CC-BY]"

# Military Building (HQ)
download_model "military-rts-character-1-cc0-908065a7006443b29edca30276750a6d" \
  "$ASSETS_DIR/buildings/hq-military.glb" \
  "Military Building (HQ) [CC-BY]"

# RTS Soldiers 2 (Engineer variant) - CC0!
download_model "rts-mercenaries-2-cc0-779cd2eafedd456abd1e6879a67c6720" \
  "$ASSETS_DIR/units/rts-soldiers-2.glb" \
  "RTS Mercenaries 2 (Engineer) by britdawgmasterfunk [CC0]"

echo "=== Done ==="
echo ""
echo "After downloading, update js/rendering/AssetManager.js MANIFEST"
echo "to point to the new model file paths."
