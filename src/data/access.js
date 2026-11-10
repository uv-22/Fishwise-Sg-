/**
 * How to reach every spot, and what to expect there.
 *
 * Nearest station: OpenStreetMap (open lines only, checked Nov 2026).
 * Walking distance: OSRM foot routing on OpenStreetMap paths
 * (routing.openstreetmap.de), converted to minutes at 4.6 km/h.
 * Arrival notes and expectations are written per spot; anything about
 * whether fishing is allowed comes from the PUB and NParks pages in spots.js.
 */

export const ACCESS = {
  "bedok-jetty": {
    "station": "Bayshore",
    "codes": [
      "TE29"
    ],
    "lines": [
      "Thomson–East Coast Line"
    ],
    "lrt": false,
    "stationLat": 1.312834,
    "stationLng": 103.942309,
    "walkKm": 1.2,
    "walkMin": 16,
    "entry": "Cross into East Coast Park and head for Area F. The 250 m jetty sits beside East Coast Lagoon Food Village.",
    "expect": [
      "One of the busiest jetties in Singapore, especially on weekend evenings",
      "Food and drink a short walk away at the hawker centre"
    ]
  },
  "east-coast-beach": {
    "station": "Siglap",
    "codes": [
      "TE28"
    ],
    "lines": [
      "Thomson–East Coast Line"
    ],
    "lrt": false,
    "stationLat": 1.309591,
    "stationLng": 103.930025,
    "walkKm": 1.3,
    "walkMin": 16,
    "entry": "Use the underpass into East Coast Park, then walk the beachfront. Fish only where there are no \"No fishing\" signs.",
    "expect": [
      "Long, open beachfront shared with cyclists, swimmers and barbecue groups"
    ]
  },
  "woodlands-jetty": {
    "station": "Woodlands North",
    "codes": [
      "TE1"
    ],
    "lines": [
      "Thomson–East Coast Line"
    ],
    "lrt": false,
    "stationLat": 1.448289,
    "stationLng": 103.785713,
    "walkKm": 1.3,
    "walkMin": 17,
    "entry": "Walk into Woodlands Waterfront Park and out along the jetty. Fishing is only allowed on the stretch after the F&B outlet.",
    "expect": [
      "A long jetty facing the Strait of Johor, open to wind from the water"
    ]
  },
  "sembawang-jetty": {
    "station": "Canberra",
    "codes": [
      "NS12"
    ],
    "lines": [
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.443213,
    "stationLng": 103.82963,
    "walkKm": 3.1,
    "walkMin": 41,
    "entry": "Sembawang Park is at the far end of Sembawang Road. The jetty is beside the beach.",
    "expect": [
      "Quieter than the East Coast jetties",
      "NParks also mentions crabbing for flower crabs and mud crabs here"
    ]
  },
  "lower-seletar-jetty": {
    "station": "Khatib",
    "codes": [
      "NS14"
    ],
    "lines": [
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.41736,
    "stationLng": 103.833018,
    "walkKm": 1.2,
    "walkMin": 16,
    "entry": "Enter Lower Seletar Reservoir Park and fish only from the designated zone at the jetty (signs and blue railings).",
    "expect": [
      "Reservoir rules apply: artificial bait only, no fly fishing"
    ]
  },
  "changi-beach": {
    "station": "Pasir Ris",
    "codes": [
      "EW1"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.37129,
    "stationLng": 103.949473,
    "walkKm": 7.1,
    "walkMin": 93,
    "entry": "Head to Changi Village, then walk east along Changi Beach Park. NParks allows fishing along the beach.",
    "expect": [
      "Aircraft fly low overhead on the approach to Changi Airport",
      "Hawker food at Changi Village"
    ],
    "far": "Several bus services end at Changi Village Bus Interchange."
  },
  "pasir-ris-beach": {
    "station": "Pasir Ris",
    "codes": [
      "EW1"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.37129,
    "stationLng": 103.949473,
    "walkKm": 1.1,
    "walkMin": 15,
    "entry": "Walk through Pasir Ris Park to the beachfront.",
    "expect": [
      "NParks excludes the mangroves, bridges and rivers inside Pasir Ris Park — fish the beachfront only"
    ]
  },
  "pasir-ris-town-park": {
    "station": "Pasir Ris",
    "codes": [
      "EW1"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.37129,
    "stationLng": 103.949473,
    "walkKm": 0.4,
    "walkMin": 6,
    "entry": "The pond is in Pasir Ris Town Park, a short walk from the MRT and the bus interchange.",
    "expect": [
      "Calm, enclosed water — good for first-timers and children"
    ]
  },
  "pulau-ubin": {
    "station": "Pasir Ris",
    "codes": [
      "EW1"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.37129,
    "stationLng": 103.949473,
    "walkKm": 9.2,
    "walkMin": 119,
    "entry": "From Changi Village, take a bumboat at Changi Point Ferry Terminal. Boats leave once they have 12 passengers and the crossing takes about 10–15 minutes.",
    "expect": [
      "No tackle shops on the island — bring everything you need",
      "Bring cash for the boat and the island shops"
    ],
    "far": "Take a bus to Changi Village first; the boat leaves from the ferry terminal there."
  },
  "chek-jawa": {
    "station": "Pasir Ris",
    "codes": [
      "EW1"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.37129,
    "stationLng": 103.949473,
    "walkKm": 12.6,
    "walkMin": 165,
    "entry": "Chek Jawa is on the eastern end of Pulau Ubin (bumboat from Changi Point Ferry Terminal).",
    "expect": [
      "NParks says fishing is not allowed at Chek Jawa — visit for the boardwalk, not to fish"
    ],
    "far": "Take a bus to Changi Village, then the bumboat to Pulau Ubin."
  },
  "jurong-lake": {
    "station": "Lakeside",
    "codes": [
      "EW26"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.34425,
    "stationLng": 103.720693,
    "walkKm": 0.7,
    "walkMin": 10,
    "entry": "Jurong Lake Gardens is right beside the station. Find the fishing-zone signs and blue railings at the lake edge.",
    "expect": [
      "Family-friendly gardens with toilets and shelters nearby"
    ]
  },
  "kranji": {
    "station": "Kranji",
    "codes": [
      "NS7"
    ],
    "lines": [
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.425219,
    "stationLng": 103.761989,
    "walkKm": 4.4,
    "walkMin": 57,
    "entry": "Kranji Reservoir Park is along Kranji Way near the dam. Fish only inside the marked zone.",
    "expect": [
      "Remote and quiet; few shops nearby, so bring water and food"
    ],
    "far": "Take a bus or cab from the station along Kranji Road."
  },
  "bedok-reservoir": {
    "station": "Bedok Reservoir",
    "codes": [
      "DT30"
    ],
    "lines": [
      "Downtown Line"
    ],
    "lrt": false,
    "stationLat": 1.336604,
    "stationLng": 103.932465,
    "walkKm": 2.3,
    "walkMin": 29,
    "entry": "Enter Bedok Reservoir Park and walk the reservoir edge to the fishing-zone signs and blue railings.",
    "expect": [
      "Popular running loop around the reservoir — check behind you before casting"
    ]
  },
  "kallang-riverside": {
    "station": "Kallang",
    "codes": [
      "EW10"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.311467,
    "stationLng": 103.871339,
    "walkKm": 0.8,
    "walkMin": 11,
    "entry": "Walk to Kallang Riverside Park along the Kallang River.",
    "expect": [
      "City-centre spot with river traffic; keep lines clear of boats and paddlers"
    ]
  },
  "punggol-park": {
    "station": "Ranggung",
    "codes": [
      "SE5"
    ],
    "lines": [
      "Sengkang LRT"
    ],
    "lrt": true,
    "stationLat": 1.384046,
    "stationLng": 103.897361,
    "walkKm": 1.0,
    "walkMin": 13,
    "entry": "Walk into Punggol Park and around the lake to the designated area.",
    "expect": [
      "Calm lake in a busy neighbourhood park"
    ]
  },
  "punggol-point": {
    "station": "Punggol Point",
    "codes": [
      "PW3"
    ],
    "lines": [
      "Punggol LRT"
    ],
    "lrt": true,
    "stationLat": 1.416852,
    "stationLng": 103.906651,
    "walkKm": 1.0,
    "walkMin": 13,
    "entry": "Punggol Point Park is at the end of Punggol Road; the jetty sits beside the park.",
    "expect": [
      "Not on the official lists — read the signs at the jetty before you fish"
    ]
  },
  "punggol-nature-walk": {
    "station": "Kadaloor",
    "codes": [
      "PE5"
    ],
    "lines": [
      "Punggol LRT"
    ],
    "lrt": true,
    "stationLat": 1.399549,
    "stationLng": 103.916508,
    "walkKm": 1.7,
    "walkMin": 22,
    "entry": "Follow the Punggol Promenade Nature Walk to the decks.",
    "expect": [
      "Not on the official lists — check signage and ask NParks before fishing"
    ]
  },
  "pandan-reservoir": {
    "station": "Jurong East",
    "codes": [
      "NS1",
      "EW24"
    ],
    "lines": [
      "East–West Line",
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.333108,
    "stationLng": 103.742294,
    "walkKm": 2.5,
    "walkMin": 33,
    "entry": "Walk to the Pandan Reservoir embankment and find the designated zone with blue railings.",
    "expect": [
      "Open embankment with little shade — go early or late"
    ]
  },
  "pang-sua": {
    "station": "Yew Tee",
    "codes": [
      "NS5"
    ],
    "lines": [
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.397461,
    "stationLng": 103.747401,
    "walkKm": 0.9,
    "walkMin": 12,
    "entry": "Walk to the Pang Sua Canal stretch marked with fishing-zone signs.",
    "expect": [
      "Narrow canal banks; water rises fast after heavy rain"
    ]
  },
  "serangoon-reservoir": {
    "station": "Riviera",
    "codes": [
      "PE4"
    ],
    "lines": [
      "Punggol LRT"
    ],
    "lrt": true,
    "stationLat": 1.394546,
    "stationLng": 103.91615,
    "walkKm": 3.9,
    "walkMin": 51,
    "entry": "Head to the Serangoon Reservoir edge at the designated zone (signs and blue railings).",
    "expect": [
      "Wide, open water; windy afternoons are common"
    ],
    "far": "Take a feeder bus or cab for the last stretch from the LRT."
  },
  "marina-reservoir": {
    "station": "Promenade",
    "codes": [
      "CC4",
      "DT15"
    ],
    "lines": [
      "Circle Line",
      "Downtown Line"
    ],
    "lrt": false,
    "stationLat": 1.293114,
    "stationLng": 103.860565,
    "walkKm": 1.8,
    "walkMin": 23,
    "entry": "Walk to the designated zones around Marina Reservoir; look for the fishing-zone signs and blue railings.",
    "expect": [
      "City skyline views and heavy foot traffic in the evenings"
    ]
  },
  "geylang-river": {
    "station": "Mountbatten",
    "codes": [
      "CC7"
    ],
    "lines": [
      "Circle Line"
    ],
    "lrt": false,
    "stationLat": 1.306393,
    "stationLng": 103.882442,
    "walkKm": 0.6,
    "walkMin": 8,
    "entry": "Walk to the Geylang River promenade and find the marked fishing stretch.",
    "expect": [
      "Concrete banks with railings; water rises fast after heavy rain"
    ]
  },
  "kolam-ayer": {
    "station": "Geylang Bahru",
    "codes": [
      "DT24"
    ],
    "lines": [
      "Downtown Line"
    ],
    "lrt": false,
    "stationLat": 1.321505,
    "stationLng": 103.871959,
    "walkKm": 0.8,
    "walkMin": 11,
    "entry": "Kolam Ayer ABC Waterfront is along the Kallang River near Bendemeer.",
    "expect": [
      "Short, compact stretch — arrive early on weekends"
    ]
  },
  "lower-peirce": {
    "station": "Mayflower",
    "codes": [
      "TE6"
    ],
    "lines": [
      "Thomson–East Coast Line"
    ],
    "lrt": false,
    "stationLat": 1.372232,
    "stationLng": 103.836895,
    "walkKm": 1.9,
    "walkMin": 24,
    "entry": "Lower Peirce Reservoir Park is off Old Upper Thomson Road. Fish only from the designated zone.",
    "expect": [
      "Forest-edge reservoir: monkeys are common — keep food sealed and never feed them"
    ]
  },
  "macritchie": {
    "station": "Marymount",
    "codes": [
      "CC16"
    ],
    "lines": [
      "Circle Line"
    ],
    "lrt": false,
    "stationLat": 1.34863,
    "stationLng": 103.839545,
    "walkKm": 1.2,
    "walkMin": 16,
    "entry": "Enter MacRitchie Reservoir Park from Lornie Road and walk to the designated fishing area.",
    "expect": [
      "Monkeys are common — keep bait and food sealed",
      "Busy trail hub at weekends"
    ]
  },
  "pelton-canal": {
    "station": "Aljunied",
    "codes": [
      "EW9"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.316452,
    "stationLng": 103.882909,
    "walkKm": 0.9,
    "walkMin": 12,
    "entry": "Walk to the Pelton Canal stretch with fishing-zone signs.",
    "expect": [
      "Narrow canal; cast short and watch passers-by"
    ]
  },
  "rochor-canal": {
    "station": "Jalan Besar",
    "codes": [
      "DT22"
    ],
    "lines": [
      "Downtown Line"
    ],
    "lrt": false,
    "stationLat": 1.305374,
    "stationLng": 103.855563,
    "walkKm": 0.4,
    "walkMin": 6,
    "entry": "Walk to the marked stretch of Rochor Canal.",
    "expect": [
      "Urban canal with railings; water rises fast after heavy rain"
    ]
  },
  "upper-seletar": {
    "station": "Woodlands South",
    "codes": [
      "TE3"
    ],
    "lines": [
      "Thomson–East Coast Line"
    ],
    "lrt": false,
    "stationLat": 1.426733,
    "stationLng": 103.79378,
    "walkKm": 7.5,
    "walkMin": 98,
    "entry": "Head to Upper Seletar Reservoir Park and fish only from the designated zone.",
    "expect": [
      "Quiet, forested reservoir; few shops nearby"
    ],
    "far": "Take a bus or cab from the station — it is a long way on foot."
  },
  "labrador-jetty": {
    "station": "Labrador Park",
    "codes": [
      "CC27"
    ],
    "lines": [
      "Circle Line"
    ],
    "lrt": false,
    "stationLat": 1.272251,
    "stationLng": 103.802995,
    "walkKm": 1.7,
    "walkMin": 22,
    "entry": "Walk through Labrador Nature Reserve to the seafront jetty.",
    "expect": [
      "Not on the official lists — confirm signage and ask NParks first"
    ]
  },
  "lim-chu-kang-jetty": {
    "station": "Kranji",
    "codes": [
      "NS7"
    ],
    "lines": [
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.425219,
    "stationLng": 103.761989,
    "walkKm": 13.0,
    "walkMin": 170,
    "entry": "The jetty is at the far end of Lim Chu Kang Road in the north-west.",
    "expect": [
      "Working jetties nearby and not on the official lists — confirm on site"
    ],
    "far": "There is no MRT nearby; drive or take a bus along Lim Chu Kang Road."
  },
  "west-coast-park": {
    "station": "Haw Par Villa",
    "codes": [
      "CC25"
    ],
    "lines": [
      "Circle Line"
    ],
    "lrt": false,
    "stationLat": 1.282469,
    "stationLng": 103.781768,
    "walkKm": 2.2,
    "walkMin": 29,
    "entry": "Walk into West Coast Park and head for the seafront and rock headland past the play areas.",
    "expect": [
      "Rocks and seawall — wear grippy shoes and keep children back from the edge",
      "Busy with families and cyclists at weekends"
    ]
  },
  "marina-south-pier": {
    "station": "Marina South Pier",
    "codes": [
      "NS28"
    ],
    "lines": [
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.271446,
    "stationLng": 103.86282,
    "walkKm": 0.4,
    "walkMin": 6,
    "entry": "Exit at Marina South Pier station and walk to the seawall on either side of the ferry terminal.",
    "expect": [
      "Boats come and go from the pier — never cast near berths or mooring lines",
      "Open to wind and sun; little shade on the wall"
    ]
  },
  "yishun-dam": {
    "station": "Yishun",
    "codes": [
      "NS13"
    ],
    "lines": [
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.429384,
    "stationLng": 103.835028,
    "walkKm": 3.3,
    "walkMin": 44,
    "entry": "Walk or cycle along Yishun Dam; it is a long, exposed causeway.",
    "expect": [
      "Strong wind and heavy cycle traffic on the dam road",
      "Reservoir side and sea side have different rules — read the signs first"
    ]
  },
  "changi-boardwalk": {
    "station": "Pasir Ris",
    "codes": [
      "EW1"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.37129,
    "stationLng": 103.949473,
    "walkKm": 7.0,
    "walkMin": 91,
    "entry": "From Changi Village, follow signs to the Changi Point Coastal Walk boardwalk.",
    "expect": [
      "Narrow boardwalk shared with walkers — keep rods upright when people pass",
      "Hawker food at Changi Village"
    ],
    "far": "Several bus services end at Changi Village Bus Interchange."
  },
  "tanah-merah-coast": {
    "station": "Expo",
    "codes": [
      "DT35",
      "CG1"
    ],
    "lines": [
      "Downtown Line",
      "East–West Line (Changi branch)"
    ],
    "lrt": false,
    "stationLat": 1.335077,
    "stationLng": 103.96266,
    "walkKm": 5.4,
    "walkMin": 70,
    "entry": "The coast runs along Tanah Merah Coast Road beside the ferry terminal.",
    "expect": [
      "Few shelters or toilets away from the ferry terminal",
      "Bring water — it is a long, sunny stretch"
    ],
    "far": "There is no MRT within walking distance; take a bus or cab along Tanah Merah Ferry Road."
  },
  "kranji-dam": {
    "station": "Kranji",
    "codes": [
      "NS7"
    ],
    "lines": [
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.425219,
    "stationLng": 103.761989,
    "walkKm": 4.0,
    "walkMin": 52,
    "entry": "Kranji Dam is along Kranji Way next to Kranji Reservoir Park.",
    "expect": [
      "Remote and quiet; bring water and food",
      "Reservoir side follows PUB rules: artificial bait only"
    ],
    "far": "Take a bus or cab from Kranji station along Kranji Road."
  },
  "coney-island": {
    "station": "Punggol Coast",
    "codes": [
      "NE18"
    ],
    "lines": [
      "North East Line"
    ],
    "lrt": false,
    "stationLat": 1.414966,
    "stationLng": 103.910117,
    "walkKm": 1.8,
    "walkMin": 24,
    "entry": "Coney Island is linked to Punggol by bridges at both ends.",
    "expect": [
      "Fishing is not allowed — come for the trails and beaches"
    ]
  },
  "admiralty-park": {
    "station": "Woodlands North",
    "codes": [
      "TE1"
    ],
    "lines": [
      "Thomson–East Coast Line"
    ],
    "lrt": false,
    "stationLat": 1.448289,
    "stationLng": 103.785713,
    "walkKm": 1.2,
    "walkMin": 15,
    "entry": "The park is between Woodlands and Sembawang along Riverside Road.",
    "expect": [
      "Fishing is not allowed — the mangroves and river are protected"
    ]
  },
  "sisters-islands": {
    "station": "Telok Blangah",
    "codes": [
      "CC28"
    ],
    "lines": [
      "Circle Line"
    ],
    "lrt": false,
    "stationLat": 1.27089,
    "stationLng": 103.809874,
    "walkKm": 11.1,
    "walkMin": 145,
    "entry": "Reached only by boat; NParks runs guided walks on the islands.",
    "expect": [
      "No fishing and no collecting — the reefs are protected"
    ],
    "far": "There is no public transport; book an NParks guided walk or a licensed boat."
  },
  "sungei-api-api": {
    "station": "Pasir Ris",
    "codes": [
      "EW1"
    ],
    "lines": [
      "East–West Line"
    ],
    "lrt": false,
    "stationLat": 1.37129,
    "stationLng": 103.949473,
    "walkKm": 1.1,
    "walkMin": 15,
    "entry": "The river runs through Pasir Ris Park past the mangrove boardwalk.",
    "expect": [
      "Fishing is not allowed — a protected mangrove river"
    ]
  },
  "hook-me-up": {
    "station": "Samudera",
    "codes": [
      "PW4"
    ],
    "lines": [
      "Punggol LRT"
    ],
    "lrt": true,
    "stationLat": 1.415889,
    "stationLng": 103.90214,
    "walkKm": 0.5,
    "walkMin": 6,
    "entry": "The pond is inside Marina Country Club at 11 Northshore Drive, at the north tip of Punggol.",
    "expect": [
      "Paid by the hour — rates and rules are set by the operator",
      "Rods and bait can usually be rented on site"
    ]
  },
  "auntie-neo-tiew": {
    "station": "Kranji",
    "codes": [
      "NS7"
    ],
    "lines": [
      "North–South Line"
    ],
    "lrt": false,
    "stationLat": 1.425219,
    "stationLng": 103.761989,
    "walkKm": 5.4,
    "walkMin": 70,
    "entry": "The pond is at 291 Neo Tiew Crescent, among the farms in the north-west.",
    "expect": [
      "Paid entry; pond rules apply",
      "Rural area with few shops — bring water"
    ],
    "far": "There is no MRT nearby; drive, cab, or take a bus to Neo Tiew from Kranji."
  },
  "little-guilin": {
    "station": "Hillview",
    "codes": [
      "DT3"
    ],
    "lines": [
      "Downtown Line"
    ],
    "lrt": false,
    "stationLat": 1.362349,
    "stationLng": 103.767463,
    "walkKm": 0.6,
    "walkMin": 8,
    "entry": "The park is off Bukit Batok East Avenue 5, a short walk from the bus stops on the main road.",
    "expect": [
      "Deep quarry water with steep edges — not for small children near the edge",
      "Very photogenic at sunset, so expect visitors"
    ]
  }
};
