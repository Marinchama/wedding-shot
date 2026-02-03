"use client";

import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabaseClient";

type Settings = { event_time: string; location: string; is_open: boolean };

// ここがポイント：item を固定の union にする
type Item = "habu" | "tequila";
type Inv = Record<Item, number>;

type Result = { ok: boolean; message: string; claim_code: string | null } | null;

export default function Home() {
  const [name, setName] = useState("");
  const [settings, setSettings] = useState<Settings>({
    event_time: "7:00 PM",
    location: "XXX",
    is_open: true,
  });
  const [inv, setInv] = useState<Inv>({ habu: 0, tequila: 0 });
  const [result, setResult] = useState<Result>(null);
  const [loading, setLoading] = useState(false);

  async function loadPublic() {
    const { data: s } = await supabase
      .from("settings")
      .select("event_time,location,is_open")
      .eq("id", 1)
      .single();

    if (s) setSettings(s as Settings);

    const { data: i } = await supabase.from("inventory").select("item,remaining");

if (i) {
  const next: Inv = { habu: 0, tequila: 0 };

  // Supabase からは string で返ってくるので、ガードしてから代入
  for (const row of i as { item: string; remaining: number | null }[]) {
    if (row.item === "habu" || row.item === "tequila") {
      next[row.item] = row.remaining ?? 0;
    }
  }

  setInv(next);
}


  useEffect(() => {
    loadPublic();
    const t = setInterval(loadPublic, 5000);
    return () => clearInterval(t);
  }, []);

  async function claim(item: Item) {
    setResult(null);

    if (!name.trim()) {
      setResult({ ok: false, message: "Please enter your name.", claim_code: null });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("claim_shot", {
        p_name: name.trim(),
        p_item: item,
      });
      if (error) throw error;

      const r = Array.isArray(data) ? data[0] : data;
      setResult(r as any);
      await loadPublic();
    } catch (e: any) {
      setResult({ ok: false, message: e.message ?? "Something went wrong.", claim_code: null });
    } finally {
      setLoading(false);
    }
  }

  const habuLabel = "Habu Snake Liquor";
  const tequilaLabel = "White Tequila";

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>
        Shot Reservation (First Come, First Served)
      </h1>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <div>
          Meet-up time: <b>{settings.event_time}</b>
        </div>
        <div>
          Location: <b>{settings.location}</b>
        </div>
        <div style={{ marginTop: 6, color: "#555" }}>
          Status: {settings.is_open ? "Open" : "Closed"}
        </div>
      </div>

      <label style={{ display: "block", marginTop: 14, fontWeight: 700 }}>
        Name (nickname OK)
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Lina"
        style={{ width: "100%", padding: 10, fontSize: 16, borderRadius: 10, border: "1px solid #ccc" }}
      />

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <button
          onClick={() => claim("habu")}
          disabled={loading || !settings.is_open || inv.habu <= 0}
          style={{ padding: 12, fontSize: 16, borderRadius: 12, border: "1px solid #ccc", fontWeight: 700 }}
        >
          Reserve {habuLabel} (Remaining {inv.habu})
        </button>

        <button
          onClick={() => claim("tequila")}
          disabled={loading || !settings.is_open || inv.tequila <= 0}
          style={{ padding: 12, fontSize: 16, borderRadius: 12, border: "1px solid #ccc", fontWeight: 700 }}
        >
          Reserve {tequilaLabel} (Remaining {inv.tequila})
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
          {result.ok ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 800 }}>✅ Reserved!</div>
              <div style={{ marginTop: 6 }}>
                Confirmation code: <b style={{ fontSize: 18 }}>{result.claim_code}</b>
              </div>
              <div style={{ marginTop: 8, color: "#555" }}>
                Please take a screenshot of this page and show it to a staff member.
              </div>
            </>
          ) : (
            <div>⚠️ {result.message}</div>
          )}
        </div>
      )}
    </main>
  );
}
