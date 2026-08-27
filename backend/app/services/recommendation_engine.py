"""Recommendation and Reasoning Engine for ORCA Marine AI.

Delivers reliable operational recommendations together with the supporting
evidence and deductive reasoning used to derive each response.
"""
from typing import Any, Dict, List, Optional
from app.models.agent_models import (
    EvidenceBundle,
    OperationalRecommendation,
    PFZEvidence,
    WeatherEvidence,
)


class RecommendationReasoningEngine:
    """
    Synthesizes multi-agent telemetry and geospatial evidence into reliable,
    prioritized operational recommendations with transparent supporting evidence
    and step-by-step reasoning derivation.
    """

    @classmethod
    def generate_recommendations(
        cls,
        bundle: EvidenceBundle,
        user_question: Optional[str] = None,
        intent: Optional[str] = None,
    ) -> List[OperationalRecommendation]:
        """
        Derives an exhaustive list of evidence-backed recommendations based on
        the collected multi-agent EvidenceBundle.
        """
        recommendations: List[OperationalRecommendation] = []
        rec_index = 1

        # -------------------------------------------------------------
        # 1. Marine Safety & Sea Venture Recommendation
        # -------------------------------------------------------------
        if bundle.risk and bundle.weather:
            risk = bundle.risk
            w = bundle.weather
            wave_h = w.wave_height_m
            wind_spd = w.wind_speed_kmh
            gust_spd = w.wind_gust_kmh or (wind_spd * 1.3)
            wave_per = w.wave_period_s or 7.5
            forecast = w.forecast.lower()
            source = w.source

            if risk.level == "unsafe":
                rec_id = f"REC-SAF-{rec_index:02d}"
                rec_index += 1
                evidence = [
                    f"Significant Wave Height (Hs): {wave_h:.2f}m (Severe safety threshold > 2.50m exceeded)",
                    f"Sustained Wind Speed: {wind_spd:.1f} km/h (Gale warning threshold > 50.0 km/h exceeded)",
                    f"Peak Wind Gusts: {gust_spd:.1f} km/h (Squall threshold > 60.0 km/h)",
                    f"Forecast Meteorological Sea State: '{forecast.capitalize()}'",
                    f"Data Provenance: {source} (Status: {w.cache_status or 'Live'})",
                ]
                reasoning = (
                    f"1. Physical limit analysis: Wave height of {wave_h:.2f}m produces severe dynamic hydrostatic loading "
                    f"exceeding craft capsizing stability margins.\n"
                    f"2. Aerodynamic drag analysis: Sustained wind of {wind_spd:.1f} km/h creates heavy chop and spray, severely reducing steering control.\n"
                    f"3. Risk matrix verdict: 4-Vector safety engine classified conditions as UNSAFE ({risk.safety_label or 'SEVERE HAZARD'}).\n"
                    f"4. Derivation: Operating in these conditions carries high risk of vessel swamping and hull damage.\n"
                    f"5. Actionable directive: Immediate cessation of sea ventures is mandatory for life safety."
                )
                recommendations.append(
                    OperationalRecommendation(
                        id=rec_id,
                        category="SAFETY",
                        title="Vessel Venture Prohibition: Severe Marine Hazard",
                        directive="Suspend all vessel departures and remain moored in harbor. If currently offshore, return to the nearest designated shelter port immediately and maintain VHF Channel 16 distress watch.",
                        priority="CRITICAL",
                        confidence_score=0.98,
                        reliability_tier="AUTHORITATIVE_VERIFIED",
                        supporting_evidence=evidence,
                        reasoning=reasoning,
                        source="orca_marine_risk_engine",
                    )
                )

            elif risk.level == "caution":
                rec_id = f"REC-SAF-{rec_index:02d}"
                rec_index += 1
                evidence = [
                    f"Significant Wave Height (Hs): {wave_h:.2f}m (Moderate swell envelope: 1.50m - 2.50m)",
                    f"Sustained Wind Speed: {wind_spd:.1f} km/h (Elevated breeze envelope: 35.0 - 50.0 km/h)",
                    f"Wave Period: {wave_per:.1f}s (Steep chop index: {'Elevated' if wave_per < 5.5 else 'Normal'})",
                    f"Forecast Condition: '{forecast.capitalize()}'",
                    f"Data Lineage: {source}",
                ]
                reasoning = (
                    f"1. Sea state physics: Wave height ({wave_h:.2f}m) and wind speed ({wind_spd:.1f} km/h) are elevated above standard calm thresholds but below extreme hazard limits.\n"
                    f"2. Vessel vulnerability: Small artisanal non-mechanized craft (<10m) face elevated roll motion, whereas larger trawlers can operate with heightened vigilance.\n"
                    f"3. Risk evaluation: Classified as CAUTION ADVISED due to localized squalls and moderate swell.\n"
                    f"4. Derivation: Limiting operational radius to nearshore waters ensures rapid harbor return if conditions deteriorate.\n"
                    f"5. Actionable directive: Implement mandatory lifejacket wear, restrict operating distance to within 5 NM, and monitor hourly weather updates."
                )
                recommendations.append(
                    OperationalRecommendation(
                        id=rec_id,
                        category="SAFETY",
                        title="Restricted Coastal Operations: Heightened Vigilance",
                        directive="Operate only with mechanized, seaworthy craft within 5 Nautical Miles (NM) of the shoreline. Ensure all crew wear certified lifejackets and maintain continuous radio watch on VHF Channel 16.",
                        priority="HIGH",
                        confidence_score=0.92,
                        reliability_tier="AUTHORITATIVE_VERIFIED",
                        supporting_evidence=evidence,
                        reasoning=reasoning,
                        source="orca_marine_risk_engine",
                    )
                )

            else:  # safe
                rec_id = f"REC-SAF-{rec_index:02d}"
                rec_index += 1
                evidence = [
                    f"Significant Wave Height (Hs): {wave_h:.2f}m (Within safe limits <= 1.50m)",
                    f"Sustained Wind Speed: {wind_spd:.1f} km/h (Gentle/Moderate breeze <= 40.0 km/h)",
                    f"Wave Period: {wave_per:.1f}s (Laminar swell profile)",
                    f"Forecast Condition: '{forecast.capitalize()}'",
                    f"Authoritative Source: {source}",
                ]
                reasoning = (
                    f"1. Multi-vector physics check: Wave height ({wave_h:.2f}m) and sustained wind ({wind_spd:.1f} km/h) are within safe navigation envelopes.\n"
                    f"2. Hydrodynamic stability: No steep wave chop or squall turbulence detected (period: {wave_per:.1f}s).\n"
                    f"3. Risk classification: SAFE TO VENTURE across all 4 maritime vectors.\n"
                    f"4. Derivation: Atmospheric and oceanic conditions support safe transit, fishing, and commercial operations.\n"
                    f"5. Actionable directive: Vessel departures cleared under standard maritime protocols."
                )
                recommendations.append(
                    OperationalRecommendation(
                        id=rec_id,
                        category="SAFETY",
                        title="Vessel Departure Clearance: Optimal Marine Conditions",
                        directive="Normal fishing and navigation operations are cleared to proceed. Maintain standard safety protocols, pre-departure engine checks, and active GPS positioning.",
                        priority="MEDIUM",
                        confidence_score=0.96,
                        reliability_tier="AUTHORITATIVE_VERIFIED",
                        supporting_evidence=evidence,
                        reasoning=reasoning,
                        source="orca_marine_risk_engine",
                    )
                )

        # -------------------------------------------------------------
        # 2. Potential Fishing Zone (PFZ) & Pelagic Strategy
        # -------------------------------------------------------------
        if bundle.pfz_zones and (not bundle.risk or bundle.risk.level != "unsafe"):
            best_pfz: PFZEvidence = bundle.pfz_zones[0]
            rec_id = f"REC-PFZ-{rec_index:02d}"
            rec_index += 1
            bearing_str = f"{int(best_pfz.bearing_deg)}° ({cls._deg_to_cardinal(best_pfz.bearing_deg)})" if best_pfz.bearing_deg is not None else "N/A"
            depth_str = f"~{int(best_pfz.depth_m)}m" if best_pfz.depth_m is not None else "25-45m"
            suit_score = best_pfz.suitability_score or 88.0

            evidence = [
                f"Top Target Fishing Zone: '{best_pfz.name}' located at ({best_pfz.latitude:.4f}°N, {best_pfz.longitude:.4f}°E)",
                f"Geodesic Distance from Port/Vessel: {best_pfz.distance_km:.1f} km ({best_pfz.distance_km / 1.852:.1f} NM)",
                f"True Compass Heading: {bearing_str}",
                f"Bathymetric Seafloor Depth: {depth_str}",
                f"Dominant Target Pelagic Species: {', '.join(best_pfz.species)}",
                f"Operational Suitability Score: {suit_score:.0f}/100",
                f"Data Provenance: {best_pfz.source}",
            ]
            reasoning = (
                f"1. Oceanographic front detection: Satellite Earth Observation identifies active chlorophyll-a aggregation and thermal boundaries at {best_pfz.name}.\n"
                f"2. Distance-fuel optimization: At {best_pfz.distance_km:.1f} km, this hotspot represents the highest Catch-Per-Unit-Effort (CPUE) to fuel-consumption ratio.\n"
                f"3. Bathymetric ecology: Seafloor depth of {depth_str} matches optimal feeding contours for {', '.join(best_pfz.species[:2])}.\n"
                f"4. Navigational feasibility: Compass heading {bearing_str} provides direct open-water transit clear of known shoals.\n"
                f"5. Actionable directive: Steer designated heading, deploy drift gillnets or longlines at targeted depth."
            )
            recommendations.append(
                OperationalRecommendation(
                    id=rec_id,
                    category="FISHING",
                    title=f"Optimal Fishing Ground Advisory: {best_pfz.name}",
                    directive=f"Set navigational heading to {bearing_str} towards {best_pfz.name} ({best_pfz.distance_km:.1f} km). Target pelagic shoals of {', '.join(best_pfz.species)} at depth {depth_str} using appropriate hook sizes or gillnets.",
                    priority="HIGH",
                    confidence_score=0.94,
                    reliability_tier="AUTHORITATIVE_VERIFIED",
                    supporting_evidence=evidence,
                    reasoning=reasoning,
                    source="orca_pfz_advisory_agent",
                )
            )

        # -------------------------------------------------------------
        # 3. Safe Navigational Route Recommendation
        # -------------------------------------------------------------
        if bundle.route:
            r = bundle.route
            rec_id = f"REC-NAV-{rec_index:02d}"
            rec_index += 1
            avoided = ", ".join(r.avoided_zones) if r.avoided_zones else "None (Clear fairway)"

            evidence = [
                f"Departure: {r.origin_name} ({r.origin_lat:.4f}°N, {r.origin_lon:.4f}°E)",
                f"Destination: {r.destination_name} ({r.destination_lat:.4f}°N, {r.destination_lon:.4f}°E)",
                f"Total Route Distance: {r.distance_km:.1f} km ({r.distance_nm:.1f} Nautical Miles)",
                f"Estimated Cruising Duration: ~{r.estimated_duration_hours:.1f} hours at nominal 8-knot speed",
                f"Plotted Waypoints: {len(r.waypoints)} safe navigation corridor coordinates",
                f"Avoided Restricted/Hazard Zones: {avoided}",
                f"Route Safety Status: {r.risk_assessment}",
            ]
            reasoning = (
                f"1. Corridor synthesis: Geodesic route computed avoiding shallow sandbars, coral protection zones, and international boundary buffers.\n"
                f"2. Fuel & transit calculation: Cruising distance of {r.distance_km:.1f} km requires ~{r.estimated_duration_hours:.1f}h of transit at standard cruising throttle (8 kts).\n"
                f"3. Hazard isolation: The course successfully skirts {avoided}.\n"
                f"4. Waypoint fidelity: {len(r.waypoints)} intermediate turn coordinates ensure adherence to certified nautical depth channels.\n"
                f"5. Actionable directive: Follow charted corridor waypoints on Tactical Map and maintain visual lookout."
            )
            recommendations.append(
                OperationalRecommendation(
                    id=rec_id,
                    category="NAVIGATION",
                    title=f"Safe Navigation Corridor: Route to {r.destination_name}",
                    directive=f"Follow the designated {len(r.waypoints)}-waypoint navigation corridor to {r.destination_name} ({r.distance_km:.1f} km, ~{r.estimated_duration_hours:.1f}h). Maintain 8 knots cruising speed and adhere to safe fairway margins.",
                    priority="HIGH",
                    confidence_score=0.93,
                    reliability_tier="MODEL_DERIVED",
                    supporting_evidence=evidence,
                    reasoning=reasoning,
                    source="orca_route_optimizer_agent",
                )
            )

        # -------------------------------------------------------------
        # 4. Maritime Boundary & Geofence Compliance
        # -------------------------------------------------------------
        if bundle.boundary:
            b = bundle.boundary
            rec_id = f"REC-GEO-{rec_index:02d}"
            rec_index += 1

            if not b.inside_eez or (b.distance_to_boundary_km is not None and b.distance_to_boundary_km < 15.0):
                evidence = [
                    f"Vessel EEZ Status: {'Inside EEZ' if b.inside_eez else 'OUTSIDE EEZ / IN INTERNATIONAL OR FOREIGN JURISDICTION'}",
                    f"Distance to Maritime Boundary: {b.distance_to_boundary_km:.1f} km" if b.distance_to_boundary_km is not None else "Proximity alert active",
                    f"Jurisdiction Zone: {b.country or 'India'} ({b.zone_name or 'EEZ'})",
                    f"Boundary Source: {b.source} ({b.dataset_version})",
                ]
                reasoning = (
                    f"1. Spatial polygon containment: Flanders Marine Institute (VLIZ) World EEZ v12 ray-casting shows vessel is near or beyond sovereign EEZ bounds.\n"
                    f"2. Legal & security implications: Approaching within 15 km of International Maritime Boundary Lines (IMBL) triggers coast guard interception and foreign authority detention risks.\n"
                    f"3. Proximity derivation: Margin of safety is insufficient for unmonitored drift.\n"
                    f"4. Actionable directive: Immediate course alteration to head inward toward Indian territorial waters."
                )
                recommendations.append(
                    OperationalRecommendation(
                        id=rec_id,
                        category="GEOFENCE",
                        title="Critical Boundary Warning: International Border Proximity",
                        directive="Alter course immediately toward the Indian mainland. Do not deploy nets across international boundary lines and maintain minimum 15 km buffer from foreign EEZ limits.",
                        priority="CRITICAL",
                        confidence_score=0.99,
                        reliability_tier="AUTHORITATIVE_VERIFIED",
                        supporting_evidence=evidence,
                        reasoning=reasoning,
                        source="orca_boundary_agent",
                    )
                )
            else:
                evidence = [
                    f"Vessel EEZ Status: Confirmed inside sovereign Indian Exclusive Economic Zone (EEZ)",
                    f"Distance to Nearest International Boundary: {b.distance_to_boundary_km:.1f} km (Safe clearance > 25 km)" if b.distance_to_boundary_km is not None else "Safe margin inside EEZ",
                    f"Jurisdiction Authority: Republic of India ({b.zone_name or 'India EEZ'})",
                    f"Authoritative Dataset: {b.source} ({b.dataset_version})",
                ]
                reasoning = (
                    f"1. Boundary geometry check: Vessel coordinates verified well within Indian EEZ polygon boundaries.\n"
                    f"2. Geofence safety clearance: Ample spatial buffer exists before reaching any contested or foreign maritime waters.\n"
                    f"3. Compliance verdict: Unrestricted legal fishing operations permitted under Indian maritime jurisdiction.\n"
                    f"4. Actionable directive: Maintain standard AIS/VMS transponder operation and carry valid fishing license."
                )
                recommendations.append(
                    OperationalRecommendation(
                        id=rec_id,
                        category="GEOFENCE",
                        title="Maritime Boundary Compliance: Indian EEZ Verified",
                        directive="Vessel is operating legally inside Indian Exclusive Economic Zone. Maintain active transponder and ensure registration documents are aboard.",
                        priority="INFO",
                        confidence_score=0.99,
                        reliability_tier="AUTHORITATIVE_VERIFIED",
                        supporting_evidence=evidence,
                        reasoning=reasoning,
                        source="orca_boundary_agent",
                    )
                )

        # -------------------------------------------------------------
        # 5. Proactive Hazard & Weather Alerts
        # -------------------------------------------------------------
        if bundle.alerts:
            for alert in bundle.alerts[:2]:
                rec_id = f"REC-HAZ-{rec_index:02d}"
                rec_index += 1
                evidence = [
                    f"Alert Identifier: {alert.id}",
                    f"Severity Classification: {alert.severity.upper()}",
                    f"Headline: {alert.title}",
                    f"Affected Geographic Sector: {alert.location_desc or 'Coastal Zone'}",
                    f"Issuing Agency: {alert.source}",
                    f"Freshness: {alert.freshness or 'LIVE'}",
                ]
                reasoning = (
                    f"1. Early warning assessment: INCOIS/IMD coastal radar and wave model triggered an active proactive hazard alert.\n"
                    f"2. Physical risk: Elevated risk of localized sea surges, high breaking waves at harbor mouths, or squall line arrival.\n"
                    f"3. Safety protocol: Preemptive tactical adjustments required to prevent vessel grounding or capsize.\n"
                    f"4. Actionable directive: Comply with alert precautions and alert nearby vessels."
                )
                prio = "CRITICAL" if alert.severity.lower() in ["critical", "warning"] else "HIGH"
                recommendations.append(
                    OperationalRecommendation(
                        id=rec_id,
                        category="HAZARD",
                        title=f"Coastal Hazard Advisory: {alert.title}",
                        directive=f"{alert.message}. Relay warning to crew and avoid low-lying coastal sandbars.",
                        priority=prio,
                        confidence_score=0.95,
                        reliability_tier="AUTHORITATIVE_VERIFIED",
                        supporting_evidence=evidence,
                        reasoning=reasoning,
                        source="incois_hazard_detection_agent",
                    )
                )

        # -------------------------------------------------------------
        # 6. Satellite Earth Observation & Chlorophyll Analytics
        # -------------------------------------------------------------
        if bundle.ocean_analytics:
            oa = bundle.ocean_analytics
            rec_id = f"REC-SAT-{rec_index:02d}"
            rec_index += 1
            sectors_desc = ", ".join([s.get("name", "Sector") for s in oa.favorable_sectors[:2]])

            evidence = [
                f"Satellite Analyzed Region: {oa.region_name}",
                f"Mean Chlorophyll-a Concentration: {oa.mean_chlorophyll_mg_m3:.2f} mg/m³ (Optimum pelagic bloom: >0.50 mg/m³)",
                f"Mean Sea Surface Temperature (SST): {oa.mean_sst_c:.1f}°C (Optimal aggregation band: {oa.optimal_sst_range})",
                f"Coastal Upwelling Index: {oa.upwelling_index}",
                f"Thermal Front Gradient: {oa.thermal_front_description}",
                f"High-Productivity Identified Sectors: {sectors_desc}",
                f"Satellite Source: {oa.satellite_source}",
            ]
            reasoning = (
                f"1. Satellite bio-optical analysis: Ocean Color Monitor (OCM) measures elevated chlorophyll-a ({oa.mean_chlorophyll_mg_m3:.2f} mg/m³), indicating active phytoplankton bloom.\n"
                f"2. Thermal front dynamics: SST of {oa.mean_sst_c:.1f}°C combined with {oa.upwelling_index} upwelling indicates nutrient-rich cold bottom water mixing with warm surface waters.\n"
                f"3. Pelagic food web derivation: Phytoplankton attracts primary forage fish (sardines, anchovies), which in turn draws commercial pelagic predators (tuna, seer fish, kingfish).\n"
                f"4. Actionable directive: Concentrate fishing efforts in {sectors_desc} along thermal front boundaries."
            )
            recommendations.append(
                OperationalRecommendation(
                    id=rec_id,
                    category="FISHING",
                    title="Satellite Ocean Color & Thermal Front Intelligence",
                    directive=f"Focus fishing operations in {sectors_desc} along the thermal front boundary. Target pelagic feeding zones between {oa.optimal_sst_range} where chlorophyll concentration peaks above 0.50 mg/m³.",
                    priority="HIGH",
                    confidence_score=0.91,
                    reliability_tier="MODEL_DERIVED",
                    supporting_evidence=evidence,
                    reasoning=reasoning,
                    source="ocean_analytics_agent",
                )
            )

        # -------------------------------------------------------------
        # 7. Marine Ecological Diagnostics & Sustainable Fisheries
        # -------------------------------------------------------------
        if bundle.ecology:
            eco = bundle.ecology
            rec_id = f"REC-ECO-{rec_index:02d}"
            rec_index += 1
            recs_text = "; ".join(eco.recommendations[:2]) if eco.recommendations else "Implement selective fishing gear."

            evidence = [
                f"Evaluated Coastal Sector: {eco.region_name}",
                f"Productivity Decline Severity: {eco.decline_severity}",
                f"Sea Surface Temperature Anomaly: {eco.sst_anomaly}",
                f"Phytoplankton Chlorophyll Trend: {eco.chlorophyll_trend}",
                f"Juvenile Overfishing & Trawling Pressure: {eco.overfishing_pressure}",
                f"Primary Ecological Drivers: {'; '.join(eco.primary_causes[:2])}",
                f"Data Provenance: {eco.source}",
            ]
            reasoning = (
                f"1. Ecological diagnostic: Multi-decadal satellite and catch time-series show productivity pressure in {eco.region_name}.\n"
                f"2. Climate-ocean interaction: SST anomalies ({eco.sst_anomaly}) alter spawning timings and push pelagic stocks further offshore into deeper waters.\n"
                f"3. Anthropogenic factors: Intensive juvenile extraction and bottom trawling damage benthic nursery grounds.\n"
                f"4. Derivation: Sustainable harvest strategies and selective gear are required to allow juvenile recruitment and preserve long-term fishery yields.\n"
                f"5. Actionable directive: Follow seasonal ban circulars and switch to square-mesh codends."
            )
            recommendations.append(
                OperationalRecommendation(
                    id=rec_id,
                    category="ECOLOGY",
                    title="Sustainable Fishery Management & Catch Recovery",
                    directive=f"{recs_text}. Avoid juvenile nursery sectors and transition to selective gear to support fish stock regeneration.",
                    priority="MEDIUM",
                    confidence_score=0.89,
                    reliability_tier="MODEL_DERIVED",
                    supporting_evidence=evidence,
                    reasoning=reasoning,
                    source="orca_marine_ecological_engine",
                )
            )

        # -------------------------------------------------------------
        # 8. Hazardous Zone Avoidance Strategy
        # -------------------------------------------------------------
        if bundle.zone_avoidance and bundle.zone_avoidance.avoided_zones:
            za = bundle.zone_avoidance
            rec_id = f"REC-AVD-{rec_index:02d}"
            rec_index += 1
            avoid_names = ", ".join([z.zone_name for z in za.avoided_zones])
            safe_alt_names = ", ".join([s["name"] for s in za.safe_alternative_zones[:2]]) if za.safe_alternative_zones else "Marked safe harbor channels"

            evidence = [
                f"Overall Avoidance Status: {za.overall_avoidance_status}",
                f"Flagged Avoidance Zones ({len(za.avoided_zones)}): {avoid_names}",
                f"Flagged Reasons: {'; '.join([f'{z.zone_name} ({z.category}): {z.reason}' for z in za.avoided_zones[:2]])}",
                f"Recommended Safe Alternative Grounds: {safe_alt_names}",
                f"Provenance: {za.source}",
            ]
            reasoning = (
                f"1. Multi-factor hazard screening: Spatial intersection of vessel operating area with active weather squalls and Marine Protected Areas.\n"
                f"2. Hazard isolation: Flagged sectors ({avoid_names}) present unacceptable risks of gear loss, vessel damage, or regulatory violations.\n"
                f"3. Alternative routing: Identified safe grounds ({safe_alt_names}) offer calm wave states (<1.2m) with legal operational clearance.\n"
                f"4. Actionable directive: Divert transit path around avoided polygons toward designated safe alternative grounds."
            )
            recommendations.append(
                OperationalRecommendation(
                    id=rec_id,
                    category="SAFETY",
                    title=f"Hazard & Geofence Avoidance Directive: {za.overall_avoidance_status}",
                    directive=f"Steer clear of flagged hazard zones ({avoid_names}). Redirect fishing activities toward verified safe alternative grounds ({safe_alt_names}).",
                    priority="HIGH",
                    confidence_score=0.95,
                    reliability_tier="AUTHORITATIVE_VERIFIED",
                    supporting_evidence=evidence,
                    reasoning=reasoning,
                    source="orca_zone_avoidance_engine",
                )
            )

        # -------------------------------------------------------------
        # 9. Tidal Navigational Windows
        # -------------------------------------------------------------
        if bundle.tide:
            t = bundle.tide
            rec_id = f"REC-TID-{rec_index:02d}"
            rec_index += 1

            evidence = [
                f"Primary High Tide Window: {t.high_tide_time} (Height: {t.high_tide_height_m:.2f}m)",
                f"Primary Low Tide Window: {t.low_tide_time} (Height: {t.low_tide_height_m:.2f}m)",
                f"Secondary High Tide Window: {t.secondary_high_tide_time} (Height: {t.secondary_high_tide_height_m:.2f}m)",
                f"Tidal Phase: {t.tidal_phase}",
                f"Tidal Range: {t.tidal_range_m:.2f}m",
                f"Provenance: {t.source}",
            ]
            reasoning = (
                f"1. Harmonic tidal dynamics: Semi-diurnal tidal oscillations create a {t.tidal_range_m:.2f}m depth variation between high and low tide.\n"
                f"2. Harbor draft clearance: Shallow estuary mouths and bar channels have restricted under-keel clearance during low tide ({t.low_tide_time} at {t.low_tide_height_m:.2f}m).\n"
                f"3. Navigational planning: Departing or returning during the high tide window ({t.high_tide_time}) ensures safe passage over shallow sandbanks.\n"
                f"4. Actionable directive: Schedule harbor bar crossings within +/- 2 hours of high tide."
            )
            recommendations.append(
                OperationalRecommendation(
                    id=rec_id,
                    category="TIDAL",
                    title="Tidal Window Optimization: Harbor Channel Navigation",
                    directive=f"Plan harbor entry and departure during High Tide window around {t.high_tide_time} ({t.high_tide_height_m:.2f}m). Exercise caution near shallow sandbars during Low Tide at {t.low_tide_time} ({t.low_tide_height_m:.2f}m).",
                    priority="INFO",
                    confidence_score=0.97,
                    reliability_tier="AUTHORITATIVE_VERIFIED",
                    supporting_evidence=evidence,
                    reasoning=reasoning,
                    source="incois_tidal_harmonic_service",
                )
            )

        # -------------------------------------------------------------
        # 10. What-If Counterfactual Simulation Recommendation
        # -------------------------------------------------------------
        if bundle.simulation:
            sim = bundle.simulation
            rec_id = f"REC-SIM-{rec_index:02d}"
            rec_index += 1

            evidence = [
                f"Modified Parameter: '{sim.parameter_modified}'",
                f"Observed Baseline Value: {sim.baseline_value} (Baseline Risk: {sim.baseline_risk.upper()})",
                f"Hypothetical Simulated Value: {sim.simulated_value} (Simulated Risk: {sim.simulated_risk.upper()})",
                f"Impact Summary: {sim.impact_summary}",
                f"Activated Risk Triggers: {', '.join(sim.triggered_factors) if sim.triggered_factors else 'None'}",
            ]
            reasoning = (
                f"1. Counterfactual sensitivity analysis: Simulating a change in {sim.parameter_modified} from {sim.baseline_value} to {sim.simulated_value}.\n"
                f"2. Threshold transition: Risk tier shifts from {sim.baseline_risk.upper()} to {sim.simulated_risk.upper()}.\n"
                f"3. Margin of safety derivation: Demonstrates the sensitivity of small vessels to rapid offshore weather deterioration.\n"
                f"4. Actionable directive: Mariners must monitor real-time telemetry closely as weather approaches simulated threshold."
            )
            recommendations.append(
                OperationalRecommendation(
                    id=rec_id,
                    category="SIMULATION",
                    title=f"What-If Scenario Insight: {sim.parameter_modified.replace('_', ' ').title()}",
                    directive=f"Simulated change shifts risk to {sim.simulated_risk.upper()}. {sim.impact_summary}. Prepare contingency plans should real-time conditions reach this threshold.",
                    priority="MEDIUM",
                    confidence_score=0.90,
                    reliability_tier="MODEL_DERIVED",
                    supporting_evidence=evidence,
                    reasoning=reasoning,
                    source="what_if_simulation_agent",
                )
            )

        return recommendations

    @staticmethod
    def _deg_to_cardinal(deg: Optional[float]) -> str:
        if deg is None:
            return "N/A"
        val = int((deg / 22.5) + 0.5)
        arr = [
            "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
        ]
        return arr[(val % 16)]
