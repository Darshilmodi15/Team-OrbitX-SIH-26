import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
import { auditTranslations } from '@/lib/orca/audit-translations';
const mocks = vi.hoisted(() => ({ role: 'government' }));
vi.mock('react-router-dom', () => ({ Link: ({ children, to }: any) => <a href={to}>{children}</a> }));
vi.mock('@/components/orca/AppShell', () => ({ AppShell: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
vi.mock('@/lib/orca/session', () => ({ useSession: () => ({ user:{id:'u1',role:mocks.role,operationalRegion:'Gujarat'},location:null }) }));
vi.mock('@/services/api', () => ({ fetchActiveSos: vi.fn().mockResolvedValue([]), fetchAdminUsers: vi.fn().mockResolvedValue([]), fetchSystemHealth: vi.fn().mockResolvedValue({overall_status:'DEGRADED',services:[]}) }));
import OperationsPage from '@/pages/OperationsPage';
for (const lang of ['en','hi','gu','mr','ta','te','ml','bn','kn','or','pa'] as const) {
  it(`renders officer and admin page translations in ${lang}`, async () => {
    localStorage.setItem('orca.lang',lang);
    mocks.role = 'government';
    const view = render(<I18nProvider><OperationsPage /></I18nProvider>);
    expect(screen.getByRole('heading',{level:1})).toHaveTextContent(auditTranslations['ops.overview'][lang]);
    expect(await screen.findByText(auditTranslations['ops.noSos'][lang])).toBeInTheDocument();
    expect(screen.getByText('Gujarat')).toBeInTheDocument();
    view.unmount(); mocks.role = 'admin';
    render(<I18nProvider><OperationsPage /></I18nProvider>);
    expect(screen.getByRole('heading',{level:1})).toHaveTextContent(auditTranslations['ops.system'][lang]);
    expect(await screen.findByRole('heading',{name:auditTranslations['ops.health'][lang]})).toBeInTheDocument();
    expect(screen.queryByText('Gujarat')).not.toBeInTheDocument();
  });
}
