# Get Rid of the Ocean — design notes

## Research

Reviewed the official store descriptions on 25 October 2026:

- [A Game About Digging a Hole](https://store.steampowered.com/app/3244220/A_Game_About_Digging_A_Hole/): collect resources, sell them, upgrade equipment, and uncover a secret. Design takeaway: repetitive work feels purposeful when it changes the physical space and funds a clearly stronger tool.
- [Hydroneer](https://store.steampowered.com/app/1106840/Hydroneer/): mining and base building with profits used to improve an operation. Design takeaway: make the upgrade economy a place the player inhabits, with shops and visible machinery.
- [Digseum](https://store.steampowered.com/app/3361470/Digseum/): a short incremental journey about excavating relics and building a museum. Design takeaway: recover keepsakes and use an achievable finite first voyage rather than an endless flat resource grind.

These takeaways are design interpretations, not claims that those games contain this game's specific mechanics. Art, writing, world, and implementation here are original.

## The loop

Work near water → earn cash proportional to actual removed volume → walk to a shop → buy power or autonomous production → expose the bottom → recover a keepsake and claim a stage bonus → tackle a radically larger container.

The opening lighter clears the cup in about 42 seconds of continuous work. The first upgrade is affordable after about 25 seconds. Stage income and bonuses finance the next power jump. Early rates are millilitres per second; later tools reach millions of litres per second. Good Business increases cash per unit of removed water, Steady Hands improves active power, and Machine Whisperer improves automation.

## Graphics and feedback

Warm coastal greens, ceramic cream, orange workwear, mint water, and a low-poly workyard. First-person movement lets a physically tiny cup become an increasingly enormous basin. A custom animated water shader, shadows, steam particles, held tools, suction beams, rotating machinery, and a descending water surface support progression. Water exists within a hollow container; the bathtub and larger basins have raised floors above solid ground, retaining walls, viewing decks and access stairs. Each stage has a distinct silhouette: handled cup, metal stockpot, bathtub with faucet, tiled pool with ladder, lake, and ocean with a sunken boat.

## Scope and balance

This is a compact browser game, with stylized volumes and power. The billion-litre ocean is intentionally much smaller than Earth's oceans. There is a finite win, then a new voyage with +30% permanent power. Saves stay in browser local storage and can be exported/imported. Offline automation is capped at one hour and stops at the current container so rewards and stage transitions remain deliberate. The final automated buying strategy finishes in 1,063 seconds of continuous work; walking and browsing add time.

## Verification

Forty-two automated tests pass, covering gameplay, scene construction, terrain access, effects, installation, saving, refresh-rate pacing, adaptive resolution and recovery, frame-time statistics, idle particle uploads, avoiding buffer reallocations on input changes, individual machine layouts, stable spacing, numbered models, offshore spacing, and bounded detail for 125 units. HTTP and JavaScript syntax checks pass. Visual WebGL and interactive browser verification remain unconfirmed: the in-app browser times out on the local preview. Actual GPU frame rate has not been measured. A private hosting attempt was stopped by automatic approval review before source synchronization because explicit publication permission was missing. No deployment is claimed.

## Individual automation units

The former one-model-per-type display is replaced with one visible rig per installed item. Each unit has a stable type/index identity, a separate dry site, its own pipes and outlet, and a numbered nameplate. Adding equipment retains existing sites during play. The layout helper reserves water, shops, the field office, and trophy-yard space, and fits the maximum 125 units at every stage. Offshore equipment gets separate scaled decks rather than overlapping platforms.

Models remain statically batched. At most sixteen nearby nameplates (ten in Low) and their moving details are active; the shared exhaust pool cycles between outlets. Nameplate textures use one quarter of their former pixel area. The under-water plate remains a shared heat feed, with the separately visible apparatus showing each contributing machine. Counts, ownership, placement state, and production rates are unchanged. Luna implemented the bounded pure-layout helper and its tests; the main implementation integrates the models, per-unit effects, nameplates, and performance limits.

## Scale and spectacle revision

Heaters stay underneath, with visible apparatus outside the basin connected by orange pipes and animated light. Boilers vent steam, pumps pour water into troughs, bucket bots shuttle, and solar arrays cast a beam. Offshore platforms and cooling stacks make the final operation read as industrial infrastructure. One additional instanced effect mesh serves all automated exhaust/discharge, and static new machinery and landmarks are batched by material.

The pool, lake, and ocean now span 24, 44, and 88 world-metres, while workers remain 1.9m tall. Pure terrain rules match the pool entry steps and organic shores: wet areas and unsafe drops are blocked, dry steps lead down and back out, and the camera follows floor height. Exposed ruins and a 13m shipwreck reward walking the drained space. The original-size cup, stockpot, and bathtub persist in a trophy yard reached on foot or through the trophy destination hotkey.

Each newly installed machine has one commissioning burst: min(4% of container capacity, eight seconds of upgraded machine output). It removes actual water and pays proportional income immediately, so saving/reloading cannot repeat it. A brief HUD highlight and message call attention to the drop. A bounded Luna review supplied independent acceptance-test suggestions and identified repeated commissioning and stale world coordinates as implementation risks; both have checks.

## First-person and performance revision

The camera now follows the player's eye position with camera-mounted hands/tools, mouse capture or right-drag look, and remappable movement. Small containers have a front level window. A full marker stays fixed while a contrasting current waterline and a gauge float descend. Larger shorelines continue to recede. Gas stoves sit beneath cup/pot sources; larger boilers sit beside the basin with hot pipes entering the water. Flames respond to active heating and stove automation. Settings pause gameplay and persist control bindings, sensitivity, inversion, field of view, and graphics quality independently from the save.

The static environment batches from 184 meshes to 35, and manual steam is a 36-instance mesh with time-based emission rather than separate mesh draws emitted every frame. Balanced graphics starts at most 1× device pixel density with no shadow pass. High starts at 1.5× density with cached 1024px shadows, compared with the former 1.8× density and continuous 2048px shadows. Low starts at 0.75× density. Per-frame vectors are reused, HUD nodes are cached, and unnecessary tool/machine reconstruction on skill purchases is removed. Active play now follows every browser refresh; shops render around 30fps and paused menus around 15fps.

## Stutter revision

The old approximate 60Hz gate could skip a browser refresh rather than synchronizing to it. Active rendering now follows requestAnimationFrame directly. Adaptive resolution samples sustained frame-time evidence in 1.5-second windows, reduces scale in 0.1 steps with a 2.5-second cooldown, and only restores 0.05 after at least twelve seconds of good pacing. Repeated spikes count as load; isolated stalls, tab changes, and paused menus do not. It can be disabled; FPS and p95 frame-time diagnostics are optional.

Periodic saves use requestIdleCallback with a timeout fallback; explicit purchase/transition/lifecycle saves remain immediate. Twenty-four HUD text assignments skip unchanged values, and layout is contained within HUD panels. Audio parameter automation changes only when its target changes. Scene updates reuse frame results, destination vectors, and collision lists. Static merged meshes no longer recompute local matrices; materials are cached and old stage sprites/materials are released.

The renderer disables multisampling. Balanced/Low water avoids the expensive caustic fragment branch; High retains it. Manual steam and automated discharge update instance buffers at 30Hz, stop uploading when inactive, and avoid redundant color uploads. Camera movement, machinery motion, and gameplay remain synchronized to every rendered frame. Changing mouse sensitivity or controls no longer rebuilds graphics buffers.

A CPU-only before/after benchmark with the real scene graph and a mock renderer found sub-0.1ms update tails in most cases, so scene math alone does not explain browser stutter. It does not compile shaders, measure GPU work, include browser DOM/layout cost, or establish actual FPS gains. The live diagnostics provide the missing device-specific frame-time evidence. A bounded Luna review independently highlighted idle GPU uploads, repeated DOM writes, periodic synchronous saving, and the risk of increasing GPU load by removing a refresh gate.

Luna provided an independent small-task economy review. Its pacing suggestions informed the opening cup duration, meaningful shop visits, and tool-specific feedback. The implemented money model pays per volume removed, retaining the user's requested water-to-money relationship.

## Future directions

- Recover a whole drowned village as the final water falls, turning its buildings into a permanent prestige town.
- Branch machines into heat, suction, or logistics, each with a different visual footprint and terrain interaction.
- Add a water destination: pipe the removed ocean into a ludicrously oversized space aquarium.
- Add optional challenge contracts such as no automation, scoop-only, and a timed tiny-flame voyage.

Raised-source revision: shared water elevations keep the bathtub, pool, lake and ocean above grade. Larger gauges map 0�100% to a fixed, readable instrument above the viewing deck; their floats no longer disappear underground. Rectangular sources have transparent front walls and descending side volumes. Shore contours match the water geometry; exterior stairs connect the shops to the deck, and interior steps or banks open as water falls. Machine pipes rise over the rim and ocean decks stand above the full waterline.
