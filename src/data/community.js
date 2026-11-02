/**
 * Sample community content for the prototype.
 *
 * Every person, post, session and reward here is invented demo content and
 * is labelled as such in the UI. Real sharing between users needs the
 * Supabase backend described in README.md.
 */

export const MENTORS = [
  { id: 'm-hafiz', name: 'Hafiz R.', initials: 'HR', years: 14, specialty: 'Jetty & coastal', basePoints: 2140, badge: 'Mentor' },
  { id: 'm-meiling', name: 'Mei Ling T.', initials: 'MT', years: 9, specialty: 'Reservoir lure fishing', basePoints: 1785, badge: 'Mentor' },
  { id: 'm-arun', name: 'Arun K.', initials: 'AK', years: 11, specialty: 'Knots & rigging', basePoints: 1520, badge: 'Mentor' },
  { id: 'm-joanne', name: 'Joanne L.', initials: 'JL', years: 4, specialty: 'Family & kids fishing', basePoints: 860, badge: 'Skilled' },
  { id: 'm-daniel', name: 'Daniel C.', initials: 'DC', years: 2, specialty: 'Pond fishing', basePoints: 410, badge: 'Skilled' },
];

export function getMentor(id) {
  return MENTORS.find((m) => m.id === id) || null;
}

export const SEED_POSTS = [
  {
    id: 'p-seletar-sign',
    authorId: 'm-daniel',
    daysAgo: 3,
    title: 'Where exactly is the fishing zone at Lower Seletar?',
    body: 'Went on Sunday and wasn’t sure which part of the jetty was allowed. Any tips for spotting the zone?',
    tags: ['rules', 'reservoir'],
    answers: [
      { authorId: 'm-meiling', daysAgo: 3, helpful: 12, body: 'Look for the fishing-zone signboard and the blue railings — PUB uses those to mark designated areas. If the railing isn’t blue and there’s no sign, it’s not a zone. Artificial bait only there.' },
      { authorId: 'm-hafiz', daysAgo: 2, helpful: 5, body: 'Also check PUB’s fishing page before you go. Zones can close temporarily for works.' },
    ],
  },
  {
    id: 'p-first-rod',
    authorId: 'm-joanne',
    daysAgo: 6,
    title: 'Good first rod for a 10-year-old?',
    body: 'My son wants to start. Should I buy a kids’ combo or something proper?',
    tags: ['gear', 'beginner'],
    answers: [
      { authorId: 'm-arun', daysAgo: 6, helpful: 9, body: 'A short 1.5–1.8 m spinning combo with 6–8 lb mono is perfect. Skip the cartoon closed-face reels — they tangle and teach bad habits. Try a FishWise Local session first; gear is provided.' },
    ],
  },
  {
    id: 'p-catfish-sting',
    authorId: 'm-daniel',
    daysAgo: 11,
    title: 'Caught a catfish at Woodlands — how do I unhook without getting spiked?',
    body: 'It had long whiskers and stiff spines. I cut the line because I was scared. Was that okay?',
    tags: ['handling', 'safety'],
    answers: [
      { authorId: 'm-hafiz', daysAgo: 10, helpful: 18, body: 'Cutting the line close to the hook was the safe call. Next time pin it gently with a wet towel and use long-nose pliers. Never grip across the dorsal or side spines — they lock upright.' },
    ],
  },
];

export const REWARDS = [
  { id: 'r-session', title: 'Free seat at a FishWise Local session', cost: 300, description: 'Swap points for one seat at any beginner session, equipment included.' },
  { id: 'r-tackle', title: 'Tackle-shop voucher (sample partner)', cost: 500, description: 'A demo voucher showing how partner rewards would appear. Not redeemable in real shops.' },
  { id: 'r-badge', title: 'Profile badge: Clean Angler', cost: 150, description: 'A badge on your community profile for pledging to leave no line behind.' },
  { id: 'r-mentor-call', title: '30-minute call with a mentor', cost: 800, description: 'Book time with an experienced angler to plan your next trip.' },
];

/**
 * FishWise Local — one-day sessions where equipment is provided.
 * `dayOffset` is relative to today so the schedule never looks stale.
 */
export const SESSIONS = [
  {
    id: 's-first-cast',
    title: 'First Cast: beginner day',
    spotId: 'pasir-ris-town-park',
    dayOffset: 5,
    time: '8:30 am – 12:30 pm',
    level: 'Beginner',
    capacity: 12,
    seatsTaken: 7,
    leadId: 'm-joanne',
    summary: 'Your first morning with a rod. Safety briefing, set-up, casting practice and fishing at the pond. Rods, tackle and bait-pond rules covered.',
    agenda: ['Safety & rules briefing', 'Knot station: improved clinch', 'Casting drills on land', 'Fishing at the pond with a coach', 'Catch-and-release practice'],
  },
  {
    id: 's-reservoir-lures',
    title: 'Reservoir lure fishing, the legal way',
    spotId: 'lower-seletar-jetty',
    dayOffset: 12,
    time: '7:00 am – 11:00 am',
    level: 'Amateur',
    capacity: 10,
    seatsTaken: 9,
    leadId: 'm-meiling',
    summary: 'Find the designated zone, choose lures for peacock bass and practise barbless-hook release. Artificial bait only, as PUB requires.',
    agenda: ['Finding the fishing-zone signage', 'Lure selection walkthrough', 'Guided fishing from the jetty', 'Release technique'],
  },
  {
    id: 's-jetty-safety',
    title: 'Jetty safety & knots',
    spotId: 'woodlands-jetty',
    dayOffset: 19,
    time: '4:00 pm – 7:00 pm',
    level: 'Beginner',
    capacity: 15,
    seatsTaken: 4,
    leadId: 'm-arun',
    summary: 'Working safely on a busy jetty: where to stand, how to cast without hooking anyone, and three knots you will use every trip.',
    agenda: ['Jetty etiquette', 'Improved clinch & Palomar knots', 'Handling dangerous species', 'Sunset session on the permitted stretch'],
  },
  {
    id: 's-family',
    title: 'Family morning at Punggol Park',
    spotId: 'punggol-park',
    dayOffset: 26,
    time: '9:00 am – 11:30 am',
    level: 'All ages',
    capacity: 20,
    seatsTaken: 11,
    leadId: 'm-joanne',
    summary: 'Short, gentle session for parents and kids at the designated lake areas. Child-sized rods provided.',
    agenda: ['Kids’ safety talk', 'Simple float fishing', 'Fish ID game', 'Clean-up challenge'],
  },
];

export const OFFICIAL_LINKS = [
  { org: 'PUB — fishing at reservoirs and waterways', url: 'https://www.pub.gov.sg/Public/Places-of-Interest/Our-Reservoirs-and-Waterways/ABC-Waters/PUB-Fishing', note: 'The 15 designated fishing locations, bait rules and penalties.' },
  { org: 'NParks — fishing in parks', url: 'https://www.nparks.gov.sg/visit/activities/fishing', note: 'Parks with designated fishing areas, etiquette and exclusions.' },
  { org: 'Meteorological Service Singapore', url: 'https://www.weather.gov.sg/', note: 'Official forecasts, warnings and monsoon outlooks.' },
];
