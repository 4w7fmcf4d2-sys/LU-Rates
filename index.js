import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractInquiry, composeReply } from "./gemini.js";
import { searchLiveRates } from "./liveRates.js";
import { inquirySchema } from "./schemas.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(png|jpeg|webp|heic|heif)$/.test(file.mimetype))
});

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.body.text && !req.file) return res.status(400).json({ error: "Text oder Bild fehlt" });
    res.json(await extractInquiry({ text: req.body.text, image: req.file }));
  } catch (error) {
    res.status(422).json({ error: error.message });
  }
});

app.post("/api/search", async (req, res) => {
  try {
    const inquiry = inquirySchema.parse(req.body);
    res.json({ searches: await searchLiveRates(inquiry) });
  } catch (error) {
    res.status(422).json({ error: error.message });
  }
});

app.post("/api/draft", async (req, res) => {
  try {
    const inquiry = inquirySchema.parse(req.body.inquiry);
    if (!Array.isArray(req.body.searches)) throw new Error("Live-Ergebnisse fehlen");
    res.json({ draft: await composeReply({ inquiry, searches: req.body.searches }) });
  } catch (error) {
    res.status(422).json({ error: error.message });
  }
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
app.use(express.static(path.join(root, "dist")));
app.get("/{*splat}", (_req, res) => res.sendFile(path.join(root, "dist", "index.html")));

app.listen(process.env.PORT || 8080, () => {
  console.log(`Chérisy Assistant läuft auf Port ${process.env.PORT || 8080}`);
});
