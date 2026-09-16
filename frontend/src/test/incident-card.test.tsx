import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
import { IncidentCard } from '@/components/orca/IncidentCard';

it('shows the incident location and description separately from the west-coast contact',()=>{
 render(<I18nProvider><IncidentCard incident={{sos_id:'veraval-test',status:'RECEIVED',assigned_mrcc:'MRCC Mumbai',recorded_telemetry:{lat:20.9,lon:70.37,location_name:'Veraval',location_source:'selected',notes:'Engine stopped; drifting'}}}/></I18nProvider>);
 expect(screen.getByText('Veraval')).toBeVisible();expect(screen.getByText('20.9, 70.37')).toBeVisible();
 expect(screen.getByText('Engine stopped; drifting')).toBeVisible();
 expect(screen.getByText('Suggested rescue contact: MRCC Mumbai')).toBeVisible();
 expect(screen.getByText(/No electronic dispatch/)).toBeVisible();
});
it('does not invent a place name or description for old records',()=>{
 render(<I18nProvider><IncidentCard incident={{sos_id:'old',status:'RECEIVED',assigned_mrcc:'MRCC Mumbai',recorded_telemetry:{lat:20.9,lon:70.37}}}/></I18nProvider>);
 expect(screen.getByText('No description provided')).toBeVisible();expect(screen.getByText('Location source not recorded')).toBeVisible();
});
