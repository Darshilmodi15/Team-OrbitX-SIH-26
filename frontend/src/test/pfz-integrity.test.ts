import { describe, expect, it } from "vitest";
import { normalizePFZ } from "@/lib/orca/pfz";

const now = Date.parse("2026-09-13T06:00:00Z");
const feed = { source: "test-provider", data_mode: "live", issued_at: "2026-09-13T00:00:00Z", valid_until: "2026-09-14T00:00:00Z", pfz_zones: [{ latitude: 19, longitude: 72, landing_centre: "Test harbour" }, { latitude: 18, longitude: 71 }] };
describe("PFZ validity boundary", () => {
  it("retains all valid points and original dates", () => {
    const result = normalizePFZ(feed, now);
    expect(result.status).toBe("current");
    expect(result.points).toHaveLength(2);
    expect(result.issuedAt).toBe(feed.issued_at);
  });
  it.each([undefined, null, {}, { ...feed, data_mode: "mock" }, { ...feed, is_demonstration: true }, { ...feed, source: "unavailable" }, { ...feed, issued_at: null }, { ...feed, valid_until: "2026-09-14" }, { ...feed, issued_at: "2026-09-14T00:00:00Z" }, { ...feed, valid_until: feed.issued_at }])("withholds unverifiable data %j", input => {
    expect(normalizePFZ(input, now)).toMatchObject({ status: "unavailable", points: [] });
  });
  it("expires cached data at the exact expiry instant", () => {
    expect(normalizePFZ({ ...feed, data_mode: "cached" }, Date.parse(feed.valid_until))).toMatchObject({ status: "expired", points: [] });
  });
  it("rejects malformed and demonstration coordinates without rejecting valid points", () => {
    expect(normalizePFZ({ ...feed, pfz_zones: [...feed.pfz_zones, null, { latitude: null, longitude: "" }, { latitude: 91, longitude: 72 }, { latitude: 19, longitude: Infinity }, { latitude: 19, longitude: 72, is_demonstration: true }] }, now).points).toHaveLength(2);
  });
});


describe("PFZ reviewed provider failures", () => {
  it("recognizes backend stale advisories as expired", () => {
    expect(normalizePFZ({ ...feed, data_mode: "stale" }, Date.parse(feed.valid_until))).toMatchObject({ status: "expired", points: [] });
  });
  it("does not infer no issuance from empty or invalid points", () => {
    for (const pfz_zones of [[], [{ latitude: true, longitude: 72 }]]) {
      expect(normalizePFZ({ ...feed, pfz_zones }, now)).toMatchObject({ status: "unavailable", coverageStatus: "coverage_gap" });
    }
  });
  it("does not assign INCOIS authority to an unknown provider", () => {
    expect(normalizePFZ(feed, now).issuingAuthority).toBeNull();
  });
  it("rejects top-level and individual mock flags", () => {
    expect(normalizePFZ({ ...feed, is_mock: true }, now).points).toEqual([]);
    expect(normalizePFZ({ ...feed, pfz_zones: [{ ...feed.pfz_zones[0], is_mock: true }] }, now).points).toEqual([]);
  });
});
