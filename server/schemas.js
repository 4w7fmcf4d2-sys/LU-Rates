import { z } from "zod";

export const dateRangeSchema = z.object({
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
}).refine((value) => value.check_out > value.check_in, {
  message: "Abreise muss nach der Anreise liegen"
});

export const inquirySchema = z.object({
  guest_name: z.string().default(""),
  language: z.enum(["de", "en", "fr"]).default("de"),
  adults: z.coerce.number().int().min(1).max(10),
  children: z.coerce.number().int().min(0).max(10).default(0),
  child_ages: z.array(z.coerce.number().int().min(0).max(17)).default([]),
  rooms: z.coerce.number().int().min(1).max(5).default(1),
  requested_room_type: z.string().default(""),
  bed_preference: z.string().default(""),
  date_ranges: z.array(dateRangeSchema).min(1).max(8),
  additional_questions: z.array(z.string()).default([]),
  original_message: z.string().default("")
});

export const extractionJsonSchema = {
  type: "object",
  properties: {
    guest_name: { type: "string" },
    language: { type: "string", enum: ["de", "en", "fr"] },
    adults: { type: "integer", minimum: 1, maximum: 10 },
    children: { type: "integer", minimum: 0, maximum: 10 },
    child_ages: { type: "array", items: { type: "integer" } },
    rooms: { type: "integer", minimum: 1, maximum: 5 },
    requested_room_type: { type: "string" },
    bed_preference: { type: "string" },
    date_ranges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          check_in: { type: "string", format: "date" },
          check_out: { type: "string", format: "date" }
        },
        required: ["check_in", "check_out"]
      }
    },
    additional_questions: { type: "array", items: { type: "string" } },
    original_message: { type: "string" }
  },
  required: [
    "guest_name", "language", "adults", "children", "child_ages", "rooms",
    "requested_room_type", "bed_preference", "date_ranges",
    "additional_questions", "original_message"
  ]
};
