const LIVE_REST = "LIVE_REST";
const LIVE_MQTT = "LIVE_MQTT";
const SIMULATION = "SIMULATION";

export function getVehicleStatus(meta = {}) {
  if (meta.mode === LIVE_REST || meta.mode === LIVE_MQTT) {
    return { id: "live", label: "Live", detail: "Telemetri terverifikasi dari sumber operator", tone: "success" };
  }
  if (meta.mode === SIMULATION) {
    return { id: "demo", label: "Demo", detail: "Posisi simulasi untuk demonstrasi, bukan GPS live", tone: "warning" };
  }
  return { id: "unavailable", label: "Tidak tersedia", detail: "Tidak ada posisi kendaraan yang dapat diverifikasi", tone: "muted" };
}