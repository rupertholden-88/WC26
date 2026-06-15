// Full WC2026 UK broadcaster schedule
// Source: sportsmole.co.uk (updated 08 Jun 2026)
// Format: "Home vs Away" (normalised) -> "ITV" | "BBC"

export type Channel = "ITV" | "BBC";

const SCHEDULE: Record<string, Channel> = {
  // Group Stage
  "mexico vs south africa": "ITV",
  "south korea vs czech republic": "ITV",
  "canada vs bosnia-herzegovina": "BBC",
  "usa vs paraguay": "BBC",
  "qatar vs switzerland": "ITV",
  "brazil vs morocco": "BBC",
  "haiti vs scotland": "BBC",
  "australia vs turkey": "ITV",
  "germany vs curacao": "ITV",
  "netherlands vs japan": "ITV",
  "ivory coast vs ecuador": "BBC",
  "sweden vs tunisia": "ITV",
  "spain vs cape verde": "ITV",
  "belgium vs egypt": "BBC",
  "saudi arabia vs uruguay": "ITV",
  "iran vs new zealand": "BBC",
  "france vs senegal": "BBC",
  "iraq vs norway": "BBC",
  "argentina vs algeria": "ITV",
  "austria vs jordan": "BBC",
  "portugal vs dr congo": "BBC",
  "england vs croatia": "ITV",
  "ghana vs panama": "ITV",
  "uzbekistan vs colombia": "BBC",
  "czech republic vs south africa": "BBC",
  "switzerland vs bosnia-herzegovina": "ITV",
  "canada vs qatar": "ITV",
  "mexico vs south korea": "BBC",
  "usa vs australia": "BBC",
  "scotland vs morocco": "ITV",
  "brazil vs haiti": "ITV",
  "turkey vs paraguay": "ITV",
  "netherlands vs sweden": "BBC",
  "germany vs ivory coast": "ITV",
  "ecuador vs curacao": "BBC",
  "tunisia vs japan": "BBC",
  "spain vs saudi arabia": "BBC",
  "belgium vs iran": "ITV",
  "uruguay vs cape verde": "BBC",
  "new zealand vs egypt": "ITV",
  "argentina vs austria": "BBC",
  "france vs iraq": "BBC",
  "norway vs senegal": "ITV",
  "jordan vs algeria": "ITV",
  "portugal vs uzbekistan": "ITV",
  "england vs ghana": "BBC",
  "panama vs croatia": "BBC",
  "colombia vs dr congo": "ITV",
  "bosnia-herzegovina vs qatar": "ITV",
  "switzerland vs canada": "ITV",
  "morocco vs haiti": "BBC",
  "scotland vs brazil": "BBC",
  "south africa vs czech republic": "ITV",
  "south korea vs mexico": "BBC",
  "turkey vs usa": "ITV",
  "australia vs paraguay": "BBC",
  "curacao vs ivory coast": "BBC",
  "ecuador vs germany": "ITV",
  "japan vs sweden": "ITV",
  "tunisia vs netherlands": "BBC",
  "cape verde vs saudi arabia": "ITV",
  "uruguay vs spain": "BBC",
  "egypt vs iran": "BBC",
  "new zealand vs belgium": "ITV",
  "senegal vs iraq": "BBC",
  "norway vs france": "BBC",
  "algeria vs austria": "ITV",
  "jordan vs argentina": "ITV",
  "dr congo vs uzbekistan": "BBC",
  "colombia vs portugal": "BBC",
  "croatia vs ghana": "ITV",
  "panama vs england": "ITV",
};

export function getBroadcaster(home: string, away: string): Channel {
  const key = `${normalise(home)} vs ${normalise(away)}`;
  const revKey = `${normalise(away)} vs ${normalise(home)}`;
  return SCHEDULE[key] ?? SCHEDULE[revKey] ?? "BBC";
}

function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/curaçao/g, "curacao")
    .replace(/türkiye/g, "turkey")
    .replace(/côte d['']ivoire/gi, "ivory coast")
    .replace(/czechia/gi, "czech republic")
    .trim();
}
