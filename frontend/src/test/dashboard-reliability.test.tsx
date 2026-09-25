vi.mock("@/components/orca/DemoControls", () => ({ DemoControls: () => null }));
vi.mock("@/components/orca/TripPack", () => ({ TripPack: () => <div>Offline pack controls</div> }));
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
const mocks = vi.hoisted(() => ({ isError: false, conditions: vi.fn(), current: {time:'2020-01-01T00:00:00Z',fetchedAt:Date.now(),waveHeightM:1,windSpeedKmh:10,visibilityKm:null,sources:['fixture']} as any }));
vi.mock('react-router-dom', () => ({ Link: ({children,to}:any)=><a href={to}>{children}</a>, useLocation:()=>({pathname:'/dashboard'}) }));
vi.mock('@/components/orca/AppShell', () => ({ AppShell: ({children}:any)=><>{children}</> }));
vi.mock('@/components/orca/MapPanel', () => ({ MapPanel: ()=>null }));
vi.mock('@/components/SEO', () => ({ SEO: ()=>null }));
vi.mock('@/lib/orca/session', () => ({ useSession:()=>({location:{coords:{lat:20.9,lon:70.3}}}) }));
vi.mock('@/lib/orca/use-marine', () => ({useMarine:()=>({data:{current:mocks.current,forecast:[],tide:null},isError:mocks.isError,isPending:false})}));
vi.mock('@/components/orca/Conditions', () => ({ MarineConditions: ({data}: any) => { mocks.conditions(data); return null; }, ForecastTimeline: () => null }));
import DashboardPage from '@/pages/DashboardPage';
it('stale measured weather cannot imply safe departure or invented future weather', () => {
  render(<I18nProvider><DashboardPage /></I18nProvider>);
  expect(screen.queryByText('Safe to go')).not.toBeInTheDocument();
  expect(screen.getByText(/Insufficient live data/i)).toBeInTheDocument();
  expect(screen.queryByText(/Next hours/)).not.toBeInTheDocument();
});

it('an API failure cannot produce a safe verdict', () => {
  mocks.isError = true;
  render(<I18nProvider><DashboardPage /></I18nProvider>);
  expect(screen.queryByText('Safe to go')).not.toBeInTheDocument();
  expect(screen.getByText(/Marine data is temporarily unavailable/i)).toBeInTheDocument();
  mocks.isError = false;
});
it('passes missing measurements through without invented sensor values', () => {
  mocks.current = {...mocks.current, seaTemperatureC: null, visibilityKm: null, wavePeriodS: null, weatherCode: null};
  render(<I18nProvider><DashboardPage /></I18nProvider>);
  expect(mocks.conditions).toHaveBeenLastCalledWith(expect.objectContaining({seaTemperatureC:null, visibilityKm:null, wavePeriodS:null, weatherCode:null}));
});
