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

  const [settings, setSettings] = useState<Settings>({
    event_time: "19:00",
    location: "XXX",
    is_open: true,
  });

  const [inventory, setInventory] = useState({ habu: 0, tequila: 0 });
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [msg, setMsg] = useState("");

  async function refreshAll() {
    const { data: s } = await supabase
      .from("settings")
      .select("event_time,location,is_open")
      .eq("id", 1)
      .single();

    if (s) setSettings(s);

    const { data: inv } = await supabase.from("inventory").select("item,remaining");

    if (inv) {
      const next = { habu: 0, tequila: 0 };
      for (const r of inv as InventoryRow[]) next[r.item] = r.remaining;
      setInventory(next);
    }

    const { data: c } = await supabase
      .from("claims")
      .select("*")
      .order("created_at");

    if (c) setClaims(c as ClaimRow[]);
  }

  useEffect(() => {
    readSession();
    refreshAll();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      readSession();
      refreshAll();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function readSession() {
    const { data } = await supabase.auth.getSession();
    setSessionEmail(data.session?.user.email ?? null);
  }

  async function signIn() {
    await supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSessionEmail(null);
  }

  async function saveSettings() {
    await supabase.from("settings").update(settings).eq("id", 1);
    refreshAll();
  }

  async function saveInventory() {
    await supabase.from("inventory").update({ remaining: inventory.habu }).eq("item", "habu");
    await supabase.from("inventory").update({ remaining: inventory.tequila }).eq("item", "tequila");
    refreshAll();
  }

  async function setClaimStatus(id: number, status: string) {
    await supabase.from("claims").update({ status }).eq("id", id);
    refreshAll();
  }

  async function resetReservations() {
    const ok = confirm("本当にリセットしますか？");
    if (!ok) return;

    const { error } = await supabase.rpc("admin_reset_claims");
    if (error) {
      alert(error.message);
      return;
    }

    // ★ここが超重要
    setClaims([]);
    await refreshAll();
  }

  if (!sessionEmail) {
    return (
      <main style={{ maxWidth: 400, margin: "40px auto" }}>
        <h2>Admin Login</h2>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={signIn}>Sign in</button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "30px auto" }}>
      <h2>Admin</h2>

      <button onClick={signOut}>Sign out</button>

      <h3>Inventory</h3>
      <input type="number" value={inventory.habu} onChange={(e) => setInventory({ ...inventory, habu: +e.target.value })} />
      <input type="number" value={inventory.tequila} onChange={(e) => setInventory({ ...inventory, tequila: +e.target.value })} />
      <button onClick={saveInventory}>Save inventory</button>

      <br />

      <button onClick={resetReservations}>Reset reservations (start from 1)</button>

      <h3>Reservations</h3>

      {claims.length === 0 && <div>No reservations yet.</div>}

      {claims.map((c) => (
        <div key={c.id}>
          {c.claim_code} / {c.name}
          <button onClick={() => setClaimStatus(c.id, "served")}>Served</button>
          <button onClick={() => setClaimStatus(c.id, "void")}>Void</button>
        </div>
      ))}
    </main>
  );
}
