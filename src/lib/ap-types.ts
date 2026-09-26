export type Band = "2.4" | "5";
export type ChannelWidth = 20 | 40 | 80 | 160;
export type Encryption = "sae-mixed" | "sae" | "psk2" | "open";
export type OpMode = "ap" | "router" | "wisp" | "repeater";
export type LogLevel = "info" | "notice" | "warn" | "err";
export type WifiStandard = "Wi-Fi 6" | "Wi-Fi 5" | "Wi-Fi 4";

export type RadioId = "radio0" | "radio1";

export type RadioConfig = {
  id: RadioId;
  band: Band;
  label: string;
  enabled: boolean;
  channel: number | "auto";
  width: ChannelWidth;
  txPower: number;
  ofdma: boolean;
  muMimo: boolean;
  bssColor: number;
  beamforming: boolean;
  airtimeFairness: boolean;
  country: string;
};

export type LiveRadio = {
  utilization: number;
  noise: number;
  txMbps: number;
  rxMbps: number;
};

export type Ssid = {
  id: string;
  name: string;
  enabled: boolean;
  band: Band | "both";
  encryption: Encryption;
  key: string;
  hidden: boolean;
  isolate: boolean;
  vlan: number;
  guest: boolean;
};

export type Client = {
  id: string;
  hostname: string;
  mac: string;
  ip: string;
  band: Band;
  ssidId: string;
  rssi: number;
  txRate: number;
  rxRate: number;
  txBytes: number;
  rxBytes: number;
  connectedAt: number;
  vendor: string;
  blocked: boolean;
  standard: WifiStandard;
};

export type LogEntry = {
  id: string;
  ts: number;
  facility: string;
  level: LogLevel;
  message: string;
};

export type NetworkConfig = {
  mode: OpMode;
  lanIp: string;
  lanPrefix: number;
  gateway: string;
  dhcp: boolean;
  dhcpStart: string;
  dhcpLimit: number;
  ipv6: boolean;
  igmpSnooping: boolean;
  stp: boolean;
  mtu: number;
};

export type MeshConfig = {
  enabled: boolean;
  meshId: string;
  fastTransition: boolean;
  kvr: boolean;
  bandSteering: boolean;
  backhaul: "wireless" | "wired";
};

export type Sample = { t: number; tx: number; rx: number; cpu: number };
