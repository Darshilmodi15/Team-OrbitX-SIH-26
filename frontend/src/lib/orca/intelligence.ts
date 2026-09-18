import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
export type SpeciesResult = {
  status: string; source: string; retrieved_at: string; cache_status: string; disclaimer: string; sample_limit: number;
  evidence: Array<{scientific_name:string;evidence_type:string;occurrence_count:number;data_period:{latest_in_sample:string|null};datasets:string[]}>;
  points: Array<{lat:number;lon:number;scientific_name:string;event_date:string|null}>;
};
export type EarthResult = {
  status:string; reason?:string; retrieved_at:string; cache_status:string; limitations:string; experimental:true;
  geometry:GeoJSON.FeatureCollection|null; observation_period:{start:string;end:string}|null; observation_age_hours?:number;
  datasets:Array<{dataset_id:string;organization:string;source_url:string;spatial_resolution:string;temporal_resolution:string;limitations:string}>;
};
export function useOptionalEvidence<T>(kind:"species"|"earth-observation", id:string|undefined, enabled:boolean) {
  return useQuery<T>({queryKey:["optional-evidence",kind,id], enabled:enabled && !!id,
    staleTime:query=>["available","empty"].includes((query.state.data as {status?:string}|undefined)?.status || "") ? (kind === "species" ? 86400000 : 3600000) : 60000, retry:false,
    queryFn:async({signal})=>{const response=await apiFetch(`/api/intelligence/${kind}?snapshot_id=${encodeURIComponent(id!)}`,{signal});if(!response.ok)throw new Error("Optional evidence unavailable");return response.json();}});
}
