import { render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/orca/i18n";
import CoastMap from "@/components/orca/CoastMap";
import type { MarineSnapshot } from "@/lib/orca/snapshot";

it("does not derive an international border warning from an independent geofence endpoint", async () => {
  const fetch=vi.spyOn(window,"fetch");
  render(<I18nProvider><CoastMap center={{lat:23.4,lon:68.1}} interactive={false}/></I18nProvider>);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  await waitFor(()=>expect(document.querySelector(".leaflet-container")).toBeTruthy());
  expect(fetch).not.toHaveBeenCalled();
});

it("uses only supplied EEZ geometry without relabeling it as an international border", async () => {
  const snapshot={boundary:{availability:"available",geometry:{type:"FeatureCollection",features:[{type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[[[72,18],[73,18],[73,19],[72,18]]]}}]}},pfz:{availability:"unavailable",zones:[]},weather:{},ocean:{},provenance:{fields:{}}} as unknown as MarineSnapshot;
  const {container}=render(<I18nProvider><CoastMap center={{lat:18.9,lon:72.7}} snapshot={snapshot}/></I18nProvider>);
  await waitFor(()=>expect(container.querySelectorAll("path.leaflet-interactive").length).toBeGreaterThan(1));
  expect(screen.queryByText(/CRITICAL IMBL WARNING/)).not.toBeInTheDocument();
});
