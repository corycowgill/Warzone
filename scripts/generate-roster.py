"""Generate the full original GLB roster; optional --only=units/buildings."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from roster_common import *
from roster_units import UNIT_BUILDERS
from roster_buildings import BUILDING_BUILDERS

report=[]
only=next((s.split('=',1)[1] for s in sys.argv if s.startswith('--only=')),None)
for category,builders in [('units',UNIT_BUILDERS),('buildings',BUILDING_BUILDERS)]:
    if only and only!=category:continue
    for key,build in builders.items():
        reset()
        build()
        item=export(key,category)
        report.append(item)
        print('ROSTER_ASSET '+json.dumps(item),flush=True)
    dest=ROOT/f'assets/models/{category}/warzone-original/roster-manifest.json'
    dest.write_text(json.dumps([r for r in report if r['category']==category],indent=2)+'\n')
print('ROSTER_COMPLETE '+str(len(report)),flush=True)
