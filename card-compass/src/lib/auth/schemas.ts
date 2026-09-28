import { z } from "zod";
import { REGION_CODES } from "../regions";

export const Credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(200),
  password: z.string().min(10, "Use at least 10 characters.").max(200),
});
export const Signup = Credentials.extend({ country: z.enum(REGION_CODES).default("US") });
