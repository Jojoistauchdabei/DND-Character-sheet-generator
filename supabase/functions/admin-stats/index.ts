import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function toDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastNDays(n: number): string[] {
  const now = new Date();
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
  }
  return days;
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonResponse({ error: "missing_token" }, 401);

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) return jsonResponse({ error: "unauthorized" }, 401);

  const email = String(userData.user.email ?? "").toLowerCase();
  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (adminError) return jsonResponse({ error: "admin_check_failed", message: adminError.message }, 500);
  if (!adminRow) return jsonResponse({ error: "forbidden" }, 403);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = new Date();
  const cutoff = now.getTime() - 30 * DAY_MS;

  const users: Array<Record<string, unknown>> = [];
  let page = 1;
  let batchSize = 200;
  while (batchSize === 200) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return jsonResponse({ error: "users_failed", message: error.message }, 500);
    const batch = ((data as unknown as { users?: Array<Record<string, unknown>> })?.users ?? []) as Array<Record<string, unknown>>;
    users.push(...batch);
    batchSize = batch.length;
    page += 1;
  }

  const totalUsers = users.length;
  const activeUsers30d = users.filter((u) => {
    const ts = u.last_sign_in_at ? new Date(String(u.last_sign_in_at)).getTime() : 0;
    return ts > cutoff;
  }).length;

  const emailById = new Map<string, string>();
  users.forEach((u) => {
    const id = String(u.id ?? "");
    const mail = String(u.email ?? "");
    if (id && mail) emailById.set(id, mail);
  });

  const { data: sheetsData, error: sheetsError } = await supabase
    .from("sheets")
    .select("user_id, slot_id, name, data, updated_at")
    .order("updated_at", { ascending: false });
  if (sheetsError) return jsonResponse({ error: "sheets_failed", message: sheetsError.message }, 500);
  const sheets = (sheetsData ?? []) as Array<Record<string, unknown>>;

  const { data: dmData, error: dmError } = await supabase
    .from("dm_state")
    .select("user_id, data, updated_at");
  if (dmError) return jsonResponse({ error: "dm_failed", message: dmError.message }, 500);
  const dmStates = (dmData ?? []) as Array<Record<string, unknown>>;

  const usersWithCharacters = new Set<string>();
  sheets.forEach((s) => { const uid = String(s.user_id ?? ""); if (uid) usersWithCharacters.add(uid); });
  const usersWithDm = new Set<string>();
  dmStates.forEach((d) => { const uid = String(d.user_id ?? ""); if (uid) usersWithDm.add(uid); });

  const days = lastNDays(30);
  const signupsByDay = days.map((d) => ({ date: d, count: 0 }));
  users.forEach((u) => {
    const created = u.created_at ? String(u.created_at) : "";
    if (!created) return;
    const entry = signupsByDay.find((e) => e.date === toDayKey(created));
    if (entry) entry.count += 1;
  });

  const updatesByDay = days.map((d) => ({ date: d, count: 0 }));
  sheets.forEach((s) => {
    const updated = s.updated_at ? String(s.updated_at) : "";
    if (!updated) return;
    const ts = new Date(updated).getTime();
    if (ts <= cutoff) return;
    const entry = updatesByDay.find((e) => e.date === toDayKey(updated));
    if (entry) entry.count += 1;
  });

  const dmUpdatesByDay = days.map((d) => ({ date: d, count: 0 }));
  dmStates.forEach((d) => {
    const updated = d.updated_at ? String(d.updated_at) : "";
    if (!updated) return;
    const ts = new Date(updated).getTime();
    if (ts <= cutoff) return;
    const entry = dmUpdatesByDay.find((e) => e.date === toDayKey(updated));
    if (entry) entry.count += 1;
  });

  const classMap = new Map<string, number>();
  sheets.forEach((s) => {
    const dataObj = (s.data ?? {}) as Record<string, unknown>;
    const k = String(dataObj?.klasse ?? "") || "Unbekannt";
    classMap.set(k, (classMap.get(k) ?? 0) + 1);
  });
  const classDistribution = Array.from(classMap.entries())
    .map(([klasse, count]) => ({ klasse, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const levelMap = new Map<string, number>();
  sheets.forEach((s) => {
    const dataObj = (s.data ?? {}) as Record<string, unknown>;
    const lv = String(dataObj?.stufe ?? "");
    levelMap.set(lv, (levelMap.get(lv) ?? 0) + 1);
  });
  const levelDistribution = Array.from(levelMap.entries())
    .map(([stufe, count]) => ({ stufe, count }))
    .sort((a, b) => Number(b.stufe) - Number(a.stufe))
    .slice(0, 10);

  const topCharacters = sheets.slice(0, 10).map((s) => {
    const dataObj = (s.data ?? {}) as Record<string, unknown>;
    return {
      user_id: String(s.user_id ?? ""),
      email: emailById.get(String(s.user_id ?? "")) ?? "",
      name: String((s.name as string) ?? ""),
      slot_id: String(s.slot_id ?? ""),
      charaktername: String(dataObj?.charaktername ?? ""),
      klasse: String(dataObj?.klasse ?? ""),
      stufe: Number(dataObj?.stufe ?? 0),
      updated_at: String(s.updated_at ?? ""),
    };
  });

  return jsonResponse({
    generated_at: new Date().toISOString(),
    overview: {
      totalUsers,
      activeUsers30d,
      totalCharacters: sheets.length,
      charactersPerUser: usersWithCharacters.size > 0 ? sheets.length / usersWithCharacters.size : 0,
      usersWithCharacters: usersWithCharacters.size,
      totalDmStates: dmStates.length,
      usersWithDm: usersWithDm.size,
    },
    signupsByDay,
    updatesByDay,
    dmUpdatesByDay,
    classDistribution,
    levelDistribution,
    topCharacters,
  });
});
