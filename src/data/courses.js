/**
 * FishWise Academy — three tracks, each a list of short lessons with a quiz.
 *
 * Rules quoted here come from the official PUB and NParks fishing pages
 * (checked 2 Nov 2026). Technique content is general angling practice.
 *
 * Lesson body blocks:
 *   { h: 'heading' }           section heading
 *   { p: 'text' }              paragraph
 *   { list: ['a', 'b'] }       bullet list
 *   { steps: ['a', 'b'] }      numbered steps
 *   { tip: 'text' }            highlighted tip
 *   { warn: 'text' }           highlighted warning
 */

export const POINTS = {
  lesson: 20,
  quiz: 30,
  track: 100,
  trip: 10,
  question: 5,
  answer: 15,
  booking: 10,
  scan: 5,
  publish: 40,
};

export const QUIZ_PASS_RATIO = 2 / 3;

export const TRACKS = [
  {
    id: 'beginner',
    title: 'Beginner',
    subtitle: 'From zero to your first legal, safe catch',
    level: 1,
    lessons: [
      {
        id: 'b1-where',
        title: 'Where you are allowed to fish',
        minutes: 6,
        body: [
          { p: 'Singapore does not have open fishing everywhere. Fishing is allowed only at designated areas, and those areas are published by two agencies: PUB for reservoirs and waterways, and NParks for parks and coastal areas.' },
          { h: 'A site is not open as a whole' },
          { p: 'Even when a reservoir or park is listed, only specific stretches inside it are designated. At PUB reservoirs and waterways, designated areas are marked by fishing-zone signage and blue railings. In NParks parks, look out for “No fishing” signs.' },
          { list: [
            'Find the site on the FishWise map (green markers are named on the official pages).',
            'On arrival, find the fishing-zone sign or blue railing before you set up.',
            'If you cannot find a sign, do not fish there.',
          ] },
          { h: 'Places that are explicitly off limits' },
          { p: 'Official pages also name exclusions. For example, NParks allows fishing along Pulau Ubin’s coast except the Chek Jawa Wetlands, and along the Pasir Ris beachfront but not within or near the mangroves, bridges or rivers.' },
          { warn: 'PUB states that fishing outside designated areas can lead to warning letters or composition fines for first-time offenders, and prosecution with fines of up to $3,000 for repeat offenders. NParks states fines of up to $3,000 for violating fishing regulations.' },
        ],
        quiz: [
          { q: 'A reservoir is listed on PUB’s fishing page. Where can you fish?', options: ['Anywhere along its shoreline', 'Only at the designated areas marked by signs and blue railings', 'Anywhere except near the dam'], answer: 1, why: 'Listing a site means designated areas exist inside it — not that the whole shoreline is open.' },
          { q: 'Which part of Pulau Ubin does NParks exclude from fishing?', options: ['The main jetty', 'The Chek Jawa Wetlands', 'The whole island'], answer: 1, why: 'NParks permits fishing along Ubin’s coastal areas except the Chek Jawa Wetlands.' },
          { q: 'You arrive and cannot find any fishing-zone sign. What should you do?', options: ['Fish quietly anyway', 'Ask another angler and fish where they are', 'Do not fish there; check the official page or move to a marked area'], answer: 2, why: 'Signage is what confirms a designated area on the ground.' },
        ],
      },
      {
        id: 'b2-kit',
        title: 'Your first kit',
        minutes: 5,
        body: [
          { p: 'You do not need expensive gear to start. A simple spinning setup covers most beginner fishing in Singapore.' },
          { h: 'The essentials' },
          { list: [
            'Spinning rod (about 1.8–2.1 m) and a matching spinning reel.',
            'Monofilament line — forgiving and easy to knot for beginners.',
            'Hooks: NParks says reservoirs and waterways require carbon steel micro-barb or barbless hooks.',
            'A few small sinkers and swivels.',
            'Long-nose pliers or a dehooker, a small towel, and a bag for your rubbish and old line.',
          ] },
          { h: 'Bait rules depend on where you fish' },
          { p: 'PUB allows only artificial bait at its designated reservoirs and waterways, and fly fishing is not allowed there. At coastal parks and paid ponds, follow the site’s own rules.' },
          { tip: 'Not ready to buy? FishWise Local sessions (Events tab) provide rods and tackle for the day.' },
        ],
        quiz: [
          { q: 'What hooks does NParks say to use at reservoirs and waterways?', options: ['Treble hooks', 'Carbon steel micro-barb or barbless hooks', 'Stainless steel barbed hooks'], answer: 1, why: 'Micro-barb or barbless carbon steel hooks are required there, and they make release easier.' },
          { q: 'Which bait may you use at PUB’s designated reservoirs?', options: ['Live prawn', 'Bread', 'Artificial bait only'], answer: 2, why: 'PUB permits artificial bait only.' },
          { q: 'Why carry long-nose pliers?', options: ['To cut bait', 'To remove hooks safely without touching the mouth', 'To tighten the reel'], answer: 1, why: 'Pliers keep fingers away from teeth, spines and hooks.' },
        ],
      },
      {
        id: 'b3-knot',
        kind: '3d',
        scene: 'knot',
        title: 'Tie an improved clinch knot',
        minutes: 5,
        body: [
          { p: 'The improved clinch knot attaches line to a hook, lure or swivel. It is the first knot most anglers learn.' },
          { steps: [
            'Thread about 15 cm of line through the hook eye.',
            'Wrap the loose end (tag end) around the main line 5 to 7 times.',
            'Pass the tag end through the small loop just above the eye.',
            'Now pass the tag end back through the big loop you just created.',
            'Wet the knot with water, then pull the main line slowly to tighten.',
            'Trim the tag end, leaving about 3 mm.',
          ] },
          { tip: 'Always wet a knot before tightening — friction heat weakens dry line.' },
          { warn: 'Put trimmed line offcuts in your bag, never on the ground or in the water. Loose line entangles birds and otters.' },
        ],
        quiz: [
          { q: 'How many wraps around the main line for an improved clinch knot?', options: ['1 to 2', '5 to 7', '15 to 20'], answer: 1, why: 'Five to seven wraps holds well without bunching.' },
          { q: 'Why wet the knot before tightening?', options: ['To make it shiny', 'To reduce friction heat that weakens the line', 'It is not needed'], answer: 1, why: 'Lubricating prevents heat damage as the wraps cinch down.' },
        ],
      },
      {
        id: 'b4-cast',
        kind: '3d',
        scene: 'cast',
        title: 'Your first cast',
        minutes: 6,
        body: [
          { p: 'A smooth overhead cast with a spinning reel is about timing, not strength. Try it in the 3D Trainer before you go.' },
          { steps: [
            'Let about 30 cm of line hang from the rod tip.',
            'Hook the line over your index finger, then open the bail arm.',
            'Look behind you — no people, trees or railings.',
            'Bring the rod back smoothly to about the 1 o’clock position.',
            'Sweep forward and release the line from your finger at about 10 o’clock.',
            'Close the bail by hand and take up the slack.',
          ] },
          { tip: 'Releasing too early sends the lure straight up; too late slams it into the water at your feet.' },
          { warn: 'NParks reminds anglers to cast lures carefully and keep away from other people and boats.' },
        ],
        quiz: [
          { q: 'At roughly which position do you release the line on the forward cast?', options: ['1 o’clock', '10 o’clock', '6 o’clock'], answer: 1, why: 'Release around 10 o’clock gives a good flight angle.' },
          { q: 'What must you check before every cast?', options: ['The weather app', 'That nobody is behind you', 'Your phone battery'], answer: 1, why: 'A hook in the back swing is the most common fishing injury.' },
        ],
      },
      {
        id: 'b5-safety',
        title: 'Safety and etiquette',
        minutes: 5,
        body: [
          { h: 'Weather' },
          { p: 'NParks advises stopping fishing and seeking shelter in bad weather. A carbon rod is a lightning conductor — when you hear thunder, pack up. The Weather tab shows the live NEA 2-hour forecast for each spot.' },
          { h: 'Sharing the space' },
          { list: [
            'Choose a spot away from boats, other anglers and people doing water activities.',
            'Never string fishing line across paths — it is hard to see.',
            'PUB asks that children are accompanied by adults.',
            'If you see otters, do not harm or feed them.',
          ] },
          { h: 'Leave no trace' },
          { p: 'Dispose of fishing line, old hooks and bait in litter bins. Return fish you do not plan to eat to the water as quickly as possible, and release any protected species.' },
        ],
        quiz: [
          { q: 'You hear thunder while fishing. What do you do?', options: ['Keep fishing until it rains', 'Stop and seek shelter', 'Move closer to the water'], answer: 1, why: 'NParks advises stopping and seeking shelter in bad weather.' },
          { q: 'Where should old line and hooks go?', options: ['In the water', 'In a litter bin', 'Under a bush'], answer: 1, why: 'Line and hooks injure wildlife and people if left behind.' },
          { q: 'What should you do if you catch a protected species?', options: ['Keep it', 'Release it', 'Sell it'], answer: 1, why: 'NParks asks anglers to release protected species.' },
        ],
      },
      {
        id: 'b6-plan',
        title: 'Plan your first trip',
        minutes: 5,
        body: [
          { p: 'A good first trip is decided before you leave home. Ten minutes of planning makes it safer, legal and far more likely to end with a fish.' },
          { h: 'The night before' },
          { steps: [
            'Pick a spot that is listed on the PUB or NParks fishing pages — the green markers on the FishWise map.',
            'Read the spot’s note: some parks only allow fishing on certain stretches or decks.',
            'Check the NEA forecast in the Weather tab. If thundery showers are forecast, choose another time.',
            'For coastal spots, check a published tide table and aim for the hours around high tide.',
            'Plan to go with a friend, or tell someone where you are going and when you will be back.',
          ] },
          { h: 'Pack list' },
          { list: [
            'Rod, reel, a few hooks, sinkers and lures that suit the spot’s bait rules.',
            'Long-nose pliers, a small towel and a bag for rubbish and old line.',
            'At least a litre of water, a hat, sunscreen and insect repellent.',
            'A charged phone, and a headlamp if you might stay past sunset.',
          ] },
          { tip: 'Log the trip as “planned” in FishWise. When you get home, mark it completed — even zero catches teaches you something.' },
        ],
        quiz: [
          { q: 'The NEA forecast shows thundery showers for your planned afternoon. What do you do?', options: ['Go anyway and fish faster', 'Choose another time', 'Bring an umbrella'], answer: 1, why: 'Lightning is the biggest weather risk to anglers; NParks advises stopping in bad weather.' },
          { q: 'For a coastal spot, which extra check matters most?', options: ['The tide table', 'The bus timetable', 'The colour of the moon'], answer: 0, why: 'Coastal fishing changes hour by hour with the tide.' },
          { q: 'Why log a planned trip in FishWise?', options: ['It is required by law', 'So you can record how it went and learn from your own data', 'To earn points without fishing'], answer: 1, why: 'Your catch log turns every trip into a lesson.' },
        ],
      },
      {
        id: 'b7-lightning',
        kind: '3d',
        scene: 'storm',
        title: 'Lightning: when to leave',
        minutes: 6,
        body: [
          { p: 'Singapore has one of the highest rates of lightning activity in the world, and an angler on a jetty holding a long rod is often the tallest thing around. Knowing when to leave is the most important weather skill you can learn.' },
          { h: 'Flash to bang' },
          { steps: [
            'When you see lightning, start counting seconds.',
            'Stop when you hear the thunder.',
            'Divide by 3 to get the distance in kilometres (sound travels about 1 km every 3 seconds).',
          ] },
          { h: 'The 30-30 rule' },
          { list: [
            '30 seconds or less between flash and thunder (about 10 km): stop fishing and get to safe shelter now.',
            'Wait 30 minutes after the last thunder before you go back out.',
            'Safe shelter is an enclosed building or a hard-top car. Open jetty shelters, trees and umbrellas are not safe.',
          ] },
          { tip: 'Turn on lightning alerts in NEA’s myENV app and check the 2-hour forecast in the Weather lab before you go.' },
          { warn: 'If you are caught out, put the rod down, get off the jetty or beach, and never shelter under a lone tree.' },
        ],
        quiz: [
          { q: 'You count 12 seconds between flash and thunder. How far away is the storm?', options: ['About 1 km', 'About 4 km', 'About 12 km'], answer: 1, why: '12 ÷ 3 = 4 km — well inside the danger zone.' },
          { q: 'What does the 30-30 rule tell you?', options: ['Fish for 30 more minutes', 'Leave if the gap is 30 s or less; wait 30 min after the last thunder', 'Stand 30 m from the water'], answer: 1, why: 'Leave at 30 seconds or less, and wait 30 minutes after the last thunder before returning.' },
          { q: 'Which of these is safe shelter from lightning?', options: ['An open jetty shelter', 'A large tree', 'A hard-top car with the windows up'], answer: 2, why: 'Only enclosed buildings and hard-top vehicles protect you.' },
        ],
      },
    ],
  },
  {
    id: 'amateur',
    title: 'Amateur',
    subtitle: 'Read the water and land fish well',
    level: 2,
    lessons: [
      {
        id: 'a1-water',
        kind: '3d',
        scene: 'water',
        title: 'Reading water and structure',
        minutes: 7,
        body: [
          { p: 'Fish hold where food comes to them and where they can hide. Learning to spot that “structure” is the biggest jump from beginner to amateur.' },
          { list: [
            'Jetty pylons and rock edges: shade and shelter for predators like mangrove jack and peacock bass.',
            'Drop-offs: where shallow water falls into deeper water, fish patrol the edge.',
            'Current seams: where fast and slow water meet near points and jetties, bait gets swept past.',
            'Weed beds and lily pads: snakehead territory in reservoirs.',
          ] },
          { h: 'Tides on the coast' },
          { p: 'Coastal spots change hour by hour with the tide. Moving water — the hours either side of high tide — is usually more productive than slack water. Check a published tide table before planning a coastal trip.' },
          { tip: 'Use the satellite map at full zoom to spot jetties, rock lines and channel edges before you travel.' },
        ],
        quiz: [
          { q: 'Which is an example of structure?', options: ['Open, featureless water', 'Jetty pylons', 'A car park'], answer: 1, why: 'Pylons give shade and shelter that predators use.' },
          { q: 'On the coast, when is fishing usually better?', options: ['Slack water at dead low tide', 'When the water is moving around the tide change', 'It makes no difference'], answer: 1, why: 'Moving water carries food past waiting fish.' },
        ],
      },
      {
        id: 'a2-lures',
        title: 'Choosing lures',
        minutes: 6,
        body: [
          { p: 'Because PUB waters allow artificial bait only, lure skills matter in Singapore more than in most places.' },
          { list: [
            'Soft plastics: shad and worm shapes, the most versatile option.',
            'Hard minnows: diving lures that imitate small baitfish; great for peacock bass and barramundi.',
            'Spoons and spinners: flash and vibration for active fish in open water.',
            'Topwater frogs and poppers: surface strikes from snakehead over weed.',
          ] },
          { h: 'Match the situation' },
          { p: 'Clear water and bright sun: natural colours and slower retrieves. Murky water or low light: brighter colours and more vibration.' },
        ],
        quiz: [
          { q: 'Which lure is the classic choice over weed for snakehead?', options: ['A metal spoon', 'A topwater frog', 'A deep diving crankbait'], answer: 1, why: 'Weedless frogs skim over vegetation where snakehead ambush.' },
          { q: 'In murky water, which tends to work better?', options: ['Brighter colours and more vibration', 'Clear, see-through lures', 'No lure'], answer: 0, why: 'Fish find lures by vibration and contrast when visibility is low.' },
        ],
      },
      {
        id: 'a3-landing',
        title: 'Fighting and landing a fish',
        minutes: 6,
        body: [
          { h: 'Set your drag before you cast' },
          { p: 'The drag lets line slip before it breaks. A common starting point is around a quarter to a third of your line’s rated strength — test by pulling line from the reel by hand.' },
          { steps: [
            'Keep the rod at roughly 45 degrees so it absorbs lunges.',
            'Reel only when the fish is not taking line.',
            'Steer the fish away from pylons and rocks by turning its head.',
            'Use a landing net for anything sizeable instead of lifting it by the line.',
          ] },
          { warn: 'Never “high-stick” (point the rod straight up while the fish is close) — it is the easiest way to snap a rod.' },
        ],
        quiz: [
          { q: 'What does the drag do?', options: ['Makes the reel faster', 'Lets line slip under pressure before it breaks', 'Locks the spool'], answer: 1, why: 'Drag protects the line and knots during runs.' },
          { q: 'What is the safest way to land a larger fish?', options: ['Lift it by the line', 'Use a landing net', 'Grab the gill covers'], answer: 1, why: 'Nets protect the fish, the line and your hands.' },
        ],
      },
      {
        id: 'a4-release',
        kind: '3d',
        scene: 'handling',
        title: 'Handling and catch-and-release',
        minutes: 6,
        body: [
          { p: 'PUB encourages catch-and-release where possible, and NParks asks that fish you do not plan to eat are returned as quickly as possible.' },
          { steps: [
            'Wet your hands before touching the fish to protect its slime coat.',
            'Support the body horizontally — do not hang heavy fish by the jaw.',
            'Remove the hook with pliers; micro-barb and barbless hooks come out fast.',
            'Keep it in the water or return it within seconds.',
            'Hold it facing gently into the current until it swims off.',
          ] },
          { h: 'Know the dangerous ones' },
          { p: 'Stingrays, catfish and scorpionfish carry venomous spines, and pufferfish must never be eaten. Check the Species guide for each fish’s handling notes.' },
        ],
        quiz: [
          { q: 'Why wet your hands before handling a fish?', options: ['To get a better grip only', 'To protect the fish’s slime coat', 'It is a tradition'], answer: 1, why: 'Dry hands strip the protective slime layer.' },
          { q: 'Which of these must you never eat?', options: ['Tilapia', 'Pufferfish', 'Barramundi'], answer: 1, why: 'Many pufferfish carry tetrodotoxin.' },
        ],
      },
      {
        id: 'a5-rigs',
        title: 'Two rigs every angler needs',
        minutes: 7,
        body: [
          { p: 'A rig is how the parts below your main line are arranged. Two simple rigs cover most fishing in Singapore.' },
          { h: 'Running sinker (bottom) rig' },
          { steps: [
            'Thread a ball sinker onto the main line so it can slide freely.',
            'Tie the main line to one end of a swivel — the swivel stops the sinker.',
            'Tie 30–50 cm of leader to the other end of the swivel.',
            'Tie your hook to the leader with an improved clinch knot.',
          ] },
          { p: 'The fish can pick up the bait and swim off without feeling the sinker’s weight. Ideal for javelin grunter and croakers off beaches and jetties.' },
          { h: 'Float rig' },
          { steps: [
            'Slide a float stopper and float onto the line.',
            'Add a couple of split shot below the float so it sits upright.',
            'Tie on a small hook and set the depth by moving the stopper.',
          ] },
          { p: 'The float suspends the bait at a set depth and shows bites clearly. Great for tilapia in ponds and calm water.' },
          { warn: 'At PUB reservoirs and waterways only artificial bait is allowed — fish a float rig with a tiny soft plastic there. Natural bait is only for places that permit it.' },
        ],
        quiz: [
          { q: 'In a running sinker rig, what stops the sinker sliding down to the hook?', options: ['The float', 'The swivel', 'The bait'], answer: 1, why: 'The swivel blocks the sinker and joins the main line to the leader.' },
          { q: 'What does a float rig let you control?', options: ['How deep the bait sits', 'How hard the fish pulls', 'The weather'], answer: 0, why: 'Moving the float stopper sets the depth.' },
          { q: 'Which bait may you use on a float rig at a PUB reservoir?', options: ['Live prawn', 'A small soft-plastic lure', 'Bread'], answer: 1, why: 'PUB designated areas allow artificial bait only.' },
        ],
      },
      {
        id: 'a6-etiquette',
        title: 'Jetty etiquette and night safety',
        minutes: 5,
        body: [
          { p: 'Jetties and decks are shared spaces. Good etiquette keeps everyone safe — and keeps fishing welcome there.' },
          { h: 'On a busy jetty' },
          { list: [
            'Leave space between you and the next angler; never cast across someone else’s line.',
            'Keep rods, buckets and tackle out of the walkway.',
            'Watch the swing path — walkers, runners and children pass behind you.',
            'Say hello. Asking “what are they biting on?” is how most anglers learn.',
          ] },
          { h: 'After dark' },
          { list: [
            'Wear a headlamp, but point it down — do not dazzle other people.',
            'Stay on lit, signed areas and never lean over railings.',
            'Wet boards are slippery: wear shoes with grip.',
            'Fish with a buddy and keep your phone charged.',
          ] },
          { tip: 'If you see someone fishing outside a designated area, let rangers or PUB know rather than confronting them.' },
        ],
        quiz: [
          { q: 'Another angler is fishing to your left. Where can you cast?', options: ['Anywhere you like', 'Straight out, not across their line', 'Across their line if you are quick'], answer: 1, why: 'Crossing lines causes tangles and arguments.' },
          { q: 'How should you use a headlamp at night?', options: ['Point it at people so they see you', 'Point it down at your work', 'Leave it off'], answer: 1, why: 'Shining it at others blinds them.' },
        ],
      },
      {
        id: 'a7-rig',
        kind: '3d',
        scene: 'rig',
        title: 'Build a float rig',
        minutes: 7,
        body: [
          { p: 'A running float rig holds your bait at a set depth and shows you the bite. It is the go-to rig for calm coastal water, paid ponds and anywhere bait is allowed.' },
          { warn: 'PUB reservoirs and waterways allow artificial bait only. Use this rig with bait only where bait fishing is allowed, such as coastal NParks spots and paid ponds — and always read the signs.' },
          { h: 'Top to bottom' },
          { steps: [
            'Float stopper — sets the depth.',
            'Bead — stops the stopper slipping through the float.',
            'Sliding float — slides freely and shows the bite.',
            'Bean sinker — cocks the float and takes the bait down.',
            'Swivel — stops the sinker reaching the hook and prevents twist.',
            'Leader, about 40 cm.',
            'Hook, tied with an improved clinch knot.',
          ] },
          { h: 'Setting the depth' },
          { p: 'Most fish here feed near the bottom. Find the depth (a plummet or a few test casts helps), then set the stopper so the bait hangs 20–50 cm above the bottom. Too deep and you snag; too shallow and you fish empty water.' },
          { tip: 'Match the sinker to the float: the float should sit upright with just the coloured tip showing.' },
        ],
        quiz: [
          { q: 'What sets the depth on a running float rig?', options: ['The hook size', 'Where the float stopper sits on the line', 'The weight of the float'], answer: 1, why: 'The float slides up to the stopper, so the stopper position sets the depth.' },
          { q: 'What does the swivel do?', options: ['Makes the bait spin', 'Stops the sinker sliding to the hook and stops line twist', 'Keeps the float upright'], answer: 1, why: 'It joins main line to leader and acts as a stop.' },
          { q: 'Where should the bait hang for bottom-feeding fish?', options: ['On the bottom', '20–50 cm above the bottom', 'Just under the surface'], answer: 1, why: 'Just off the bottom avoids snags while staying where the fish feed.' },
        ],
      },
      {
        id: 'a8-fight',
        kind: '3d',
        scene: 'fight',
        title: 'Play and land a fish',
        minutes: 6,
        body: [
          { p: 'Most fish are lost in the fight, not the bite. The secret is the drag: a clutch on your reel that lets line slip before it breaks.' },
          { h: 'Set the drag before you cast' },
          { list: [
            'Set it to roughly a quarter to a third of your line’s breaking strain (about 1.3–1.8 kg for 12 lb line).',
            'Check it by pulling line off the reel by hand: it should slip smoothly, not jerk.',
          ] },
          { h: 'During the fight' },
          { steps: [
            'Keep the rod up at about 45–60° so it absorbs the lunges.',
            'When the fish runs, stop reeling and let the drag work.',
            'When it rests, lift the rod and reel down as you lower it (pump and wind).',
            'Never let the line go slack — that is when hooks fall out, especially barbless ones.',
          ] },
          { tip: 'Land the fish head-first into a net, or lead it to the shore. Never lift a big fish up a jetty by the line.' },
        ],
        quiz: [
          { q: 'What should you do when a fish makes a strong run?', options: ['Reel as hard as you can', 'Stop reeling and let the drag work', 'Tighten the drag fully'], answer: 1, why: 'Reeling against a running fish just twists line; the drag absorbs the run.' },
          { q: 'Your line breaks at 6 kg. About where should the drag be set?', options: ['0.5 kg', '1.5–2 kg', '6 kg or more'], answer: 1, why: 'A quarter to a third of the line strength.' },
          { q: 'Why keep the line tight?', options: ['It looks better', 'Slack line lets the hook fall out', 'It makes the fish swim faster'], answer: 1, why: 'Constant pressure keeps the hook in place.' },
        ],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: 'Target species, read conditions, mentor others',
    level: 3,
    lessons: [
      {
        id: 'x1-targeting',
        title: 'Targeting key species',
        minutes: 8,
        body: [
          { h: 'Peacock bass in reservoirs' },
          { p: 'Fish rocky banks and drop-offs at first light. Minnow lures with long pauses trigger reaction strikes. Follow-ups are common — pause again before lifting the lure out.' },
          { h: 'Barramundi on the coast' },
          { p: 'Low light around a high tide near jetties and mangrove edges. Slow-rolled soft plastics close to structure; heavier leader to survive pylons.' },
          { h: 'Snakehead over vegetation' },
          { p: 'Weedless frogs across lily pads. Let the fish turn down with the lure before you strike; a heavy braid main line helps pull it out of cover.' },
        ],
        quiz: [
          { q: 'When fishing minnow lures for peacock bass, what often triggers strikes?', options: ['A constant fast retrieve', 'Long pauses', 'Dragging the lure along the bottom'], answer: 1, why: 'Peacock bass frequently hit a suspended, paused lure.' },
          { q: 'When should you strike on a snakehead topwater bite?', options: ['Instantly at the splash', 'After a short pause as the fish turns down', 'Never'], answer: 1, why: 'Striking too early pulls the frog out of its mouth.' },
        ],
      },
      {
        id: 'x2-conditions',
        title: 'Tides, monsoons and weather',
        minutes: 7,
        body: [
          { p: 'Singapore usually has two high tides and two low tides a day, of unequal heights. Coastal plans should start from the tide table, not the clock.' },
          { h: 'Monsoon seasons' },
          { list: [
            'Northeast Monsoon (roughly December to early March): steadier winds, wetter early in the season.',
            'Southwest Monsoon (roughly June to September): early-morning squalls can arrive suddenly.',
            'Inter-monsoon periods: thundery afternoon showers are common — plan mornings.',
          ] },
          { warn: 'Lightning is the biggest weather risk to anglers. If the NEA forecast shows thundery showers for your area, plan around it and leave at the first thunder.' },
        ],
        quiz: [
          { q: 'How many high tides does Singapore usually have per day?', options: ['One', 'Two', 'Four'], answer: 1, why: 'Usually two highs and two lows of unequal height.' },
          { q: 'During inter-monsoon periods, when are thunderstorms common?', options: ['Afternoons', 'Midnight only', 'Never'], answer: 0, why: 'Afternoon thundery showers are typical of inter-monsoon periods.' },
        ],
      },
      {
        id: 'x3-rigs',
        title: 'Leaders and the Palomar knot',
        minutes: 6,
        body: [
          { p: 'Braided line casts far and is very sensitive, but it is visible and weak against abrasion. A short fluorocarbon or monofilament leader solves both problems.' },
          { h: 'Palomar knot (great with braid)' },
          { steps: [
            'Double about 15 cm of line and pass the loop through the hook eye.',
            'Tie a loose overhand knot with the doubled line.',
            'Pass the loop over the entire hook or lure.',
            'Wet and pull both the main line and tag end to tighten.',
            'Trim the tag end.',
          ] },
          { tip: 'Use a leader roughly as long as your rod for structure fishing around pylons.' },
        ],
        quiz: [
          { q: 'Why add a leader to braided line?', options: ['Braid is too thick', 'Braid is visible and weak against abrasion', 'It is required by law'], answer: 1, why: 'A leader adds abrasion resistance and lower visibility.' },
          { q: 'In a Palomar knot, what passes over the hook?', options: ['The tag end', 'The loop of doubled line', 'Nothing'], answer: 1, why: 'Passing the loop over the hook is the defining step.' },
        ],
      },
      {
        id: 'x5-invasive',
        title: 'Introduced and protected species',
        minutes: 5,
        body: [
          { p: 'Many of the fish in Singapore’s reservoirs — including peacock bass and tilapia — were introduced from elsewhere. Native species, meanwhile, need protecting.' },
          { h: 'What anglers can do' },
          { list: [
            'Release protected species carefully and quickly, as NParks asks.',
            'Never release pet, aquarium or bait fish into any waterway — they can spread disease and crowd out native wildlife.',
            'If you are unsure what you caught, use Fish ID or ask in Community before keeping it.',
            'Practise catch-and-release where possible, as PUB encourages.',
          ] },
          { tip: 'Photograph unusual catches and log them — good records help everyone understand what lives in our waters.' },
        ],
        quiz: [
          { q: 'You catch a fish you think is protected. What do you do?', options: ['Keep it as a trophy', 'Release it carefully', 'Give it away'], answer: 1, why: 'NParks asks anglers to release protected species.' },
          { q: 'Is it okay to release leftover live bait fish into a reservoir?', options: ['Yes, it feeds the fish', 'No — introduced fish can harm native wildlife', 'Only at night'], answer: 1, why: 'Releasing animals into waterways can spread disease and harm native species.' },
        ],
      },
      {
        id: 'x6-log',
        title: 'Learn from your catch log',
        minutes: 5,
        body: [
          { p: 'Your FishWise log is a personal dataset. A few minutes reviewing it turns luck into skill.' },
          { h: 'Questions to ask your log' },
          { list: [
            'Which spots give you catches, and which are blanks?',
            'What time of day and which weather produced most fish?',
            'Which species do you meet where — check the Catch records panel.',
            'Is your release rate where you want it to be?',
          ] },
          { steps: [
            'Open My trips and filter to completed trips.',
            'Add notes after every trip: lure, depth, tide and weather.',
            'Look for two or three things your best trips have in common.',
            'Plan your next trip to repeat them — then test one change at a time.',
          ] },
          { tip: 'Zero-catch trips are data too. Logging them stops you repeating the same mistake.' },
        ],
        quiz: [
          { q: 'Why log trips where you caught nothing?', options: ['They do not matter', 'They show what did not work', 'To lower your release rate'], answer: 1, why: 'Blank trips are just as informative as good ones.' },
          { q: 'When testing ideas on your next trip, how many things should you change?', options: ['Everything at once', 'One at a time', 'None'], answer: 1, why: 'Changing one thing at a time tells you what made the difference.' },
        ],
      },
      {
        id: 'x4-mentor',
        title: 'Conservation and mentoring',
        minutes: 5,
        body: [
          { p: 'Experienced anglers shape how fishing is seen in Singapore. Every illegal spot or tangle of dumped line makes access harder for everyone.' },
          { list: [
            'Log your trips honestly in FishWise — catch records help everyone learn what works.',
            'Report illegal fishing at PUB waters to PUB’s 24-hour hotline listed on its fishing page.',
            'Release protected species and handle every fish as if it will be released.',
            'Answer beginner questions in Community — mentors earn points and badges.',
          ] },
          { tip: 'The best mentoring moment is showing someone where the fishing-zone sign is.' },
        ],
        quiz: [
          { q: 'How can experienced anglers earn FishWise points?', options: ['By answering beginner questions in Community', 'By fishing outside designated areas', 'By keeping every fish'], answer: 0, why: 'Helpful answers earn mentor points.' },
          { q: 'Who should illegal fishing at reservoirs be reported to?', options: ['Nobody', 'PUB', 'The nearest shop'], answer: 1, why: 'PUB publishes a 24-hour hotline on its fishing page.' },
        ],
      },
      {
        id: 'x7-tides',
        kind: '3d',
        scene: 'tide',
        title: 'Fish the tide',
        minutes: 7,
        body: [
          { p: 'On the coast the tide matters more than almost anything else. Singapore usually has two high and two low tides each day, roughly six hours apart, and the two highs (and two lows) are often different heights.' },
          { h: 'How the water moves' },
          { list: [
            'Slack water: around high and low tide the current almost stops.',
            'The current is strongest halfway between — the middle two hours of a tide move about half the water (the rule of twelfths).',
            'Spring tides, around new and full moon, have the biggest range and strongest currents; neap tides are gentler.',
          ] },
          { h: 'Using it' },
          { list: [
            'Jetty predators such as barramundi and mangrove jack often feed on the rising tide, as moving water pushes bait past structure.',
            'At very strong flows you may need a heavier sinker — or wait for the current to ease near the turn.',
            'On beaches, a falling tide can leave you a long walk from the water; check the time of low tide before you go.',
          ] },
          { tip: 'Tide tables for Singapore are published by the Maritime and Port Authority (MPA). Note the times of high and low on your trip plan.' },
        ],
        quiz: [
          { q: 'How many high tides does Singapore usually get in a day?', options: ['One', 'Two', 'Four'], answer: 1, why: 'A semi-diurnal tide gives two highs and two lows a day.' },
          { q: 'When is the current usually strongest?', options: ['At high tide', 'Halfway between high and low', 'At low tide'], answer: 1, why: 'The flow peaks mid-tide and slackens at the turn.' },
          { q: 'Which tides have the biggest range?', options: ['Spring tides, near new and full moon', 'Neap tides', 'Every tide is the same'], answer: 0, why: 'Spring tides happen when the sun and moon line up.' },
        ],
      },
    ],
  },
];

export function allLessons() {
  return TRACKS.flatMap((t) => t.lessons.map((l) => ({ ...l, trackId: t.id })));
}

export function findLesson(lessonId) {
  for (const track of TRACKS) {
    const lesson = track.lessons.find((l) => l.id === lessonId);
    if (lesson) return { track, lesson };
  }
  return null;
}
