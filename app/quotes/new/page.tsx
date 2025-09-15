// app/quotes/new/page.tsx
"use client";
import React, { useState } from "react";

type Item = { title: string; quantity: number; unitPrice: number };

export default function Page() {
  const [userEmail, setUserEmail] = useState("test@example.com");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<Item[]>([{ title: "", quantity: 1, unitPrice: 0 }]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addRow = () => setItems((prev) => [...prev, { title: "", quantity: 1, unitPrice: 0 }]);
  const removeRow = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const vat = Math.round(subtotal * 0.25);
  const total = subtotal + vat;
  const fmtSEK = (n: number) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(n);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setCreatedId(null);

    const emailForCustomer = customerEmail.trim() === "" ? undefined : customerEmail.trim();

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          customer: { name: customerName.trim(), email: emailForCustomer },
          items: items.map((it) => ({
            title: it.title.trim(),
            quantity: Number(it.quantity) || 0,
            unitPrice: Number(it.unitPrice) || 0,
          })),
          validUntil: validUntil || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data?.error || "Kunde inte skapa offert");
      else {
        setCreatedId(data.quoteId);
        setMessage("Offert skapad!");
      }
    } catch {
      setMessage("Nätverksfel – försök igen.");
    } finally {
      setLoading(false);
    }
  }
async function sendNow() {
  if (!createdId) return;
  setSending(true);
  try {
    const r = await fetch(`/api/quotes/${createdId}/send`, { method: "POST" });

    // Läs alltid som text först, och försök sedan JSON-parse
    const txt = await r.text();
    let data: any = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      data = { raw: txt };
    }

    if (!r.ok) {
      const msg =
        data?.error ||
        (typeof data?.message === "string" && data.message) ||
        (data?.raw ? `Serverfel: ${String(data.raw).slice(0, 200)}` : "Kunde inte skicka e-post");
      alert(msg);
      return;
    }

    alert("Offert skickad!");
  } catch (e) {
    alert("Nätverksfel – kunde inte kontakta servern.");
  } finally {
    setSending(false);
  }
}

 

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ny offert</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-700">Din e-post (user)</span>
            <input className="mt-1 w-full border rounded p-2" type="email" value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Giltig till (valfritt)</span>
            <input className="mt-1 w-full border rounded p-2" type="date" value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Kundnamn</span>
            <input className="mt-1 w-full border rounded p-2" value={customerName}
              onChange={(e) => setCustomerName(e.target.value)} placeholder="Kund AB" required />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Kund e-post (valfritt)</span>
            <input className="mt-1 w-full border rounded p-2" type="email" value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)} placeholder="kund@exempel.se" />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Rader</h2>
            <button type="button" onClick={addRow} className="px-3 py-1.5 rounded bg-black text-white text-sm">
              + Lägg till rad
            </button>
          </div>

          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input className="col-span-6 border rounded p-2" placeholder="Titel" value={it.title}
                  onChange={(e) => updateItem(idx, { title: e.target.value })} required />
                <input className="col-span-2 border rounded p-2" type="number" min={1} placeholder="Antal" value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} required />
                <input className="col-span-3 border rounded p-2" type="number" min={0} step="0.01" placeholder="à-pris (SEK)"
                  value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })} required />
                <button type="button" onClick={() => removeRow(idx)}
                  className="col-span-1 border rounded text-sm" aria-label="Remove row">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-xl p-3 bg-gray-50">
          <div className="flex justify-between"><span>Delsumma</span><span>{fmtSEK(subtotal)}</span></div>
          <div className="flex justify-between"><span>Moms (25%)</span><span>{fmtSEK(vat)}</span></div>
          <div className="flex justify-between font-semibold"><span>Att betala</span><span>{fmtSEK(total)}</span></div>
        </div>

        <div className="flex gap-2 items-center">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-black text-white rounded">
            {loading ? "Skapar..." : "Skapa offert"}
          </button>
          {createdId && (
            <>
              <a className="px-3 py-2 border rounded text-sm" href={`/api/quotes/${createdId}/pdf`} target="_blank" rel="noreferrer">
                Visa PDF
              </a>
              <button type="button" onClick={sendNow} disabled={sending}
                className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">
                {sending ? "Skickar..." : "Skicka via e-post"}
              </button>
            </>
          )}
        </div>

        {message && <p className="text-sm mt-2">{message}</p>}
        {createdId && <p className="text-sm text-green-700">Offert skapad (id: {createdId}).</p>}
      </form>
    </div>
  );
}
