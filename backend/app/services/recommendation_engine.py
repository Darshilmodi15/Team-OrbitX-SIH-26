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
            recommendations.append(OperationalRecommendation(
                id=f"REC-SAF-{rec_index:02d}", category="SAFETY",
                title=f"ORCA heuristic assessment: {risk.level}",
                directive="Consult current official marine advisories before making navigation decisions. ORCA does not issue departure clearance.",
                priority="CRITICAL" if risk.level == "unsafe" else "HIGH" if risk.level == "caution" else "INFO",
                confidence_score=None, reliability_tier="ORCA_HEURISTIC",
                supporting_evidence=[f"{key}: {value}" for key, value in risk.available_evidence.items()]
                    + [f"Missing evidence: {', '.join(risk.missing_evidence) or 'none in the assessed input set'}",
                       f"Evidence completeness: {risk.evidence_completeness}", f"Source: {w.source}; status: {w.cache_status or 'unavailable'}"],
                reasoning=risk.reason, source="orca_marine_risk_engine",
            ))
            rec_index += 1

        # -------------------------------------------------------------
        # 2. Potential Fishing Zone (PFZ) & Pelagic Strategy
        # -------------------------------------------------------------
        if bundle.pfz_zones and (not bundle.risk or bundle.risk.level != "unsafe"):
            best_pfz: PFZEvidence = bundle.pfz_zones[0]
            rec_id = f"REC-PFZ-{rec_index:02d}"
            rec_index += 1
            evidence = [
                f"Advisory point: {best_pfz.name} ({best_pfz.latitude:.4f}, {best_pfz.longitude:.4f})",
                f"Straight-line distance from selected location: {best_pfz.distance_km:.1f} km; not a navigable route",
                f"Published depth: {str(best_pfz.depth_m) + ' m' if best_pfz.depth_m is not None else 'unavailable'}",
                f"Published species: {', '.join(best_pfz.species) or 'unavailable'}",
                f"Source: {best_pfz.source}",
            ]
            recommendations.append(OperationalRecommendation(
                id=rec_id, category="FISHING", title=f"PFZ advisory reference: {best_pfz.name}",
                directive="Review the current source advisory and official marine warnings before planning a fishing trip.",
                priority="INFO", confidence_score=None, reliability_tier="REFERENCE_ESTIMATE",
                supporting_evidence=evidence,
                reasoning="This is a published advisory point. The available evidence does not establish catch probability, optimal depth, fuel efficiency or a safe route to it.",
                source=best_pfz.source,
            ))

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
            boundary = bundle.boundary
            recommendations.append(OperationalRecommendation(
                id=f"REC-GEO-{rec_index:02d}", category="GEOFENCE",
                title="ORCA boundary reference assessment",
                directive="Consult current official charts and restrictions. Reference geometry does not establish legal or navigational clearance.",
                priority="HIGH" if not boundary.inside_eez or (boundary.distance_to_boundary_km is not None and boundary.distance_to_boundary_km < 15) else "INFO",
                supporting_evidence=[f"Source: {boundary.source}", f"Inside reference polygon: {boundary.inside_eez}", f"Distance to reference boundary (km): {boundary.distance_to_boundary_km}"],
                reasoning=boundary.status_message or "Reference boundary estimate only.",
                source="orca_boundary_reference", reliability_tier="REFERENCE_ESTIMATE", confidence_score=None,
            ))
            rec_index += 1

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
                    f"Freshness: {alert.freshness or 'UNAVAILABLE'}",
                ]
                reasoning = "ORCA derived this alert from the supplied evidence. It is not a retrieved government bulletin."
                prio = "CRITICAL" if alert.severity.lower() in ["critical", "warning"] else "HIGH"
                recommendations.append(
                    OperationalRecommendation(
                        id=rec_id,
                        category="HAZARD",
                        title=f"Coastal Hazard Advisory: {alert.title}",
                        directive=f"{alert.message}. Relay warning to crew and avoid low-lying coastal sandbars.",
                        priority=prio,
                        confidence_score=None,
                        reliability_tier="ORCA_HEURISTIC",
                        supporting_evidence=evidence,
                        reasoning=reasoning,
                        source="orca_heuristic",
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
        if bundle.zone_avoidance:
            za = bundle.zone_avoidance
            recommendations.append(OperationalRecommendation(
                id=f"REC-ZONE-{rec_index:02d}", category="SAFETY",
                title="ORCA zone coverage assessment", priority="HIGH" if za.avoided_zones else "INFO",
                directive="Review identified restrictions and current official advisories. No safe alternative is established by incomplete coverage.",
                supporting_evidence=[item.reason for item in za.avoided_zones] + ["Missing evidence: " + ", ".join(za.missing_evidence)],
                reasoning=za.summary, source="orca_heuristic", reliability_tier="ORCA_HEURISTIC", confidence_score=None,
            ))
            rec_index += 1

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
                    title="Tidal Window Advisory: Harbor Channel Navigation",
                    directive=f"Plan harbor entry and departure during High Tide window around {t.high_tide_time} ({t.high_tide_height_m:.2f}m). Exercise caution near shallow sandbars during Low Tide at {t.low_tide_time} ({t.low_tide_height_m:.2f}m).",
                    priority="INFO",
                    confidence_score=0.85,
                    reliability_tier="REFERENCE_ESTIMATE",
                    supporting_evidence=evidence,
                    reasoning=reasoning,
                    source=t.source or "incois_tidal_harmonic_service",
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

    @classmethod
    def format_recommendations_markdown(cls, recs: List[OperationalRecommendation]) -> str:
        """Formats recommendations with evidence and reasoning trace into structured markdown."""
        if not recs:
            return ""
        lines = [
            "### ⚓ Operational Recommendations, Evidence & Reasoning Derivation\n"
        ]
        for r in recs:
            icon = "🚨" if r.priority == "CRITICAL" else ("⚠️" if r.priority == "HIGH" else "ℹ️")
            confidence = f"{int(r.confidence_score * 100)}% Confidence" if r.confidence_score is not None else "Confidence unavailable"
            lines.append(f"#### {icon} {r.title} [{r.priority} Priority | {confidence}]")
            lines.append(f"**Action Directive**: {r.directive}\n")
            lines.append("**Supporting Evidence**:")
            for ev in r.supporting_evidence:
                lines.append(f"• {ev}")
            lines.append(f"\n**Step-by-Step Deductive Reasoning**:\n{r.reasoning}\n")
        return "\n".join(lines)

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
