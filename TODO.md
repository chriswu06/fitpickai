## Setup (one-time)
- [ ] Restore the Supabase project (DB was unreachable: "tenant/user ... not found" — likely paused)
- [ ] Run `migrations/001_social_and_google.sql` against the existing DB (or hit /seed in dev to rebuild from scratch — it wipes data)
- [ ] Google OAuth: create a client in Google Cloud Console, redirect URI `<origin>/api/auth/callback/google`, set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`

## Done
- [x] Outfit create/edit forms with photo upload to Supabase Storage (bucket `outfits`, auto-created)
- [x] Outfits page shows your own outfits with edit/delete
- [x] Dashboard: stat cards, personal rating trend chart, friends' feed
- [x] Social: follow/unfollow on Connect, profile pages, friends can rate your outfits
- [x] Google sign-in
- [x] OOTD: swipe through in-rotation outfits, weighted "Pick for me" (non-AI)

## Next
### Figure out AI Personal outfit creator for OOTD (replace the weighted random pick)
### Figure out how to display user's own wardrobe: spinning clothes and swiping l/r (OOTD swipe is a start)
### Figure out Amazon shopping plugin
### Friends' rating trend graph over time (outfit_ratings keeps only the latest rating per rater)
### Camera capture + ML clothes detection/extraction (post-MVP)
