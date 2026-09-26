import { createFileRoute } from "@tanstack/react-router";
import { Download, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardHint, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEVICE } from "@/lib/ap-seed";
import { useApStore } from "@/lib/ap-store";
import { formatUptime } from "@/lib/format";

export const Route = createFileRoute("/_app/systeme")({
  component: SystemPage,
});

function SystemPage() {
  const hostname = useApStore((s) => s.hostname);
  const setHostname = useApStore((s) => s.setHostname);
  const timezone = useApStore((s) => s.timezone);
  const setTimezone = useApStore((s) => s.setTimezone);
  const led = useApStore((s) => s.led);
  const setLed = useApStore((s) => s.setLed);
  const bootAt = useApStore((s) => s.bootAt);
  const now = useApStore((s) => s.live.now);
  const logs = useApStore((s) => s.logs);
  const radios = useApStore((s) => s.radios);
  const ssids = useApStore((s) => s.ssids);
  const network = useApStore((s) => s.network);
  const mesh = useApStore((s) => s.mesh);
  const reboot = useApStore((s) => s.reboot);
  const [confirm, setConfirm] = useState(false);
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? logs.filter(
          (l) =>
            l.message.toLowerCase().includes(q) ||
            l.facility.toLowerCase().includes(q) ||
            l.level.includes(q),
        )
      : logs;
    return list.slice(-80).reverse();
  }, [logs, filter]);

  function backup() {
    const payload = {
      device: DEVICE,
      hostname,
      timezone,
      led,
      radios,
      ssids,
      network,
      mesh,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${hostname}-uci-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Sauvegarde exportée", { description: "JSON UCI-like" });
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <p className="text-xs tracking-widest text-muted uppercase">procd · ubus</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Système</h1>
        <p className="mt-1 text-sm text-muted">
          OpenWrt {DEVICE.openwrt} ({DEVICE.revision}) · Linux {DEVICE.kernel}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Identité</CardTitle>
              <CardHint>{DEVICE.board}</CardHint>
            </div>
            <Badge tone="ok">filogic</Badge>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-y-2 font-mono text-xs">
            <dt className="text-muted">Modèle</dt>
            <dd>{DEVICE.model}</dd>
            <dt className="text-muted">SoC</dt>
            <dd>{DEVICE.soc}</dd>
            <dt className="text-muted">Radio</dt>
            <dd>{DEVICE.radioChip}</dd>
            <dt className="text-muted">PHY</dt>
            <dd>{DEVICE.phy}</dd>
            <dt className="text-muted">RAM / Flash</dt>
            <dd>
              {DEVICE.ramMb} / {DEVICE.flashMb} Mo
            </dd>
            <dt className="text-muted">Uptime</dt>
            <dd className="tabular">{formatUptime((now - bootAt) / 1000)}</dd>
          </dl>
          <div className="mt-4 grid gap-3">
            <div>
              <Label htmlFor="hostname">Nom d'hôte</Label>
              <Input
                id="hostname"
                className="mt-1.5 font-mono"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tz">Fuseau</Label>
              <NativeSelect
                id="tz"
                className="mt-1.5"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/Brussels">Europe/Bruxelles</option>
                <option value="Europe/Zurich">Europe/Zurich</option>
                <option value="UTC">UTC</option>
              </NativeSelect>
            </div>
            <div className="flex items-center justify-between rounded-md bg-elevated px-3 py-3">
              <div>
                <p className="text-sm">LED système</p>
                <p className="text-xs text-muted">gpio bleu plafond</p>
              </div>
              <Switch checked={led} onCheckedChange={setLed} aria-label="LED" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Maintenance</CardTitle>
              <CardHint>Session démo — télémétrie fidèle au hardware, sans ubus réel</CardHint>
            </div>
          </CardHeader>
          <p className="text-sm text-muted">
            Beacon simule un Cudy AP3000 sous OpenWrt 24.10 (mediatek/filogic). Les réglages sont
            persistés dans le navigateur. Un vrai AP répondrait via LuCI JSON-RPC sur {DEVICE.defaultIp}.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button variant="secondary" onClick={backup}>
              <Download className="size-4" />
              Exporter la configuration
            </Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              <RotateCcw className="size-4" />
              Redémarrer l'AP
            </Button>
          </div>
          <div className="mt-5 rounded-md bg-elevated p-3 font-mono text-xs text-muted">
            <p>ubus call system board</p>
            <p className="mt-1 text-fg">
              {DEVICE.model} / {DEVICE.target} / {DEVICE.arch}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Journal système</CardTitle>
            <CardHint>logread · {logs.length} lignes</CardHint>
          </div>
          <Input
            className="max-w-xs"
            placeholder="Filtrer"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </CardHeader>
        <div className="max-h-80 overflow-auto rounded-md bg-bg p-3">
          <ul className="log-term space-y-1.5">
            {visible.map((l) => (
              <li key={l.id} className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="text-faint tabular">
                  {new Date(l.ts).toISOString().slice(11, 19)}
                </span>
                <span
                  className={
                    l.level === "err"
                      ? "text-bad"
                      : l.level === "warn"
                        ? "text-warn"
                        : "text-muted"
                  }
                >
                  {l.facility}.{l.level}
                </span>
                <span className="min-w-0 text-fg">{l.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title="Redémarrer l'AP3000 ?">
          <p className="text-sm text-muted">
            Les radios s'éteignent pendant quelques secondes. Les clients devront se réassocier.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirm(false);
                reboot();
              }}
            >
              Redémarrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
