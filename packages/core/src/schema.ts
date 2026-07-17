import { z } from "zod";
import { CARD_STATUSES, CARD_TYPES, LOAD_MODES, PRIORITIES } from "./types.js";

/** YAML may parse dates as Date objects — normalize to YYYY-MM-DD strings. */
const dateString = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v));

const idList = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (typeof v === "string" ? [v] : v))
  .default([]);

const linksSchema = z
  .object({
    parent: z.string().optional(),
    "depends-on": idList,
    "relates-to": idList,
    supersedes: idList,
  })
  .default({ "depends-on": [], "relates-to": [], supersedes: [] });

export const frontmatterSchema = z.object({
  id: z.string(),
  type: z.enum(CARD_TYPES),
  title: z.string(),
  status: z.enum(CARD_STATUSES).default("draft"),
  description: z.string().optional(),
  owner: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  effort: z.number().optional(),
  iteration: z.string().optional(),
  due: dateString.optional(),
  tags: z.array(z.string()).default([]),
  load: z.enum(LOAD_MODES).optional(),
  links: linksSchema,
  created: dateString.default(""),
  updated: dateString.default(""),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;
