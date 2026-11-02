/**
 * Species guide — fish a Singapore beginner is likely to meet at the
 * official spots on the map. "Where" links to spot ids in spots.js; the
 * NParks fishing page names several of these species for specific parks.
 *
 * Handling advice is general safety guidance, not veterinary or medical
 * advice. If you are stung or spiked, seek medical help.
 *
 * `tags` drive the offline Guided ID (see views/fishid.js).
 */

export const DANGER = {
  safe: { label: 'Easy to handle', tone: 'teal' },
  caution: { label: 'Handle with care', tone: 'amber' },
  danger: { label: 'Dangerous — do not grip', tone: 'red' },
};

export const SPECIES = [
  {
    id: 'peacock-bass',
    name: 'Speckled peacock bass',
    scientific: 'Cichla temensis',
    water: 'fresh',
    danger: 'safe',
    size: 'Commonly 25–45 cm in reservoirs',
    looks: 'Deep olive-gold body with dark vertical bars, a red-orange eye and a dark eye-spot ring on the tail. Large mouth.',
    where: 'Introduced to Singapore reservoirs. Holds tight to structure — submerged rocks, jetty pylons and drop-offs.',
    spots: ['lower-seletar-jetty', 'kranji', 'jurong-lake', 'macritchie', 'upper-seletar'],
    catchHow: [
      'Artificial lures only at PUB reservoirs: minnow-style hard baits, soft plastics and small spinnerbaits.',
      'Cast parallel to structure and retrieve with pauses — strikes often come on the pause.',
      'Early morning and late afternoon are usually most productive.',
    ],
    handling: [
      'Lip-grip with a wet hand or a lip-grip tool; support the belly for larger fish.',
      'Use pliers to remove hooks — peacock bass often take lures deep.',
      'Practise catch-and-release where possible, as PUB encourages.',
    ],
    tags: ['fresh', 'deep', 'bars', 'tailspot', 'bigmouth'],
  },
  {
    id: 'peacock-cichlid',
    name: 'Peacock cichlid',
    scientific: 'Cichla spp.',
    water: 'fresh',
    danger: 'safe',
    size: 'Commonly 20–35 cm',
    looks: 'A close relative of the speckled peacock bass: yellow-green body, three dark bars and a bright eye-spot (ocellus) on the tail.',
    where: 'Named by NParks as a Lower Seletar Reservoir species. Shallow margins and around jetties.',
    spots: ['lower-seletar-jetty', 'bedok-reservoir', 'pandan-reservoir'],
    catchHow: [
      'Small soft plastics and compact crankbaits on light tackle.',
      'Work the edges of weed and rock in the first metre of water.',
    ],
    handling: [
      'Wet hands, support the body, return quickly.',
      'Barbless or micro-barb hooks make release fast.',
    ],
    tags: ['fresh', 'deep', 'bars', 'tailspot'],
  },
  {
    id: 'snakehead',
    name: 'Indonesian (giant) snakehead',
    scientific: 'Channa micropeltes',
    water: 'fresh',
    danger: 'caution',
    size: 'Can exceed 70 cm',
    looks: 'Long, tube-shaped body with a flat head like a snake, long dorsal fin and a mouth full of sharp teeth. Juveniles have orange-and-black stripes.',
    where: 'Named by NParks at Lower Seletar Reservoir. Ambushes from weed beds, lily pads and shaded banks.',
    spots: ['lower-seletar-jetty', 'kranji', 'jurong-lake', 'lower-peirce'],
    catchHow: [
      'Topwater frogs and weedless soft plastics over vegetation.',
      'Wait a beat before setting the hook when it strikes on the surface.',
      'Use a heavier leader — teeth will cut light line.',
    ],
    handling: [
      'Never put fingers near the mouth. Use a lip-grip tool and long-nose pliers.',
      'The fish is powerful and slippery: keep it low over the ground or a mat.',
      'Parent fish guard fry aggressively — give fry balls a wide berth.',
    ],
    tags: ['fresh', 'long', 'teeth', 'flathead'],
  },
  {
    id: 'tilapia',
    name: 'Tilapia',
    scientific: 'Oreochromis spp.',
    water: 'fresh',
    danger: 'safe',
    size: 'Usually 15–30 cm',
    looks: 'Deep, compressed silver-grey body, sometimes with faint vertical bars and a red-tinged tail. Long spiny dorsal fin.',
    where: 'Very common in reservoirs, canals and ponds across Singapore; often in schools near the surface.',
    spots: ['pasir-ris-town-park', 'punggol-park', 'pang-sua', 'rochor-canal', 'geylang-river', 'kolam-ayer', 'pelton-canal'],
    catchHow: [
      'Small hooks (size 10–14) are essential — tilapia have small mouths.',
      'At PUB waters use only artificial bait: the tiniest soft plastics or small jigs.',
      'At paid ponds, follow the operator’s bait rules.',
    ],
    handling: [
      'Smooth the dorsal spines down from front to back before gripping.',
      'Wet hands; return quickly if releasing.',
    ],
    tags: ['fresh', 'deep', 'spinyback'],
  },
  {
    id: 'barramundi',
    name: 'Barramundi (Asian sea bass)',
    scientific: 'Lates calcarifer',
    water: 'brackish',
    danger: 'caution',
    size: 'Commonly 40–70 cm',
    looks: 'Silver, elongated body with a concave head profile, large mouth and glowing amber eye.',
    where: 'Estuaries, mangrove edges and jetties. NParks names it at Changi Beach Park; also stocked in some ponds.',
    spots: ['changi-beach', 'woodlands-jetty', 'sembawang-jetty', 'pulau-ubin', 'pasir-ris-town-park'],
    catchHow: [
      'Low light around high tide is prime time.',
      'Suspending minnow lures and soft plastics worked slowly near pylons.',
      'Expect head-shakes and jumps — keep steady pressure, rod low.',
    ],
    handling: [
      'Gill covers have razor-sharp edges: never put fingers under them.',
      'Use a landing net and lip-grip tool; support the body horizontally.',
    ],
    tags: ['salt', 'fresh', 'torpedo', 'silver', 'bigmouth'],
  },
  {
    id: 'mangrove-jack',
    name: 'Mangrove jack',
    scientific: 'Lutjanus argentimaculatus',
    water: 'brackish',
    danger: 'caution',
    size: 'Commonly 30–50 cm',
    looks: 'Copper-red to brown snapper with a sturdy body, prominent canine teeth and a slightly forked tail.',
    where: 'Tight to structure: jetty pylons, rocks and mangrove roots along the northern and eastern shores.',
    spots: ['woodlands-jetty', 'sembawang-jetty', 'pulau-ubin', 'punggol-point'],
    catchHow: [
      'Cast close to pylons and turn the fish’s head immediately — it will dive into structure.',
      'Use a stronger leader; the teeth and structure will fray light line.',
    ],
    handling: [
      'Sharp canine teeth and dorsal spines — use pliers and a lip-grip tool.',
      'Keep a towel handy for a secure grip on the body.',
    ],
    tags: ['salt', 'deep', 'red', 'teeth'],
  },
  {
    id: 'javelin-grunter',
    name: 'Javelin grunter',
    scientific: 'Pomadasys kaakan',
    water: 'salt',
    danger: 'safe',
    size: 'Commonly 25–45 cm',
    looks: 'Silvery-grey body with rows of dark spots or bars on the upper flanks; makes a grunting sound when landed.',
    where: 'Sandy and muddy coastal bottoms. NParks names it at Changi Beach Park; popular at Bedok Jetty.',
    spots: ['changi-beach', 'bedok-jetty', 'east-coast-beach'],
    catchHow: [
      'Bottom rig with a running sinker, fished on a rising tide.',
      'Where natural bait is permitted on the coast, prawn is a common choice.',
    ],
    handling: [
      'Dorsal spines are sharp — smooth them down before gripping.',
      'Wet hands, quick release.',
    ],
    tags: ['salt', 'torpedo', 'silver', 'spots'],
  },
  {
    id: 'goatee-croaker',
    name: 'Goatee croaker',
    scientific: 'Dendrophysa russelii',
    water: 'salt',
    danger: 'safe',
    size: 'Usually 10–20 cm',
    looks: 'Small silvery croaker with a single short barbel ("goatee") under the chin.',
    where: 'Shallow sandy beaches. Named by NParks at Changi Beach Park.',
    spots: ['changi-beach', 'east-coast-beach', 'pasir-ris-beach'],
    catchHow: [
      'Light bottom rig with a small hook, cast just beyond the shore break.',
      'A great first catch for beginners.',
    ],
    handling: ['Easy to handle; wet hands and release gently.'],
    tags: ['salt', 'torpedo', 'silver', 'whiskers'],
  },
  {
    id: 'brown-stingray',
    name: 'Brown stingray',
    scientific: 'Dasyatidae (family)',
    water: 'salt',
    danger: 'danger',
    size: 'Disc can exceed 50 cm across',
    looks: 'Flat, disc-shaped brown body with a long whip-like tail that carries a venomous serrated barb.',
    where: 'Sandy bottoms off beaches. Named by NParks at Changi Beach Park.',
    spots: ['changi-beach', 'east-coast-beach'],
    catchHow: [
      'Usually an accidental catch on bottom rigs — FishWise does not recommend targeting rays.',
    ],
    handling: [
      'Never lift a ray by the tail or step near it. Keep everyone clear of the tail.',
      'If you cannot unhook it safely, cut the line as close to the hook as you can and let it go.',
      'A barb wound is a medical emergency — seek medical help immediately.',
    ],
    tags: ['salt', 'flat', 'tail'],
  },
  {
    id: 'pufferfish',
    name: 'Pufferfish',
    scientific: 'Tetraodontidae (family)',
    water: 'salt',
    danger: 'danger',
    size: 'Usually 10–25 cm',
    looks: 'Rounded body that inflates into a ball, small beak-like teeth, often with spots or a spiky-feeling skin.',
    where: 'Very common along jetties and beaches; notorious bait thieves.',
    spots: ['bedok-jetty', 'pasir-ris-beach', 'east-coast-beach'],
    catchHow: ['Not a target species. Moving spots or using larger hooks reduces bycatch.'],
    handling: [
      'NEVER eat pufferfish — many species carry tetrodotoxin, a potentially fatal toxin.',
      'The beak can bite through line and skin: unhook with long-nose pliers.',
      'Do not squeeze it to make it inflate. Return it to the water quickly.',
    ],
    tags: ['salt', 'round', 'spots', 'beak'],
  },
  {
    id: 'scorpionfish',
    name: 'Scorpionfish',
    scientific: 'Scorpaenidae (family)',
    water: 'salt',
    danger: 'danger',
    size: 'Usually 10–25 cm',
    looks: 'Mottled, well-camouflaged fish with a spiny, bony head and fan-like fins. Looks like a rock.',
    where: 'Rocky bottoms and around jetty pylons.',
    spots: ['bedok-jetty', 'labrador-jetty'],
    catchHow: ['Not a target species; usually caught by accident on bottom rigs.'],
    handling: [
      'Dorsal, pelvic and anal spines are venomous. Do not touch the fish.',
      'Hold it with a towel or lip-grip tool and unhook with pliers, or cut the line.',
      'A sting is very painful: seek medical help.',
    ],
    tags: ['salt', 'spinyhead', 'mottled'],
  },
  {
    id: 'marine-catfish',
    name: 'Marine catfish',
    scientific: 'Ariidae (family)',
    water: 'brackish',
    danger: 'danger',
    size: 'Usually 25–50 cm',
    looks: 'Smooth, scaleless grey body with several long whiskers (barbels) around the mouth and stiff spines on the back and side fins.',
    where: 'Muddy estuaries, river mouths and jetties, especially at night.',
    spots: ['woodlands-jetty', 'sembawang-jetty', 'kallang-riverside'],
    catchHow: ['Often caught on bottom rigs after dark.'],
    handling: [
      'The dorsal and pectoral spines are serrated and venomous — they lock upright.',
      'Hold the fish down with a wet towel and unhook with pliers; never grab across the spines.',
      'Seek medical help if spiked.',
    ],
    tags: ['salt', 'fresh', 'long', 'whiskers', 'smooth'],
  },
];

export function getSpecies(id) {
  return SPECIES.find((s) => s.id === id) || null;
}

/** Questions for the offline Guided ID — each option adds tags. */
export const GUIDED_QUESTIONS = [
  {
    id: 'water',
    label: 'Where did you catch it?',
    options: [
      { label: 'Reservoir, canal or pond', tags: ['fresh'] },
      { label: 'Beach, jetty or sea', tags: ['salt'] },
      { label: 'Not sure', tags: [] },
    ],
  },
  {
    id: 'shape',
    label: 'What is its body shape?',
    options: [
      { label: 'Flat disc with a long tail', tags: ['flat', 'tail'] },
      { label: 'Long and tube-like', tags: ['long'] },
      { label: 'Round or able to puff up', tags: ['round'] },
      { label: 'Tall, deep body', tags: ['deep'] },
      { label: 'Streamlined, torpedo-like', tags: ['torpedo'] },
      { label: 'Lumpy, rock-like, spiny head', tags: ['spinyhead', 'mottled'] },
    ],
  },
  {
    id: 'feature',
    label: 'Which feature stands out most?',
    options: [
      { label: 'Whiskers (barbels) by the mouth', tags: ['whiskers'] },
      { label: 'Dark vertical bars', tags: ['bars'] },
      { label: 'Eye-spot on the tail', tags: ['tailspot'] },
      { label: 'Red or copper colour', tags: ['red'] },
      { label: 'Spots on the body', tags: ['spots'] },
      { label: 'Sharp teeth or a beak', tags: ['teeth', 'beak'] },
      { label: 'Plain silver', tags: ['silver'] },
    ],
  },
];

/**
 * Rank species by how many chosen tags they share. Runners-up are only shown
 * when they are nearly as strong as the best match.
 */
export function guidedMatches(chosenTags) {
  const chosen = new Set(chosenTags);
  const ranked = SPECIES.map((s) => ({
    species: s,
    score: s.tags.reduce((n, t) => n + (chosen.has(t) ? 1 : 0), 0),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return [];
  const floor = Math.max(1, ranked[0].score - 1);
  return ranked.filter((r) => r.score >= floor).slice(0, 3);
}
