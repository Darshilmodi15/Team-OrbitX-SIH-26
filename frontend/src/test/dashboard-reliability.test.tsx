import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
const mocks = vi.hoisted(() => ({ current: {time:'2020-01-01T00:00:00Z',fetchedAt:Date.now(),waveHeightM:1,windSpeedKmh:10,visibilityKm:null,sources:['fixture']} as any }));
vi.mock('react-router-dom', () => ({ Link: ({children,to}:any)=><a href={to}>{children}</a> }));
vi.mock('@/components/orca/AppShell', () => ({ AppShell: ({children}:any)=><>{children}</> }));
vi.mock('@/components/orca/MapPanel', () => ({ MapPanel: ()=>null }));
vi.mock('@/components/SEO', () => ({ SEO: ()=>null }));
vi.mock('@/lib/orca/session', () => ({ useSession:()=>({location:{coords:{lat:20.9,lon:70.3}}}) }));
vi.mock('@/lib/orca/use-marine', () => ({useMarine:()=>({data:{current:mocks.current,forecast:[],tide:null},isError:false,isPending:false})}));
import DashboardPage from '@/pages/DashboardPage';
it('stale measured weather cannot imply safe departure or invented future weather', () => {
  render(<I18nProvider><DashboardPage /></I18nProvider>);
  expect(screen.queryByText('Safe to go')).not.toBeInTheDocument();
  expect(screen.getByText(/Current safety status.*Unavailable/i)).toBeInTheDocument();
  expect(screen.getByText(/Next hours.*Unavailable/)).toBeInTheDocument();
});
