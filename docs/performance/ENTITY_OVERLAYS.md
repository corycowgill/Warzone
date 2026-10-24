# Entity overlay rendering — 2026-10-24

Health bars and type labels are presentation work. They now update once in `Game.renderUpdate`, after camera movement, rather than during every combat simulation step. Catch-up simulation steps no longer repeat these updates.

The render pass hides overlays for dead, garrisoned, fog-hidden and out-of-view entities. Healthy, unselected idle/moving entities do not display health bars. Selected, damaged, engaged, retreating, EMP-disabled and unfinished entities retain them. Existing type-label distance limits remain. Bar fill geometry/color only updates when health changes; billboard rotation still follows the camera. Parent rotation is compensated so turning units do not turn their bars away from the viewer.

A regression scene with 500 actual Entity health-bar groups starts with 1,500 visible plane meshes. The new policy hides all of them while the army is healthy, idle and unselected. Marking 20 units damaged and another 20 selected restores exactly 120 visible health-bar meshes. This is a scene-graph visibility measurement, not a GPU draw-call or FPS benchmark. Fully engaged/damaged armies retain their bars, so that artificial idle-army saving should not be extrapolated to a full battle.

Six regression tests cover visibility policy, current-camera frustum culling/restoration, fog privacy, rotated-parent billboarding, cached fill updates/healing and 500-entity visibility counts. All 182 tests and performance/control/interface checks pass. No fresh browser FPS result is claimed; desktop browser control was unavailable in the preceding live-testing attempt.
