import { chromium } from "playwright";

const HOTEL = process.env.HOTEL_WEBSITE || "https://www.cherisyhotel-konstanz.de/";
const PROPERTY = process.env.BOOKING_PROPERTY || "cherisyhotelkonstanzdirect";

function bookingUrl(range, inquiry) {
  const url = new URL(`https://direct-book.com/properties/${PROPERTY}`);
  url.searchParams.set("locale", inquiry.language || "de");
  url.searchParams.set("checkInDate", range.check_in);
  url.searchParams.set("checkOutDate", range.check_out);
  url.searchParams.set("from_widget", "true");
  url.searchParams.set("referrer", "canvas");
  url.searchParams.set("items[0][adults]", String(inquiry.adults));
  url.searchParams.set("items[0][children]", String(inquiry.children || 0));
  url.searchParams.set("items[0][infants]", "0");
  url.searchParams.set("currency", "EUR");
  return url.toString();
}

async function readRooms(page) {
  await page.waitForSelector(".room-type.room, .room-card, [class*='room-type']", { timeout: 20000 });
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(".room-type.room")];
    return cards.map((card) => {
      const roomType = card.querySelector(".room-title")?.textContent?.trim() || "";
      const featureText = card.querySelector(".room-type-brief")?.innerText || "";
      const rates = [...card.querySelectorAll(".room-rate-wrapper")].map((rate) => ({
        aria: rate.getAttribute("aria-label") || "",
        text: rate.innerText || "",
        detailsLabel: rate.querySelector("button[aria-label^='More info on']")?.getAttribute("aria-label") || ""
      }));
      return { room_type: roomType, features: featureText, rates };
    }).filter((room) => room.room_type);
  });
}

async function addRateDetails(page, rooms) {
  for (const room of rooms) {
    for (const rate of room.rates) {
      if (!rate.detailsLabel) continue;
      const button = page.getByRole("button", { name: rate.detailsLabel, exact: true });
      if (await button.count() !== 1) continue;
      await button.click();
      const dialog = page.locator("[role='dialog']");
      await dialog.waitFor({ state: "visible", timeout: 8000 });
      rate.details = (await dialog.innerText()).trim();
      const close = page.getByRole("button", { name: "Close", exact: true });
      if (await close.count() === 1) await close.click();
      else await page.keyboard.press("Escape");
    }
  }
}

function matchRequestedRoom(roomType, requested) {
  if (!requested) return true;
  const clean = (value) => value.toLowerCase().replace(/zimmer/g, "room").replace(/doppel/g, "double").trim();
  return clean(roomType).includes(clean(requested)) || clean(requested).includes(clean(roomType));
}

export async function searchLiveRates(inquiry) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "de-DE" });
  const page = await context.newPage();
  const results = [];

  try {
    await page.goto(HOTEL, { waitUntil: "domcontentloaded", timeout: 30000 });

    for (const range of inquiry.date_ranges) {
      const sourceUrl = bookingUrl(range, inquiry);
      try {
        await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1200);
        const heading = await page.locator("body").innerText({ timeout: 10000 });
        const criteriaMatch = heading.includes(String(inquiry.adults)) &&
          heading.toLowerCase().includes(new Date(`${range.check_in}T12:00:00`).toLocaleString("en", { day: "numeric", month: "short" }).toLowerCase());
        const rooms = await readRooms(page);
        await addRateDetails(page, rooms);
        const requested = rooms.filter((room) => matchRequestedRoom(room.room_type, inquiry.requested_room_type));
        results.push({
          range,
          verified: criteriaMatch && rooms.length > 0,
          verified_at: new Date().toISOString(),
          source: sourceUrl,
          criteria_match: criteriaMatch,
          requested_room_available: requested.some((room) => room.rates.length > 0),
          requested_rooms: requested,
          alternatives: rooms.filter((room) => !requested.includes(room) && room.rates.length > 0)
        });
      } catch (error) {
        results.push({
          range,
          verified: false,
          verified_at: new Date().toISOString(),
          source: sourceUrl,
          error: "Der Live-Preis konnte nicht verifiziert werden.",
          technical_reason: error.message
        });
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}
