"""Split the checked-in generated albedo atlas into runtime WebP tiles.
Requires Pillow. This processes the saved ImageGen output; no API call needed.
"""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'assets/textures/environment'
image=Image.open(root/'terrain-atlas-source.png').convert('RGB')
width,height=image.size
for name,x,y in [('grass',0,0),('dirt',1,0),('rock',0,1),('sand',1,1)]:
    tile=image.crop((x*width//2+2,y*height//2+2,(x+1)*width//2-2,(y+1)*height//2-2))
    tile.resize((512,512)).save(root/(name+'.webp'),quality=90)
    print(name+'.webp')
