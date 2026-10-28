// Comparison pages: TM Stats against the golf stats trackers people search for.
// Competitor prices were checked on 28 October 2026 and will drift. Keep the
// wording hedged ("around", "at the time of writing") and revisit twice a year.

export interface Competitor {
  slug: string
  name: string
  tagline: string
  pricesChecked: string
  summary: string
  howItTracks: string
  whatItCosts: string
  strokesGained: string
  bestFor: string
  pros: string[]
  cons: string[]
  verdict: string
}

export const TM_STATS = {
  howItTracks:
    'You enter each shot on your phone as you play: distance left and the lie. No sensors, no watch, no tags. A hole takes about a minute to log, and you can do it walking to the next tee.',
  whatItCosts:
    'Free for your first five rounds, with full stats and one round of Strokes Gained. Pro is £4.99 a month or £50 a year for unlimited rounds, Strokes Gained on every round, AI coaching and the mental game coach.',
  strokesGained:
    'Strokes Gained is the whole point of TM Stats. Every shot is compared with what a golfer at your handicap would expect from that distance and lie, split into off the tee, approach, around the green and putting.',
}

export const COMPETITORS: Competitor[] = [
  {
    slug: 'arccos',
    name: 'Arccos Caddie',
    tagline: 'Automatic tracking with sensors in your grips, on a yearly membership',
    pricesChecked: '28 October 2026',
    summary:
      'Arccos is the best known shot tracker in golf and for good reason. Screw a sensor into every grip, keep your phone in your pocket, and it records where each shot was hit from. The data is excellent. The cost and the faff are the trade-off.',
    howItTracks:
      'A sensor in each grip talks to your phone, which has to be in your front pocket all round. Putts are detected by a putter sensor. Most rounds need a quick tidy up afterwards to fix missed shots, penalty drops and the odd putt it did not hear.',
    whatItCosts:
      'A sensor pack is around £225 in the UK (about $250 in the US) and usually includes the first year of membership. After that a membership renews yearly, which at the time of writing is in the region of £130 to £150 depending on where you buy. Without a membership you cannot record new rounds.',
    strokesGained:
      'Yes, and it is good. Arccos has a huge data set and shows Strokes Gained by category with tour and handicap comparisons.',
    bestFor:
      'Golfers who want hands-off tracking, play a lot, and do not mind the yearly fee or the phone in the pocket.',
    pros: [
      'Tracking is automatic once it is set up',
      'Very large data set behind the benchmarks',
      'GPS rangefinder and club distances built in',
    ],
    cons: [
      'Around £225 up front for the sensors',
      'A yearly membership after the first year, or your tracking stops',
      'Phone must stay in your front pocket, and rounds often need editing afterwards',
      'Sensors add a little weight to the grip end, which some golfers notice',
    ],
    verdict:
      'If you want the data without any input during the round and the price does not bother you, Arccos is the one to beat. If you would rather spend a minute a hole than a couple of hundred pounds plus a yearly fee, TM Stats gives you the same Strokes Gained breakdown with nothing to buy.',
  },
  {
    slug: 'shot-scope',
    name: 'Shot Scope',
    tagline: 'A GPS watch that tracks shots, with no subscription',
    pricesChecked: '28 October 2026',
    summary:
      'Shot Scope is a Scottish company that sells GPS watches and handhelds with shot tracking built in. The V5 watch is the one most people buy. The big selling point is that the app and the stats are free for life once you own the device.',
    howItTracks:
      'The watch detects your swing and logs the position. Tags in the grips tell it which club you used. Putts are added on the green. Like any automatic system, you will spend a few minutes after the round correcting it.',
    whatItCosts:
      'The V5 watch is listed at £199.99 to £239.99 on Shot Scope\'s own UK site at the time of writing, depending on offers. The X5 is a bit more. There is no subscription: the app, dashboard and Strokes Gained are included.',
    strokesGained:
      'Yes. Shot Scope shows Strokes Gained and benchmarks against handicap bands in its app and web dashboard, free with the device.',
    bestFor:
      'Golfers who want a GPS watch anyway and would like tracking thrown in without an ongoing fee.',
    pros: [
      'No subscription, ever',
      'Distances on your wrist during the round',
      'Strokes Gained and handicap benchmarking included',
    ],
    cons: [
      'About £200 to £240 up front',
      'You have to wear the watch and tag your clubs',
      'Still needs post-round editing to be accurate',
      'No coaching layer, you interpret the numbers yourself',
    ],
    verdict:
      'Shot Scope is the best value of the hardware options and I would recommend it over Arccos for most club golfers who want a watch. If you do not want a device at all, TM Stats gets you to the same Strokes Gained numbers from your phone for £4.99 a month, and adds coaching on top.',
  },
  {
    slug: '18birdies',
    name: '18Birdies',
    tagline: 'A free GPS and scorecard app with a paid Premium tier',
    pricesChecked: '28 October 2026',
    summary:
      '18Birdies is one of the most downloaded golf apps in the world. It started as a free GPS and scorecard and has grown into a social app with games, leagues and a Premium tier. It is very good at what most golfers use it for, which is distances and keeping score with mates.',
    howItTracks:
      'You keep score on your phone and can add fairways, greens and putts per hole. There is no automatic shot detection. Premium adds more detailed stats and an AI coach.',
    whatItCosts:
      'The basic app is free. Premium is priced in US dollars at about $99.99 a year or $19.99 a month at the time of writing, with UK pricing set by the app stores. Some features move between the free and paid tiers from time to time, so check the app itself.',
    strokesGained:
      'A simplified Strokes Gained figure exists and 18Birdies has at times made it free to all users. It is based on the basic stats you tap in rather than every shot, so it is less precise than a shot by shot system.',
    bestFor:
      'Golfers who mainly want GPS distances, a scorecard and the social side, with stats as a bonus.',
    pros: [
      'Free tier is genuinely useful',
      'GPS, scorecard, games and leagues in one app',
      'Huge user base, so your mates are probably on it',
    ],
    cons: [
      'Strokes Gained is approximate because it works from summary stats, not shots',
      'Premium costs more per year than TM Stats Pro',
      'Built for socialising and GPS first, improvement second',
    ],
    verdict:
      '18Birdies is a great app for playing golf. TM Stats is built for getting better at it. If you want to know, to the shot, where your 84 came from and what to practise on Tuesday night, that is what TM Stats does and 18Birdies does not.',
  },
]

export function findCompetitor(slug: string): Competitor | undefined {
  return COMPETITORS.find(c => c.slug === slug)
}
