// app/trial/page.tsx
"use client";
import { useState } from "react";

export default function TrialPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Skickar…");
    const res = await fetch("/api/trial/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    setMessage(
      data.success
        ? `Trial aktiverad! Giltig till: ${data.user.trialExpiresAt}`
        : `Fel: ${data.error}`
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Aktivera Trial</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="din@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded p-2"
          required
        />
        <input
          placeholder="TRIALCODE123"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border rounded p-2"
          required
        />
        <button className="w-full px-4 py-2 bg-black text-white rounded">
          Aktivera
        </button>
      </form>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
