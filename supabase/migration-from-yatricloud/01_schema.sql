-- Resources DB schema, generated from yatricloud.com (lprejdcudtkuxjwghesv)

begin;

create type public.content_status_t as enum ('draft','published','archived','cancelled');

create type public.payment_provider_t as enum ('razorpay','stripe','free');

create type public.payment_status_t as enum ('pending','completed','failed','refunded');

create type public.provider_t as enum ('AWS','AZURE','GCP','GITHUB','ORACLE','SALESFORCE','SERVICENOW','OPENAI','HASHICORP','KUBERNETES','OTHER','ANTHROPIC','SNOWFLAKE','REDIS');

create table public.admin_users (  id uuid not null,   role text default 'admin'::text not null,   permissions text[] default '{}'::text[] not null,   is_active boolean default true not null,   created_by uuid,   created_at timestamp with time zone default now() not null,   updated_at timestamp with time zone default now() not null);

create table public.analytics_events (  id uuid default gen_random_uuid() not null,   event_name text not null,   category text not null,   target_id text,   user_id uuid,   metadata jsonb default '{}'::jsonb,   created_at timestamp with time zone default timezone('utc'::text, now()) not null);

create table public.cert_providers (  id uuid default gen_random_uuid() not null,   slug text not null,   label text not null,   enum_value text,   logo_url text,   logo_light_url text,   brand_color text,   blurb text,   cert_count integer,   show_on_home boolean default false not null,   show_in_forms boolean default true not null,   sort_order integer default 0 not null,   active boolean default true not null,   updated_at timestamp with time zone default now() not null,   url text);

create table public.coupons (  id uuid default gen_random_uuid() not null,   code text not null,   percent_off integer not null,   applies_to text default 'all'::text not null,   max_uses integer,   used_count integer default 0 not null,   expires_at timestamp with time zone,   active boolean default true not null,   created_at timestamp with time zone default now() not null,   entity_type text,   entity_id uuid,   entity_label text);

create table public.email_templates (  key text not null,   subject text not null,   body_html text not null,   updated_at timestamp with time zone default now() not null,   design_json jsonb);

create table public.entity_reviews (  id uuid default gen_random_uuid() not null,   entity_type text not null,   entity_id uuid not null,   user_id uuid not null,   name text not null,   rating integer not null,   review text not null,   is_public boolean default true not null,   created_at timestamp with time zone default now() not null,   updated_at timestamp with time zone default now() not null);

create table public.exam_dumps (  id uuid default gen_random_uuid() not null,   title text not null,   provider provider_t not null,   original_price_inr numeric(10,2),   price_inr numeric(10,2) default 0 not null,   image_url text,   description text,   file_path text,   download_url text,   status content_status_t default 'published'::content_status_t not null,   created_at timestamp with time zone default now() not null,   updated_at timestamp with time zone default now() not null);

create table public.invoices (  id uuid default gen_random_uuid() not null,   invoice_number text not null,   kind text not null,   payment_id uuid,   order_id uuid,   buyer_name text,   buyer_email text not null,   amount numeric(12,2) default 0 not null,   currency text default 'INR'::text not null,   items jsonb default '[]'::jsonb not null,   created_at timestamp with time zone default now() not null);

create table public.orders (  id uuid default gen_random_uuid() not null,   user_id uuid,   email text not null,   kind text not null,   items jsonb default '[]'::jsonb not null,   amount numeric(10,2) not null,   currency text default 'INR'::text not null,   status payment_status_t default 'pending'::payment_status_t not null,   created_at timestamp with time zone default now() not null);

create table public.payments (  id uuid default gen_random_uuid() not null,   order_id uuid,   provider payment_provider_t not null,   provider_order_id text,   provider_payment_id text,   amount numeric(10,2) not null,   currency text default 'INR'::text not null,   status payment_status_t default 'pending'::payment_status_t not null,   raw jsonb default '{}'::jsonb not null,   created_at timestamp with time zone default now() not null,   verified_at timestamp with time zone);

create table public.profiles (  id uuid not null,   email text not null,   full_name text default ''::text not null,   linkedin_url text,   photo_url text,   country text,   state_province text,   city text,   country_code text,   phone_number text,   role text default 'yatri'::text not null,   created_at timestamp with time zone default now() not null,   updated_at timestamp with time zone default now() not null,   bio text,   interested_certifications text[] default '{}'::text[],   tagline text,   github_url text,   twitter_handle text,   website_url text,   email_notifications_enabled boolean default true not null);

create table public.provider_certifications (  id uuid default gen_random_uuid() not null,   provider_slug text not null,   value text not null,   label text not null,   exam_code text,   level text,   sort_order integer default 0 not null,   active boolean default true not null,   updated_at timestamp with time zone default now() not null,   url text);

create table public.resources (  id uuid default gen_random_uuid() not null,   name text not null,   description text default ''::text not null,   image_url text default ''::text not null,   access_url text not null,   resource_type text default 'link'::text not null,   is_free boolean default true not null,   price_inr numeric(10,2) default 0 not null,   provider text default ''::text not null,   category text default ''::text not null,   tags text[] default '{}'::text[] not null,   is_published boolean default false not null,   created_at timestamp with time zone default now() not null,   updated_at timestamp with time zone default now() not null);

create table public.site_settings (  key text not null,   value jsonb default '{}'::jsonb not null,   updated_at timestamp with time zone default now() not null);

create table public.site_stats (  id uuid default gen_random_uuid() not null,   key text not null,   value text not null,   label text not null,   sort_order integer default 0 not null,   active boolean default true not null,   updated_at timestamp with time zone default now() not null);

create table public.user_resources (  id uuid default gen_random_uuid() not null,   user_id uuid not null,   resource_id uuid not null,   payment_id text,   accessed_at timestamp with time zone default now() not null);

create table public.website_team (  id uuid default gen_random_uuid() not null,   user_id uuid,   email text not null,   full_name text not null,   avatar_url text,   phone text,   city text,   country text default 'India'::text,   linkedin_url text,   portfolio_url text,   job_title text,   company text,   department text default 'Marketing'::text not null,   role_title text default 'Content Writer'::text not null,   system_role text default 'writer'::text not null,   permissions text[] default '{}'::text[] not null,   bio text,   why_join text,   skills text[] default '{}'::text[],   status text default 'invited'::text not null,   invite_code text not null,   invited_by uuid,   invited_at timestamp with time zone default now(),   onboarded_at timestamp with time zone,   created_at timestamp with time zone default now(),   updated_at timestamp with time zone default now());

alter table public.exam_dumps add constraint exam_dumps_pkey PRIMARY KEY (id);

alter table public.resources add constraint resources_pkey PRIMARY KEY (id);

alter table public.resources add constraint resources_resource_type_check CHECK ((resource_type = ANY (ARRAY['link'::text, 'file'::text])));

alter table public.user_resources add constraint user_resources_pkey PRIMARY KEY (id);

alter table public.user_resources add constraint user_resources_user_id_resource_id_key UNIQUE (user_id, resource_id);

alter table public.profiles add constraint profiles_email_key UNIQUE (email);

alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);

alter table public.profiles add constraint profiles_role_check CHECK ((role = ANY (ARRAY['yatri'::text, 'trainer'::text, 'admin'::text])));

alter table public.admin_users add constraint admin_users_pkey PRIMARY KEY (id);

alter table public.admin_users add constraint admin_users_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'manager'::text, 'support'::text, 'auditor'::text])));

alter table public.orders add constraint orders_amount_check CHECK ((amount >= (0)::numeric));

alter table public.orders add constraint orders_kind_check CHECK ((kind = ANY (ARRAY['store'::text, 'exam_dump'::text, 'event'::text, 'training'::text, 'mentorship'::text, 'other'::text])));

alter table public.orders add constraint orders_pkey PRIMARY KEY (id);

alter table public.payments add constraint payments_amount_check CHECK ((amount >= (0)::numeric));

alter table public.payments add constraint payments_pkey PRIMARY KEY (id);

alter table public.invoices add constraint invoices_invoice_number_key UNIQUE (invoice_number);

alter table public.invoices add constraint invoices_kind_check CHECK ((kind = ANY (ARRAY['store'::text, 'event'::text, 'training'::text, 'mentorship'::text, 'other'::text])));

alter table public.invoices add constraint invoices_pkey PRIMARY KEY (id);

alter table public.coupons add constraint coupons_applies_to_check CHECK ((applies_to = ANY (ARRAY['all'::text, 'training'::text, 'event'::text, 'store'::text])));

alter table public.coupons add constraint coupons_code_key UNIQUE (code);

alter table public.coupons add constraint coupons_entity_type_check CHECK ((entity_type = ANY (ARRAY['event'::text, 'training'::text, 'product'::text])));

alter table public.coupons add constraint coupons_max_uses_check CHECK ((max_uses > 0));

alter table public.coupons add constraint coupons_percent_off_check CHECK (((percent_off >= 1) AND (percent_off <= 100)));

alter table public.coupons add constraint coupons_pkey PRIMARY KEY (id);

alter table public.entity_reviews add constraint entity_reviews_entity_type_check CHECK ((entity_type = ANY (ARRAY['event'::text, 'product'::text, 'udemy_course'::text, 'exam_dump'::text])));

alter table public.entity_reviews add constraint entity_reviews_entity_type_entity_id_user_id_key UNIQUE (entity_type, entity_id, user_id);

alter table public.entity_reviews add constraint entity_reviews_pkey PRIMARY KEY (id);

alter table public.entity_reviews add constraint entity_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));

alter table public.email_templates add constraint email_templates_pkey PRIMARY KEY (key);

alter table public.site_settings add constraint site_settings_pkey PRIMARY KEY (key);

alter table public.site_stats add constraint site_stats_key_key UNIQUE (key);

alter table public.site_stats add constraint site_stats_pkey PRIMARY KEY (id);

alter table public.cert_providers add constraint cert_providers_pkey PRIMARY KEY (id);

alter table public.cert_providers add constraint cert_providers_slug_key UNIQUE (slug);

alter table public.provider_certifications add constraint provider_certifications_pkey PRIMARY KEY (id);

alter table public.provider_certifications add constraint provider_certifications_provider_slug_value_key UNIQUE (provider_slug, value);

alter table public.analytics_events add constraint analytics_events_pkey PRIMARY KEY (id);

alter table public.website_team add constraint website_team_email_key UNIQUE (email);

alter table public.website_team add constraint website_team_invite_code_key UNIQUE (invite_code);

alter table public.website_team add constraint website_team_pkey PRIMARY KEY (id);

CREATE INDEX idx_entity_reviews_entity ON public.entity_reviews USING btree (entity_type, entity_id, created_at DESC);

CREATE INDEX analytics_events_event_name_idx ON public.analytics_events USING btree (event_name);

CREATE INDEX idx_website_team_invite_code ON public.website_team USING btree (invite_code);

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);

CREATE INDEX idx_orders_email ON public.orders USING btree (email);

CREATE INDEX idx_payments_order ON public.payments USING btree (order_id);

CREATE INDEX admin_users_role_idx ON public.admin_users USING btree (role);

CREATE INDEX idx_dumps_provider_status ON public.exam_dumps USING btree (provider, status);

CREATE INDEX idx_payments_provider_ids ON public.payments USING btree (provider, provider_order_id);

CREATE INDEX idx_website_team_user_id ON public.website_team USING btree (user_id);

CREATE INDEX idx_website_team_email ON public.website_team USING btree (email);

CREATE INDEX analytics_events_category_idx ON public.analytics_events USING btree (category);

CREATE INDEX analytics_events_target_idx ON public.analytics_events USING btree (target_id);

CREATE INDEX idx_provider_certs_slug ON public.provider_certifications USING btree (provider_slug, sort_order);

CREATE INDEX analytics_events_created_at_idx ON public.analytics_events USING btree (created_at DESC);

CREATE INDEX idx_invoices_email ON public.invoices USING btree (buyer_email, created_at DESC);

alter table public.user_resources add constraint user_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE;

alter table public.user_resources add constraint user_resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.admin_users add constraint admin_users_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.admin_users add constraint admin_users_id_fkey FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table public.orders add constraint orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);

alter table public.payments add constraint payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

alter table public.invoices add constraint invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);

alter table public.invoices add constraint invoices_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id);

alter table public.entity_reviews add constraint entity_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table public.provider_certifications add constraint provider_certifications_provider_slug_fkey FOREIGN KEY (provider_slug) REFERENCES cert_providers(slug) ON DELETE CASCADE;

alter table public.analytics_events add constraint analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.website_team add constraint website_team_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.website_team add constraint website_team_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, full_name, photo_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
  and not exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.is_active = false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_scope text DEFAULT 'all'::text, p_entity_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(percent_off integer, entity_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.percent_off, c.entity_id
  from coupons c
  where upper(c.code) = upper(trim(p_code))
    and c.active
    and (c.applies_to = 'all' or c.applies_to = p_scope)
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.used_count < c.max_uses)
    and (
      c.entity_id is null
      or (p_entity_ids is not null and c.entity_id = any(p_entity_ids))
    );
$function$
;

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_scope text DEFAULT 'all'::text)
 RETURNS TABLE(percent_off integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.percent_off
  from coupons c
  where upper(c.code) = upper(trim(p_code))
    and c.active
    and (c.applies_to = 'all' or c.applies_to = p_scope)
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.used_count < c.max_uses);
$function$
;

CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update coupons
  set used_count = used_count + 1
  where upper(code) = upper(trim(p_code))
    and active
    and (max_uses is null or used_count < max_uses);
$function$
;

CREATE OR REPLACE FUNCTION public.is_client_session()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select current_user in ('anon', 'authenticated');
$function$
;

CREATE OR REPLACE FUNCTION public.profiles_guard_privileged()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if public.is_client_session() and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only an admin can change a profile role' using errcode = '42501';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Email is managed by authentication' using errcode = '42501';
    end if;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.claim_team_admin_role()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_email text := lower(coalesce(auth.email(), ''));
begin
  if auth.uid() is null or v_email = '' then
    return false;
  end if;
  if to_regclass('public.website_team') is null then
    return false;
  end if;
  if not exists (
    select 1 from public.website_team t
    where lower(t.email) = v_email
      and t.status in ('invited', 'active')
  ) then
    return false;
  end if;
  update public.profiles set role = 'admin'
   where id = auth.uid() and role is distinct from 'admin';
  return true;
end $function$
;

CREATE OR REPLACE FUNCTION public.website_team_guard_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if public.is_client_session() and not public.is_admin() then
    if new.system_role is distinct from old.system_role
       or new.permissions is distinct from old.permissions
       or new.email is distinct from old.email
       or new.invite_code is distinct from old.invite_code
       or new.invited_by is distinct from old.invited_by
       or new.department is distinct from old.department
       or new.role_title is distinct from old.role_title then
      raise exception 'Team access fields are managed by admins' using errcode = '42501';
    end if;
    if new.user_id is distinct from old.user_id and new.user_id is distinct from auth.uid() then
      raise exception 'You can only link your own account' using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       and not (old.status = 'invited' and new.status = 'active') then
      raise exception 'Team status is managed by admins' using errcode = '42501';
    end if;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.grant_resource_access(p_resource_id uuid, p_payment_id text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_access_url text;
    v_is_free    boolean;
    v_is_pub     boolean;
begin
    if auth.uid() is null then
        raise exception 'Sign in required';
    end if;

    select access_url, is_free, is_published
      into v_access_url, v_is_free, v_is_pub
      from public.resources
     where id = p_resource_id;

    if not found then
        raise exception 'Resource not found';
    end if;
    if not v_is_pub then
        raise exception 'Resource is not published';
    end if;

    if not v_is_free then
        if p_payment_id is null or p_payment_id = '' then
            raise exception 'Payment required for this resource';
        end if;
        -- Must be a payment our server verified (api/razorpay verify records it)...
        if not exists (
            select 1 from public.payments
             where provider_payment_id = p_payment_id and status = 'completed'
        ) then
            raise exception 'Payment could not be verified';
        end if;
        -- ...and not one already used by another account or for another resource.
        if exists (
            select 1 from public.user_resources
             where payment_id = p_payment_id
               and (user_id <> auth.uid() or resource_id <> p_resource_id)
        ) then
            raise exception 'This payment has already been used';
        end if;
    end if;

    insert into public.user_resources (user_id, resource_id, payment_id)
    values (auth.uid(), p_resource_id, p_payment_id)
    on conflict (user_id, resource_id) do update
        set payment_id  = coalesce(excluded.payment_id, user_resources.payment_id),
            accessed_at = now();

    return v_access_url;
end;
$function$
;

alter table public.exam_dumps enable row level security;

alter table public.resources enable row level security;

alter table public.user_resources enable row level security;

alter table public.profiles enable row level security;

alter table public.admin_users enable row level security;

alter table public.orders enable row level security;

alter table public.payments enable row level security;

alter table public.invoices enable row level security;

alter table public.coupons enable row level security;

alter table public.entity_reviews enable row level security;

alter table public.email_templates enable row level security;

alter table public.site_settings enable row level security;

alter table public.site_stats enable row level security;

alter table public.cert_providers enable row level security;

alter table public.provider_certifications enable row level security;

alter table public.analytics_events enable row level security;

alter table public.website_team enable row level security;

create policy dumps_admin_write on public.exam_dumps as PERMISSIVE for ALL to public using (is_admin()) with check (is_admin());

create policy dumps_public_read on public.exam_dumps as PERMISSIVE for SELECT to public using (((status = 'published'::content_status_t) OR is_admin()));

create policy resources_admin_all on public.resources as PERMISSIVE for ALL to authenticated using (is_admin()) with check (is_admin());

create policy resources_public_read on public.resources as PERMISSIVE for SELECT to public using ((is_published = true));

create policy user_resources_admin_all on public.user_resources as PERMISSIVE for ALL to authenticated using (is_admin()) with check (is_admin());

create policy user_resources_own_insert on public.user_resources as PERMISSIVE for INSERT to authenticated with check ((user_id = auth.uid()));

create policy user_resources_own_read on public.user_resources as PERMISSIVE for SELECT to authenticated using ((user_id = auth.uid()));

create policy profiles_select_own_or_admin on public.profiles as PERMISSIVE for SELECT to public using (((id = auth.uid()) OR is_admin()));

create policy profiles_update_own on public.profiles as PERMISSIVE for UPDATE to public using (((id = auth.uid()) OR is_admin())) with check (((id = auth.uid()) OR is_admin()));

create policy admin_users_select_admin on public.admin_users as PERMISSIVE for SELECT to authenticated using (is_admin());

create policy orders_insert_own on public.orders as PERMISSIVE for INSERT to authenticated with check ((user_id = auth.uid()));

create policy orders_read_own on public.orders as PERMISSIVE for SELECT to public using (((user_id = auth.uid()) OR is_admin()));

create policy payments_read_own on public.payments as PERMISSIVE for SELECT to public using ((is_admin() OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = auth.uid()))))));

create policy invoices_admin_write on public.invoices as PERMISSIVE for ALL to public using (is_admin()) with check (is_admin());

create policy invoices_owner_read on public.invoices as PERMISSIVE for SELECT to public using ((is_admin() OR (buyer_email = ( SELECT profiles.email
   FROM profiles
  WHERE (profiles.id = auth.uid())))));

create policy coupons_admin_all on public.coupons as PERMISSIVE for ALL to public using (is_admin()) with check (is_admin());

create policy entrev_delete on public.entity_reviews as PERMISSIVE for DELETE to public using (((user_id = auth.uid()) OR is_admin()));

create policy entrev_insert_own on public.entity_reviews as PERMISSIVE for INSERT to authenticated with check ((user_id = auth.uid()) AND (entity_type <> 'event'::text));

create policy entrev_read on public.entity_reviews as PERMISSIVE for SELECT to public using (((is_public = true) OR (user_id = auth.uid()) OR is_admin()));

create policy entrev_update_own on public.entity_reviews as PERMISSIVE for UPDATE to public using (((user_id = auth.uid()) OR is_admin()));

create policy email_templates_admin_read on public.email_templates as PERMISSIVE for SELECT to public using (is_admin());

create policy email_templates_admin_write on public.email_templates as PERMISSIVE for ALL to public using (is_admin()) with check (is_admin());

create policy site_settings_admin_write on public.site_settings as PERMISSIVE for ALL to public using (is_admin()) with check (is_admin());

create policy site_settings_public_read on public.site_settings as PERMISSIVE for SELECT to public using (((key <> ALL (ARRAY['ai_api_keys'::text, 'gemini_ai'::text])) OR is_admin()));

create policy site_stats_admin_write on public.site_stats as PERMISSIVE for ALL to public using (is_admin()) with check (is_admin());

create policy site_stats_public_read on public.site_stats as PERMISSIVE for SELECT to public using (((active = true) OR is_admin()));

create policy cert_providers_admin_write on public.cert_providers as PERMISSIVE for ALL to public using (is_admin()) with check (is_admin());

create policy cert_providers_public_read on public.cert_providers as PERMISSIVE for SELECT to public using (((active = true) OR is_admin()));

create policy provider_certifications_admin_write on public.provider_certifications as PERMISSIVE for ALL to public using (is_admin()) with check (is_admin());

create policy provider_certifications_public_read on public.provider_certifications as PERMISSIVE for SELECT to public using (((active = true) OR is_admin()));

create policy "Admins can view all analytics events" on public.analytics_events as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

create policy "Users can insert own analytics events" on public.analytics_events as PERMISSIVE for INSERT to authenticated with check ((auth.uid() = user_id));

create policy website_team_admin_all on public.website_team as PERMISSIVE for ALL to authenticated using (is_admin()) with check (is_admin());

create policy website_team_select_own on public.website_team as PERMISSIVE for SELECT to authenticated using (((lower(email) = lower(COALESCE(auth.email(), ''::text))) OR (user_id = auth.uid())));

create policy website_team_update_own on public.website_team as PERMISSIVE for UPDATE to authenticated using (((lower(email) = lower(COALESCE(auth.email(), ''::text))) AND (status <> 'inactive'::text))) with check ((lower(email) = lower(COALESCE(auth.email(), ''::text))));

CREATE TRIGGER trg_dumps_updated BEFORE UPDATE ON public.exam_dumps FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_guard_privileged BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_guard_privileged();

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_admin_users_updated BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_entity_reviews_updated BEFORE UPDATE ON public.entity_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_email_templates_updated BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_site_stats_updated BEFORE UPDATE ON public.site_stats FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cert_providers_updated BEFORE UPDATE ON public.cert_providers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_provider_certifications_updated BEFORE UPDATE ON public.provider_certifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_website_team_guard_member BEFORE UPDATE ON public.website_team FOR EACH ROW EXECUTE FUNCTION website_team_guard_member();

revoke execute on function public.claim_team_admin_role() from public, anon;

revoke execute on function public.grant_resource_access(uuid, text) from public, anon;

revoke execute on function public.redeem_coupon(text) from public, anon;

grant execute on function public.claim_team_admin_role() to authenticated, service_role;

grant execute on function public.grant_resource_access(uuid, text) to authenticated, service_role;

grant execute on function public.redeem_coupon(text) to authenticated, service_role;

commit;
