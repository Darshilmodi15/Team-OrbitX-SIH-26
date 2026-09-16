import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
vi.mock('@/services/api', () => ({ broadcastSOS: vi.fn(), updateSOSDetails: vi.fn() }));
import { broadcastSOS, updateSOSDetails } from '@/services/api';
import EmergencySOSModal from '@/components/EmergencySOSModal';
it('records first without vessel details, retries failure and updates the same request', async () => {
 vi.mocked(broadcastSOS).mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce({status:'RECEIVED',sos_id:'qa-sos'});
 vi.mocked(updateSOSDetails).mockResolvedValue({sos_id:'qa-sos'});
 render(<I18nProvider><EmergencySOSModal isOpen onClose={()=>{}} userLocation={{lat:18.7,lon:73.6}} /></I18nProvider>);
 expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Send SOS request'}));
 expect(await screen.findByRole('alert')).toBeInTheDocument();
 expect(screen.getByRole('textbox')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Send SOS request'}));
 expect(await screen.findByRole('textbox')).toBeInTheDocument();
 expect(broadcastSOS).toHaveBeenLastCalledWith({lat:18.7,lon:73.6,emergency_nature:'General Emergency',notes:'',location_source:'unspecified',location_name:undefined});
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Floodwater entering home'}});
 fireEvent.click(screen.getByRole('button',{name:'Save details'}));
 expect(updateSOSDetails).toHaveBeenCalledWith('qa-sos','Floodwater entering home');
});

it('includes Veraval and the initial description before the officer first sees the alert',async()=>{
 vi.mocked(broadcastSOS).mockResolvedValue({status:'RECEIVED',sos_id:'veraval-sos'});
 render(<I18nProvider><EmergencySOSModal isOpen onClose={()=>{}} userLocation={{lat:20.9,lon:70.37}} locationName="Veraval" locationSource="selected"/></I18nProvider>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Engine stopped; drifting'}});
 fireEvent.click(screen.getByRole('button',{name:'Send SOS request'}));
 expect(await screen.findByText(/veraval-sos/)).toBeInTheDocument();
 expect(broadcastSOS).toHaveBeenLastCalledWith(expect.objectContaining({lat:20.9,lon:70.37,location_name:'Veraval',location_source:'selected',notes:'Engine stopped; drifting'}));
});
