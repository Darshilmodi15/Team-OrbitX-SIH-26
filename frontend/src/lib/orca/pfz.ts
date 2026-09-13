/** Only timestamped provider data may be plotted as a current advisory. */
export type PFZPoint = { id: string; name: string; lat: number; lon: number };
export type PFZAdvisory = {
  status: "current" | "expired" | "unavailable";
  source: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  sector?: string | null;
  sectorName?: string | null;
  issuingAuthority?: string | null;
  coverageStatus?: "active" | "no_advisory_issued" | "coverage_gap" | "expired" | "unconfigured";
  landingCentres?: string[];
  points: PFZPoint[];
};

function timestamp(value: unknown): string | null {
  // Require a timezone: a date alone does not establish an expiry instant.
  return typeof value === "string" && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
}

export function normalizePFZ(value: unknown, now = Date.now()): PFZAdvisory {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const source = typeof raw.source === "string" && raw.source.trim() && !["unavailable", "mock", "demo"].includes(raw.source.trim().toLowerCase()) ? raw.source.trim() : null;
  const issuedAt = timestamp(raw.issued_at);
  const validUntil = timestamp(raw.valid_until);
  const sector = typeof raw.sector === "string" ? raw.sector : null;
  const sectorName = typeof raw.sector_name === "string" ? raw.sector_name : null;
  const issuingAuthority = typeof raw.issuing_authority === "string" ? raw.issuing_authority : "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India";
  const rawCoverage = typeof raw.coverage_status === "string" ? raw.coverage_status : undefined;
  const landingCentres = Array.isArray(raw.landing_centres) ? raw.landing_centres.map(String) : [];

  const base = {
    source,
    issuedAt,
    validUntil,
    sector,
    sectorName,
    issuingAuthority,
    landingCentres,
    points: [] as PFZPoint[],
  };

  if (!source || !issuedAt || !validUntil || !["live", "fresh", "cached"].includes(String(raw.data_mode)) || raw.is_demonstration === true || Date.parse(issuedAt) > now || Date.parse(validUntil) <= Date.parse(issuedAt)) {
    return {
      ...base,
      status: "unavailable",
      coverageStatus: (rawCoverage as any) || (sector ? "coverage_gap" : "unconfigured"),
    };
  }
  if (Date.parse(validUntil) <= now) {
    return {
      ...base,
      status: "expired",
      coverageStatus: "expired",
    };
  }
  const points = (Array.isArray(raw.pfz_zones) ? raw.pfz_zones : []).flatMap((zone: unknown, index) => {
    if (!zone || typeof zone !== "object") return [];
    const z = zone as Record<string, unknown>;
    const lat = z.latitude;
    const lon = z.longitude;
    if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || z.is_demonstration === true) return [];
    return [{ id: String(z.id ?? index), name: typeof z.landing_centre === "string" ? z.landing_centre : "PFZ", lat, lon }];
  });
  return {
    ...base,
    status: "current",
    coverageStatus: points.length > 0 ? "active" : "no_advisory_issued",
    points,
  };
}
