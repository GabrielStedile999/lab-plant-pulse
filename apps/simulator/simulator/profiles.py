"""Cada perfil e uma funcao pura do tempo decorrido (segundos) para (metricas, status).

Ser funcao do tempo, e nao de estado acumulado, torna os perfis testaveis sem loop e
reproduziveis entre reinicios do simulador.
"""

import math
import random

from simulator.models import Metrics, Status


def _noise(scale: float) -> float:
    return random.gauss(0, scale)


def heating(t: float) -> tuple[Metrics, Status]:
    # Dente de serra de 10 min: 60 -> 95 C. Cruza 80 C aos ~3m40s e fica la por ~6 min.
    temperature = 60 + 35 * ((t % 600) / 600) + _noise(0.3)
    return Metrics(temperature=temperature, vibration=2.5 + _noise(0.2)), "running"


def shaky(t: float) -> tuple[Metrics, Status]:
    # Surto de vibracao de 20 s a cada 2 min.
    burst = 9.0 if (t % 120) < 20 else 0.0
    vibration = 3.0 + 1.5 * math.sin(t / 7) + burst + _noise(0.3)
    return Metrics(rpm=1800 + _noise(15), vibration=max(0.0, vibration)), "running"


def steady(t: float) -> tuple[Metrics, Status]:
    return Metrics(temperature=65 + _noise(0.5), rpm=1200 + _noise(10)), "running"


def intermittent(t: float) -> tuple[Metrics, Status]:
    # 1 min ocioso a cada 3.
    if (t % 180) < 60:
        return Metrics(rpm=0.0), "idle"
    return Metrics(rpm=950 + _noise(8)), "running"


def faulty(t: float) -> tuple[Metrics, Status]:
    # 20 s de falha a cada 5 min, com temperatura fugindo.
    if (t % 300) < 20:
        return Metrics(temperature=140 + _noise(2)), "fault"
    return Metrics(temperature=180 + _noise(0.8)), "running"


PROFILES = {
    "heating": heating,
    "shaky": shaky,
    "steady": steady,
    "intermittent": intermittent,
    "faulty": faulty,
}


def only_declared(metrics: Metrics, sensors: list[str]) -> Metrics:
    """Uma maquina so publica os sensores que o cadastro diz que ela tem."""
    return Metrics(**{k: v for k, v in metrics.model_dump().items() if k in sensors})