import { createFileRoute } from "@tanstack/react-router";
import { Ban, LogOut, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RssiBars } from "@/components/meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { ssidName, useApStore } from "@/lib/ap-store";
import type { Band, Client } from "@/lib/ap-types";
import { formatBytes, formatDuration, formatRssi } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const clients = useApStore((s) => s.clients);
  const ssids = useApStore((s) => s.ssids);
  const now = useApStore((s) => s.live.now);
  const kickClient = useApStore((s) => s.kickClient);
  const blockClient = useApStore((s) => s.blockClient);
  const renameClient = useApStore((s) => s.renameClient);
  const [q, setQ] = useState("");
  const [band, setBand] = useState<"all" | Band>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return clients
      .filter((c) => (band === "all" ? true : c.band === band))
      .filter((c) =>
        query
          ? c.hostname.toLowerCase().includes(query) ||
            c.mac.toLowerCase().includes(query) ||
            c.ip.includes(query)
          : true,
      )
      .sort((a, b) => Number(a.blocked) - Number(b.blocked) || a.rssi - b.rssi);
  }, [clients, q, band]);

  const active = list.find((c) => c.id === selected) ?? null;
  const online = clients.filter((c) => !c.blocked);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs tracking-widest text-muted uppercase">hostapd sta</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            {online.length} associés · {online.filter((c) => c.band === "5").length} en 5 GHz
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-faint" />
            <Input
              className="pl-10"
              placeholder="Nom, IP, MAC"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <NativeSelect
            className="sm:w-40"
            value={band}
            onChange={(e) => setBand(e.target.value as "all" | Band)}
          >
            <option value="all">Toutes bandes</option>
            <option value="5">5 GHz</option>
            <option value="2.4">2,4 GHz</option>
          </NativeSelect>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Appareil</th>
                  <th className="px-3 py-3 font-medium">Bande</th>
                  <th className="px-3 py-3 font-medium">Signal</th>
                  <th className="px-3 py-3 font-medium">Débit</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted">
                      Aucun client
                    </td>
                  </tr>
                ) : (
                  list.map((c) => (
                    <tr
                      key={c.id}
                      className={cn(
                        "cursor-pointer border-b border-border last:border-0 hover:bg-elevated/50",
                        selected === c.id && "bg-elevated",
                        c.blocked && "opacity-50",
                      )}
                      onClick={() => setSelected(c.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.hostname}</p>
                        <p className="font-mono text-xs text-muted">
                          {c.ip} · {c.vendor}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={c.band === "5" ? "band5" : "band24"}>
                          {c.band === "5" ? "5 GHz" : "2,4"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <RssiBars rssi={c.rssi} />
                          <span className="font-mono text-xs tabular text-muted">{c.rssi}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs tabular text-muted">
                        {c.txRate}/{c.rxRate}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Detail
          client={active}
          ssid={active ? ssidName(ssids, active.ssidId) : "—"}
          now={now}
          onRename={renameClient}
          onKick={(id, name) => {
            kickClient(id);
            setSelected(null);
            toast("Client déconnecté", { description: name });
          }}
          onBlock={(c) => {
            blockClient(c.id);
            toast(c.blocked ? "Filtre MAC retiré" : "Adresse bloquée", { description: c.mac });
          }}
        />
      </div>
    </div>
  );
}

function Detail({
  client,
  ssid,
  now,
  onRename,
  onKick,
  onBlock,
}: {
  client: Client | null;
  ssid: string;
  now: number;
  onRename: (id: string, hostname: string) => void;
  onKick: (id: string, name: string) => void;
  onBlock: (c: Client) => void;
}) {
  if (!client) {
    return (
      <Card className="flex min-h-48 items-center justify-center p-6 text-sm text-muted">
        Sélectionnez un client
      </Card>
    );
  }

  const rows: [string, string][] = [
    ["MAC", client.mac],
    ["IPv4", client.ip],
    ["SSID", ssid],
    ["Standard", client.standard],
    ["Constructeur", client.vendor],
    ["RSSI", `${client.rssi} dBm · ${formatRssi(client.rssi)}`],
    ["TX / RX PHY", `${client.txRate} / ${client.rxRate} Mb/s`],
    ["Volume", `${formatBytes(client.txBytes)} ↓ · ${formatBytes(client.rxBytes)} ↑`],
    ["Associé", formatDuration(now - client.connectedAt)],
  ];

  return (
    <Card>
      <Input
        value={client.hostname}
        onChange={(e) => onRename(client.id, e.target.value)}
        aria-label="Nom de l'appareil"
      />
      <dl className="mt-4 space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-mono text-xs text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={() => onKick(client.id, client.hostname)}
          disabled={client.blocked}
        >
          <LogOut className="size-4" />
          Déconnecter
        </Button>
        <Button variant="danger" onClick={() => onBlock(client)}>
          <Ban className="size-4" />
          {client.blocked ? "Débloquer" : "Bloquer l'adresse MAC"}
        </Button>
      </div>
    </Card>
  );
}
