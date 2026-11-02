"""Loop principal: a cada INTERVAL_SECONDS, uma leitura por maquina, publicada com QoS 1."""

import json
import os
import signal
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import paho.mqtt.client as mqtt

from simulator.models import Machine, TelemetryReading
from simulator.profiles import PROFILES, only_declared

MQTT_URL = os.environ.get("MQTT_URL", "mqtt://localhost:1883")
MACHINES_FILE = Path(os.environ.get("MACHINES_FILE", "../../infra/machines.json"))
INTERVAL = float(os.environ.get("INTERVAL_SECONDS", "1"))


def load_machines() -> list[Machine]:
    return [Machine(**m) for m in json.loads(MACHINES_FILE.read_text())]


def connect() -> mqtt.Client:
    url = urlparse(MQTT_URL)
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="lab-plant-pulse-simulator")
    client.reconnect_delay_set(min_delay=1, max_delay=10)
    client.connect(url.hostname or "localhost", url.port or 1883)
    client.loop_start()  # thread de rede em background; publish() enfileira e volta
    return client


def main() -> None:
    machines = load_machines()
    client = connect()
    started = time.monotonic()
    running = True

    def stop(*_: object) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    print(f"simulator: {len(machines)} machines -> {MQTT_URL} every {INTERVAL}s", flush=True)

    while running:
        t = time.monotonic() - started
        now = datetime.now(timezone.utc)
        for m in machines:
            metrics, status = PROFILES[m.profile](t)
            reading = TelemetryReading(
                readingId=str(uuid.uuid4()),
                assetId=m.id,
                ts=now,
                metrics=only_declared(metrics, m.sensors),
                status=status,
            )
            client.publish(f"plant/{m.sector}/{m.id}/telemetry", reading.to_json(), qos=1)
        time.sleep(INTERVAL)

    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()