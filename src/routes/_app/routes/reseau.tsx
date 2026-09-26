import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardHint, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEVICE } from "@/lib/ap-seed";
import { useApStore } from "@/lib/ap-store";
import type { OpMode } from "@/lib/ap-types";
import { modeLabel } from "@/lib/format";

export const Route = createFileRoute("/_app/reseau")({
  component: NetworkPage,
});

const MODES: OpMode[] = ["ap", "router", "wisp", "repeater"];

function NetworkPage() {
  const network = useApStore((s) => s.network);
  const setNetwork = useApStore((s) => s.setNetwork);
  const ssids = useApStore((s) => s.ssids);
  const live = useApStore((s) => s.live);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <p className="text-xs tracking-widest text-muted uppercase">netifd · dnsmasq</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Réseau</h1>
        <p className="mt-1 text-sm text-muted">
          Port {DEVICE.phy} · {DEVICE.ethSpeed} Mb/s · {DEVICE.poe}
        </p>
      </header>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Mode de fonctionnement</CardTitle>
            <CardHint>Correspond à network.device + wireless.mode dans UCI</CardHint>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {MODES.map((m) => {
            const active = network.mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setNetwork({ mode: m, dhcp: m === "router" })}
                className={
                  active
                    ? "rounded-lg border border-primary bg-elevated px-3 py-3 text-left"
                    : "rounded-lg border border-border bg-bg px-3 py-3 text-left hover:bg-elevated"
                }
              >
                <p className="text-sm font-medium">{modeLabel(m)}</p>
                <p className="mt-1 text-xs text-muted">
                  {m === "ap" && "Pont LAN, DHCP amont"}
                  {m === "router" && "NAT + DHCP local"}
                  {m === "wisp" && "Client WAN Wi-Fi"}
                  {m === "repeater" && "Répéteur + SSID"}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Interface lan</CardTitle>
              <CardHint>br-lan · eth0 2,5 GbE</CardHint>
            </div>
            <Badge tone="ok">up</Badge>
          </CardHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="lan-ip">Adresse IPv4</Label>
              <Input
                id="lan-ip"
                className="mt-1.5 font-mono"
                value={network.lanIp}
                onChange={(e) => setNetwork({ lanIp: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="prefix">Préfixe</Label>
                <Input
                  id="prefix"
                  className="mt-1.5 font-mono"
                  type="number"
                  min={8}
                  max={30}
                  value={network.lanPrefix}
                  onChange={(e) => setNetwork({ lanPrefix: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="mtu">MTU</Label>
                <Input
                  id="mtu"
                  className="mt-1.5 font-mono"
                  type="number"
                  value={network.mtu}
                  onChange={(e) => setNetwork({ mtu: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="gw">Passerelle</Label>
              <Input
                id="gw"
                className="mt-1.5 font-mono"
                value={network.gateway}
                onChange={(e) => setNetwork({ gateway: e.target.value })}
              />
            </div>
            <p className="font-mono text-xs text-muted">
              débit {live.radioLive.radio1.txMbps.toFixed(0)} Mb/s air · PoE {live.poeWatts.toFixed(1)} W
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>DHCP</CardTitle>
              <CardHint>
                {network.mode === "ap"
                  ? "Désactivé en mode AP — le routeur amont distribue les baux"
                  : "dnsmasq sur br-lan"}
              </CardHint>
            </div>
            <Switch
              checked={network.dhcp}
              onCheckedChange={(v) => setNetwork({ dhcp: v })}
              aria-label="Serveur DHCP"
            />
          </CardHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="dhcp-start">Début de plage</Label>
              <Input
                id="dhcp-start"
                className="mt-1.5 font-mono"
                disabled={!network.dhcp}
                value={network.dhcpStart}
                onChange={(e) => setNetwork({ dhcpStart: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dhcp-limit">Nombre de baux</Label>
              <Input
                id="dhcp-limit"
                className="mt-1.5 font-mono"
                type="number"
                disabled={!network.dhcp}
                value={network.dhcpLimit}
                onChange={(e) => setNetwork({ dhcpLimit: Number(e.target.value) })}
              />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>VLAN par SSID</CardTitle>
            <CardHint>802.1Q sur eth0 — isolation d'invités et d'IoT</CardHint>
          </div>
        </CardHeader>
        <ul className="divide-y divide-border">
          {ssids.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm">{s.name}</p>
                <p className="font-mono text-xs text-muted">{s.band === "both" ? "2,4+5" : `${s.band} GHz`}</p>
              </div>
              <div className="flex items-center gap-3">
                {s.guest ? <Badge tone="warn">invité</Badge> : null}
                <span className="font-mono text-sm tabular">VLAN {s.vlan}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pont et multicast</CardTitle>
            <CardHint>Options br-lan</CardHint>
          </div>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <Toggle
            label="IPv6"
            hint="RA / DHCPv6"
            checked={network.ipv6}
            onChange={(v) => setNetwork({ ipv6: v })}
          />
          <Toggle
            label="IGMP snooping"
            hint="IPTV / mDNS"
            checked={network.igmpSnooping}
            onChange={(v) => setNetwork({ igmpSnooping: v })}
          />
          <Toggle
            label="STP"
            hint="boucles mesh"
            checked={network.stp}
            onChange={(v) => setNetwork({ stp: v })}
          />
        </div>
      </Card>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-elevated px-3 py-3">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
