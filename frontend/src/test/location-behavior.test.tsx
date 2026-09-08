import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
const mocks = vi.hoisted(() => ({ setLocation: vi.fn(), navigate: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/components/orca/AppShell', () => ({ AppShell: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
vi.mock('@/components/orca/MapPanel', () => ({ MapPanel: ({ onSelect }: any) => <button onClick={() => onSelect({ lat: 20.9, lon: 70.3 })}>Select coastal test point</button> }));
vi.mock('@/lib/orca/session', () => ({ useSession: () => ({ location: null, setLocation: mocks.setLocation }) }));
vi.mock('@/services/api', () => ({ saveSelectedLocation: vi.fn() }));
vi.mock('@/lib/orca/geo', () => ({ classifyLocation: (c: any) => ({ area: c.lat > 25 ? 'inland' : 'coastal', distanceToCoastKm: 1 }), reverseLabel: vi.fn().mockResolvedValue(null), formatCoords: (c: any) => `${c.lat}, ${c.lon}`, nearestCoastPoint: () => ({lat:20.9,lon:70.3}), searchIndianPlaces: vi.fn().mockResolvedValue([]) }));
import { saveSelectedLocation } from '@/services/api';
import LocationPage from '@/pages/LocationPage';
const mount = () => render(<I18nProvider><LocationPage /></I18nProvider>);
const gps = (handler: any) => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: handler } });
beforeEach(() => { vi.mocked(saveSelectedLocation).mockResolvedValue({ is_coastal_supported: true }); });
it('does not treat the map center as a selected user location', () => {
  mount(); expect(screen.queryByRole('button', {name:'Confirm this location'})).not.toBeInTheDocument();
  expect(mocks.setLocation).not.toHaveBeenCalled();
});
it('permission denial allows explicit manual selection and persists before navigation', async () => {
  gps((_success: any, failure: any) => failure({code:1})); mount();
  fireEvent.click(screen.getByRole('button',{name:'Allow GPS location'}));
  expect(screen.getByText(/Location permission was denied/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Select coastal test point'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm this location'}));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/dashboard'));
  expect(saveSelectedLocation).toHaveBeenCalledWith(20.9,70.3,undefined);
  expect(mocks.setLocation).toHaveBeenCalledWith(expect.objectContaining({source:'manual'}));
});
it('GPS success uses measured coordinates and accuracy', async () => {
  gps((success: any) => success({coords:{latitude:20.9,longitude:70.3,accuracy:15}})); mount();
  fireEvent.click(screen.getByRole('button',{name:'Allow GPS location'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm this location'}));
  await waitFor(() => expect(saveSelectedLocation).toHaveBeenCalledWith(20.9,70.3,15));
  expect(mocks.setLocation).toHaveBeenCalledWith(expect.objectContaining({source:'gps'}));
});
it('unsupported inland GPS location cannot be confirmed', () => {
  gps((success: any) => success({coords:{latitude:28.6,longitude:77.2,accuracy:10}})); mount();
  fireEvent.click(screen.getByRole('button',{name:'Allow GPS location'}));
  expect(screen.getByRole('button',{name:'Confirm this location'})).toBeDisabled();
  expect(saveSelectedLocation).not.toHaveBeenCalled();
});
it('storage failure leaves the selected point available without false persistence', async () => {
  vi.mocked(saveSelectedLocation).mockRejectedValue(new Error('unavailable')); mount();
  fireEvent.click(screen.getByRole('button',{name:'Select coastal test point'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm this location'}));
  await waitFor(() => expect(screen.getByRole('button',{name:'Confirm this location'})).toBeEnabled());
  expect(mocks.setLocation).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
});
