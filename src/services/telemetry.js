// Halte Telemetry & Vehicle Tracking Engine
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
    this.currentMode = TelemetrySourceType.SIMULATION; // Defaults to high-fidelity GTFS simulation with clear labeling
    this.activeVehicles = new Map(); // id -> vehicle
    this.pollInterval = null;
    this.simInterval = null;
    this.mqttStatus = "Auth Required (*.tj.co.id closed broker)";
    this.centerLat = -6.1754;
    this.centerLon = 106.8272;
    this.selectedRouteId = "1"; // Default corridor 1
    this.simulatedFleet = [];
  }

  /**
   * Subscribe to vehicle position stream
   */
  subscribe(callback) {
    this.listeners.add(callback);
    callback(Array.from(this.activeVehicles.values()), {
      mode: this.currentMode,
      mqttStatus: this.mqttStatus,
      lastUpdated: new Date()
    });
    return () => this.listeners.delete(callback);
  }

  notify() {
    const list = Array.from(this.activeVehicles.values());
    const meta = {
      mode: this.currentMode,
      mqttStatus: this.mqttStatus,
      lastUpdated: new Date(),
      count: list.length
    };
    for (const listener of this.listeners) {
      listener(list, meta);
    }
  }

  /**
   * Set map center for live REST discovery
   */
  setCenter(lat, lon) {
    this.centerLat = lat;
    this.centerLon = lon;
  }

  /**
   * Set route focus
   */
  setRoute(routeId) {
    this.selectedRouteId = routeId;
    if (this.currentMode === TelemetrySourceType.SIMULATION) {
      this.initSimulatedFleetForRoute(routeId);
    }
  }

  /**
   * Switch data source mode
   */
  setMode(mode) {
    this.currentMode = mode;
    this.stopAll();
    if (mode === TelemetrySourceType.LIVE_REST) {
      this.startRestPolling();
    } else if (mode === TelemetrySourceType.LIVE_MQTT) {
      this.tryMqttConnection();
    } else {
      this.startSimulation();
    }
  }

  stopAll() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.simInterval) clearInterval(this.simInterval);
  }

  /**
   * Attempt official MQTT connection
   */
  tryMqttConnection() {
    this.mqttStatus = "Menghubungkan ke wss://mqtt.tj.co.id:8084/mqtt...";
    this.notify();

    // Browser WebSocket attempt
    try {
      const ws = new WebSocket("wss://mqtt.tj.co.id:8084/mqtt");
      ws.onopen = () => {
        this.mqttStatus = "WebSocket Terbuka, Menunggu Otorisasi...";
        this.notify();
      };
      ws.onerror = () => {
        this.mqttStatus = "Ditolak: Broker MQTT Transjakarta Memerlukan Hak Akses Operator";
        this.notify();
      };
      ws.onclose = () => {
        this.mqttStatus = "Koneksi Terputus: Memerlukan Kredensial Khusus";
        this.notify();
      };
    } catch (e) {
      this.mqttStatus = "Gagal terhubung: " + e.message;
      this.notify();
    }
  }

  /**
   * Start REST live polling from /v1/bus
   */
  startRestPolling() {
    const poll = async () => {
      const res = await getLiveBusesFromAPI(this.centerLat, this.centerLon, 8);
      if (res && res.buses && res.buses.length > 0) {
        this.activeVehicles.clear();
        for (const b of res.buses) {
          this.activeVehicles.set(b.bus_body_no || b.id, {
            id: b.bus_body_no || b.id,
            busBodyNo: b.bus_body_no || "TJ-" + Math.floor(100 + Math.random() * 899),
            routeCode: b.route_code || "TJ",
            routeColor: b.route_color ? `#${b.route_color}` : "#0070BA",
            latitude: b.latitude,
            longitude: b.longitude,
            bearing: b.bearing || 0,
            speed: b.speed || Math.floor(20 + Math.random() * 25),
            currentStop: b.curr_stops || "Dalam Perjalanan",
            nextStop: b.next_stops || "Halte Berikutnya",
            etaNextStopSeconds: b.estimated_time_next_stops || 180,
            passengerStatus: b.passengers_status || "MEDIUM",
            busType: b.bus_type || "Transjakarta BRT Standard",
            dataSource: TelemetrySourceType.LIVE_REST,
            lastUpdate: Date.now()
          });
        }
        this.notify();
      } else {
        // If REST returned empty fleet in this specific coordinate radius, fall back gracefully to simulation
        if (this.activeVehicles.size === 0) {
          this.startSimulation();
        }
      }
    };
    poll();
    this.pollInterval = setInterval(poll, 12000);
  }

  /**
   * Initialize realistic moving fleet along real GTFS route polylines
   */
  initSimulatedFleetForRoute(routeId) {
    const route = localRoutes.find(r => r.id === routeId || r.code === routeId) || localRoutes[0];
    const shapes = localShapes[route.id] || {};
    const shapeKeys = Object.keys(shapes);

    let polyline = [];
    if (shapeKeys.length > 0 && shapes[shapeKeys[0]].length > 5) {
      polyline = shapes[shapeKeys[0]];
    } else {
      // Build polyline from stop coordinates
      const stopMap = new Map(localStops.map(s => [s.id, s]));
      const stops = (route.outboundStops || []).map(id => stopMap.get(id)).filter(Boolean);
      polyline = stops.map(s => [s.lat, s.lon]);
    }

    if (polyline.length < 2) {
      // Fallback Jakarta spine (Blok M - Kota)
      polyline = [
        [-6.2433, 106.8018], [-6.2300, 106.8080], [-6.2200, 106.8150],
        [-6.2008, 106.8229], [-6.1925, 106.8234], [-6.1754, 106.8272],
        [-6.1550, 106.8200], [-6.1376, 106.8146]
      ];
    }

    // Spawn 4-6 buses evenly distributed along the route
    const fleetCount = route.category === "mikrotrans" ? 6 : 4;
    const operators = ["TJ", "MYS", "PPD", "SAF", "BMP", "MAYASARI"];
    this.simulatedFleet = [];

    for (let i = 0; i < fleetCount; i++) {
      const progress = (i / fleetCount) * (polyline.length - 1);
      const op = operators[i % operators.length];
      const busNumber = `${op}-${Math.floor(100 + Math.random() * 899)}`;
      const loadOptions = ["SEPI (Low)", "SEDANG (Medium)", "PADAT (High)"];

      this.simulatedFleet.push({
        id: `sim-${route.code}-${i}`,
        busBodyNo: busNumber,
        routeCode: route.code,
        routeName: route.name,
        routeColor: route.color || "#0070BA",
        category: route.category,
        polyline,
        currentIndex: Math.floor(progress),
        currentFraction: progress - Math.floor(progress),
        direction: i % 2 === 0 ? 1 : -1, // both directions
        speedKmh: Math.floor(22 + Math.random() * 18),
        passengerStatus: loadOptions[i % 3],
        busType: route.category === "mikrotrans" ? "Mikrotrans AC / Non-AC" : (route.category === "brt" ? "Articulated Bus 18m" : "Single Bus Lowdeck 12m"),
        headsign: i % 2 === 0 ? (route.outboundHeadsign || "Terminal Akhir") : (route.inboundHeadsign || "Terminal Awal")
      });
    }
  }

  /**
   * Start moving simulation
   */
  startSimulation() {
    this.initSimulatedFleetForRoute(this.selectedRouteId);

    if (this.simInterval) clearInterval(this.simInterval);
    this.simInterval = setInterval(() => {
      this.activeVehicles.clear();
      for (const bus of this.simulatedFleet) {
        const poly = bus.polyline;
        if (poly.length < 2) continue;

        // Advance bus along polyline
        const step = 0.05 + (bus.speedKmh / 1000);
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
          currentStop: bus.direction === 1 ? "Arah " + bus.headsign : "Arah Berlawanan",
          nextStop: bus.headsign,
          etaNextStopSeconds: Math.floor(120 + Math.random() * 240),
          passengerStatus: bus.passengerStatus,
          busType: bus.busType,
          dataSource: TelemetrySourceType.SIMULATION,
          lastUpdate: Date.now()
        });
      }
      this.notify();
    }, 1500);
  }
}

export const telemetry = new TelemetryEngine();
