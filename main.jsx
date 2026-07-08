import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const emptyInquiry = {
  guest_name: "", language: "de", adults: 1, children: 0, child_ages: [], rooms: 1,
  requested_room_type: "", bed_preference: "", date_ranges: [{ check_in: "", check_out: "" }],
  additional_questions: [], original_message: ""
};

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Unbekannter Fehler");
  return body;
}

function App() {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [inquiry, setInquiry] = useState(null);
  const [searches, setSearches] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function analyze() {
    setBusy("Anfrage wird gelesen …"); setError(""); setSearches([]); setDraft("");
    try {
      const form = new FormData(); form.append("text", text); if (image) form.append("image", image);
      setInquiry(await api("/api/analyze", { method: "POST", body: form }));
    } catch (e) { setError(e.message); } finally { setBusy(""); }
  }

  function update(key, value) { setInquiry((current) => ({ ...current, [key]: value })); }
  function updateRange(index, key, value) {
    const next = inquiry.date_ranges.map((range, i) => i === index ? { ...range, [key]: value } : range);
    update("date_ranges", next);
  }

  async function search() {
    setBusy("Live-Preise werden geprüft …"); setError(""); setDraft("");
    try {
      const result = await api("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inquiry) });
      setSearches(result.searches);
    } catch (e) { setError(e.message); } finally { setBusy(""); }
  }

  async function makeDraft() {
    setBusy("Antwort wird formuliert …"); setError("");
    try {
      const result = await api("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inquiry, searches }) });
      setDraft(result.draft);
    } catch (e) { setError(e.message); } finally { setBusy(""); }
  }

  return <main>
    <header><p className="eyebrow">CHÉRISY HOTEL</p><h1>Anfrage-Assistent</h1><p>Screenshot oder Text hinein – live geprüfte Antwort heraus.</p></header>

    <section className="card">
      <h2>1. Anfrage einfügen</h2>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="E-Mail oder Anfrage hier einfügen …" rows="8" />
      <label className="upload">Screenshot auswählen
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setImage(e.target.files?.[0] || null)} />
      </label>
      {image && <p className="file">{image.name}</p>}
      <button onClick={analyze} disabled={!!busy || (!text && !image)}>Anfrage analysieren</button>
    </section>

    {inquiry && <section className="card">
      <h2>2. Angaben prüfen</h2>
      <div className="grid">
        <label>Name<input value={inquiry.guest_name} onChange={(e) => update("guest_name", e.target.value)} /></label>
        <label>Sprache<select value={inquiry.language} onChange={(e) => update("language", e.target.value)}><option value="de">Deutsch</option><option value="en">Englisch</option><option value="fr">Französisch</option></select></label>
        <label>Erwachsene<input type="number" min="1" value={inquiry.adults} onChange={(e) => update("adults", Number(e.target.value))} /></label>
        <label>Kinder<input type="number" min="0" value={inquiry.children} onChange={(e) => update("children", Number(e.target.value))} /></label>
        <label>Zimmer<input type="number" min="1" value={inquiry.rooms} onChange={(e) => update("rooms", Number(e.target.value))} /></label>
        <label>Zimmertyp<input value={inquiry.requested_room_type} onChange={(e) => update("requested_room_type", e.target.value)} placeholder="z. B. Twin Room" /></label>
        <label className="wide">Bettenwunsch<input value={inquiry.bed_preference} onChange={(e) => update("bed_preference", e.target.value)} /></label>
      </div>
      <h3>Zeiträume</h3>
      {inquiry.date_ranges.map((range, index) => <div className="dates" key={index}>
        <input type="date" value={range.check_in} onChange={(e) => updateRange(index, "check_in", e.target.value)} />
        <span>bis</span>
        <input type="date" value={range.check_out} onChange={(e) => updateRange(index, "check_out", e.target.value)} />
        {inquiry.date_ranges.length > 1 && <button className="ghost" onClick={() => update("date_ranges", inquiry.date_ranges.filter((_, i) => i !== index))}>×</button>}
      </div>)}
      <button className="secondary" onClick={() => update("date_ranges", [...inquiry.date_ranges, { check_in: "", check_out: "" }])}>Zeitraum hinzufügen</button>
      <button onClick={search} disabled={!!busy}>Live-Verfügbarkeit prüfen</button>
    </section>}

    {searches.length > 0 && <section className="card">
      <h2>3. Live-Ergebnisse</h2>
      {searches.map((search, index) => <article className={search.verified ? "result ok" : "result fail"} key={index}>
        <strong>{search.range.check_in} – {search.range.check_out}</strong>
        <span>{search.verified ? `Live geprüft: ${new Date(search.verified_at).toLocaleString("de-DE")}` : "Der Live-Preis konnte nicht verifiziert werden."}</span>
        {[...(search.requested_rooms || []), ...(search.alternatives || [])].map((room) => <details key={room.room_type}>
          <summary>{room.room_type} · {room.rates.length} Tarif(e)</summary>
          {room.rates.map((rate, i) => <pre key={i}>{rate.details || rate.text || rate.aria}</pre>)}
        </details>)}
      </article>)}
      <button onClick={makeDraft} disabled={!!busy}>E-Mail-Entwurf erstellen</button>
    </section>}

    {draft && <section className="card">
      <h2>4. Antwort</h2>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows="18" />
      <button onClick={() => navigator.clipboard.writeText(draft)}>Antwort kopieren</button>
    </section>}

    {busy && <div className="status">{busy}</div>}
    {error && <div className="error">{error}</div>}
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
