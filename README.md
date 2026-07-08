# Chérisy Anfrage-Assistent

Mobile Full-Stack-PWA für Hotelanfragen: Text oder Screenshot analysieren, Angaben prüfen,
Chérisy-Raten live aus dem Buchungssystem lesen und einen sicheren E-Mail-Entwurf erzeugen.

## Wichtig

- Preise werden bei jeder Anfrage neu live geprüft.
- Nicht verifizierte Preise werden niemals ausgegeben.
- Die App versendet keine E-Mails automatisch.
- API-Schlüssel bleiben ausschließlich auf dem Server.

## Lokal starten

```bash
cp .env.example .env
# GEMINI_API_KEY in .env eintragen
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8080`

## Produktion

```bash
npm run build
npm start
```

Für Cloud Run muss Playwright/Chromium im Container verfügbar sein. Für eine belastbare
Produktion sollte bevorzugt eine offizielle SiteMinder-/Buchungssystem-API eingesetzt werden.
Die enthaltene Browser-Automatisierung benötigt Monitoring, da sich HTML-Strukturen ändern können.

## Google AI Studio

Das Projekt kann als ZIP oder GitHub-Projekt in Google AI Studio weiterbearbeitet werden.
`GEMINI_API_KEY` gehört in die serverseitigen Secrets, niemals in Frontend-Code.

## GitHub

```bash
git init
git add .
git commit -m "Initial Chérisy inquiry assistant"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/DEIN-REPO.git
git push -u origin main
```
