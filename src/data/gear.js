/**
 * FishWise Gear Match — catalogue data.
 *
 * FishWise does not stock or sell gear. It is the middle man: the advisor
 * matches each angler to the right type of gear for where and what they fish,
 * checks it against the rules, and points them to a shop that carries it.
 * Prices are typical Singapore retail ranges (SGD) to help people budget,
 * not FishWise prices. In the business model, partner shops pay FishWise a
 * referral fee; the prototype has no agreements with any shop yet.
 *
 * "Compliant" flags follow the official rules quoted elsewhere in the app:
 * PUB waters allow artificial bait only (no fly fishing); NParks asks for
 * carbon steel micro-barb or barbless hooks at reservoirs and waterways.
 *
 * Photos: Wikimedia Commons, credited per photo. They show the type of item,
 * not a specific product we recommend.
 */

export const CATEGORIES = {
  rods: 'Rods',
  reels: 'Reels',
  line: 'Line & leader',
  terminal: 'Hooks & terminal',
  lures: 'Lures',
  tools: 'Tools',
  safety: 'Safety & comfort',
};

export const GEAR_PHOTOS = {
  rod: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Two_spinning_fishing_reels_on_pier.JPG/500px-Two_spinning_fishing_reels_on_pier.JPG", page: "https://commons.wikimedia.org/wiki/File:Two_spinning_fishing_reels_on_pier.JPG", author: "Juliancolton", license: "Public domain" },
  combo: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/A_spinning_reel_on_a_rod.jpg/500px-A_spinning_reel_on_a_rod.jpg", page: "https://commons.wikimedia.org/wiki/File:A_spinning_reel_on_a_rod.jpg", author: "JaredMcKenzie", license: "CC0" },
  reel: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Fishing-spinning-reel.JPG/500px-Fishing-spinning-reel.JPG", page: "https://commons.wikimedia.org/wiki/File:Fishing-spinning-reel.JPG", author: "Jonathan Ewen & Stephen Ewen", license: "CC BY 3.0" },
  reelbig: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/A_spinning_reel_on_a_rod.jpg/500px-A_spinning_reel_on_a_rod.jpg", page: "https://commons.wikimedia.org/wiki/File:A_spinning_reel_on_a_rod.jpg", author: "JaredMcKenzie", license: "CC0" },
  hook: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Fishing_hooks_on_white_surface.jpg/500px-Fishing_hooks_on_white_surface.jpg", page: "https://commons.wikimedia.org/wiki/File:Fishing_hooks_on_white_surface.jpg", author: "daniel jaeger", license: "CC BY-SA 2.5" },
  barbless: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Barbed_vs_barbless_hooks.jpg/500px-Barbed_vs_barbless_hooks.jpg", page: "https://commons.wikimedia.org/wiki/File:Barbed_vs_barbless_hooks.jpg", author: "Mark Bachmann", license: "Copyrighted free use" },
  sinker: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Lead_sinker.JPG/500px-Lead_sinker.JPG", page: "https://commons.wikimedia.org/wiki/File:Lead_sinker.JPG", author: "Chemicalinterest", license: "Public domain" },
  swivel: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Angeln_zubehoer_wirbel_01.jpg/500px-Angeln_zubehoer_wirbel_01.jpg", page: "https://commons.wikimedia.org/wiki/File:Angeln_zubehoer_wirbel_01.jpg", author: "Raboe001", license: "CC BY-SA 2.5" },
  paddle: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Twister_2008_G01.jpg/500px-Twister_2008_G01.jpg", page: "https://commons.wikimedia.org/wiki/File:Twister_2008_G01.jpg", author: "George Chernilevsky", license: "Public domain" },
  minnow: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Angeln_zubehoer_wobbler_01.jpg/500px-Angeln_zubehoer_wobbler_01.jpg", page: "https://commons.wikimedia.org/wiki/File:Angeln_zubehoer_wobbler_01.jpg", author: "Raboe001", license: "CC BY-SA 2.5" },
  frog: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Scum_frog.jpg/500px-Scum_frog.jpg", page: "https://commons.wikimedia.org/wiki/File:Scum_frog.jpg", author: "Musky~jawiki", license: "Public domain" },
  spoon: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Spoon-bait_2008_G1.jpg/500px-Spoon-bait_2008_G1.jpg", page: "https://commons.wikimedia.org/wiki/File:Spoon-bait_2008_G1.jpg", author: "George Chernilevsky", license: "Public domain" },
  pliers: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Long-nosePliers.jpg/500px-Long-nosePliers.jpg", page: "https://commons.wikimedia.org/wiki/File:Long-nosePliers.jpg", author: "Raysonho @ Open Grid Scheduler / Grid Engine", license: "CC0" },
  lamp: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Zebralight_H600Fc_Mk_IV_headlamp_with_its_headband.jpg/500px-Zebralight_H600Fc_Mk_IV_headlamp_with_its_headband.jpg", page: "https://commons.wikimedia.org/wiki/File:Zebralight_H600Fc_Mk_IV_headlamp_with_its_headband.jpg", author: "Siarhei Besarab", license: "CC BY-SA 4.0" },
  shoe: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Sperry.jpg/500px-Sperry.jpg", page: "https://commons.wikimedia.org/wiki/File:Sperry.jpg", author: "Antontushnov", license: "CC BY-SA 3.0" },
  aid: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/First-aid_travel_kit_1.jpg/500px-First-aid_travel_kit_1.jpg", page: "https://commons.wikimedia.org/wiki/File:First-aid_travel_kit_1.jpg", author: "Renée Kools", license: "CC BY 4.0" },
  box: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/TackleBoxFortDeSoto.JPG/500px-TackleBoxFortDeSoto.JPG", page: "https://commons.wikimedia.org/wiki/File:TackleBoxFortDeSoto.JPG", author: "350z33", license: "CC BY-SA 3.0" },
  pouch: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Fannypack1a.jpg/500px-Fannypack1a.jpg", page: "https://commons.wikimedia.org/wiki/File:Fannypack1a.jpg", author: "RJF", license: "CC BY-SA 3.0" },
  braid: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Rod_based_line_spooler_1.jpg/500px-Rod_based_line_spooler_1.jpg", page: "https://commons.wikimedia.org/wiki/File:Rod_based_line_spooler_1.jpg", author: "JaredMcKenzie", license: "CC0" },
  mono: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/GreenFishingLine.jpg/500px-GreenFishingLine.jpg", page: "https://commons.wikimedia.org/wiki/File:GreenFishingLine.jpg", author: "Jay Erickson", license: "CC BY 2.0" },
  leader: { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Rod_based_line_spooler_2.jpg/500px-Rod_based_line_spooler_2.jpg", page: "https://commons.wikimedia.org/wiki/File:Rod_based_line_spooler_2.jpg", author: "JaredMcKenzie", license: "CC0" },
};

// where: which shop types usually carry it (ids in SHOPS)
export const PRODUCTS = [
  { id: 'rod-21', cat: 'rods', photo: 'rod', name: 'Light spinning rod, 2.1 m', range: [35, 90], spec: '6–12 lb · 2-piece · fast action', where: ['decathlon', 'tackle', 'specialist', 'online'], note: 'Easy to cast small lures at reservoir zones and canals.' },
  { id: 'rod-27', cat: 'rods', photo: 'rod', name: 'Jetty spinning rod, 2.7 m', range: [55, 140], spec: '10–20 lb · 2-piece · moderate-fast', where: ['decathlon', 'tackle', 'specialist'], note: 'Extra length to reach past pylons and lift fish up a jetty.' },
  { id: 'rod-16', cat: 'rods', photo: 'combo', name: 'Junior rod & reel combo, 1.6 m', range: [20, 45], spec: 'Pre-spooled · short and light', where: ['decathlon', 'tackle', 'online'], note: 'Light enough for small hands; comes spooled with line.' },
  { id: 'reel-2500', cat: 'reels', photo: 'reel', name: '2500-size spinning reel', range: [40, 120], spec: '5.2:1 · 6 bearings · 7 kg drag', where: ['decathlon', 'tackle', 'specialist', 'online'], note: 'Pairs with a 2.1 m rod for lure fishing.' },
  { id: 'reel-4000', cat: 'reels', photo: 'reelbig', name: '4000-size spinning reel', range: [60, 160], spec: '4.9:1 · sealed drag · 10 kg', where: ['tackle', 'specialist', 'online'], note: 'Bigger spool and drag for barramundi and jacks.' },
  { id: 'braid-15', cat: 'line', photo: 'braid', name: 'PE 1.0 braid, 150 m', range: [18, 40], spec: '≈15 lb · 4-strand · low stretch', where: ['tackle', 'specialist', 'online'], note: 'Thin and sensitive — you feel every bite.' },
  { id: 'mono-12', cat: 'line', photo: 'mono', name: '12 lb nylon mono, 200 m', range: [6, 15], spec: 'Forgiving stretch · easy knots', where: ['decathlon', 'tackle', 'online'], note: 'The simplest line to learn knots with.' },
  { id: 'leader-20', cat: 'line', photo: 'leader', name: '20 lb fluorocarbon leader, 30 m', range: [10, 25], spec: 'Abrasion resistant', where: ['tackle', 'specialist', 'online'], note: 'Protects your braid from teeth, rocks and pylons.' },
  { id: 'hooks-mb', cat: 'terminal', photo: 'hook', name: 'Carbon steel micro-barb hooks (20)', range: [4, 10], spec: 'Sizes 6–1/0', where: ['tackle', 'specialist'], compliant: 'NParks hook rule', note: 'Meets NParks’ hook guidance for reservoirs and waterways.' },
  { id: 'hooks-bl', cat: 'terminal', photo: 'barbless', name: 'Barbless hooks (20)', range: [4, 10], spec: 'Sizes 8–1/0', where: ['tackle', 'specialist', 'online'], compliant: 'NParks hook rule', note: 'Fastest, kindest release — great with children.' },
  { id: 'sinkers', cat: 'terminal', photo: 'sinker', name: 'Ball & bean sinker kit', range: [5, 12], spec: '5–40 g assorted', where: ['tackle', 'decathlon'], note: 'Holds the bottom in current at jetties.' },
  { id: 'swivels', cat: 'terminal', photo: 'swivel', name: 'Snap swivels #10 (20)', range: [3, 8], spec: 'Black, 25 kg', where: ['tackle', 'decathlon', 'online'], note: 'Change lures fast; stops line twist.' },
  { id: 'soft-3', cat: 'lures', photo: 'paddle', name: 'Soft plastic paddle-tails 3" + jig heads', range: [10, 22], spec: '8 tails · 4 heads', where: ['tackle', 'specialist', 'decathlon'], compliant: 'PUB: artificial bait', note: 'The most versatile lure in Singapore waters.' },
  { id: 'minnow-7', cat: 'lures', photo: 'minnow', name: 'Floating minnow, 7 cm (2)', range: [12, 35], spec: 'Dives 0.5–1 m', where: ['specialist', 'tackle'], compliant: 'PUB: artificial bait', note: 'Twitch-and-pause for peacock bass along structure.' },
  { id: 'frog', cat: 'lures', photo: 'frog', name: 'Weedless topwater frog', range: [10, 25], spec: '5 cm · hollow body', where: ['specialist', 'tackle'], compliant: 'PUB: artificial bait', note: 'Walk it over weed and lily pads for snakehead.' },
  { id: 'spoon-15', cat: 'lures', photo: 'spoon', name: 'Casting spoons, 15 g (3)', range: [6, 15], spec: 'Silver / gold', where: ['tackle', 'decathlon'], compliant: 'PUB: artificial bait', note: 'Casts a long way into the wind from jetties.' },
  { id: 'lipgrip', cat: 'tools', photo: null, art: 'grip', name: 'Lip-grip tool', range: [10, 30], spec: 'Floating · lanyard', where: ['tackle', 'specialist', 'online'], note: 'Hold fish safely — essential for spiky or toothy fish.' },
  { id: 'pliers', cat: 'tools', photo: 'pliers', name: 'Long-nose pliers + line cutter', range: [10, 30], spec: 'Stainless · split-ring tip', where: ['tackle', 'decathlon', 'specialist'], note: 'Unhook without fingers near teeth or spines.' },
  { id: 'pouch', cat: 'tools', photo: 'pouch', name: 'Waist pouch for line offcuts', range: [5, 20], spec: 'Zip pocket · clips to your belt', where: ['decathlon', 'online'], note: 'Leave nothing: every offcut goes home with you.' },
  { id: 'headlamp', cat: 'safety', photo: 'lamp', name: 'Rechargeable headlamp', range: [15, 45], spec: '300 lm · red mode', where: ['decathlon', 'online'], note: 'Dusk sessions and the walk back.' },
  { id: 'shoes', cat: 'safety', photo: 'shoe', name: 'Non-slip deck shoes', range: [30, 80], spec: 'Siped rubber sole', where: ['decathlon'], note: 'Wet jetty planks are slippery.' },
  { id: 'firstaid', cat: 'safety', photo: 'aid', name: 'Pocket first-aid kit', range: [8, 20], spec: 'Plasters · antiseptic · tweezers', where: ['decathlon', 'online'], note: 'For hook pricks and fin spikes.' },
  { id: 'box', cat: 'safety', photo: 'box', name: 'Tackle box + shoulder bag', range: [20, 50], spec: '2 trays · rain cover', where: ['decathlon', 'tackle', 'online'], note: 'Keeps everything in one place.' },
];

export const KITS = [
  { id: 'kit-reservoir', name: 'Reservoir lure starter', for: 'reservoir', blurb: 'Everything legal for PUB reservoir zones: lures only, micro-barb hooks.', items: ['rod-21', 'reel-2500', 'braid-15', 'leader-20', 'soft-3', 'minnow-7', 'hooks-mb', 'pliers', 'lipgrip'] },
  { id: 'kit-jetty', name: 'Jetty & beach kit', for: 'jetty', blurb: 'A longer rod, stronger drag and a headlamp for Bedok, Changi or Woodlands.', items: ['rod-27', 'reel-4000', 'braid-15', 'leader-20', 'spoon-15', 'sinkers', 'swivels', 'hooks-mb', 'pliers', 'headlamp'] },
  { id: 'kit-family', name: 'Family first cast', for: 'kids', blurb: 'Two junior combos, barbless hooks and a first-aid kit for a safe first trip.', items: ['rod-16', 'rod-16', 'hooks-bl', 'soft-3', 'firstaid', 'pouch'] },
  { id: 'kit-snakehead', name: 'Snakehead topwater', for: 'snakehead', blurb: 'Weedless frogs, heavier leader and a lip-grip for toothy fish.', items: ['rod-21', 'reel-2500', 'braid-15', 'leader-20', 'frog', 'lipgrip', 'pliers'] },
];

// Shop types FishWise points people to. Named shops are real businesses we
// link to for information only; there is no partnership with them yet.
export const SHOPS = [
  { id: 'decathlon', kind: 'Sports chain', name: 'Decathlon Singapore', addr: 'Several stores island-wide', text: 'Budget-friendly beginner rods, reels, shoes and accessories. Check stock at your nearest store online first.', link: 'https://www.decathlon.sg/', linkText: 'Find a store', ext: true },
  { id: 'specialist', kind: 'Specialist', name: 'Lure Haven', addr: '12 Hamilton Road, Singapore 209183', text: 'Specialist in Japanese lure-fishing tackle. Good for upgrading reels, braid and lures once you know what you like.', link: 'https://lurehaven.com.sg/', linkText: 'Visit website', ext: true },
  { id: 'tackle', kind: 'Neighbourhood', name: 'Local tackle shops', addr: 'In many HDB town centres', text: 'Small shops with friendly local advice. Show them your FishWise list — and remember PUB reservoirs are artificial bait only.', link: 'https://www.pub.gov.sg/Public/Places-of-Interest/Our-Reservoirs-and-Waterways/ABC-Waters/PUB-Fishing', linkText: 'PUB rules', ext: true },
  { id: 'online', kind: 'Online', name: 'Online marketplaces', addr: 'Delivered island-wide', text: 'Good for line, small tackle and accessories. Buy from sellers with many reviews, and check hook types against the rules.', link: '', linkText: '' },
];

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

export function getShop(id) {
  return SHOPS.find((s) => s.id === id) || null;
}

/** Typical budget for a list of item ids: [low, high] in SGD. */
export function rangeOf(ids) {
  return ids.reduce(([lo, hi], id) => {
    const p = getProduct(id);
    return p ? [lo + p.range[0], hi + p.range[1]] : [lo, hi];
  }, [0, 0]);
}

/** Mid-point estimate used when fitting a list to a budget. */
export function midOf(ids) {
  const [lo, hi] = rangeOf(ids);
  return Math.round((lo + hi) / 2);
}

export function kitTotal(kit) {
  const [lo, hi] = rangeOf(kit.items);
  return { lo, hi };
}
