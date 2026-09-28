import { z } from "zod";

export const LANGUAGES = {
  en: "English",
  ja: "Japanese",
  fr: "French",
  de: "German",
  it: "Italian",
  es: "Spanish",
  pt: "Portuguese",
  ko: "Korean",
  zh: "Chinese",
  other: "Other",
} as const;

export const CONDITIONS = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
} as const;

export const GRADERS = ["PSA", "BGS", "CGC", "Other"] as const;

/** What the buyer confirmed about their physical card. Carried in the results URL. */
export const Selection = z
  .object({
    finish: z.string().regex(/^[A-Za-z0-9]{1,32}$/),
    lang: z.enum(Object.keys(LANGUAGES) as [keyof typeof LANGUAGES, ...(keyof typeof LANGUAGES)[]]),
    grading: z.enum(["raw", "graded"]),
    condition: z.enum(Object.keys(CONDITIONS) as [keyof typeof CONDITIONS, ...(keyof typeof CONDITIONS)[]]).optional(),
    grader: z.enum(GRADERS).optional(),
    grade: z
      .string()
      .regex(/^[0-9]{1,2}(\.5)?$/)
      .optional(),
  })
  .refine((s) => (s.grading === "raw" ? Boolean(s.condition) : Boolean(s.grader && s.grade)), {
    message: "Raw cards need a condition; graded cards need a grader and grade.",
  });

export type Selection = z.infer<typeof Selection>;

export function selectionToQuery(s: Selection): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(s)) if (v !== undefined) p.set(k, String(v));
  return p.toString();
}
