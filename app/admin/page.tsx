"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabaseClient";

type Settings = { event_time: string; location: string; is_open: boolean };
type InventoryRow = { item: "habu" | "tequila"; remaining: number };
type ClaimRow = {
  id: number;
  claim_code: string;
  name: string;
  item: "habu" | "tequila";
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const [settings, setSettings] = useState<Settings>({ event_time: "19:00", location: "XXX", is_open: true });
  const [inventory, setInventory] = useState<{ habu: number; tequila: number }>({ habu: 0, tequila: 0 });
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [msg, setMsg] = useState<string>("");

  async function refreshAll() {
    setMsg("");

    const { data: s, error: se } = await supabase
      .from("settings")
      .select("event_time,location,is_open")
      .eq("id", 1)
      .single();
    if (se) setMsg(se.message);
    if (s) setSettings(s as Settings);

    const { data: inv, error: ie } = await supabase.from("inventory").select("item,remaining");
    if (ie) setMsg(ie.message);
    if (inv) {
      const next = { habu: 0, tequila: 0 };
      for (const r of inv as InventoryRow[]) next[r.item] = r.remaining;
      setInventory(next);
    }

    const { data: c, error: ce } = await supabase
      .from("claims")
      .select("id,claim_code,name,item,status,created_at")
      .order("created_at", { ascending: true });
    if (ce) setMsg(ce.message);
    if (c) setClaims(c as ClaimRow[]);
  }

async function resetReservations() {
  setLoading(true);
  try {
    const { error } = await supabase.rpc("reset_reservations"); // あなたの関数名に合わせて
    if (error) throw error;

    // ここがポイント：押した後に一覧を取り直す
    await loadReservations();

    // さらに確実にするなら、画面上も一旦空にしておく（任意）
    // setReservations([]);
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    readSession();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      readSession();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }

  async function signOut() {
    setMsg("");
    await supabase.auth.signOut();
    setSessionEmail(null);
  }

  async function saveSettings() {
    setMsg("");
    const { error } = await supabase.from("settings").update(settings).eq("id", 1);
    if (error) setMsg(error.message);
    else setMsg("Settings saved.");
    await refreshAll();
  }

  async function saveInventory() {
    setMsg("");
    const { error: e1 } = await supabase.from("inventory").update({ remaining: inventory.habu }).eq("item", "habu");
    const { error: e2 } = await supabase
      .from("inventory")
      .update({ remaining: inventory.tequila })
      .eq("item", "tequila");
    if (e1 || e2) setMsg((e1 ?? e2)!.message);
    else setMsg("Inventory saved.");
    await refreshAll();
  }

  async function setClaimStatus(id: number, status: string) {
    setMsg("");
    const { error } = await supabase.from("claims").update({ status }).eq("id", id);
    if (error) setMsg(error.message);
    await refreshAll();
  }

  if (!sessionEmail) {
    return (
      <main style={{ maxWidth: 520, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Admin Login</h1>

        <label style={{ display: "block", marginTop: 10, fontWeight: 700 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, fontSize: 16, borderRadius: 10, border: "1px solid #ccc" }}
        />

        <label style={{ display: "block", marginTop: 10, fontWeight: 700 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, fontSize: 16, borderRadius: 10, border: "1px solid #ccc" }}
        />

        <button
          onClick={signIn}
          style={{ marginTop: 12, padding: 12, width: "100%", fontSize: 16, borderRadius: 12, border: "1px solid #ccc" }}
        >
          Sign in
        </button>

        {msg && <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>⚠️ {msg}</div>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "30px auto", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h1 style={{ fontSize: 22 }}>Admin</h1>
        <div style={{ fontSize: 14, color: "#555" }}>
          Signed in as <b>{sessionEmail}</b>{" "}
          <button onClick={signOut} style={{ marginLeft: 10, padding: "6px 10px", borderRadius: 10, border: "1px solid #ccc" }}>
            Sign out
          </button>
        </div>
      </div>

      {msg && <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>⚠️ {msg}</div>}

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Event Settings</h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr", alignItems: "end" }}>
          <div>
            <label style={{ fontWeight: 700 }}>Meet-up time</label>
            <input
              value={settings.event_time}
              onChange={(e) => setSettings({ ...settings, event_time: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 700 }}>Location</label>
            <input
              value={settings.location}
              onChange={(e) => setSettings({ ...settings, location: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 700 }}>Reservations</label>
            <select
              value={settings.is_open ? "open" : "closed"}
              onChange={(e) => setSettings({ ...settings, is_open: e.target.value === "open" })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <button onClick={saveSettings} style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid #ccc", fontWeight: 700 }}>
          Save settings
        </button>
      </section>

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Inventory</h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={{ fontWeight: 700 }}>Habush</label>
            <input
              type="number"
              value={inventory.habu}
              onChange={(e) => setInventory({ ...inventory, habu: Number(e.target.value) })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 700 }}>Don Julio Blanco</label>
            <input
              type="number"
              value={inventory.tequila}
              onChange={(e) => setInventory({ ...inventory, tequila: Number(e.target.value) })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            />
          </div>
        </div>

        <button onClick={saveInventory} style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid #ccc", fontWeight: 700 }}>
          Save inventory
        </button>
      </section>
<button
  onClick={async () => {
    const ok = confirm("本当にリセットしますか？\n・予約(Reservation)が全削除され、コードが1からになります");
    if (!ok) return;

    const { error } = await supabase.rpc("admin_reset_claims");
    if (error) {
      alert("Reset failed: " + error.message);
      return;
    }
    alert("Reset done!");
    // 必要なら一覧再取得
    // await loadClaims();
    // await loadPublic();
  }}
  style={{
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ccc",
    fontWeight: 700,
  }}
>
  Reset reservations (start from 1)
</button>

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Reservations</h2>
          <button onClick={refreshAll} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #ccc" }}>
            Refresh
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Code</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Name</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Item</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ padding: 8, borderBottom: "1px solid #ddd" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.claim_code}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.name}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.item}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.status}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "center" }}>
                    <button onClick={() => setClaimStatus(c.id, "served")} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ccc" }}>
                      Mark served
                    </button>{" "}
                    <button onClick={() => setClaimStatus(c.id, "void")} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ccc" }}>
                      Void
                    </button>
                  </td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 10, color: "#777" }}>
                    No reservations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
