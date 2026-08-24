"""Planner and task orchestrator service for ORCA multi-agent architecture."""
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


<<<<<<< HEAD
def _asks_for_boundary(question: str) -> bool:
    """Checks if question explicitly mentions marine boundaries, EEZ, IMBL, or international borders."""
    q = question.lower()
    keywords = [
        "boundary", "boundaries", "eez", "exclusive economic zone", "imbl",
        "border", "borders", "maritime border", "international waters", "foreign waters",
        "territorial", "territorial waters", "geofence", "geofencing", "sovereignty",
        "sovereign", "marine boundary", "marine boundaries", "cross border", "vliz",
        "marine regions",
=======
def _asks_for_geofence(question: str) -> bool:
    """Checks if question explicitly mentions maritime boundaries, IMBL, or protected marine sanctuaries."""
    q = question.lower()
    keywords = [
        "boundary", "boundaries", "border", "borders", "imbl", "sanctuary", "sanctuaries",
        "marine national park", "protected area", "protected zone", "mpa", "restricted",
        "pakistan", "sri lanka", "gulf of mannar", "sir creek", "malvan", "gahirmatha",
        "geofence", "no fishing zone", "prohibited",
>>>>>>> 401bb31 (feat(v0.5): Marine risk matrix, spatial geofences, REST telemetry and GIS overlays)
    ]
    return any(kw in q for kw in keywords)


class Planner:
    """
    Deterministic task planner for ORCA.
    
    Translates detected user intent and query context into an ordered, structured
    ExecutionPlan of agent tasks without relying on internal LLM calls.
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
        """
        Generates a deterministic ExecutionPlan based on intent and question keywords.

        Rules:
        1. safety_check:
           - weather_agent / get_marine_conditions
           - risk_agent / assess_risk
           - If also asking for boundaries/geofence:
             - geofence_agent / evaluate_boundaries
           - If also asking for fishing zones/spots:
             - pfz_agent / find_nearest_zones
             - geospatial_agent / calculate_distance
           - If also asking for boundaries/borders:
             - boundary_agent / check_boundary
        2. nearest_pfz:
           - pfz_agent / find_nearest_zones
           - geospatial_agent / calculate_distance
           - If also asking for boundaries/borders:
             - boundary_agent / check_boundary
           - If also asking for boundary/geofence:
             - geofence_agent / evaluate_boundaries
        3. weather_conditions:
           - weather_agent / get_marine_conditions
        4. marine_boundary / boundary_check:
           - boundary_agent / check_boundary
        5. geofence_check / boundary queries:
           - geofence_agent / evaluate_boundaries
        6. general:
           - empty task list
        """
        task_tuples: List[tuple[str, str, bool]] = []
        seen: Set[tuple[str, str]] = set()

        def add_task(agent: str, action: str, required: bool = True):
            if (agent, action) not in seen:
                seen.add((agent, action))
                task_tuples.append((agent, action, required))

        if intent in ("marine_boundary", "boundary_check"):
            add_task("boundary_agent", "check_boundary", required=True)
            if _asks_for_weather(question):
                add_task("weather_agent", "get_marine_conditions", required=True)

        elif intent == "safety_check":
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("risk_agent", "assess_risk", required=True)
            if _asks_for_geofence(question):
                add_task("geofence_agent", "evaluate_boundaries", required=True)
            if _asks_for_pfz(question):
                add_task("pfz_agent", "find_nearest_zones", required=True)
                add_task("geospatial_agent", "calculate_distance", required=True)
            if _asks_for_boundary(question):
                add_task("boundary_agent", "check_boundary", required=True)

        elif intent == "nearest_pfz":
            add_task("pfz_agent", "find_nearest_zones", required=True)
            add_task("geospatial_agent", "calculate_distance", required=True)
            if _asks_for_weather(question):
                add_task("weather_agent", "get_marine_conditions", required=True)
            if _asks_for_boundary(question):
                add_task("boundary_agent", "check_boundary", required=True)
            if _asks_for_geofence(question):
                add_task("geofence_agent", "evaluate_boundaries", required=True)

        elif intent == "weather_conditions":
            add_task("weather_agent", "get_marine_conditions", required=True)
            if _asks_for_boundary(question):
                add_task("boundary_agent", "check_boundary", required=True)
            if _asks_for_geofence(question):
                add_task("geofence_agent", "evaluate_boundaries", required=True)

        elif intent == "geofence_check" or _asks_for_geofence(question):
            add_task("geofence_agent", "evaluate_boundaries", required=True)
            if _asks_for_weather(question):
                add_task("weather_agent", "get_marine_conditions", required=True)
                add_task("risk_agent", "assess_risk", required=True)

        elif intent == "general":
            if _asks_for_boundary(question):
                add_task("boundary_agent", "check_boundary", required=True)
            if _asks_for_geofence(question):
                add_task("geofence_agent", "evaluate_boundaries", required=True)

        else:
            if _asks_for_boundary(question):
                add_task("boundary_agent", "check_boundary", required=True)
            if _asks_for_geofence(question):
                add_task("geofence_agent", "evaluate_boundaries", required=True)

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
