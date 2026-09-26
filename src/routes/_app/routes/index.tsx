import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, MemoryStick, Thermometer, Zap } from "lucide-react";
import { ApGlyph } from "@/components/ap-glyph";
import { Meter } from "@/components/meter";
import { ThroughputChart } from "@/components/throughput-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardHint, CardTitle } from "@/components/ui/card";
import { DEVICE } from "@/lib/ap-seed";
import { ssidName, useApStore } from "@/lib/ap-store";
import { formatBytes, formatMbps, formatUptime, modeLabel } from "@/lib/format";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const hostname = useApStore((s) => s.hostname);
  const led = useApStore((s) => s.led);
  const bootAt = useApStore((s) => s.bootAt);
  const live = useApStore((s) => s.live);
  const radios = useApStore((s) => s.radios);
  const ssids = useApStore((s) => s.ssids);
  const clients = useApStore((s) => s.clients);
  const network = useApStore((s) => s.network);
  const logs = useApStore((s) => s.logs);

  const online = clients.filter((c) => !c.blocked);
  const n24 = online.filter((c) => c.band === "2.4").length;
  const n5 = online.filter((c) => c.band === "5").length;
  const last = live.samples[live.samples.length - 1];
  const memPct = (live.memUsedMb / DEVICE.ramMb) * 100;
  const cpuTone = live.cpu > 70 ? "bad" : live.cpu > 45 ? "warn" : "ok";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex min-w-0 flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <ApGlyph led={led} className="size-20 shrink-0 md:size-28" />
          <div>
            <p className="text-xs tracking-widest text-muted uppercase">Session démo</p>
            <h1 className="mt-1 text-2xl font-medium tracking-tight md:text-3xl">{hostname}</h1>
            <p className="mt-1 text-sm text-muted">
              {DEVICE.model} · OpenWrt {DEVICE.openwrt} · {modeLabel(network.mode)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="ok">en ligne</Badge>
              <Badge>2,5 GbE</Badge>
              <Badge>{DEVICE.poe} PoE</Badge>
              <Badge>Wi-Fi 6</Badge>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs text-muted md:text-right">
          <span>IP</span>
          <span className="truncate text-fg">{network.lanIp}</span>
          <span>Uptime</span>
          <span className="text-fg tabular">{formatUptime((live.now - bootAt) / 1000)}</span>
          <span>SoC</span>
          <span className="truncate text-fg">{DEVICE.soc}</span>
          <span>Cible</span>
          <span className="truncate text-fg">{DEVICE.target}</span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={Cpu}
          label="CPU"
          value={`${live.cpu.toFixed(0)} %`}
          hint={DEVICE.cpu}
          meter={live.cpu}
          tone={cpuTone}
        />
        <Stat
          icon={MemoryStick}
          label="Mémoire"
          value={`${live.memUsedMb.toFixed(0)} Mo`}
          hint={`${DEVICE.ramMb} Mo DDR4`}
          meter={memPct}
          tone={memPct > 80 ? "warn" : "ok"}
        />
        <Stat
          icon={Thermometer}
          label="Température"
          value={`${live.tempC.toFixed(0)} °C`}
          hint={`charge ${live.load[0].toFixed(2)}`}
          meter={(live.tempC / 70) * 100}
          tone={live.tempC > 58 ? "warn" : "ok"}
        />
        <Stat
          icon={Zap}
          label="PoE"
          value={`${live.poeWatts.toFixed(1)} W`}
          hint={`${DEVICE.ethSpeed} Mb/s full`}
          meter={(live.poeWatts / 15) * 100}
          tone="ok"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Débit airtime</CardTitle>
              <CardHint>Échantillons toutes les 1,5 s · descente / montée</CardHint>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg tabular text-fg">{formatMbps(last?.tx ?? 0)}</p>
              <p className="font-mono text-xs text-muted">{formatMbps(last?.rx ?? 0)} montée</p>
            </div>
          </CardHeader>
          <ThroughputChart samples={live.samples} />
        </Card>

        <div className="flex flex-col gap-3">
          {radios.map((radio) => {
            const liveR = live.radioLive[radio.id];
            const bandClients = online.filter((c) => c.band === radio.band).length;
            return (
              <Card key={radio.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{radio.band === "5" ? "5 GHz" : "2,4 GHz"}</p>
                  <Badge tone={radio.enabled ? "ok" : "muted"}>{radio.enabled ? "actif" : "off"}</Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  ch {radio.channel} · {radio.width} MHz · {radio.txPower} dBm
                </p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between font-mono text-xs text-muted">
                    <span>Occupation</span>
                    <span className="tabular">{liveR.utilization.toFixed(0)} %</span>
                  </div>
                  <Meter
                    value={liveR.utilization}
                    tone={radio.band === "5" ? "band5" : "band24"}
                  />
                </div>
                <p className="mt-3 font-mono text-xs text-muted">
                  {bandClients} clients · bruit {liveR.noise.toFixed(0)} dBm
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Clients associés</CardTitle>
              <CardHint>
                {online.length} en ligne · {n5} sur 5 GHz · {n24} sur 2,4 GHz
              </CardHint>
            </div>
            <Link to="/clients" className="text-xs text-muted hover:text-fg">
              Voir tout
            </Link>
          </CardHeader>
          <ul className="flex flex-col divide-y divide-border">
            {online.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate text-sm">{c.hostname}</p>
                  <p className="font-mono text-xs text-muted">
                    {c.ip} · {ssidName(ssids, c.ssidId)}
                  </p>
                </div>
                <Badge tone={c.band === "5" ? "band5" : "band24"}>{c.band === "5" ? "5 GHz" : "2,4"}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Journal</CardTitle>
              <CardHint>hostapd · netifd · kernel</CardHint>
            </div>
            <Link to="/systeme" className="text-xs text-muted hover:text-fg">
              Système
            </Link>
          </CardHeader>
          <ul className="log-term space-y-2 text-muted">
            {logs.slice(-7).reverse().map((l) => (
              <li key={l.id} className="flex gap-2">
                <span className={l.level === "err" || l.level === "warn" ? "text-warn" : "text-faint"}>
                  {l.facility}
                </span>
                <span className="min-w-0 truncate text-fg">{l.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini label="SSIDs" value={String(ssids.filter((s) => s.enabled).length)} hint="max 8" />
        <Mini label="Flash" value={`${DEVICE.flashMb} Mo`} hint="NAND" />
        <Mini label="Débit TX" value={formatBytes(online.reduce((a, c) => a + c.txBytes, 0), 0)} hint="cumul" />
        <Mini label="Révision" value={DEVICE.revision.split("-")[0]} hint="OpenWrt" />
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  meter,
  tone,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  hint: string;
  meter: number;
  tone: "ok" | "warn" | "bad" | "primary";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 font-mono text-xl tabular">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      <Meter className="mt-3" value={meter} tone={tone} />
    </Card>
  );
}

function Mini({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg tabular">{value}</p>
      <p className="text-xs text-faint">{hint}</p>
    </Card>
  );
}
