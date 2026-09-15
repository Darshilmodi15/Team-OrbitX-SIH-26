import { act, fireEvent, render, screen } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/lib/orca/i18n";
import { TaskGuide } from "@/components/orca/TaskGuide";
import { LocationGate } from "@/components/orca/LocationGate";
import { guideCopy } from "@/lib/orca/guide-copy";
const session = vi.hoisted(() => ({ location: null as any, locationReady: true }));
vi.mock("@/lib/orca/session", () => ({ useSession: () => session }));
function gate() { return render(<I18nProvider><MemoryRouter initialEntries={["/assistant"]}><Routes><Route path="/assistant" element={<LocationGate><p>Assistant loaded</p></LocationGate>}/><Route path="/location" element={<p>Choose a location first</p>}/></Routes></MemoryRouter></I18nProvider>); }
it("blocks direct assistant navigation without a coastal location", () => {
  session.location = null; session.locationReady = true; gate();
  expect(screen.getByText("Choose a location first")).toBeVisible();
  expect(screen.queryByText("Assistant loaded")).toBeNull();
});
it("waits for saved-location restoration and allows valid coastal locations", () => {
  session.locationReady = false; const view = gate();
  expect(screen.queryByText("Assistant loaded")).toBeNull();
  expect(screen.queryByText("Choose a location first")).toBeNull();
  view.unmount(); session.locationReady = true; session.location = {area:"coastal"}; gate();
  expect(screen.getByText("Assistant loaded")).toBeVisible();
});
it("dismisses, restores and replays the five-step guide without blocking navigation", () => {
  const view = render(<I18nProvider><MemoryRouter><TaskGuide/></MemoryRouter></I18nProvider>);
  fireEvent.click(screen.getByRole("button", {name:"Next"}));
  expect(screen.getByText(/Get started · 2\/5/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", {name:"Dismiss guide"}));
  expect(screen.queryByText(guideCopy.en.steps[1])).toBeNull();
  view.unmount(); render(<I18nProvider><MemoryRouter><TaskGuide/></MemoryRouter></I18nProvider>);
  fireEvent.click(screen.getByRole("button", {name:"Show guide"}));
  expect(screen.getByText(guideCopy.en.steps[0])).toBeVisible();
  for (let i=0;i<4;i++) fireEvent.click(screen.getByRole("button", {name:"Next"}));
  expect(screen.getByRole("link", {name:"Open this step"})).toHaveAttribute("href", "/assistant");
  fireEvent.click(screen.getByRole("button", {name:"Finish guide"}));
  expect(screen.getByRole("button", {name:"Show guide"})).toBeVisible();
});
it("provides five explicit steps and a home-pin warning in all eleven languages", () => {
  expect(Object.keys(guideCopy)).toHaveLength(11);
  for (const copy of Object.values(guideCopy)) { expect(copy.steps).toHaveLength(5); expect(copy.steps.every(Boolean)).toBe(true); expect(copy.pin.length).toBeGreaterThan(40); }
});
