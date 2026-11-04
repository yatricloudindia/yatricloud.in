#!/usr/bin/env python3
"""Copy NON-personal content tables old -> new (catalog + site content). Reads old only."""
import json, os, urllib.request, urllib.error
P = {"old": ("lprejdcudtkuxjwghesv", os.environ["OLD_TOKEN"]), "new": ("hiwqpaknodvcegavmcuj", os.environ["NEW_TOKEN"])}
def q(which, sql):
    ref, tok = P[which]
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": sql}).encode(), method="POST",
        headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=300).read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{which} HTTP {e.code}: {e.read().decode()[:2000]}")
JOBS = [
    ("public.cert_providers", "true"),
    ("public.provider_certifications", "true"),
    ("public.site_settings", "true"),
    ("public.site_stats", "true"),
    ("public.email_templates", "true"),
    ("public.exam_dumps", "true"),
    ("public.resources", "true"),
    ("public.coupons", "applies_to in ('all','store')"),
]
for tbl, where in JOBS:
    sch, name = tbl.split(".")
    cols = q("new", f"select string_agg(quote_ident(column_name), ',' order by ordinal_position) c from information_schema.columns where table_schema='{sch}' and table_name='{name}' and is_generated='NEVER'")[0]["c"]
    rows = q("old", f"select coalesce(json_agg(t), '[]'::json) as j from (select {cols} from {tbl} where {where}) t")[0]["j"]
    payload = json.dumps(rows)
    assert "$mig$" not in payload
    if rows:
        q("new", f"insert into {tbl} ({cols}) select {cols} from json_populate_recordset(null::{tbl}, $mig${payload}$mig$) on conflict do nothing")
    n = q("new", f"select count(*) c from {tbl}")[0]["c"]
    print(f"{tbl:32} old={len(rows):5}  new={n}", flush=True)
