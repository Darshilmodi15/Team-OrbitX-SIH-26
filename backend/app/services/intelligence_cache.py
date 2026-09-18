"""Bounded process cache and striped single-flight locks for optional providers."""
from collections import OrderedDict
from copy import deepcopy
from threading import Lock
from time import monotonic


class EvidenceCache:
    def __init__(self, capacity=64):
        self.capacity = capacity
        self.entries = OrderedDict()
        self.lock = Lock()
        self.flights = [Lock() for _ in range(16)]

    def resolve(self, key, fetch, ttl=86400):
        with self.flights[hash(key) % len(self.flights)]:
            with self.lock:
                entry = self.entries.get(key)
                if entry and entry[0] > monotonic():
                    self.entries.move_to_end(key)
                    value = deepcopy(entry[1])
                    value["cache_status"] = "cached"
                    return value
            value = fetch()
            lifetime = ttl if value["status"] in {"available", "empty"} else 60
            with self.lock:
                self.entries[key] = (monotonic() + lifetime, deepcopy(value))
                self.entries.move_to_end(key)
                while len(self.entries) > self.capacity:
                    self.entries.popitem(last=False)
            return value
