import { NextResponse } from "next/server";
import { z } from "zod";
import { listRecentSubmissions } from "@/lib/persistence";
import { log } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

const GOALS = ["work", "study", "pr"] as const;
const REGIONS = [
  "canada", "uk", "australia-new-zealand", "germany-nordics",
  "southern-europe", "middle-east", "usa", "sg-my", "jp-kr", "easy-entry",
] as const;

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  goal: z.enum(GOALS).optional(),
  region: z.enum(REGIONS).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    goal: url.searchParams.get("goal") ?? undefined,
    region: url.searchParams.get("region") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query parameters" },
      { status: 400 },
    );
  }

  const { limit, goal, region } = parsed.data;

  // Authenticated users see only their own submissions; anonymous sees public ones.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const items = await listRecentSubmissions({
      limit,
      goal,
      region,
      userId: user?.id ?? undefined,
    });
    return NextResponse.json({ items });
  } catch (err) {
    log("error", "history_fetch_failed", {
      details: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
