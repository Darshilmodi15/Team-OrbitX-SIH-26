import {it,expect} from "vitest";
import {trackEvent} from "@/lib/orca/analytics";
import {reviewCopy} from "@/lib/orca/review-copy";
import {policyCopy} from "@/lib/orca/policy-copy";
import {LANGUAGES} from "@/lib/orca/i18n";
it("does not record optional analytics without explicit consent",()=>{
 localStorage.removeItem("orca_cookie_consent"); localStorage.removeItem("orca_analytics_events");
 trackEvent("test"); expect(localStorage.getItem("orca_analytics_events")).toBeNull();
 localStorage.setItem("orca_cookie_consent","broken-json"); trackEvent("test"); expect(localStorage.getItem("orca_analytics_events")).toBeNull();
 localStorage.setItem("orca_cookie_consent",JSON.stringify({analytics:false}));trackEvent("test");expect(localStorage.getItem("orca_analytics_events")).toBeNull();
 localStorage.removeItem("orca_cookie_consent");
});
it("includes policy and download text in all supported languages",()=>{
 expect(Object.keys(policyCopy)).toHaveLength(LANGUAGES.length);
 for(const lang of Object.keys(policyCopy) as Array<keyof typeof policyCopy>){
  expect(policyCopy[lang].privacy).toHaveLength(3);expect(policyCopy[lang].terms).toHaveLength(3);
  expect(Object.values(reviewCopy(lang)).every(value=>!!value)).toBe(true);
  if(lang!=="en") expect(policyCopy[lang].privacy[0]).not.toBe(policyCopy.en.privacy[0]);
 }
});
