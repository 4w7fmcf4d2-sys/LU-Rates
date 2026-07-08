import { GoogleGenAI } from "@google/genai";
import { extractionJsonSchema, inquirySchema } from "./schemas.js";

function client() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY fehlt");
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const model = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function extractInquiry({ text, image }) {
  const parts = [{
    text: `Extrahiere eine Hotelanfrage. Aktuelles Jahr: 2026. Nutze ausschließlich Angaben,
die in der Anfrage erkennbar sind. Interpretiere Zeiträume als Anreise bis Abreise.
Wenn ein Doppelzimmer ausdrücklich für zwei Personen verlangt wird, adults=2.
Erfinde keine Namen, Daten, Belegungen oder Zimmertypen. Gib nur JSON zurück.\n\n${text || ""}`
  }];

  if (image) {
    parts.unshift({ inlineData: { mimeType: image.mimetype, data: image.buffer.toString("base64") } });
  }

  const response = await client().models.generateContent({
    model: model(),
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: extractionJsonSchema,
      temperature: 0.1
    }
  });

  const parsed = JSON.parse(response.text);
  parsed.original_message = text || parsed.original_message || "";
  return inquirySchema.parse(parsed);
}

export async function composeReply({ inquiry, searches }) {
  const facts = JSON.stringify({ inquiry, searches }, null, 2);
  const response = await client().models.generateContent({
    model: model(),
    contents: [{ role: "user", parts: [{ text: `
Du verfasst eine professionelle Antwort im Namen des Chérisy Hotel Konstanz.
Nutze ausschließlich die verifizierten Fakten im JSON. Preise dürfen niemals berechnet,
geschätzt oder ergänzt werden. Nenne exakten Zimmertyp, Gesamtpreis, Währung, Nächte,
Belegung, Steuern/Gebühren, Zahlung und Stornierung, soweit vorhanden.
Wenn der gewünschte Zimmertyp fehlt, nenne klar passende Alternativen samt Bettenart.
Wenn verified=false, sage ausdrücklich: "Der Live-Preis konnte nicht verifiziert werden."
Ende mit dem Hinweis, dass Preis und Verfügbarkeit bis zur Buchung veränderlich sind.
Gib nur den versandfertigen E-Mail-Text zurück.\n\n${facts}` }] }],
    config: { temperature: 0.2 }
  });
  return response.text.trim();
}
