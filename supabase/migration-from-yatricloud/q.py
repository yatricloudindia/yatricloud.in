#!/usr/bin/env python3
"""q.py old|new <sql-file> [out.json] — run SQL via Supabase Management API.
Tokens come from env OLD_TOKEN / NEW_TOKEN (never written to disk)."""
import json, sys, os, urllib.request, urllib.error
refs = {"old": ("lprejdcudtkuxjwghesv", "OLD_TOKEN"), "new": ("hiwqpaknodvcegavmcuj", "NEW_TOKEN")}
ref, tokvar = refs[sys.argv[1]]
sql = open(sys.argv[2]).read()
req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{ref}/database/query",
    data=json.dumps({"query": sql}).encode(), method="POST",
    headers={"Authorization": "Bearer " + os.environ[tokvar], "Content-Type": "application/json"})
try:
    body = urllib.request.urlopen(req, timeout=300).read().decode()
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:3000]); sys.exit(1)
if len(sys.argv) > 3:
    open(sys.argv[3], "w").write(body); print("saved", len(body), "bytes")
else:
    print(body[:6000])
