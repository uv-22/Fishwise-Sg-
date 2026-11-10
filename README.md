# FishWise SG

A casual-fishing platform for Singapore, built for a university project. It shows beginners where fishing is permitted, teaches them to fish safely (including interactive 3D lessons), identifies their catch and tracks their trips.

**Live site:** https://uv-22.github.io/Fishwise-Sg-/

> Spot statuses summarise the official PUB and NParks pages as checked on 2 Nov 2026. Sample trips, mentors, posts, sessions and rewards are invented and labelled **Sample**. FishWise SG is not affiliated with any government agency.

## Run it locally

You only need **Python 3**. There's nothing to install.

```bash
python serve.py
```

This opens http://localhost:5173. On Windows you can also double-click **Open FishWise.bat** (it opens http://localhost:5180). Opening `index.html` straight from the file system won't work, because browsers block ES modules on `file://`.

## Features

| Area | What it does |
|---|---|
| **Design** | Night-water theme: black, deep navy and light blue, with Sora, Manrope and JetBrains Mono. A top navigation bar with dropdown menus, full-width sections, smooth wheel scrolling, scroll reveals and a pinned, side-scrolling tour on the dashboard. Page headers carry a cursor-reactive field of spot and fish names. All motion is switched off for people who prefer reduced motion. |
| **Intro** | A night jetty with anglers, lamps and fishing lines above the waterline; schools of fish drawn from real body plans (barramundi, peacock bass, snakehead, tilapia, mangrove jack, grunter, catfish) below. Skippable. |
| **First visit** | The full intro plays once; later visits get a short one. A three-step welcome tour (your level, your area) points new users to a nearby legal spot, a first lesson and a gear list. On phones, a bottom tab bar (Home, Map, Go?, Gear, More) replaces the menu button. |
| **No login** | The app opens straight to the dashboard. Each browser gets a private **sync code**, shown under *Profile & sync*. Enter the code on another device to load the same data. |
| **Dashboard** | Live conditions, your stats, a swipeable seven-slide tour of every section (drag, swipe or arrows), a daily **Name that fish** challenge (real photo, +5 points, streaks), Fish of the day, a 6-month chart, recent and next trips, points and level, "Continue learning" and "Ask FishWise". |
| **Should I go?** | Trip planner: pick a spot, day and time window and get one verdict (Go / Go with care / Don't go) from the spot's official status, the NEA forecast covering that window (2-hour, 24-hour regional or 4-day), lightning and heat, tide advice for coastal spots, getting there, what to bring and likely species. Suggests legal spots nearby or another time, and saves the plan as a trip. |
| **Spot map** | Satellite imagery down to building level, with 43 spots: all 15 PUB designated fishing areas and the NParks parks (25 listed), 11 community spots to check first, 2 paid ponds and 5 places where fishing is banned. Tap a status chip to show only that status. Each spot shows its status on the official pages, photos (credited), live NEA weather, and a **Getting there** guide: nearest MRT/LRT station, a step-by-step pathway, the real walking route drawn on the map, public-transport directions, what to expect and what to bring. |
| **3D place view** | *Explore in 3D* on any spot opens a tilted, orbiting 3D map of that place: OpenStreetMap buildings extruded to their heights, with an optional satellite layer, top-down view and recenter. |
| **My trips** | Plan, log, edit, complete and delete trips. Inputs are validated. Catch records by species, and a **catch collection** of all 12 species with real photos that light up as you catch them. |
| **Academy** | 22 lessons across the Beginner, Amateur and Advanced tracks: 14 reading lessons and 8 interactive 3D lessons. It also has quizzes, a progress dashboard, search and filters, saved lessons, personal notes, printable certificates and community lessons. |
| **3D lessons** | Eight interactive lessons:<br>• **Improved clinch knot**: the line morphs step by step around a hook.<br>• **Overhead cast**: an articulated angler, a rod that bends, a physics-based line, a clock guide, camera views and release-timing practice.<br>• **Read the water**: tap where each species holds, scored over 4 rounds.<br>• **Handle fish safely**: find the spines, barbs and safe grips on 4 fish.<br>• **Lightning: when to leave**: flash-to-bang counting and the 30-30 rule over 4 rounds.<br>• **Build a float rig**: thread 7 parts in order, then set the depth.<br>• **Play and land a fish**: set the drag and fight a fish on a live tension meter.<br>• **Fish the tide**: drag through a day of Singapore tides and read the current. |
| **Gear Match & advisor** | FishWise is the middle man, not a shop. A one-on-one gear advisor (Claude via the `gear-advisor` Edge Function when connected, otherwise a built-in guided advisor) builds a legal gear list for where you fish, what you want to catch and your budget. Real photos of each item type, typical Singapore price ranges, which shops stock each item, starter kits, and a saved gear list you can copy and take to a shop. Business model: referral fees from partner shops (none signed yet). |
| **Fish ID** | AI photo ID (needs the Edge Function) and an offline Guided ID. |
| **Weather lab** | Live NEA data as maps (heat, rain, humidity, animated wind flow, 2-hour forecast by area), a go / caution / stop verdict, readings for temperature, humidity, wind, rain, UV and haze, a UV chart, a 4-day outlook chart, spot-by-spot advice and a guide to reading the weather as an angler. |
| **Species, Community, Events** | 12 species with real photos, Q&A with points and rewards, and FishWise Local sessions with seat booking. |

## Supabase (data)

Project: `https://sfijnunnqpjzzgunlahg.supabase.co`

1. In Supabase, open **SQL Editor → New query**, paste `supabase/fishwise_setup.sql`, and click **Run**. This creates the tables and Row Level Security.
2. In **Project Settings → API Keys**, copy the **anon / publishable** key and paste it into `src/config.js` as `supabaseAnonKey`. It's designed to be public.
3. Push the change. The sidebar shows **Synced to cloud** once it's connected.

What syncs:
- **Private, per device:** trips, profile, learning progress, notes, bookings and scans, in `fw_user_state`.
- **Shared with everyone:** community questions, answers, helpful votes, live seat counts and published lessons, in `fw_posts`, `fw_answers`, `fw_helpful`, `fw_bookings` and `fw_lessons`.

The app saves to the device first, so it keeps working offline and syncs when it's back online. Shared tables store only a one-way hash of the device id, so nobody can read another person's sync code.

### AI fish ID (optional)

1. Deploy `supabase/functions/identify-fish`, `ask-coach` and `gear-advisor` with the Supabase CLI.
2. Set the `ANTHROPIC_API_KEY` secret in Supabase.
3. Set `aiFunctionsDeployed: true` in `src/config.js`.

Never put the Anthropic key in the front-end.

## Deploying

The site is static and served by **GitHub Pages** from the `main` branch root. Pushing to `main` updates the live link within a minute or two.

## Limitations

- No real accounts: the sync code is the key to your data, so keep it private.
- Spot markers are reference points, not fishing boundaries. Always follow on-site signage and the PUB and NParks pages.
- 3D lessons need WebGL. The 3D motion is hand-authored from standard instruction; capturing real mentors' technique is a future phase.
- Tide times aren't included. Live weather is cached for 5 minutes and requests are spaced out because of data.gov.sg rate limits, so the weather lab fills in over about 15 seconds.
- Weather maps are interpolated between stations, so they are a guide rather than a reading at your exact spot.
- Walking routes come from a public OSRM demo server; if it is down, a straight-line guide is shown instead.

## Credits

- Rules: [PUB](https://www.pub.gov.sg/Public/Places-of-Interest/Our-Reservoirs-and-Waterways/ABC-Waters/PUB-Fishing) and [NParks](https://www.nparks.gov.sg/visit/activities/fishing) fishing pages.
- Coordinates: © OpenStreetMap contributors.
- Photos: Wikimedia Commons, credited per photo (spots and all 12 fish species).
- Stations: OpenStreetMap. Walking routes: OSRM foot routing (routing.openstreetmap.de).
- Imagery: Esri, Maxar and Earthstar Geographics. Street map: OneMap (Night), © SLA. Weather basemap: © CARTO, © OpenStreetMap contributors.
- Weather: data.gov.sg (NEA).
- 3D place view: MapLibre GL 4.7.1 (jsDelivr) with OpenFreeMap vector tiles, © OpenMapTiles, © OpenStreetMap contributors.
- Libraries: Leaflet 1.9.4 and three.js 0.160, from jsDelivr. Fonts: Sora, Manrope and JetBrains Mono (Google Fonts).
- Shops: Lure Haven address from lurehaven.com.sg. Gear items and typical price ranges are estimates for the prototype; FishWise has no shop partnerships.
- Gear photos: Wikimedia Commons, credited on each photo (the lip-grip uses an illustration).
- Extra spots: community spots from angler spot lists; paid ponds from operator listings; Coney Island, Admiralty Park and Sisters' Islands from NParks. Coordinates from OpenStreetMap (Nominatim).
