"""Unit tests for ORCA Planner and ExecutionPlan generation."""
import unittest

from app.services.planner import ExecutionPlan, Planner


class TestPlanner(unittest.TestCase):
    """Test suite covering all deterministic planning rules."""

    def setUp(self):
        self.lat = 18.9220
        self.lon = 72.8347
        self.date = "2026-08-24"

    def test_1_safety_check_basic(self):
        """Rule 1: safety_check requires weather, hazard, and deterministic risk agents."""
        question = "Is it safe to go out to sea today?"
        plan = Planner.plan(
            question=question,
            intent="safety_check",
            lat=self.lat,
            lon=self.lon,
            date=self.date,
        )
        self.assertIsInstance(plan, ExecutionPlan)
        self.assertEqual(plan.intent, "safety_check")
        
        task_list = [(t.agent, t.action) for t in plan.tasks]
        self.assertIn(("weather_agent", "get_marine_conditions"), task_list)
        self.assertIn(("risk_agent", "assess_risk"), task_list)
        self.assertIn(("hazard_agent", "detect_hazards"), task_list)
        self.assertNotIn(("pfz_agent", "find_nearest_zones"), task_list)
        self.assertNotIn(("geospatial_agent", "calculate_distance"), task_list)
        self.assertEqual(len(plan.tasks), 3)

    def test_2_nearest_pfz_basic(self):
        """Rule 2: PFZ recommendations include location and safety evaluation."""
        question = "Where are the nearest fishing zones?"
        plan = Planner.plan(
            question=question,
            intent="nearest_pfz",
            lat=self.lat,
            lon=self.lon,
            date=self.date,
        )
        self.assertIsInstance(plan, ExecutionPlan)
        self.assertEqual(plan.intent, "nearest_pfz")

        task_list = [(t.agent, t.action) for t in plan.tasks]
        self.assertIn(("pfz_agent", "find_nearest_zones"), task_list)
        self.assertIn(("geospatial_agent", "calculate_distance"), task_list)
        self.assertIn(("weather_agent", "get_marine_conditions"), task_list)
        self.assertIn(("risk_agent", "assess_risk"), task_list)
        self.assertIn(("hazard_agent", "detect_hazards"), task_list)
        self.assertEqual(len(plan.tasks), 5)

    def test_3_weather_conditions_basic(self):
        """Rule 3: weather_conditions requires weather_agent."""
        question = "What are the wind and wave conditions today?"
        plan = Planner.plan(
            question=question,
            intent="weather_conditions",
            lat=self.lat,
            lon=self.lon,
            date=self.date,
        )
        self.assertIsInstance(plan, ExecutionPlan)
        self.assertEqual(plan.intent, "weather_conditions")

        task_list = [(t.agent, t.action) for t in plan.tasks]
        self.assertIn(("weather_agent", "get_marine_conditions"), task_list)
        self.assertNotIn(("risk_agent", "assess_risk"), task_list)
        self.assertNotIn(("pfz_agent", "find_nearest_zones"), task_list)
        self.assertEqual(len(plan.tasks), 1)

    def test_4_safety_check_with_pfz_request(self):
        """Rule 4: safety_check asking for fishing zones adds pfz_agent and geospatial_agent."""
        question = "Is it safe to fish today and where are the closest fishing spots?"
        plan = Planner.plan(
            question=question,
            intent="safety_check",
            lat=self.lat,
            lon=self.lon,
            date=self.date,
        )
        self.assertIsInstance(plan, ExecutionPlan)
        self.assertEqual(plan.intent, "safety_check")

        task_list = [(t.agent, t.action) for t in plan.tasks]
        self.assertIn(("weather_agent", "get_marine_conditions"), task_list)
        self.assertIn(("risk_agent", "assess_risk"), task_list)
        self.assertIn(("pfz_agent", "find_nearest_zones"), task_list)
        self.assertIn(("geospatial_agent", "calculate_distance"), task_list)
        self.assertIn(("hazard_agent", "detect_hazards"), task_list)
        self.assertEqual(len(plan.tasks), 5)

    def test_5_nearest_pfz_with_weather_request(self):
        """Rule 5: nearest_pfz asking about conditions/weather adds weather_agent."""
        question = "Where is the nearest fishing zone and what are the weather conditions there?"
        plan = Planner.plan(
            question=question,
            intent="nearest_pfz",
            lat=self.lat,
            lon=self.lon,
            date=self.date,
        )
        self.assertIsInstance(plan, ExecutionPlan)
        self.assertEqual(plan.intent, "nearest_pfz")

        task_list = [(t.agent, t.action) for t in plan.tasks]
        self.assertIn(("pfz_agent", "find_nearest_zones"), task_list)
        self.assertIn(("geospatial_agent", "calculate_distance"), task_list)
        self.assertIn(("weather_agent", "get_marine_conditions"), task_list)
        self.assertIn(("risk_agent", "assess_risk"), task_list)
        self.assertIn(("hazard_agent", "detect_hazards"), task_list)
        self.assertEqual(len(plan.tasks), 5)

    def test_6_general(self):
        """Rule 6: general intent returns an empty task list."""
        question = "Hello ORCA, what can you do?"
        plan = Planner.plan(
            question=question,
            intent="general",
            lat=self.lat,
            lon=self.lon,
            date=self.date,
        )
        self.assertIsInstance(plan, ExecutionPlan)
        self.assertEqual(plan.intent, "general")
        self.assertEqual(len(plan.tasks), 0)


if __name__ == "__main__":
    unittest.main()
