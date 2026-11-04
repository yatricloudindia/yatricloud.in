with t(name) as (values ('exam_dumps'),('resources'),('user_resources'),('profiles'),('admin_users'),('orders'),('payments'),('invoices'),('coupons'),('entity_reviews'),('email_templates'),('site_settings'),('site_stats'),('cert_providers'),('provider_certifications'),('analytics_events'),('website_team')),
tbl as (select c.oid, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace join t on t.name=c.relname where n.nspname='public' and c.relkind='r'),
enums as (
  select distinct ty.oid, ty.typname from tbl join pg_attribute a on a.attrelid=tbl.oid and a.attnum>0 and not a.attisdropped
  join pg_type ty on ty.oid = case when (select typcategory from pg_type where oid=a.atttypid)='A' then (select typelem from pg_type where oid=a.atttypid) else a.atttypid end
  where ty.typtype='e'),
fn_names(name) as (values ('is_admin'),('set_updated_at'),('handle_new_user'),('is_client_session'),('profiles_guard_privileged'),('grant_resource_access'),('validate_coupon'),('redeem_coupon'),('claim_team_admin_role')),
trig_fns as (select distinct p.oid from pg_trigger tg join tbl on tbl.oid=tg.tgrelid join pg_proc p on p.oid=tg.tgfoid where not tg.tgisinternal),
fns as (select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname in (select name from fn_names) or p.oid in (select oid from trig_fns)))
select 1 as ord, 'create type public.'||quote_ident(e.typname)||' as enum ('||string_agg(quote_literal(en.enumlabel), ',' order by en.enumsortorder)||');' as ddl from enums e join pg_enum en on en.enumtypid=e.oid group by e.typname
union all
select 2, 'create table public.'||quote_ident(tbl.relname)||' ('||string_agg('  '||quote_ident(a.attname)||' '||format_type(a.atttypid,a.atttypmod)
   ||case when a.attgenerated='s' then ' generated always as ('||pg_get_expr(d.adbin,d.adrelid)||') stored' when d.adbin is not null then ' default '||pg_get_expr(d.adbin,d.adrelid) else '' end
   ||case when a.attidentity in ('a','d') then ' generated '||case a.attidentity when 'a' then 'always' else 'by default' end||' as identity' else '' end
   ||case when a.attnotnull then ' not null' else '' end, ', ' order by a.attnum)||');'
  from tbl join pg_attribute a on a.attrelid=tbl.oid and a.attnum>0 and not a.attisdropped left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum group by tbl.relname
union all
select 3, 'alter table public.'||quote_ident(tbl.relname)||' add constraint '||quote_ident(co.conname)||' '||pg_get_constraintdef(co.oid)||';' from tbl join pg_constraint co on co.conrelid=tbl.oid where co.contype in ('p','u','c','x')
union all
select 4, pg_get_indexdef(i.indexrelid)||';' from tbl join pg_index i on i.indrelid=tbl.oid where not exists (select 1 from pg_constraint co where co.conindid=i.indexrelid)
union all
select 5, 'alter table public.'||quote_ident(tbl.relname)||' add constraint '||quote_ident(co.conname)||' '||pg_get_constraintdef(co.oid)||';' from tbl join pg_constraint co on co.conrelid=tbl.oid where co.contype='f'
union all
select 6, pg_get_functiondef(f.oid)||';' from fns f
union all
select 7, 'alter table public.'||quote_ident(tbl.relname)||' enable row level security;' from tbl join pg_class c on c.oid=tbl.oid where c.relrowsecurity
union all
select 8, 'create policy '||quote_ident(p.policyname)||' on public.'||quote_ident(p.tablename)||' as '||p.permissive||' for '||p.cmd||' to '||array_to_string(p.roles,',')
   ||coalesce(' using ('||p.qual||')','')||coalesce(' with check ('||p.with_check||')','')||';' from pg_policies p join tbl on tbl.relname=p.tablename where p.schemaname='public'
union all
select 9, pg_get_triggerdef(tg.oid)||';' from pg_trigger tg join tbl on tbl.oid=tg.tgrelid where not tg.tgisinternal
union all
select 10, pg_get_triggerdef(tg.oid)||';' from pg_trigger tg join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='auth' and c.relname='users' and not tg.tgisinternal
order by 1;
