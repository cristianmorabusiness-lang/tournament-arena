"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  savePushSubscription,
  removePushSubscription,
} from "@/lib/actions/push";
import { sendTestPush } from "@/lib/actions/pushTest";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied";

export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function detect(): Promise<State> {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported || !vapidKey) return "unsupported";
      if (Notification.permission === "denied") return "denied";
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        return sub ? "on" : "off";
      } catch {
        return "off";
      }
    }
    detect().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      const res = await savePushSubscription({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      });
      if (!res.ok) {
        await sub.unsubscribe();
        setError(res.error ?? "Errore");
        setState("off");
        return;
      }
      setState("on");
    } catch {
      setError("Attivazione non riuscita.");
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setTestMsg(null);
    try {
      const res = await sendTestPush();
      setTestMsg(res.ok ? "Inviata! Controlla le notifiche." : (res.error ?? "Errore"));
    } catch {
      setTestMsg("Invio non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Disattivazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">Promemoria pronostici</p>
          <p className="text-sm text-muted-foreground">
            Un avviso al giorno quando hai pronostici da inserire.
          </p>
        </div>
        {state === "loading" && (
          <span className="text-sm text-muted-foreground">…</span>
        )}
        {state === "off" && (
          <Button onClick={enable} disabled={busy} className="h-9 px-4 text-xs">
            {busy ? "…" : "Attiva"}
          </Button>
        )}
        {state === "on" && (
          <Button
            variant="secondary"
            onClick={disable}
            disabled={busy}
            className="h-9 px-4 text-xs"
          >
            {busy ? "…" : "Attive ✓"}
          </Button>
        )}
      </div>

      {state === "on" && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={sendTest}
            disabled={busy}
            className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
          >
            Invia notifica di prova
          </button>
          {testMsg && (
            <span className="text-xs text-muted-foreground">{testMsg}</span>
          )}
        </div>
      )}

      {state === "denied" && (
        <p className="text-sm text-muted-foreground">
          Le notifiche sono bloccate nel browser. Abilitale dalle impostazioni
          del sito per ricevere i promemoria.
        </p>
      )}
      {state === "unsupported" && (
        <p className="text-sm text-muted-foreground">
          Questo browser non supporta le notifiche push. Su iPhone, aggiungi
          prima l&apos;app alla schermata Home.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
