const UNITS = ["o", "Ko", "Mo", "Go", "To"] as const;

export function formatBytes(n: number, digits = 1): string {
  let v = n;
  let i = 0;
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : digits)}\u00a0${UNITS[i]}`;
}

export function formatMbps(n: number): string {
  if (n < 1) return `${Math.round(n * 1000)}\u00a0kb/s`;
  return `${n.toFixed(n >= 10 ? 0 : 1)}\u00a0Mb/s`;
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d} j ${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")}`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatRssi(rssi: number): "excellent" | "bon" | "moyen" | "faible" {
  if (rssi >= -55) return "excellent";
  if (rssi >= -67) return "bon";
  if (rssi >= -75) return "moyen";
  return "faible";
}

export function formatMac(mac: string): string {
  return mac.toUpperCase();
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d} j ${h % 24} h`;
  }
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

export function encryptionLabel(enc: string): string {
  switch (enc) {
    case "sae-mixed":
      return "WPA2/WPA3";
    case "sae":
      return "WPA3-SAE";
    case "psk2":
      return "WPA2-PSK";
    case "open":
      return "Ouvert";
    default:
      return enc;
  }
}

export function modeLabel(mode: string): string {
  switch (mode) {
    case "ap":
      return "Point d'accès";
    case "router":
      return "Routeur";
    case "wisp":
      return "WISP";
    case "repeater":
      return "Répéteur";
    default:
      return mode;
  }
}
