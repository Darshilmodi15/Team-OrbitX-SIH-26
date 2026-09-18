import {fireEvent,render as testingRender,screen} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
function render(ui:React.ReactNode){return testingRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);}
import {expect,it,vi} from 'vitest';
import {I18nProvider} from '@/lib/orca/i18n';
import {ChatSnapshot} from '@/components/orca/ChatSnapshot';
vi.mock('@/lib/orca/snapshot',async(original)=>({...await original<any>(),useMarineSnapshot:()=>({offline:false,activate:vi.fn()})}));
vi.mock('@/components/orca/CoastMap',()=>({default:()=> <div>Verified map layer test</div>}));
it('has exactly one snapshot disclosure even after expanding the map',async()=>{
 const snapshot:any={snapshot_id:'one-snapshot',location:{lat:20.9,lon:70.37},request:{requested_time:'2026-09-16T06:00:00Z'},risk:{level:'unknown',reasons:[]},expires_at:'2026-09-16T06:05:00Z',provenance:{cache_status:'cached',fields:{},retrieved_at:'2026-09-16T06:00:00Z'},pfz:{availability:'unavailable',zones:[]},boundary:{availability:'unavailable'},weather:{},ocean:{}};
 const {container}=render(<I18nProvider><ChatSnapshot snapshot={snapshot}/></I18nProvider>);
 expect(container.querySelectorAll('details[data-snapshot-id]')).toHaveLength(1);
 expect(screen.queryByText('Verified map layer test')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{expanded:false}));
 expect(await screen.findByText('Verified map layer test')).toBeVisible();
 expect(container.querySelectorAll('details[data-snapshot-id]')).toHaveLength(1);
});
