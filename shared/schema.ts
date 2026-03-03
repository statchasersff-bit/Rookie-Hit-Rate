import { z } from "zod";

export const filterSchema = z.object({
  yearStart: z.number().min(2015).max(2025),
  yearEnd: z.number().min(2015).max(2025),
  format: z.enum(["1qb", "sf"]),
  scoring: z.enum(["ppr", "hppr", "std"]),
  outcome: z.enum(["elite", "starter", "flex"]),
  positions: z.array(z.enum(["QB", "RB", "WR", "TE"])),
  rounds: z.array(z.number().min(1).max(7)),
  minGames: z.number().min(1).max(17),
  showConfidence: z.boolean(),
});

export type Filters = z.infer<typeof filterSchema>;
