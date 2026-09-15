import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { it, expect, vi, afterEach } from "vitest";
import { TripPack } from "@/components/orca/TripPack";
import { I18nProvider } from "@/lib/orca/i18n";
import type { MarineBundle, LocationInfo } from "@/lib/orca/types";
const mocks = vi.hoisted(() => ({ prepare: vi.fn() }));
vi.mock("@/lib/orca/use-pfz", () => ({ usePFZ: () => ({ isPending: false, advisory: { status: "unavailable", points: [] } }) }));
vi.mock("@/lib/orca/offline/trip-pack", () => ({ prepareTripPack: mocks.prepare }));
afterEach(() => vi.restoreAllMocks());
const location = { coords: { lat: 18.9, lon: 72.6 }, label: "Public reference" } as LocationInfo;
const bundle = {} as MarineBundle;
it("shows preparation failure without claiming storage or delivery", async () => {
 mocks.prepare.mockImplementation(()=>{throw new Error('unavailable')});
 render(<I18nProvider><TripPack location={location} bundle={bundle}/></I18nProvider>);
 fireEvent.click(screen.getByRole("button", {name:/Download readable/}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Could not prepare'));
});
it("downloads plain text without requiring a password or file upload", async () => {
 mocks.prepare.mockReturnValue({savedAt:Date.now(),expiresAt:Date.now()+10000,location:{label:'test',lat:18.9,lon:72.6},readings:[],pfz:{status:'unavailable',points:[]}});
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){expect(this.download).toMatch(/\.txt$/)});
 Object.defineProperty(URL,'createObjectURL',{value:vi.fn(()=> 'blob:test'),configurable:true});
 render(<I18nProvider><TripPack location={location} bundle={bundle}/></I18nProvider>);
 expect(screen.queryByLabelText(/password/)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Download readable/}));
 await waitFor(()=>expect(click).toHaveBeenCalledOnce());
 expect(screen.getByRole('status')).toHaveTextContent('Download requested');
});
