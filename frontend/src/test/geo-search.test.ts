import { expect, it, vi } from 'vitest';
import { searchIndianPlaces } from '@/lib/orca/geo';
it('keeps verified Indian coastal search results outside the coarse outline', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>({results:[{name:'Veraval',country_code:'IN',latitude:20.9077,longitude:70.3679},{name:'Foreign place',country_code:'PK',latitude:24.8,longitude:67}]})}));
  const results = await searchIndianPlaces('Veraval');
  expect(results).toEqual([{name:'Veraval',admin:'',coords:{lat:20.9077,lon:70.3679}}]);
  vi.unstubAllGlobals();
});
