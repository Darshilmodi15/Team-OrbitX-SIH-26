import {expect,it} from "vitest";
import {classifyConnectivity} from "@/lib/orca/connectivity";
import {bearing,marineMapData} from "@/lib/orca/map-data";
import type {MarineSnapshot} from "@/lib/orca/snapshot";
it("uses failures, latency and save-data as well as browser connectivity",()=>{
 expect(classifyConnectivity(false,[])).toBe("OFFLINE");
 expect(classifyConnectivity(true,[])).toBe("GOOD");
 expect(classifyConnectivity(true,[],{saveData:true})).toBe("DEGRADED");
 expect(classifyConnectivity(true,[{latency:2,failed:true},{latency:2,failed:true}])).toBe("DEGRADED");
 expect(classifyConnectivity(true,[{latency:3000,failed:false}])).toBe("DEGRADED");
 expect(classifyConnectivity(true,Array.from({length:3},()=>({latency:200,failed:false})))).toBe("FULL");
});
it("preserves point-only PFZ and rejects unsupported radius meaning",()=>{
 const s={location:{lat:19,lon:72},pfz:{availability:"available",valid_until:"2099-01-01",zones:[{id:"test",latitude:20,longitude:72,search_radius_m:2000}]},boundary:{},weather:{},provenance:{fields:{}}} as unknown as MarineSnapshot;
 const data=marineMapData(s);expect(data.pfz[0].radius).toBeNull();expect(data.pfz[0].bearing).toBe(0);
 expect(bearing({lat:0,lon:0},{lat:0,lon:1})).toBe(90);
 s.pfz.valid_until="2000-01-01";expect(marineMapData(s).pfz).toHaveLength(0);
});
it("draws vectors only at real per-field grid coordinates and retains zero degrees",()=>{
 const s={pfz:{zones:[]},boundary:{},weather:{wind_direction_deg:0,wave_direction_deg:90},provenance:{fields:{"weather.wind_direction_deg":{source:"provider",grid_lat:19,grid_lon:72,forecast_valid_at:"2026-09-18"}}}} as unknown as MarineSnapshot;
 const result=marineMapData(s);expect(result.vectors).toHaveLength(1);expect(result.vectors[0].degrees).toBe(0);
});
