import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BOOT_AT,
  DEVICE,
  seedClients,
  seedLogs,
  seedMesh,
  seedNetwork,
  seedRadios,
  seedSamples,
  seedSsids,
} from "./ap-seed";
import type {
  Client,
  LiveRadio,
  LogEntry,
  LogLevel,
  MeshConfig,
  NetworkConfig,
  RadioConfig,
  RadioId,
  Sample,
  Ssid,
} from "./ap-types";

type LiveState = {
  cpu: number;
  memUsedMb: number;
  tempC: number;
  load: [number, number, number];
  poeWatts: number;
  radioLive: Record<RadioId, LiveRadio>;
  samples: Sample[];
  now: number;
};

type ApState = {
  hostname: string;
  led: boolean;
  timezone: string;
  dirty: number;
  applying: boolean;
  rebooting: boolean;
  bootAt: number;
  radios: RadioConfig[];
  ssids: Ssid[];
  clients: Client[];
  network: NetworkConfig;
  mesh: MeshConfig;
  logs: LogEntry[];
  live: LiveState;
  kickClient: (id: string) => void;
  blockClient: (id: string) => void;
  renameClient: (id: string, hostname: string) => void;
  setRadio: (id: RadioId, patch: Partial<RadioConfig>) => void;
  setSsid: (id: string, patch: Partial<Ssid>) => void;
  addSsid: (ssid: Omit<Ssid, "id">) => string | null;
  removeSsid: (id: string) => void;
  setNetwork: (patch: Partial<NetworkConfig>) => void;
  setMesh: (patch: Partial<MeshConfig>) => void;
  setHostname: (hostname: string) => void;
  setLed: (led: boolean) => void;
  setTimezone: (timezone: string) => void;
  apply: () => void;
  reboot: () => void;
  finishReboot: () => void;
  tick: () => void;
  pushLog: (facility: string, level: LogLevel, message: string) => void;
};

let seq = 100;
function nid(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
}

function jitter(n: number, amp: number, min: number, max: number) {
  const v = n + (Math.random() - 0.5) * amp;
  return Math.min(max, Math.max(min, v));
}

const initialLive: LiveState = {
  cpu: 22,
  memUsedMb: 186,
  tempC: 46,
  load: [0.34, 0.28, 0.22],
  poeWatts: 9.4,
  radioLive: {
    radio0: { utilization: 18, noise: -92, txMbps: 12, rxMbps: 6 },
    radio1: { utilization: 31, noise: -95, txMbps: 48, rxMbps: 21 },
  },
  samples: seedSamples(),
  now: BOOT_AT + 12 * 86_400_000,
};

export const useApStore = create<ApState>()(
  persist(
    (set, get) => ({
      hostname: "ap3000-salon",
      led: true,
      timezone: "Europe/Paris",
      dirty: 0,
      applying: false,
      rebooting: false,
      bootAt: BOOT_AT,
      radios: seedRadios,
      ssids: seedSsids,
      clients: seedClients,
      network: seedNetwork,
      mesh: seedMesh,
      logs: seedLogs,
      live: initialLive,

      kickClient: (id) => {
        const client = get().clients.find((c) => c.id === id);
        if (!client) return;
        set((s) => ({
          clients: s.clients.filter((c) => c.id !== id),
        }));
        get().pushLog(
          "hostapd",
          "notice",
          `phy${client.band === "5" ? "1" : "0"}-ap0: AP-STA-DISCONNECTED ${client.mac.toLowerCase()} (kicked)`,
        );
      },

      blockClient: (id) => {
        const client = get().clients.find((c) => c.id === id);
        if (!client) return;
        set((s) => ({
          clients: s.clients.map((c) => (c.id === id ? { ...c, blocked: !c.blocked } : c)),
          dirty: s.dirty + 1,
        }));
        const next = get().clients.find((c) => c.id === id);
        get().pushLog(
          "firewall",
          "warn",
          next?.blocked
            ? `MAC filter DROP ${client.mac} (${client.hostname})`
            : `MAC filter ACCEPT ${client.mac} (${client.hostname})`,
        );
      },

      renameClient: (id, hostname) => {
        set((s) => ({
          clients: s.clients.map((c) => (c.id === id ? { ...c, hostname } : c)),
        }));
      },

      setRadio: (id, patch) => {
        set((s) => ({
          radios: s.radios.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          dirty: s.dirty + 1,
        }));
      },

      setSsid: (id, patch) => {
        set((s) => ({
          ssids: s.ssids.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          dirty: s.dirty + 1,
        }));
      },

      addSsid: (ssid) => {
        const { ssids } = get();
        if (ssids.length >= 8) return null;
        const id = nid("ssid");
        set((s) => ({ ssids: [...s.ssids, { ...ssid, id }], dirty: s.dirty + 1 }));
        return id;
      },

      removeSsid: (id) => {
        set((s) => ({ ssids: s.ssids.filter((x) => x.id !== id), dirty: s.dirty + 1 }));
      },

      setNetwork: (patch) => {
        set((s) => ({ network: { ...s.network, ...patch }, dirty: s.dirty + 1 }));
      },

      setMesh: (patch) => {
        set((s) => ({ mesh: { ...s.mesh, ...patch }, dirty: s.dirty + 1 }));
      },

      setHostname: (hostname) => {
        set((s) => ({ hostname, dirty: s.dirty + 1 }));
      },

      setLed: (led) => {
        set({ led });
        get().pushLog("system", "info", `LED ${led ? "on" : "off"} (gpio: blue)`);
      },

      setTimezone: (timezone) => {
        set((s) => ({ timezone, dirty: s.dirty + 1 }));
      },

      apply: () => {
        set({ applying: true });
        window.setTimeout(() => {
          get().pushLog("uci", "notice", "uci commit wireless; wifi reload");
          get().pushLog("hostapd", "info", "configuration applied — AP-ENABLED");
          set({ applying: false, dirty: 0 });
        }, 700);
      },

      reboot: () => {
        set({ rebooting: true });
        get().pushLog("system", "warn", "reboot requested (watchdog ok)");
      },

      finishReboot: () => {
        const bootAt = Date.now();
        set({
          rebooting: false,
          bootAt,
          dirty: 0,
          live: {
            ...initialLive,
            cpu: 8,
            memUsedMb: 142,
            tempC: 38,
            samples: seedSamples().map((s, i) => ({
              ...s,
              t: bootAt - (59 - i) * 2000,
              tx: 4 + i * 0.2,
              rx: 2,
              cpu: 8 + (i % 4),
            })),
            now: bootAt,
          },
        });
        get().pushLog("kernel", "info", `Linux version ${DEVICE.kernel} — ${DEVICE.board}`);
        get().pushLog("netifd", "notice", "Interface 'lan' is now up");
        get().pushLog("hostapd", "info", "phy1-ap0: AP-ENABLED  channel=36  width=160 MHz");
      },

      pushLog: (facility, level, message) => {
        const entry: LogEntry = {
          id: nid("log"),
          ts: Date.now(),
          facility,
          level,
          message,
        };
        set((s) => ({ logs: [...s.logs.slice(-200), entry] }));
      },

      tick: () => {
        const s = get();
        if (s.rebooting) return;
        const now = Date.now();
        const radio0On = s.radios[0]?.enabled ?? true;
        const radio1On = s.radios[1]?.enabled ?? true;
        const n5 = s.clients.filter((c) => !c.blocked && c.band === "5").length;
        const n24 = s.clients.filter((c) => !c.blocked && c.band === "2.4").length;
        const tx = (radio1On ? 28 + n5 * 4.2 : 0) + (radio0On ? 6 + n24 * 1.1 : 0);
        const rx = tx * (0.35 + Math.random() * 0.15);
        const cpu = jitter(16 + n5 * 1.8 + n24 * 0.6, 6, 6, 78);
        set({
          clients: s.clients.map((c) =>
            c.blocked
              ? c
              : {
                  ...c,
                  rssi: Math.round(jitter(c.rssi, 3, -88, -28)),
                  txBytes: c.txBytes + Math.round(Math.random() * 40_000),
                  rxBytes: c.rxBytes + Math.round(Math.random() * 18_000),
                },
          ),
          live: {
            cpu,
            memUsedMb: jitter(s.live.memUsedMb, 4, 140, 320),
            tempC: jitter(44 + cpu / 10, 1.4, 38, 62),
            load: [
              cpu / 50,
              jitter(s.live.load[1], 0.04, 0.1, 1.6),
              jitter(s.live.load[2], 0.02, 0.08, 1.2),
            ],
            poeWatts: jitter(8.2 + (radio0On ? 1.4 : 0) + (radio1On ? 2.1 : 0) + n5 * 0.12, 0.4, 6, 14),
            radioLive: {
              radio0: {
                utilization: radio0On ? jitter(10 + n24 * 4, 6, 2, 80) : 0,
                noise: jitter(-92, 2, -98, -86),
                txMbps: radio0On ? jitter(4 + n24 * 1.5, 3, 0, 80) : 0,
                rxMbps: radio0On ? jitter(2 + n24, 2, 0, 40) : 0,
              },
              radio1: {
                utilization: radio1On ? jitter(16 + n5 * 3.5, 8, 2, 85) : 0,
                noise: jitter(-95, 2, -99, -88),
                txMbps: radio1On ? jitter(20 + n5 * 5, 10, 0, 400) : 0,
                rxMbps: radio1On ? jitter(8 + n5 * 2, 6, 0, 200) : 0,
              },
            },
            samples: [
              ...s.live.samples.slice(-59),
              { t: now, tx: jitter(tx, 10, 0, 600), rx: jitter(rx, 6, 0, 300), cpu },
            ],
            now,
          },
        });
      },
    }),
    {
      name: "beacon-ap3000",
      partialize: (s) => ({
        hostname: s.hostname,
        led: s.led,
        timezone: s.timezone,
        radios: s.radios,
        ssids: s.ssids,
        network: s.network,
        mesh: s.mesh,
        clients: s.clients.map((c) => ({
          ...c,
          blocked: c.blocked,
          hostname: c.hostname,
        })),
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ApState> | undefined;
        if (!p) return current;
        return {
          ...current,
          ...p,
          live: current.live,
          logs: current.logs,
          dirty: 0,
          applying: false,
          rebooting: false,
          bootAt: current.bootAt,
          clients:
            p.clients?.map((pc) => {
              const base = current.clients.find((c) => c.id === pc.id) ?? pc;
              return { ...base, ...pc };
            }) ?? current.clients,
        };
      },
    },
  ),
);

export function ssidName(ssids: Ssid[], id: string) {
  return ssids.find((s) => s.id === id)?.name ?? "—";
}
