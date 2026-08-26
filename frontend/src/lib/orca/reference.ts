import type { EmergencyService } from "./types";

/**
 * Verified, nationally published emergency contacts.
 * Only numbers published by Government of India services are listed here.
 */
export const EMERGENCY_SERVICES: EmergencyService[] = [
  {
    id: "112",
    name: "National Emergency Response (112)",
    description: "Single emergency number for police, fire and medical help across India.",
    phone: "112",
    source: "Ministry of Home Affairs, ERSS",
  },
  {
    id: "1554",
    name: "Indian Coast Guard (1554)",
    description: "Maritime distress, search and rescue at sea.",
    phone: "1554",
    source: "Indian Coast Guard",
  },
  {
    id: "108",
    name: "Ambulance (108)",
    description: "Emergency medical assistance.",
    phone: "108",
    source: "National Health Mission",
  },
  {
    id: "1077",
    name: "District Disaster Control Room (1077)",
    description: "District-level disaster management control room.",
    phone: "1077",
    source: "National Disaster Management Authority",
  },
  {
    id: "1078",
    name: "NDMA Control Room (1078)",
    description: "National Disaster Management Authority helpline.",
    phone: "1078",
    source: "National Disaster Management Authority",
  },
  {
    id: "1093",
    name: "Coastal Security Helpline (1093)",
    description: "Report suspicious activity or coastal security concerns.",
    phone: "1093",
    source: "Ministry of Home Affairs",
  },
];

export type GlossaryTerm = { short: string; full: string; plain: string };

export const GLOSSARY: GlossaryTerm[] = [
  {
    short: "PFZ",
    full: "Potential Fishing Zone",
    plain: "An area where conditions suggest fish may be more abundant.",
  },
  {
    short: "IMBL",
    full: "International Maritime Boundary Line",
    plain: "An international sea boundary that vessels must not cross.",
  },
  {
    short: "SST",
    full: "Sea Surface Temperature",
    plain: "How warm the top layer of the sea is right now.",
  },
  {
    short: "Significant wave height",
    full: "Significant wave height",
    plain: "The average height of the highest one-third of waves \u2014 bigger waves are possible.",
  },
  {
    short: "Swell",
    full: "Swell",
    plain: "Long waves that travel from distant storms, even when local wind is calm.",
  },
];
