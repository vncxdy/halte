// Halte Telemetry & Real-Time Fleet Tracking Engine
import { getLiveBusesFromAPI, localRoutes, localShapes, localStops } from "./api";
import { calculateBearing, getDistanceKm } from "./geo";

export const TelemetrySourceType = {
  LIVE_MQTT: "LIVE_MQTT",
  LIVE_REST: "LIVE_REST",
  LAST_KNOWN: "LAST_KNOWN",
  SIMULATION: "SIMULATION"
};

class TelemetryEngine {
  constructor() {
    this.listeners = new Set();
    this.currentMode = TelemetrySourceType.SIMULATION;
    this.activeVehicles = new Map();
    this.pollInterval = null;
    this.simInterval = null;
    this.mqttStatus = "Auth Required (*.tj.co.id closed broker)";
    this.mqttLatency = null;
    this.centerLat = -6.1754;
    this.centerLon = 106.8272;
    this.selectedRouteId = "1";
    this.speedMultiplier = 1; // 1 = normal, 2 = fast, 0 = paused
    this.simulatedFleet = [];

    // Pre-cache stops map for instant lookup
    this.stopsMap = new Map(localStops.map(s => [s.id, s]));
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(Array.from(this.activeVehicles.values()), this.getMeta());
    return () => this.listeners.delete(callback);
  }

  getMeta() {
    return {
      mode: this.currentMode,
      mqttStatus: this.mqttStatus,
      mqttLatency: this.mqttLatency,
      speedMultiplier: this.speedMultiplier,
      selectedRouteId: this.selectedRouteId,
      lastUpdated: new Date(),
      count: this.activeVehicles.size
    };
  }

  notify() {
    const list = Array.from(this.activeVehicles.values());
    const meta = this.getMeta();
    for (const listener of this.listeners) {
      listener(list, meta);
    }
  }

  setCenter(lat, lon) {
    this.centerLat = lat;
    this.centerLon = lon;
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
    this.notify();
  }

  setRoute(routeId) {
    this.selectedRouteId = routeId;
    this.initSimulatedFleet(routeId);
    this.notify();
  }

  setMode(mode) {
    this.currentMode = mode;
    this.stopAll();
    if (mode === TelemetrySourceType.LIVE_REST) {
      this.startRestPolling();
    } else if (mode === TelemetrySourceType.LIVE_MQTT) {
      this.probeMqttConnection();
    } else {
      this.startSimulation();
    }
  }

  stopAll() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }

  /**
   * Probe live WSS MQTT broker at wss://mqtt.tj.co.id:8084/mqtt
   */
  async probeMqttConnection() {
    this.mqttStatus = "Menghubungi wss://mqtt.tj.co.id:8084/mqtt...";
    this.notify();

    const start = performance.now();
    try {
      const ws = new WebSocket("wss://mqtt.tj.co.id:8084/mqtt");

      const timeout = setTimeout(() => {
        try { ws.close(); } catch (e) {}
        this.mqttStatus = "Timeout: Server tidak merespons dalam 5 detik";
        this.notify();
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        const elapsed = Math.round(performance.now() - start);
        this.mqttLatency = elapsed;
        this.mqttStatus = `Handshake WSS Berhasil (${elapsed}ms). Menunggu otorisasi klien...`;
        this.notify();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        const elapsed = Math.round(performance.now() - start);
        this.mqttLatency = elapsed;
        this.mqttStatus = `Otorisasi Gagal: Broker Tertutup (*.tj.co.id hanya untuk armada internal operator)`;
        this.notify();
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        this.mqttStatus = `Koneksi Selesai (Kode: ${event.code || 1006} - Closed/Unauthorized)`;
        this.notify();
      };
    } catch (e) {
      this.mqttStatus = "Gagal inisialisasi WebSocket: " + e.message;
      this.notify();
    }
  }

  /**
   * Live polling from official REST TiJe API
   */
  startRestPolling() {
    const poll = async () => {
      const res = await getLiveBusesFromAPI(this.centerLat, this.centerLon, 10);
      if (res && res.buses && res.buses.length > 0) {
        this.activeVehicles.clear();
        for (const b of res.buses) {
          const id = b.bus_body_no || b.id || `tj-live-${Math.random()}`;
          this.activeVehicles.set(id, {
            id,
            busBodyNo: b.bus_body_no || "TJ-Armada",
            routeCode: b.route_code || "TJ",
            routeName: b.route_long_name || "Layanan Transjakarta",
            routeColor: b.route_color ? `#${b.route_color}` : "#0070BA",
            latitude: b.latitude,
            longitude: b.longitude,
            bearing: b.bearing || 0,
            speed: b.speed || 24,
            currentStop: b.curr_stops || "Dalam Perjalanan",
            nextStop: b.next_stops || "Halte Terdekat",
            etaNextStopSeconds: b.estimated_time_next_stops || 120,
            passengerStatus: b.passengers_status || "SEDANG (Medium)",
            busType: b.bus_type || "Transjakarta BRT",
            dataSource: TelemetrySourceType.LIVE_REST,
            lastUpdate: Date.now()
          });
        }
        this.notify();
      } else {
        // An empty or unavailable live response must not be replaced with
        // fabricated positions, speed, occupancy, or arrival predictions.
        this.activeVehicles.clear();
        this.notify();
      }
    };

    poll();
    this.pollInterval = setInterval(poll, 10000);
  }

  /**
   * Initialize fleet for single route OR all BRT corridors
   */
  initSimulatedFleet(routeId) {
    this.simulatedFleet = [];
    const isMultiCorridor = routeId === "ALL_BRT" || routeId === "all";

    const targetRoutes = isMultiCorridor
      ? localRoutes.filter(r => r.category === "brt").slice(0, 14)
      : [localRoutes.find(r => r.id === routeId || r.code === routeId) || localRoutes[0]];

    const operators = ["TJ", "MYS", "PPD", "SAF", "BMP", "MAYASARI"];
    const loadOptions = ["SEPI (Low)", "SEDANG (Medium)", "PADAT (High)"];

    for (const route of targetRoutes) {
      const shapes = localShapes[route.id] || {};
      const shapeKeys = Object.keys(shapes);

      let polyline = [];
      if (shapeKeys.length > 0 && shapes[shapeKeys[0]].length > 5) {
        polyline = shapes[shapeKeys[0]];
      } else {
        const stops = (route.outboundStops || []).map(id => this.stopsMap.get(id)).filter(Boolean);
        polyline = stops.map(s => [s.lat, s.lon]);
      }

      if (polyline.length < 2) continue;

      // Spawn 3-5 buses per route
      const busCount = isMultiCorridor ? 2 : (route.category === "mikrotrans" ? 6 : 4);

      // Extract route stops for next halte calculation
      const stopList = (route.outboundStops || []).map(id => this.stopsMap.get(id)).filter(Boolean);

      for (let i = 0; i < busCount; i++) {
        const progress = (i / busCount) * (polyline.length - 1);
        const op = operators[Math.floor(Math.random() * operators.length)];
        const busNumber = `${op}-${Math.floor(100 + Math.random() * 899)}`;

        this.simulatedFleet.push({
          id: `bus-${route.code}-${i}`,
          busBodyNo: busNumber,
          routeCode: route.code,
          routeName: route.name,
          routeColor: route.color || "#0070BA",
          category: route.category,
          polyline,
          stopList,
          currentIndex: Math.floor(progress),
          currentFraction: progress - Math.floor(progress),
          direction: i % 2 === 0 ? 1 : -1,
          speedKmh: Math.floor(22 + Math.random() * 16),
          passengerStatus: loadOptions[i % 3],
          busType: route.category === "mikrotrans" ? "Mikrotrans AC" : (route.category === "brt" ? "Articulated Bus 18m" : "Single Bus Lowdeck 12m"),
          headsign: i % 2 === 0 ? (route.outboundHeadsign || "Terminal Akhir") : (route.inboundHeadsign || "Terminal Awal")
        });
      }
    }
  }

  /**
   * Start moving simulation loop
   */
  startSimulation() {
    this.initSimulatedFleet(this.selectedRouteId);

    if (this.simInterval) clearInterval(this.simInterval);
    this.simInterval = setInterval(() => {
      if (this.speedMultiplier === 0) return; // Paused

      this.activeVehicles.clear();

      for (const bus of this.simulatedFleet) {
        const poly = bus.polyline;
        if (poly.length < 2) continue;

        // Advance bus along polyline
        const baseStep = 0.04 + (bus.speedKmh / 1200);
        const step = baseStep * this.speedMultiplier;
        bus.currentFraction += step * bus.direction;

        if (bus.currentFraction >= 1) {
          bus.currentIndex += 1;
          bus.currentFraction = 0;
          if (bus.currentIndex >= poly.length - 1) {
            bus.direction = -1;
            bus.currentIndex = poly.length - 2;
            bus.currentFraction = 1;
          }
        } else if (bus.currentFraction <= 0) {
          bus.currentIndex -= 1;
          bus.currentFraction = 1;
          if (bus.currentIndex < 0) {
            bus.direction = 1;
            bus.currentIndex = 0;
            bus.currentFraction = 0;
          }
        }

        const p1 = poly[bus.currentIndex] || poly[0];
        const p2 = poly[bus.currentIndex + 1] || p1;

        const lat = p1[0] + (p2[0] - p1[0]) * bus.currentFraction;
        const lon = p1[1] + (p2[1] - p1[1]) * bus.currentFraction;
        const bearing = bus.direction === 1
          ? calculateBearing(p1[0], p1[1], p2[0], p2[1])
          : calculateBearing(p2[0], p2[1], p1[0], p1[1]);

        // Calculate upcoming stops along direction
        const upcoming = this.calculateUpcomingStops(lat, lon, bus.stopList, bus.direction, bus.speedKmh);

        this.activeVehicles.set(bus.id, {
          id: bus.id,
          busBodyNo: bus.busBodyNo,
          routeCode: bus.routeCode,
          routeName: bus.routeName,
          routeColor: bus.routeColor,
          category: bus.category,
          latitude: lat,
          longitude: lon,
          bearing: Math.round(bearing),
          speed: bus.speedKmh,
          currentStop: bus.direction === 1 ? "Menuju " + (upcoming[0]?.name || bus.headsign) : "Arah Berlawanan",
          nextStop: upcoming[0]?.name || bus.headsign,
          etaNextStopSeconds: upcoming[0]?.etaSeconds || 120,
          upcomingStops: upcoming,
          passengerStatus: bus.passengerStatus,
          busType: bus.busType,
          dataSource: TelemetrySourceType.SIMULATION,
          lastUpdate: Date.now()
        });
      }

      this.notify();
    }, 1200);
  }

  calculateUpcomingStops(lat, lon, stopList, direction, speedKmh) {
    if (!stopList || stopList.length === 0) return [];

    // Find nearest stop and subsequent stops
    const stopsWithDist = stopList.map(s => ({
      ...s,
      distKm: getDistanceKm(lat, lon, s.lat, s.lon)
    }));

    stopsWithDist.sort((a, b) => a.distKm - b.distKm);
    const closest = stopsWithDist.slice(0, 3);

    return closest.map((s, idx) => {
      const distM = Math.round(s.distKm * 1000);
      const etaSeconds = Math.max(30, Math.round((s.distKm / (speedKmh || 22)) * 3600));
      return {
        name: s.name,
        distanceMeters: distM,
        etaSeconds,
        etaMinutes: Math.max(1, Math.round(etaSeconds / 60))
      };
    });
  }
}

export const telemetry = new TelemetryEngine();
telemetry.startSimulation(); // Start engine immediately
