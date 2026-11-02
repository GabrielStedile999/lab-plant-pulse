from simulator.models import Metrics
from simulator.profiles import heating, intermittent, only_declared


def test_heating_crosses_80_degrees_within_the_cycle():
    low, _ = heating(0)
    high, _ = heating(500)
    assert low.temperature < 70
    assert high.temperature > 85


def test_intermittent_is_idle_in_the_first_minute_of_each_cycle():
    metrics, status = intermittent(30)
    assert status == "idle"
    assert metrics.rpm == 0.0
    _, status = intermittent(120)
    assert status == "running"


def test_only_declared_sensors_are_published():
    metrics = only_declared(Metrics(temperature=70, rpm=1000), ["rpm"])
    assert metrics.model_dump(exclude_none=True) == {"rpm": 1000}