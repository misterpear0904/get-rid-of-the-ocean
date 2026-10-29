# Get Rid of the Ocean

A playable 3D incremental game built with Three.js. A pocket lighter becomes a horizon eraser, one visibly shrinking container at a time.

## Play locally

Run `start-game.cmd`, or run `npm start` in this folder and open http://127.0.0.1:5177. Node.js is required. Three.js is bundled in `dist/vendor`; playing requires no dependency installation or CDN. The optional Google Fonts request falls back to system fonts if offline.

## Controls

- WASD: walk in first person. Shift: run.
- Click the world to capture the mouse and look around, or right-drag without capture. Escape releases capture.
- Hold Space, left mouse while captured, or the work button near the water: remove water and earn money.
- E at a shop counter: buy upgrades. Escape: close a panel or pause.
- The gear button opens Settings: remap every gameplay key, change sensitivity, invert vertical look, adjust field of view, or choose Low / Balanced / High graphics. Settings persist separately from your voyage save.
- Automatic resolution adjustment is on by default: sustained slow frames or repeated spikes gradually lower resolution, with a long recovery delay to prevent oscillation. Enable Show FPS and frame times in Settings for live diagnostics. Turning it off fixes resolution at the selected preset.
- 1–4: mark water, tools, skills, or automation with an orange world marker. Walk to the marker to reach the destination.
- Buying automation gives you a packed machine and opens a placement preview. Walk to the water, then press your interact key (E by default) or click INSTALL UNDER WATER. The preview snaps beneath the source. Escape cancels placement while keeping the machine. Use PLACE AUTOMATION to resume placement later; machines only operate once installed. Previously purchased machines from older saves are preserved in this placement inventory.

## Included

Six containers: cup, pot, bathtub, pool, lake, and a stylized billion-litre ocean. Eight held tools; five automation machine types; three skill trees; completion rewards and recovered keepsakes; an additional voyage with permanent power; procedural water and particles; moving character and camera; physically visited shops; local autosave; up to one hour of offline automation; save export/import; pause and sound controls.

The first-person update adds cup/pot level windows, a fixed original-full line, a descending waterline and level float, a percentage-removed readout, animated flames directly under the small sources, and piped boilers for larger basins. Static scenery is merged by material (184 meshes reduced to 35); steam uses one instanced draw; balanced graphics disables shadows and caps pixel density. High enables cached shadows, Low reduces resolution further, and paused/modal rendering is throttled. Actual GPU frame rate still needs verification in your browser.

The scale update keeps heaters/intakes under the water and connects them to visible above-ground boilers, pumps, bucket crews, and solar rigs. The ocean adds offshore platforms and cooling towers. Animated exhaust, water discharge, conveyors of light through pipes, and moving bucket bots make production visible. Machine installation includes a one-time startup surge of up to 4% of the current container (eight seconds of that machine's output, credited as real removal).

The pool is 24 world-metres wide, the lake 44, and the ocean 88, with fixed-size people and railings as references. Pool steps and receding shores become walkable as they dry; the camera follows your ground height. Ruins and a larger shipwreck emerge. At stage completion choose EXPLORE THE DRY BED to stay; press your interact key near the basin to return to the completion panel when ready to continue. The trophy yard beyond the source displays your emptied cup, pot, and bathtub at their original sizes. The world dimensions and litre economy are intentionally stylized.

Progress is saved per browser and origin. Local and hosted versions have separate saves; use Field Notes to export/import between them. Desktop keyboard and mouse are recommended. Containers and volumes are deliberately stylized for a short playable incremental arc, rather than physically accurate evaporation.

## Development

`npm test` checks gameplay, scene geometry, terrain access, settings, frame scheduling, and adaptive rendering. `npm run benchmark` measures scene-update CPU time with a mock renderer and writes results under qa/; it does not measure WebGL/GPU performance. `npm install` followed by `npm run vendor` refreshes the pinned Three.js files. `npm start` serves `dist` on port 5177; set `PORT` to override. No build step is required. See DESIGN.md for research and design decisions.

The stutter revision removes the active-play frame-skipping limiter, defers periodic saves to browser idle time, skips unchanged HUD text, simplifies water shading in Balanced/Low, disables multisampling, reuses frame data and materials, releases old stage resources, and skips inactive particle uploads. Cosmetic particle buffers update at 30Hz while movement and camera rendering follow every browser refresh. Changes to controls or sensitivity no longer reallocate graphics buffers. Existing saves and controls are preserved.

Every installed automation item now has its own visible rig and numbered nameplate (BOILER #01, BOILER #02, etc.), with separate pipes and outlets. New units use spaced dry sites around the source, and existing units keep their locations while you add more. Offshore machinery also receives individual platforms. Static equipment remains batched; nearby labels and moving details are limited to keep large collections responsive. All 125 possible installed machines can be represented individually. Existing saves automatically use the new display without changing ownership or output.

Three.js is MIT licensed; license is bundled in dist/vendor/THREE-LICENSE.txt.

The bathtub and larger basins now sit entirely above the yard. Larger stages have raised viewing decks and access stairs; the bathtub and pool have glass fronts that expose the falling water volume. The deck-mounted FULL/EMPTY gauge stays above the rim and uses the same fill fraction as the water. Orange machine pipes pass over the rim, and offshore platforms remain above full water level.

Shops face the water at every scale, with their interaction points and collision bounds following the entrance. Shop lettering is fixed to the signboards so it cannot swivel into the backing at oblique viewing angles. The field office has been removed.
