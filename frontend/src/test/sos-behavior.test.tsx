import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
vi.mock('@/services/api', () => ({ broadcastSOS: vi.fn() }));
import { broadcastSOS } from '@/services/api';
import EmergencySOSModal from '@/components/EmergencySOSModal';
it('shows request failure without rescue success and allows retry', async () => {
  vi.mocked(broadcastSOS).mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce({status:'RECEIVED',sos_id:'qa-sos',mayday_message:'User supplied details'});
  render(<I18nProvider><EmergencySOSModal isOpen onClose={()=>{}} userLocation={{lat:20.9,lon:70.3}} /></I18nProvider>);
  fireEvent.change(screen.getByRole('spinbutton'),{target:{value:'1'}});
  fireEvent.click(screen.getByRole('button',{name:'Send SOS request'}));
  fireEvent.click(screen.getByRole('button',{name:'Send SOS request'}));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByText('Request recorded in ORCA')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Send SOS request'}));
  expect(await screen.findByText('Request recorded in ORCA')).toBeInTheDocument();
  expect(broadcastSOS).toHaveBeenCalledWith(expect.objectContaining({crew_count:1,emergency_nature:'General Maritime Distress'}));
});
