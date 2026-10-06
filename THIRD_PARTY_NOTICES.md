# Third-party notices

## FitCheck (Apache-2.0)

Parts of FitPickAI are ported from [FitCheck](https://github.com/HackedRico/FitCheck), Copyright the FitCheck contributors, licensed under the Apache License, Version 2.0 (https://www.apache.org/licenses/LICENSE-2.0). The ported code was translated from Python to TypeScript and adapted to this app:

| FitPickAI file | From FitCheck |
| --- | --- |
| `app/lib/garments.ts` | `engine/src/fitcheck/domain.py` (garment vocabulary) |
| `app/lib/verdict.ts` | `engine/src/fitcheck/verdict/__init__.py`, `docs/verdict-rules.md` |
| `app/lib/weather.ts` | `engine/src/fitcheck/context/open_meteo.py` |
| `app/lib/garment-link.ts` | `engine/src/fitcheck/garment_link.py` |
| `app/lib/ai.ts` (tagging and scan prompts, stylist prompt) | `engine/src/fitcheck/vision/prompts.py`, `engine/src/fitcheck/stylist/prompts.py` |
| `app/lib/tryon.ts` | `engine/src/fitcheck/tryon/hf_space.py` |
| `app/ui/images/cutout.ts`, `canvas.ts`, `once.ts` | `web/src/lib/cutout.ts`, `canvas.ts`, `once.ts` |

## Services and models

- **MediaPipe Interactive Segmenter** (Apache-2.0), loaded in the browser for background removal.
- **Leffa** virtual try-on (MIT), called on the public Hugging Face Space `franciszzj/Leffa`.
- **Open-Meteo** weather data (CC BY 4.0). "Weather data by Open-Meteo.com" is shown wherever forecasts appear.
