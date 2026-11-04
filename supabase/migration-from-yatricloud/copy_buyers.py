#!/usr/bin/env python3
"""Copy ONLY buyer + admin accounts old (yatricloud.com) -> new (resources).

Accounts copied: users with a store invoice (matched by buyer_email), users whose
profile role is 'admin', and website_team members with a login. Everything else
stays in yatricloud.com. Reads the old project only; inserts use ON CONFLICT DO
NOTHING (safe to re-run). Tokens from env OLD_TOKEN / NEW_TOKEN, never on disk.

Usage: OLD_TOKEN=... NEW_TOKEN=... python3 copy_buyers.py
"""
import json, os, urllib.request, urllib.error

P = {"old": ("lprejdcudtkuxjwghesv", os.environ["OLD_TOKEN"]),
     "new": ("hiwqpaknodvcegavmcuj", os.environ["NEW_TOKEN"])}


def q(which, sql):
    ref, tok = P[which]
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": sql}).encode(), method="POST",
        headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=300).read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{which} HTTP {e.code}: {e.read().decode()[:2000]}")


KEEP_USERS = (
    "select u.id from auth.users u where lower(u.email) in "
    "(select lower(buyer_email) from public.invoices where kind='store' and buyer_email is not null)"
    " union select id from public.profiles where role='admin'"
    " union select user_id from public.website_team where user_id is not null"
)
STORE_PAY = "select payment_id from public.invoices where kind='store' and payment_id is not null"
JOBS = [  # FK order
    ("auth.users", f"id in ({KEEP_USERS})"),
    ("auth.identities", f"user_id in ({KEEP_USERS})"),
    ("public.profiles", f"id in ({KEEP_USERS})"),
    ("public.website_team", f"user_id in ({KEEP_USERS})"),
    ("public.user_resources", f"user_id in ({KEEP_USERS})"),
    ("public.orders", f"user_id in ({KEEP_USERS}) and id in (select order_id from public.invoices where kind='store'"
                      f" and order_id is not null union select order_id from public.payments where id in ({STORE_PAY})"
                      " and order_id is not null)"),
    ("public.payments", f"id in ({STORE_PAY}) and (order_id is null or order_id in"
                        f" (select id from public.orders where user_id in ({KEEP_USERS})))"),
    ("public.invoices", "kind='store'"),
    ("public.entity_reviews", f"entity_type in ('exam_dump','resource') and user_id in ({KEEP_USERS})"),
]

for tbl, where in JOBS:
    sch, name = tbl.split(".")
    cols = q("new", "select string_agg(quote_ident(column_name), ',' order by ordinal_position) c "
                    f"from information_schema.columns where table_schema='{sch}' and table_name='{name}' "
                    "and is_generated='NEVER'")[0]["c"]
    rows = q("old", f"select coalesce(json_agg(t), '[]'::json) as j from (select {cols} from {tbl} where {where}) t")[0]["j"]
    if rows:
        payload = json.dumps(rows)
        if "$mig$" in payload:
            raise SystemExit("delimiter collision in " + tbl)
        q("new", f"insert into {tbl} ({cols}) select {cols} from "
                 f"json_populate_recordset(null::{tbl}, $mig${payload}$mig$) on conflict do nothing")
    n = q("new", f"select count(*) c from {tbl}")[0]["c"]
    print(f"{tbl:24} old={len(rows):4}  new={n:4}  {'OK' if n >= len(rows) else 'MISMATCH'}", flush=True)

# New signups on the resources site get a profile row, same as yatricloud.com.
here = os.path.dirname(os.path.abspath(__file__))
if not q("new", "select count(*) c from pg_trigger where tgname='on_auth_user_created'")[0]["c"]:
    q("new", open(os.path.join(here, "99_auth_trigger.sql")).read())
    print("auth trigger on_auth_user_created: created")
else:
    print("auth trigger on_auth_user_created: already present")
