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
        "forecast", "sea state", "storm", "rain", "rainy", "squall", "visibility",
        "temperature", "temp", "safe", "safety",
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
           - If also asking for fishing zones/spots:
             - pfz_agent / find_nearest_zones
             - geospatial_agent / calculate_distance
        2. nearest_pfz:
           - pfz_agent / find_nearest_zones
           - geospatial_agent / calculate_distance
           - If also asking for conditions/weather:
             - weather_agent / get_marine_conditions
        3. weather_conditions:
           - weather_agent / get_marine_conditions
        4. general:
           - empty task list
        """
        task_tuples: List[tuple[str, str, bool]] = []
        seen: Set[tuple[str, str]] = set()

        def add_task(agent: str, action: str, required: bool = True):
            if (agent, action) not in seen:
                seen.add((agent, action))
                task_tuples.append((agent, action, required))

        if intent == "safety_check":
            add_task("weather_agent", "get_marine_conditions", required=True)
            add_task("risk_agent", "assess_risk", required=True)
            if _asks_for_pfz(question):
                add_task("pfz_agent", "find_nearest_zones", required=True)
                add_task("geospatial_agent", "calculate_distance", required=True)

        elif intent == "nearest_pfz":
            add_task("pfz_agent", "find_nearest_zones", required=True)
            add_task("geospatial_agent", "calculate_distance", required=True)
            if _asks_for_weather(question):
                add_task("weather_agent", "get_marine_conditions", required=True)

        elif intent == "weather_conditions":
            add_task("weather_agent", "get_marine_conditions", required=True)

        elif intent == "general":
            # General query: return empty task list
            pass

        else:
            # Unknown intent fallback: empty task list
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
