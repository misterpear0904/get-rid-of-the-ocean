# Performance investigation - 29 October 2026

Profiled actual WebGL through the in-app browser at 1280x720, Balanced quality, pixel ratio 1, on NVIDIA RTX 2070 SUPER hardware acceleration (ANGLE/D3D11). Each scene warms up for 30 frames and measures 120. Short runs vary; these results do not measure overall Windows CPU usage.

## Findings

The original game rendered at approximately 144 FPS on every refresh, even standing still. V8 sample profiling of the separate Node benchmark identified matrix updates as a recurring JavaScript cost. Startup file loading and compilation were excluded from steady-state interpretation.

| Real WebGL scenario | Original draws/frame | Updated draws/frame | Updated unlimited CPU submission ms/second | Updated 60 FPS CPU submission ms/second |
| --- | ---: | ---: | ---: | ---: |
| Working cup, five machines | 122 | 116 | 95.2 | 48.9 |
| Working ocean, 125 machines | 153 | 138 | 109.8 | 63.2 |

Unlimited measured 144-144.1 FPS and the cap measured 60-60.2 FPS. CPU submission measures synchronous time inside world.update, including Three.js rendering submission. It excludes other browser threads, driver work, GPU execution, the OS and other applications. These samples show approximately 42-49% less measured submission work per second at 60 FPS; they cannot establish that the game caused all of the reported near-100% system CPU load.

The CPU-only Node benchmark uses a mock renderer and does not measure WebGL:

| Scenario | Before median ms | After median ms |
| --- | ---: | ---: |
| Idle cup | 0.0151 | 0.0070 |
| Working cup, five machines | 0.0266 | 0.0164 |
| Working ocean, five machines | 0.0293 | 0.0161 |

These tiny update times show the transform-cache improvement, not full browser frame cost. Actual WebGL submission in these runs was around 0.5-1.1 ms/frame. Rendering fewer frames supplies the largest practical workload reduction.

## Changes

- Active play defaults to 60 FPS. Settings offers 30/60/90/120/144 or Unlimited.
- At most 30 FPS when idle, 10 FPS behind browsing panels, and 1 FPS while paused or in settings. Hidden tabs do not render.
- Persistent deadlines keep the requested average rate across 60/120/144Hz displays. A 60 FPS cap on 144Hz necessarily alternates refresh intervals; users preferring maximum smoothness can select 144 or Unlimited.
- Economy progress uses elapsed seconds separately from bounded animation steps, preserving income at reduced rendering rates.
- Static local transforms are cached and changed parents updated at stage rebuilds. Camera matrix work is no longer duplicated. Water, rotors, tools and flames remain dynamic.
- Fixed submerged machinery is batched without combining animated components.
- Adaptive resolution uses the selected frame budget and clears mixed-rate samples on transitions. FPS diagnostics count actual rendered frames.

## Reproduce

Run npm start and open http://127.0.0.1:5177/profile.html. Choose a frame limit and Run profile. The standalone lab does not read or change saves and stops drawing when complete. Compare the same viewport, quality and scene counts, preferably with other heavy tabs closed.

Run npm test for regression checks. Run `node --cpu-prof --cpu-prof-dir=qa --expose-gc benchmark.mjs cpu-check` for a V8 sampling profile and CPU-only timing JSON in the ignored qa directory. Use the browser lab for real WebGL measurements; the Node benchmark only covers update logic.
