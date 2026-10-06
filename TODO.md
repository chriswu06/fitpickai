## Setup (one-time)
- [x] Restore the Supabase project
- [x] Run `migrations/001_social_and_google.sql`, `002_rating_history.sql` and `003_garment_tags.sql` against the existing DB (or hit /seed in dev to rebuild from scratch — it wipes data)
- [x] Google OAuth client in its own `fitpickai` Google Cloud project
- [ ] Add `https://fitpickai.vercel.app` (origin) and `https://fitpickai.vercel.app/api/auth/callback/google` (redirect) to the Google OAuth client
- [x] Claude API: set `ANTHROPIC_API_KEY` (console.anthropic.com) to turn on the AI outfit pick and smart "shop similar" searches. Without it, OOTD falls back to the weighted random pick and shopping searches by item type.
- [x] `AMAZON_ASSOCIATE_TAG` (Associates account is provisional until 3 sales in 180 days)
- [ ] `HF_TOKEN` (free Hugging Face read token) for try-on. Without it the shared anonymous GPU quota allows about one render a day.
- [ ] Vercel: add every `.env` variable in Project Settings > Environment Variables; try-on needs Fluid Compute (or Pro) for its 300s limit

## Done
- [x] Outfit create/edit forms with photo upload to Supabase Storage (bucket `outfits`, auto-created)
- [x] Outfits page shows your own outfits with edit/delete
- [x] Dashboard: stat cards, personal rating trend chart, friends' feed
- [x] Social: follow/unfollow on Connect, profile pages, friends can rate your outfits
- [x] Google sign-in
- [x] OOTD: swipe through in-rotation outfits, weighted "Surprise me" pick
- [x] OOTD: AI pick (Claude looks at your in-rotation outfits + what you say about your day, avoids last week's picks, explains why)
- [x] Wardrobe: every piece from your outfits on spinning rails; swipe to mix and match, "Spin the closet", save new combos as outfits
- [x] Shop similar: cart buttons on friends' outfits and in the wardrobe open an Amazon search Claude writes from the photo
- [x] Friends' rating trend graph (history kept in `outfit_rating_history`)

- [x] From FitCheck (Apache-2.0, see THIRD_PARTY_NOTICES.md):
  - [x] Garment tags (category, colour, warmth, formality...) auto-tagged in the background for every photo
  - [x] Weather (Open-Meteo) on OOTD and fed into the AI pick
  - [x] On-device background removal for uploaded photos (MediaPipe)
  - [x] Scan one outfit photo to fill shirt/pants/shoes/accessory slots; import a piece from a shop link
  - [x] "Should I buy it?" page: BUY / SKIP / TRY WITH rules against your closet, weather and plans
  - [x] Try on: render a shirt or pants from your wardrobe onto your photo (Leffa on Hugging Face)

## Next
### Live camera try-on (FitCheck's on-device pose tracking + garment overlay)
### Calendar-aware plans for the buy check (FitCheck reads a Google Calendar iCal link)
### Amazon Product Advertising API for real product cards (needs an approved Associates account)
