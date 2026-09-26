import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Meter } from "@/components/meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardHint, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHANNELS_24, CHANNELS_5 } from "@/lib/ap-seed";
import { useApStore } from "@/lib/ap-store";
import type { Band, ChannelWidth, Encryption, RadioConfig, Ssid } from "@/lib/ap-types";
import { encryptionLabel } from "@/lib/format";

export const Route = createFileRoute("/_app/wifi")({
  component: WifiPage,
});

function WifiPage() {
  const radios = useApStore((s) => s.radios);
  const ssids = useApStore((s) => s.ssids);
  const live = useApStore((s) => s.live);
  const mesh = useApStore((s) => s.mesh);
  const setMesh = useApStore((s) => s.setMesh);
  const addSsid = useApStore((s) => s.addSsid);
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <p className="text-xs tracking-widest text-muted uppercase">hostapd · mt76</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Wi-Fi 6</h1>
        <p className="mt-1 text-sm text-muted">
          Dual-band AX3000 · 160 MHz · OFDMA · MU-MIMO · jusqu'à 8 SSID
        </p>
      </header>

      <Tabs defaultValue="radios">
        <TabsList>
          <TabsTrigger value="radios">Radios</TabsTrigger>
          <TabsTrigger value="ssid">SSID ({ssids.length}/8)</TabsTrigger>
          <TabsTrigger value="roaming">Roaming</TabsTrigger>
        </TabsList>

        <TabsContent value="radios" className="mt-4 grid gap-4 lg:grid-cols-2">
          {radios.map((radio) => (
            <RadioCard key={radio.id} radio={radio} live={live.radioLive[radio.id]} />
          ))}
        </TabsContent>

        <TabsContent value="ssid" className="mt-4 flex flex-col gap-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                if (ssids.length >= 8) {
                  toast.error("Limite de 8 SSID atteinte");
                  return;
                }
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              Nouveau SSID
            </Button>
          </div>
          {ssids.map((ssid) => (
            <SsidCard key={ssid.id} ssid={ssid} />
          ))}
        </TabsContent>

        <TabsContent value="roaming" className="mt-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>802.11k/v/r et Mesh</CardTitle>
                <CardHint>Fast transition Cudy Mesh / 802.11r · backhaul filaire 2,5 GbE</CardHint>
              </div>
            </CardHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleRow
                label="Mesh"
                hint={mesh.meshId}
                checked={mesh.enabled}
                onChange={(v) => setMesh({ enabled: v })}
              />
              <ToggleRow
                label="Fast Transition (11r)"
                hint="roaming sans coupure"
                checked={mesh.fastTransition}
                onChange={(v) => setMesh({ fastTransition: v })}
              />
              <ToggleRow
                label="802.11k / 802.11v"
                hint="neighbor reports"
                checked={mesh.kvr}
                onChange={(v) => setMesh({ kvr: v })}
              />
              <ToggleRow
                label="Band steering"
                hint="préfère le 5 GHz"
                checked={mesh.bandSteering}
                onChange={(v) => setMesh({ bandSteering: v })}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="mesh-id">Mesh ID</Label>
                <Input
                  id="mesh-id"
                  className="mt-1.5"
                  value={mesh.meshId}
                  onChange={(e) => setMesh({ meshId: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="backhaul">Backhaul</Label>
                <NativeSelect
                  id="backhaul"
                  className="mt-1.5"
                  value={mesh.backhaul}
                  onChange={(e) => setMesh({ backhaul: e.target.value as "wired" | "wireless" })}
                >
                  <option value="wired">Filaire (recommandé)</option>
                  <option value="wireless">Sans fil 5 GHz</option>
                </NativeSelect>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <NewSsidDialog open={open} onOpenChange={setOpen} onCreate={addSsid} />
    </div>
  );
}

function RadioCard({
  radio,
  live,
}: {
  radio: RadioConfig;
  live: { utilization: number; noise: number; txMbps: number; rxMbps: number };
}) {
  const setRadio = useApStore((s) => s.setRadio);
  const channels = radio.band === "5" ? CHANNELS_5 : CHANNELS_24;
  const widths: ChannelWidth[] = radio.band === "5" ? [20, 40, 80, 160] : [20, 40];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{radio.band === "5" ? "5 GHz · HE160" : "2,4 GHz · HE40"}</CardTitle>
          <CardHint>{radio.label} · {radio.country}</CardHint>
        </div>
        <Switch
          checked={radio.enabled}
          onCheckedChange={(v) => setRadio(radio.id, { enabled: v })}
          aria-label={`Radio ${radio.band}`}
        />
      </CardHeader>

      <div className="mb-4">
        <div className="mb-1 flex justify-between font-mono text-xs text-muted">
          <span>Occupation canal</span>
          <span className="tabular">{live.utilization.toFixed(0)} %</span>
        </div>
        <Meter value={live.utilization} tone={radio.band === "5" ? "band5" : "band24"} />
        <p className="mt-2 font-mono text-xs text-muted">
          bruit {live.noise.toFixed(0)} dBm · {live.txMbps.toFixed(0)}/{live.rxMbps.toFixed(0)} Mb/s
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Canal</Label>
          <NativeSelect
            className="mt-1.5"
            value={String(radio.channel)}
            onChange={(e) =>
              setRadio(radio.id, {
                channel: e.target.value === "auto" ? "auto" : Number(e.target.value),
              })
            }
          >
            <option value="auto">Auto</option>
            {channels.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
                {radio.band === "5" && ch >= 52 && ch <= 144 ? " DFS" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label>Largeur</Label>
          <NativeSelect
            className="mt-1.5"
            value={radio.width}
            onChange={(e) => setRadio(radio.id, { width: Number(e.target.value) as ChannelWidth })}
          >
            {widths.map((w) => (
              <option key={w} value={w}>
                {w} MHz
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted">
          <Label>Puissance TX</Label>
          <span className="font-mono tabular">{radio.txPower} dBm</span>
        </div>
        <Slider
          min={8}
          max={radio.band === "5" ? 23 : 20}
          step={1}
          value={[radio.txPower]}
          onValueChange={([v]) => setRadio(radio.id, { txPower: v ?? radio.txPower })}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <ToggleRow
          label="OFDMA"
          hint="Wi-Fi 6"
          checked={radio.ofdma}
          onChange={(v) => setRadio(radio.id, { ofdma: v })}
        />
        <ToggleRow
          label="MU-MIMO"
          hint={radio.band === "5" ? "3T3R" : "2T2R"}
          checked={radio.muMimo}
          onChange={(v) => setRadio(radio.id, { muMimo: v })}
        />
        <ToggleRow
          label="Beamforming"
          hint="directionnel"
          checked={radio.beamforming}
          onChange={(v) => setRadio(radio.id, { beamforming: v })}
        />
        <ToggleRow
          label="Airtime fairness"
          hint="mt76"
          checked={radio.airtimeFairness}
          onChange={(v) => setRadio(radio.id, { airtimeFairness: v })}
        />
      </div>
    </Card>
  );
}

function SsidCard({ ssid }: { ssid: Ssid }) {
  const setSsid = useApStore((s) => s.setSsid);
  const removeSsid = useApStore((s) => s.removeSsid);
  const clients = useApStore((s) => s.clients);
  const count = clients.filter((c) => c.ssidId === ssid.id && !c.blocked).length;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={ssid.name}
              onChange={(e) => setSsid(ssid.id, { name: e.target.value })}
              aria-label="Nom du SSID"
              className="max-w-xs"
            />
            <Badge tone={ssid.enabled ? "ok" : "muted"}>{ssid.enabled ? "diffusé" : "off"}</Badge>
            {ssid.guest ? <Badge tone="warn">invités</Badge> : null}
            {ssid.hidden ? <Badge>caché</Badge> : null}
          </div>
          <p className="mt-2 font-mono text-xs text-muted">
            {encryptionLabel(ssid.encryption)} · VLAN {ssid.vlan} · {count} client{count > 1 ? "s" : ""}
          </p>
        </div>
        <Switch
          checked={ssid.enabled}
          onCheckedChange={(v) => setSsid(ssid.id, { enabled: v })}
          aria-label="Activer le SSID"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Bande</Label>
          <NativeSelect
            className="mt-1.5"
            value={ssid.band}
            onChange={(e) => setSsid(ssid.id, { band: e.target.value as Band | "both" })}
          >
            <option value="both">2,4 + 5 GHz</option>
            <option value="2.4">2,4 GHz</option>
            <option value="5">5 GHz</option>
          </NativeSelect>
        </div>
        <div>
          <Label>Chiffrement</Label>
          <NativeSelect
            className="mt-1.5"
            value={ssid.encryption}
            onChange={(e) => setSsid(ssid.id, { encryption: e.target.value as Encryption })}
          >
            <option value="sae-mixed">WPA2/WPA3</option>
            <option value="sae">WPA3-SAE</option>
            <option value="psk2">WPA2-PSK</option>
            <option value="open">Ouvert</option>
          </NativeSelect>
        </div>
        <div>
          <Label>Clé</Label>
          <Input
            className="mt-1.5"
            type="text"
            value={ssid.key}
            disabled={ssid.encryption === "open"}
            onChange={(e) => setSsid(ssid.id, { key: e.target.value })}
          />
        </div>
        <div>
          <Label>VLAN</Label>
          <Input
            className="mt-1.5"
            type="number"
            min={1}
            max={4094}
            value={ssid.vlan}
            onChange={(e) => setSsid(ssid.id, { vlan: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted">
          <Switch checked={ssid.hidden} onCheckedChange={(v) => setSsid(ssid.id, { hidden: v })} />
          Caché
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <Switch checked={ssid.isolate} onCheckedChange={(v) => setSsid(ssid.id, { isolate: v })} />
          Isolation clients
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <Switch checked={ssid.guest} onCheckedChange={(v) => setSsid(ssid.id, { guest: v })} />
          Réseau invité
        </label>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-bad"
          onClick={() => {
            removeSsid(ssid.id);
            toast("SSID retiré");
          }}
        >
          <Trash2 className="size-4" />
          Supprimer
        </Button>
      </div>
    </Card>
  );
}

function ToggleRow({
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
    <div className="flex items-center justify-between gap-3 rounded-md bg-elevated px-3 py-2.5">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NewSsidDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (ssid: Omit<Ssid, "id">) => string | null;
}) {
  const [name, setName] = useState("Nouveau-SSID");
  const [key, setKey] = useState("change-moi");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Nouveau SSID">
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="new-ssid">Nom</Label>
            <Input id="new-ssid" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-key">Clé WPA</Label>
            <Input id="new-key" className="mt-1.5" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <Button
            onClick={() => {
              const id = onCreate({
                name,
                enabled: true,
                band: "both",
                encryption: "sae-mixed",
                key,
                hidden: false,
                isolate: false,
                vlan: 1,
                guest: false,
              });
              if (!id) {
                toast.error("Impossible d'ajouter le SSID");
                return;
              }
              toast("SSID créé", { description: name });
              onOpenChange(false);
            }}
          >
            Créer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
