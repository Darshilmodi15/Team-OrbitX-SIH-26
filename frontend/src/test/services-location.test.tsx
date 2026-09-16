import { fireEvent,render,screen } from '@testing-library/react';
import { expect,it,vi } from 'vitest';
import { I18nProvider } from '@/lib/orca/i18n';
import ServicesPage from '@/pages/ServicesPage';
vi.mock('@/components/orca/AppShell',()=>({AppShell:({children}:any)=><>{children}</>}));
vi.mock('@/components/SEO',()=>({SEO:()=>null}));
vi.mock('@/lib/orca/session',()=>({useSession:()=>({location:{coords:{lat:20.9,lon:70.37},label:'Veraval'}})}));
vi.mock('@/services/api',()=>({broadcastSOS:vi.fn().mockResolvedValue({sos_id:'test',status:'RECEIVED'}),updateSOSDetails:vi.fn()}));
import {broadcastSOS} from '@/services/api';
it('uses the confirmed selection rather than silently replacing Veraval with device GPS',async()=>{
 const gps=vi.fn();Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:gps}});
 render(<I18nProvider><ServicesPage/></I18nProvider>);
 // Find by its actual service label, avoiding a test-only entry point.
 fireEvent.click(screen.getByRole('button',{name:/SOS/}));
 expect(await screen.findByRole('dialog')).toHaveTextContent('Veraval');expect(gps).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Send SOS request'}));
 expect(broadcastSOS).toHaveBeenCalledWith(expect.objectContaining({lat:20.9,lon:70.37,location_name:'Veraval',location_source:'selected'}));
});
