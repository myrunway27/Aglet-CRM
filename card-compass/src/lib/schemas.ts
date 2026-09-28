import { z } from "zod";
import { CONDITIONS, FINISH_LABELS, LANGUAGES, type Finish } from "./types";

export const CatalogIdSchema = z.string().regex(/^(mock|pokemontcg):[A-Za-z0-9._-]{1,64}$/, "Invalid card id");

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(2, "Type at least 2 characters").max(60, "Search is too long"),
});

export const SelectionSchema = z.object({
  finish: z.enum(Object.keys(FINISH_LABELS) as [Finish, ...Finish[]]),
  language: z.enum(LANGUAGES).default("English"),
  grading: z.enum(["raw", "graded"]).default("raw"),
  condition: z.enum(CONDITIONS).default("Unsure"),
});

export const ConfirmSchema = z.object({ catalogId: CatalogIdSchema });
