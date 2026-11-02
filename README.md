# FishWise SG

A casual-fishing platform for Singapore, built for a university project. It shows beginners where fishing is permitted, teaches them to fish safely (including interactive 3D lessons), identifies their catch and tracks their trips.

**Live site:** https://uv-22.github.io/Fishwise-Sg-/

> Spot statuses summarise the official PUB and NParks pages as checked on 2 Nov 2026. Sample trips, mentors, posts, sessions and rewards are invented and labelled **Sample**. FishWise SG is not affiliated with any government agency.

## Run it locally

You only need **Python 3**. There's nothing to install.

```bash
python serve.py
```

This opens http://localhost:5173. Opening `index.html` straight from the file system won't work, because browsers block ES modules on `file://`.

## Features

| Area | What it does |
|---|---|
| **No login** | The app opens straight to the dashboard. Each browser gets a private **sync code**, shown under *Profile & sync*. Enter the code on another device to load the same data. |
| **Dashboard** | Your stats, a 6-month chart, recent and next trips, your points and level, "Continue learning", and "Ask FishWise". |
| **Spot map** | Satellite imagery down to building level, with 30 real spots. Each spot shows its status on the official pages, photos (credited), satellite close-ups, live NEA weather and directions. |
| **My trips** | Plan, log, edit, complete and delete trips. Inputs are validated. Catch records are grouped by species. |
| **Academy** | 18 lessons across the Beginner, Amateur and Advanced tracks: 14 reading lessons and 4 interactive 3D lessons. It also has quizzes, a progress dashboard, search and filters, saved lessons, personal notes, printable certificates and community lessons. |
| **3D lessons** | Four interactive lessons:<br>• **Improved clinch knot**: the line morphs step by step around a hook.<br>• **Overhead cast**: an articulated angler, a rod that bends, a physics-based line, a clock guide, camera views and release-timing practice.<br>• **Read the water**: tap where each species holds, scored over 4 rounds.<br>• **Handle fish safely**: find the spines, barbs and safe grips on 4 fish. |
| **Lesson Studio** | Write lessons with content blocks and a quiz builder, with a live preview. Save drafts, then publish to everyone or unpublish. |
| **Fish ID** | AI photo ID (needs the Edge Function) and an offline Guided ID. |
| **Weather, Species, Community, Events** | Live NEA forecasts per spot, a guide to 12 species, Q&A with points and rewards, and FishWise Local sessions with seat booking. |

## Supabase (data)

Project: `https://sfijnunnqpjzzgunlahg.supabase.co`

1. In Supabase, open **SQL Editor → New query**, paste `supabase/fishwise_setup.sql`, and click **Run**. This creates the tables and Row Level Security.
2. In **Project Settings → API Keys**, copy the **anon / publishable** key and paste it into `src/config.js` as `supabaseAnonKey`. It's designed to be public.
3. Push the change. The sidebar shows **Synced to cloud** once it's connected.

What syncs:
- **Private, per device:** trips, profile, learning progress, notes, Studio drafts, bookings and scans, in `fw_user_state`.
- **Shared with everyone:** community questions, answers, helpful votes, live seat counts and published lessons, in `fw_posts`, `fw_answers`, `fw_helpful`, `fw_bookings` and `fw_lessons`.

The app saves to the device first, so it keeps working offline and syncs when it's back online. Shared tables store only a one-way hash of the device id, so nobody can read another person's sync code.

### AI fish ID (optional)

1. Deploy `supabase/functions/identify-fish` and `ask-coach` with the Supabase CLI.
2. Set the `ANTHROPIC_API_KEY` secret in Supabase.
3. Set `aiFunctionsDeployed: true` in `src/config.js`.

Never put the Anthropic key in the front-end.

## Deploying

The site is static and served by **GitHub Pages** from the `main` branch root. Pushing to `main` updates the live link within a minute or two.

## Limitations

- No real accounts: the sync code is the key to your data, so keep it private.
- Spot markers are reference points, not fishing boundaries. Always follow on-site signage and the PUB and NParks pages.
- 3D lessons need WebGL. The 3D motion is hand-authored from standard instruction; capturing real mentors' technique is a future phase.
- Tide times aren't included. Live weather is cached for 5 minutes because of data.gov.sg rate limits.

## Credits

- Rules: [PUB](https://www.pub.gov.sg/Public/Places-of-Interest/Our-Reservoirs-and-Waterways/ABC-Waters/PUB-Fishing) and [NParks](https://www.nparks.gov.sg/visit/activities/fishing) fishing pages.
- Coordinates: © OpenStreetMap contributors.
- Photos: Wikimedia Commons, credited per photo.
- Imagery: Esri, Maxar and Earthstar Geographics. Street map: OneMap, © SLA.
- Weather: data.gov.sg (NEA).
- Libraries: Leaflet 1.9.4 and three.js 0.160, from jsDelivr.
