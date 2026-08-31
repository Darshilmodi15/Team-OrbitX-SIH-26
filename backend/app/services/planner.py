"""
Planner and multi-agent task orchestrator service for ORCA.
Translates detected user intent and operational context into a deterministic,
auditable multi-agent ExecutionPlan.
"""
from typing import List, Set
from pydantic import BaseModel, Field


class ExecutionTask(BaseModel):
    """Represents a discrete task assigned to a specialized agent."""
    agent: str = Field(..., description="Name of the agent responsible for executing the task")
    action: str = Field(..., description="Action/operation to be executed by the agent")
    required: bool = Field(default=True, description="Whether this task is mandatory for query resolution")


class ExecutionPlan(BaseModel):
    """Represents the structured multi-agent execution plan generated for a query."""
    intent: str = Field(..., description="Detected user intent driving the execution plan")
    tasks: List[ExecutionTask] = Field(default_factory=list, description="Ordered list of execution tasks")


def _asks_for_pfz(question: str) -> bool:
    """Checks if question explicitly mentions fishing zones, spots, or grounds."""
    q = question.lower()
    keywords = [
        "pfz", "fishing zone", "fishing spots", "fishing spot", "fish zone", "fish zones",
        "fishing ground", "fishing grounds", "fishing area", "fishing areas",
        "where to fish", "where should i fish", "where can i fish", "where should i go",
        "where to catch", "catch fish", "best spot", "best spots", "fish catch",
    ]
    return any(kw in q for kw in keywords)


def _asks_for_weather(question: str) -> bool:
    """Checks if question explicitly mentions weather, sea conditions, wind, or waves."""
    q = question.lower()
    keywords = [
        "weather", "condition", "conditions", "wind", "winds", "wave", "waves",
        "wave height", "wind speed", "wind direction", "swell", "sea state",
        "forecast", "storm", "rain", "rainy", "squall", "visibility",
        "temperature", "temp", "safe", "safety", "ocean state", "marine",
    ]
    return any(kw in q for kw in keywords)


class Planner:
    """
    Deterministic task planner for ORCA multi-agent architecture.
    Translates intent and context into an ordered list of specialized agent tasks.
    """

    @classmethod
    def plan(
        cls,
        question: str,
        intent: str,
        lat: float,
        lon: float,
        date: str,
    ) -> ExecutionPlan:
        task_tuples: List[tuple[str, str, bool]] = []
        seen: Set[tuple[str, str]] = set()

        def add_task(agent: str, action: str, required: bool = True):
            if (agent, action) not in seen:
                seen.add((agent, action))
                task_tuples.append((agent, action, required))

        if intent == "combined_pfz_safety":
            add_task("pfz_agent", "find_nearest_zones", required=True)
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("risk_agent", "assess_risk", required=True)
            add_task("geospatial_agent", "calculate_distance", required=True)
            add_task("route_agent", "plan_safe_route", required=True)
            add_task("hazard_agent", "detect_hazards", required=True)

        elif intent == "safe_route":
            add_task("pfz_agent", "find_nearest_zones", required=True)
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("risk_agent", "assess_risk", required=True)
            add_task("geospatial_agent", "calculate_distance", required=True)
            add_task("route_agent", "plan_safe_route", required=True)
            add_task("hazard_agent", "detect_hazards", required=True)

        elif intent == "chlorophyll_sst_analytics":
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("ocean_analytics_agent", "analyze_chlorophyll_sst", required=True)
            add_task("pfz_agent", "find_nearest_zones", required=True)
            add_task("geospatial_agent", "calculate_distance", required=True)

        elif intent == "fish_productivity_decline":
            add_task("ocean_analytics_agent", "analyze_productivity_decline", required=True)
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("pfz_agent", "find_nearest_zones", required=False)

        elif intent == "zone_avoidance":
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("hazard_agent", "detect_hazards", required=True)
            add_task("geospatial_agent", "calculate_distance", required=True)
            add_task("pfz_agent", "find_nearest_zones", required=True)
            add_task("ocean_analytics_agent", "evaluate_zone_avoidance", required=True)

        elif intent == "what_if_simulation":
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("risk_agent", "assess_risk", required=True)
            add_task("simulation_agent", "run_simulation", required=True)

        elif intent == "marine_boundary":
            add_task("boundary_agent", "check_marine_boundary", required=True)
            add_task("geospatial_agent", "calculate_distance", required=True)
            add_task("hazard_agent", "detect_hazards", required=True)

        elif intent == "hazard_alerts":
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("hazard_agent", "detect_hazards", required=True)
            add_task("geospatial_agent", "calculate_distance", required=True)

        elif intent == "geofence_check":
            add_task("geospatial_agent", "calculate_distance", required=True)
            add_task("hazard_agent", "detect_hazards", required=True)

        elif intent == "safety_check":
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("hazard_agent", "detect_hazards", required=True)
            add_task("risk_agent", "assess_risk", required=True)
            if _asks_for_pfz(question):
                add_task("pfz_agent", "find_nearest_zones", required=True)
                add_task("geospatial_agent", "calculate_distance", required=True)

        elif intent == "nearest_pfz":
            add_task("pfz_agent", "find_nearest_zones", required=True)
            add_task("geospatial_agent", "calculate_distance", required=True)
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("risk_agent", "assess_risk", required=True)
            add_task("hazard_agent", "detect_hazards", required=True)

        elif intent == "weather_conditions":
            add_task("weather_agent", "get_marine_conditions", required=True)

        elif intent == "emergency_sos":
            add_task("geospatial_agent", "calculate_distance", required=True)
            add_task("boundary_agent", "check_marine_boundary", required=True)
            add_task("hazard_agent", "detect_hazards", required=True)

        elif intent == "government_schemes":
            # Informational scheme retrieval
            pass

        elif intent == "general":
            # General informational query: 0 tasks
            pass

        else:
            # Fallback
            pass

        tasks = [
            ExecutionTask(agent=t[0], action=t[1], required=t[2])
            for t in task_tuples
        ]

        return ExecutionPlan(intent=intent, tasks=tasks)


def create_plan(
    question: str,
    intent: str,
    lat: float,
    lon: float,
    date: str,
) -> ExecutionPlan:
    """Convenience functional wrapper for Planner.plan."""
    return Planner.plan(question=question, intent=intent, lat=lat, lon=lon, date=date)
