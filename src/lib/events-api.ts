// Events data-access layer, Supabase backend.
//
// Replaces the legacy localStorage store (events-store.ts) and the Google
// Apps Script flows. The rich frontend `Event` shape is mapped to/from the
// flat `events` table: primitive fields go into real columns (event_date,
// location/city/country, price_inr, image_url, meet_link, ticket_type,
// status, slug, name) and the remaining nested data (speakers, sponsors,
// tickets, gallery, organizer, techStack, timezone, collaboration flags, …)
// is JSON-encoded into the `description` column and rebuilt on read.

import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import type { Event } from "@/lib/events-store";
import type { EventRegistration } from "@/lib/registration-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type EventRow = Record<string, any>;

// ---------- mapping helpers ----------
function isPaidPrice(price: Event["price"]): boolean {
    if (price === undefined || price === null) return false;
    const s = String(price).trim();
    if (s === "" || s.toLowerCase() === "free") return false;
    const n = typeof price === "number" ? price : parseFloat(s);
    return !Number.isNaN(n) && n > 0;
}

function eventToRow(event: Event): EventRow {
    const paid = isPaidPrice(event.price);
    // price_inr is NOT NULL (default 0), a free event must write 0, not null,
    // or the insert fails and publishing breaks entirely.
    const priceNum = paid
        ? (typeof event.price === "number" ? event.price : parseFloat(String(event.price)))
        : 0;

    // Everything the flat columns can't hold, stored in the `details` jsonb
    // column (a real object) and rebuilt on read. The plain-text summary now
    // lives in the `description` column, so it is not duplicated here.
    const ext = {
        fullDescription: event.fullDescription,
        timezone: event.timezone,
        endDate: event.endDate,
        category: event.category,
        techStack: event.techStack,
        hiddenSections: event.hiddenSections,
        registrationDeadline: event.registrationDeadline,
        communityLink: event.communityLink,
        organizer: event.organizer,
        sponsors: event.sponsors,
        speakers: event.speakers,
        tickets: event.tickets,
        gallery: event.gallery,
        attendees: event.attendees,
        isUpcoming: event.isUpcoming,
        lookingForVenue: event.lookingForVenue,
        lookingForSpeakers: event.lookingForSpeakers,
        lookingForSponsors: event.lookingForSponsors,
        requiresLogin: event.requiresLogin,
        locationType: event.location?.type,
        venue: event.location?.venue,
        mapLink: event.location?.mapLink,
        state: event.location?.state,
        priceLabel: paid ? undefined : "Free",
    };

    const row: EventRow = {
        slug: event.slug || null,
        name: event.name || "Untitled Event",
        description: event.description ?? "",
        details: ext,
        event_date: event.date ? new Date(event.date).toISOString() : null,
        location: event.location?.venue || null,
        city: event.location?.city || null,
        country: event.location?.country || null,
        capacity: event.seatsAvailable ?? null,
        ticket_type: paid ? "paid" : "free",
        price_inr: priceNum,
        platform_fee_pct: Math.max(0, Number(event.platformFeePct) || 0),
        image_url: event.imageUrl || null,
        meet_link: event.communityLink || event.location?.mapLink || null,
        status: event.status === "draft" ? "draft" : "published",
        visibility: event.visibility === "private" ? "private" : "public",
    };
    // Preserve the app-generated UUID so upserts by id keep working.
    if (event.id && UUID_RE.test(event.id)) row.id = event.id;
    return row;
}

function rowToEvent(row: EventRow): Event {
    let ext: any = {};
    let plainDescription: string | undefined;

    const details = row.details;
    const hasDetails =
        details &&
        typeof details === "object" &&
        !Array.isArray(details) &&
        Object.keys(details).length > 0;

    if (hasDetails) {
        // New path: rich data lives in the `details` jsonb column and the
        // plain-text summary lives in the `description` column.
        ext = details;
        plainDescription = typeof row.description === "string" ? row.description : "";
    } else if (typeof row.description === "string") {
        // Legacy path: the rich data was JSON-encoded into `description`
        // (marked with __yc). Keeps the pre-migration events rendering.
        try {
            const parsed = JSON.parse(row.description);
            if (parsed && parsed.__yc) ext = parsed;
            else plainDescription = row.description;
        } catch {
            plainDescription = row.description;
        }
    }

    const computedStatus: Event["status"] =
        row.status === "draft"
            ? "draft"
            : row.event_date && new Date(row.event_date) > new Date()
                ? "upcoming"
                : "past";

    const price =
        row.ticket_type === "paid"
            ? (row.price_inr ?? undefined)
            : "Free";

    return {
        id: row.id,
        slug: row.slug || undefined,
        name: row.name || "",
        description: ext.description ?? plainDescription ?? "",
        fullDescription: ext.fullDescription,
        imageUrl: row.image_url || "",
        date: row.event_date || "",
        endDate: ext.endDate,
        timezone: ext.timezone || "IST",
        location: {
            type: ext.locationType || "offline",
            venue: ext.venue ?? row.location ?? undefined,
            mapLink: ext.mapLink,
            city: row.city ?? undefined,
            state: ext.state,
            country: row.country ?? undefined,
        },
        category: ext.category || "",
        status: computedStatus,
        visibility: row.visibility === "private" ? "private" : "public",
        isUpcoming: ext.isUpcoming ?? (computedStatus === "upcoming"),
        lookingForVenue: ext.lookingForVenue,
        lookingForSpeakers: ext.lookingForSpeakers,
        lookingForSponsors: ext.lookingForSponsors,
        price: price as Event["price"],
        platformFeePct: Number(row.platform_fee_pct) || 0,
        registrationDeadline: ext.registrationDeadline,
        seatsAvailable: row.capacity ?? undefined,
        communityLink: ext.communityLink ?? row.meet_link ?? undefined,
        organizer: ext.organizer,
        techStack: ext.techStack,
        requiresLogin: ext.requiresLogin,
        sponsors: ext.sponsors,
        speakers: ext.speakers,
        tickets: ext.tickets,
        attendees: ext.attendees,
        gallery: ext.gallery,
        hiddenSections: ext.hiddenSections,
    };
}

// ---------- event reads ----------
export async function getAllEvents(): Promise<Event[]> {
    // RLS: an admin session returns every row; anon returns published only.
    const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false });
    if (error) {
        console.error("[events-api] getAllEvents", error.message);
        return [];
    }
    return (data || []).map(rowToEvent);
}

export async function getPublishedEvents(): Promise<Event[]> {
    const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("event_date", { ascending: false });
    if (error) {
        console.error("[events-api] getPublishedEvents", error.message);
        return [];
    }
    return (data || [])
        .map(rowToEvent)
        .filter(e => e.status !== "draft" && e.visibility !== "private");
}

export async function getEventBySlug(slug: string): Promise<Event | undefined> {
    if (!slug) return undefined;
    const clean = slug.trim();
    // 1. Try exact slug
    const bySlug = await supabase.from("events").select("*").eq("slug", clean).limit(1);
    if (!bySlug.error && bySlug.data && bySlug.data.length > 0) {
        return rowToEvent(bySlug.data[0]);
    }
    // 2. Try case-insensitive slug
    const byIlike = await supabase.from("events").select("*").ilike("slug", clean).limit(1);
    if (!byIlike.error && byIlike.data && byIlike.data.length > 0) {
        return rowToEvent(byIlike.data[0]);
    }
    // 3. Fall back to id (when the param looks like a UUID).
    if (UUID_RE.test(clean)) {
        const byId = await supabase.from("events").select("*").eq("id", clean).limit(1);
        if (!byId.error && byId.data && byId.data.length > 0) {
            return rowToEvent(byId.data[0]);
        }
    }
    return undefined;
}


export async function getEventById(id: string): Promise<Event | undefined> {
    if (!id || !UUID_RE.test(id)) return undefined;
    const { data, error } = await supabase.from("events").select("*").eq("id", id).limit(1);
    if (error || !data || data.length === 0) return undefined;
    return rowToEvent(data[0]);
}

// ---------- event writes ----------
export async function saveEvent(event: Event): Promise<Event | undefined> {
    const row = eventToRow(event);
    const { data, error } = await supabase
        .from("events")
        .upsert(row, { onConflict: "id" })
        .select("*")
        .limit(1);
    if (error) {
        console.error("[events-api] saveEvent", error.message);
        throw new Error(error.message);
    }
    return data && data.length > 0 ? rowToEvent(data[0]) : undefined;
}

export const createEvent = saveEvent;
export const updateEvent = saveEvent;

export async function publishEvent(eventId: string): Promise<void> {
    const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", eventId);
    if (error) {
        console.error("[events-api] publishEvent error:", error.message);
        throw new Error(error.message);
    }
}

export async function unpublishEvent(eventId: string): Promise<void> {
    const { error } = await supabase
        .from("events")
        .update({ status: "draft" })
        .eq("id", eventId);
    if (error) {
        console.error("[events-api] unpublishEvent error:", error.message);
        throw new Error(error.message);
    }
}


export async function deleteEvent(id: string): Promise<void> {
    // Remove the event's gallery files from the private bucket first, the
    // event_media rows cascade on delete, but the storage objects would not,
    // leaving orphans behind.
    try {
        const { data: media } = await supabase
            .from("event_media")
            .select("path")
            .eq("event_id", id);
        const paths = (media || []).map((m: { path: string }) => m.path);
        if (paths.length) await supabase.storage.from("event-gallery").remove(paths);
    } catch (e: any) {
        console.error("[events-api] deleteEvent gallery cleanup", e?.message);
    }
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
        console.error("[events-api] deleteEvent", error.message);
        throw new Error(error.message);
    }
}

// ---------- registrations ----------
export interface CreateRegistrationInput {
    eventId: string;
    userId?: string | null;
    codePrefix?: string;
    userDetails: {
        name: string;
        email: string;
        phone?: string;
        city?: string;
        state?: string;
        country?: string;
        linkedIn?: string;
    };
    paymentId?: string;
    /** INR price of the ticket (stored for the record). */
    amount?: number;
    /** Currency the Yatri chose to pay in (INR default). */
    currency?: string;
    /** 'pending' before a paid checkout, 'paid'/'free' when settled. */
    paymentStatus?: "pending" | "paid" | "failed" | "free";
    /** Our orders.id row backing this registration (paid flows). */
    orderId?: string | null;
}

function generateRegistrationCode(prefix?: string): string {
    const clean = (prefix || "YC").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 10) || "YC";
    return `${clean}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * A registration plus the schedule fields carried from the embedded event, so
 * calendar buttons can be built without a second read. Superset of
 * EventRegistration, so existing consumers keep working unchanged.
 */
export interface RegistrationWithEvent extends EventRegistration {
    eventDate?: string;
    meetLink?: string;
    city?: string;
}

function regRowToRegistration(row: EventRow): RegistrationWithEvent {
    // A to-one embed returns an object; guard for the array shape too.
    const ev = Array.isArray(row.events) ? row.events[0] : row.events;
    const rawStatus = row.payment_status ?? (row.payment_id ? "paid" : undefined);
    const paymentStatus = rawStatus === "paid" ? "completed" : rawStatus;
    const isPaidTicket = rawStatus && rawStatus !== "free";
    return {
        id: row.id,
        userId: row.user_id || "",
        eventId: row.event_id,
        eventSlug: ev?.slug || "",
        eventName: ev?.name || "",
        eventDate: ev?.event_date || undefined,
        meetLink: ev?.meet_link || undefined,
        city: ev?.city || undefined,
        registrationCode: row.registration_code,
        registeredAt: row.created_at,
        status: row.status,
        attendedAt: row.attended_at || undefined,
        userDetails: {
            name: row.name,
            email: row.email,
            phone: row.phone || "",
            city: row.city || "",
            state: row.state || "",
            country: row.country || "",
            linkedIn: row.linkedin_url || undefined,
        },
        ticketType: isPaidTicket ? "paid" : "free",
        paymentStatus: paymentStatus || undefined,
        paymentId: row.payment_id || undefined,
        orderId: row.order_id || undefined,
        currency: row.currency || undefined,
        paymentAmount: typeof row.amount === 'number' ? row.amount : undefined,
    };
}

/** Payment/amount fields that vary between the free and paid flows. */
function registrationPaymentFields(input: CreateRegistrationInput): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    if (input.paymentId && UUID_RE.test(input.paymentId)) {
        fields.payment_id = input.paymentId;
    }
    if (input.amount !== undefined) fields.amount = input.amount;
    if (input.currency) fields.currency = input.currency;
    if (input.paymentStatus) fields.payment_status = input.paymentStatus;
    if (input.orderId !== undefined && input.orderId !== null) fields.order_id = input.orderId;
    return fields;
}


/**
 * Creates (or reuses) a registration for an event.
 *
 * The (event_id, email) pair is unique, so an abandoned then retried paid
 * attempt must reuse the existing pending row rather than hit the constraint.
 * We look it up first (fast path for the Yatri's own row), fall back to an
 * insert, and if the insert races into a 23505 we patch the existing row.
 */
export async function createRegistration(
    input: CreateRegistrationInput
): Promise<{ registrationCode: string; id: string }> {
    const email = input.userDetails.email.trim().toLowerCase();
    const detailFields = {
        name: input.userDetails.name,
        phone: input.userDetails.phone || null,
        city: input.userDetails.city || null,
        state: input.userDetails.state || null,
        country: input.userDetails.country || null,
        linkedin_url: input.userDetails.linkedIn || null,
    };
    const paymentFields = registrationPaymentFields(input);

    // Fast path: reuse the Yatri's own existing row for this event.
    const { data: existing } = await supabase
        .from("event_registrations")
        .select("id, registration_code")
        .eq("event_id", input.eventId)
        .eq("email", email)
        .maybeSingle();

    if (existing?.id) {
        const { data, error } = await supabase
            .from("event_registrations")
            .update({ ...detailFields, ...paymentFields })
            .eq("id", existing.id)
            .select("id, registration_code")
            .single();
        if (error) {
            console.error("[events-api] createRegistration(update)", error.message);
            throw error;
        }
        return { registrationCode: data.registration_code, id: data.id };
    }

    const registrationCode = generateRegistrationCode(input.codePrefix);
    const { data, error } = await supabase
        .from("event_registrations")
        .insert({
            event_id: input.eventId,
            user_id: input.userId || null,
            registration_code: registrationCode,
            email,
            status: "registered",
            ...detailFields,
            ...paymentFields,
        })
        .select("id, registration_code")
        .single();

    if (error) {
        // Row already exists (e.g. RLS hid it above), patch it instead.
        if ((error as any).code === "23505") {
            const { data: patched, error: upErr } = await supabase
                .from("event_registrations")
                .update({ ...detailFields, ...paymentFields })
                .eq("event_id", input.eventId)
                .eq("email", email)
                .select("id, registration_code")
                .single();
            if (upErr) {
                console.error("[events-api] createRegistration(conflict)", upErr.message);
                throw upErr;
            }
            return { registrationCode: patched.registration_code, id: patched.id };
        }
        console.error("[events-api] createRegistration", error.message);
        throw error;
    }
    return { registrationCode: data.registration_code, id: data.id };
}

/**
 * Creates our orders row (kind 'event') and returns its id. Mirrors
 * createMentorshipOrder so the paid registration flow has an order to link.
 */
export async function createEventOrder(input: {
    userId?: string | null;
    email: string;
    amount: number;
    currency: string;
    items: unknown[];
}): Promise<{ orderId: string | null; error: string | null }> {
    const { data, error } = await supabase
        .from("orders")
        .insert({
            user_id: input.userId || null,
            email: input.email,
            kind: "event",
            items: input.items,
            amount: input.amount,
            currency: input.currency,
        })
        .select("id")
        .single();
    if (error || !data) {
        console.error("[events-api] createEventOrder", error?.message);
        return { orderId: null, error: "We could not start your order. Please try again." };
    }
    return { orderId: String(data.id), error: null };
}

export async function getEventRegistrations(eventId: string): Promise<RegistrationWithEvent[]> {
    if (!eventId) return [];
    const { data, error } = await supabase
        .from("event_registrations")
        // Left embed of the event so slug/date/meet link/city ride along; a
        // registration missing its event still returns (event fields empty).
        .select("*, events(name,slug,event_date,meet_link,city)")
        .eq("event_id", eventId)
        // Exclude abandoned checkout rows (payment_status='pending') so they
        // don't show as valid registrations in the admin view.
        .not("payment_status", "eq", "pending")
        .order("created_at", { ascending: false });
    if (error) {
        console.error("[events-api] getEventRegistrations", error.message);
        return [];
    }
    return (data || []).map(regRowToRegistration);
}


export async function cancelRegistration(id: string): Promise<boolean> {
    // 1. Fetch registration details before cancelling
    let regInfo: { name: string | null; email: string | null; eventName: string; eventDate: string; eventLocation: string } | null = null;
    try {
        const { data } = await supabase
            .from("event_registrations")
            .select("id, name, email, events(name, event_date, location, city)")
            .eq("id", id)
            .maybeSingle();
        if (data) {
            const ev = data.events as any;
            regInfo = {
                name: data.name,
                email: data.email,
                eventName: ev?.name || "Yatri Cloud Event",
                eventDate: ev?.event_date ? new Date(ev.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "",
                eventLocation: [ev?.location, ev?.city].filter(Boolean).join(", ") || "Online",
            };
        }
    } catch (err) {
        console.warn("[events-api] Failed to fetch registration details for cancellation email:", err);
    }

    const { error } = await supabase
        .from("event_registrations")
        .update({ status: "cancelled" })
        .eq("id", id);
    if (error) {
        console.error("[events-api] cancelRegistration", error.message);
        return false;
    }

    // 2. Dispatch cancellation email
    if (regInfo?.email) {
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #0f172a; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="margin-bottom: 20px;">
              <span style="font-weight: 700; font-size: 15px; color: #ef4444; letter-spacing: -0.02em;">YATRI CLOUD - CANCELLATION</span>
            </div>
            <div style="margin-bottom: 12px; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.3;">
              Registration Cancelled
            </div>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Hello ${regInfo.name || "Yatri"}, your registration for <strong>${regInfo.eventName}</strong> has been cancelled and your ticket has been released.
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <div style="font-weight: 700; font-size: 15px; color: #0f172a; margin-bottom: 8px;">${regInfo.eventName}</div>
              ${regInfo.eventDate ? `<p style="margin: 0 0 6px 0; font-size: 13px; color: #475569;"><strong>Date:</strong> ${regInfo.eventDate}</p>` : ""}
              <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Location:</strong> ${regInfo.eventLocation}</p>
            </div>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Changed your mind? You can explore our upcoming workshops and reserve a spot anytime.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="https://www.yatricloud.com/events" style="display: inline-block; background-color: #007CFF; color: #ffffff; padding: 10px 22px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 13px;">
                Explore Events
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin: 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              © ${new Date().getFullYear()} Yatri Cloud. All rights reserved.
            </p>
          </div>
        `;

        sendEmail({
            to: regInfo.email,
            subject: `Registration Cancelled: ${regInfo.eventName}`,
            html,
            templateKey: "event_registration_cancelled",
            metadata: { registrationId: id },
        }).catch((err) => console.warn("[events-api] Failed to send registration cancellation email:", err));
    }

    return true;
}

export async function deleteRegistration(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("id", id);
    if (error) {
        console.error("[events-api] deleteRegistration", error.message);
        return false;
    }
    return true;
}

export async function updateRegistrationDetails(
    id: string,
    updates: Partial<EventRegistration["userDetails"]>
): Promise<boolean> {
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.city !== undefined) patch.city = updates.city;
    if (updates.state !== undefined) patch.state = updates.state;
    if (updates.country !== undefined) patch.country = updates.country;
    if (updates.linkedIn !== undefined) patch.linkedin_url = updates.linkedIn;
    const { error } = await supabase.from("event_registrations").update(patch).eq("id", id);
    if (error) {
        console.error("[events-api] updateRegistrationDetails", error.message);
        return false;
    }
    return true;
}

// ---------- capacity ----------
export interface EventCapacity {
    /** Configured seat cap, or null when the event is unlimited. */
    capacity: number | null;
    /** Non-cancelled registrations that already took a seat. */
    registered: number;
    /** Seats still open, or null when unlimited. */
    seatsLeft: number | null;
    /** True only when a real cap is set and every seat is taken. */
    isFull: boolean;
}

/**
 * Reads the event's seat cap and counts the non-cancelled registrations.
 * A null or 0 capacity means unlimited (never full, no seats-left number).
 */
export async function getEventCapacity(eventId: string): Promise<EventCapacity> {
    const unlimited: EventCapacity = { capacity: null, registered: 0, seatsLeft: null, isFull: false };
    if (!eventId) return unlimited;

    const { data: eventRow } = await supabase
        .from("events")
        .select("capacity")
        .eq("id", eventId)
        .maybeSingle();
    const rawCapacity = eventRow?.capacity;
    const capacity =
        typeof rawCapacity === "number" && rawCapacity > 0 ? rawCapacity : null;

    const { count } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .neq("status", "cancelled");
    const registered = count ?? 0;

    if (capacity === null) {
        return { capacity: null, registered, seatsLeft: null, isFull: false };
    }
    const seatsLeft = Math.max(0, capacity - registered);
    return { capacity, registered, seatsLeft, isFull: seatsLeft <= 0 };
}

// ---------- waitlist ----------
export type WaitlistStatus = "waiting" | "notified" | "converted" | "cancelled";

export interface WaitlistEntry {
    id: string;
    eventId: string;
    userId: string | null;
    name: string;
    email: string;
    phone: string | null;
    status: WaitlistStatus;
    notifiedAt: string | null;
    createdAt: string;
}

function waitlistRowToEntry(row: EventRow): WaitlistEntry {
    return {
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id || null,
        name: row.name || "",
        email: row.email || "",
        phone: row.phone || null,
        status: row.status,
        notifiedAt: row.notified_at || null,
        createdAt: row.created_at,
    };
}

/**
 * Adds the Yatri to an event's waitlist. The (event_id, email) pair is unique,
 * so an existing row is reused: a previously cancelled entry is re-opened, and
 * a live entry is treated as success without a duplicate insert.
 */
export async function joinWaitlist(input: {
    eventId: string;
    userId?: string | null;
    name: string;
    email: string;
    phone?: string;
}): Promise<{ ok: boolean; error: string | null }> {
    const email = input.email.trim().toLowerCase();

    const { data: existing } = await supabase
        .from("event_waitlist")
        .select("id, status")
        .eq("event_id", input.eventId)
        .eq("email", email)
        .maybeSingle();

    if (existing?.id) {
        if (existing.status === "cancelled") {
            const { error } = await supabase
                .from("event_waitlist")
                .update({ status: "waiting", name: input.name, phone: input.phone || null })
                .eq("id", existing.id);
            if (error) {
                console.error("[events-api] joinWaitlist(reopen)", error.message);
                return { ok: false, error: "We could not add you to the waitlist. Please try again." };
            }
        }
        return { ok: true, error: null };
    }

    const { error } = await supabase.from("event_waitlist").insert({
        event_id: input.eventId,
        user_id: input.userId || null,
        name: input.name,
        email,
        phone: input.phone || null,
        status: "waiting",
    });

    if (error) {
        // Raced into the unique constraint, already on the list, treat as done.
        if ((error as any).code === "23505") return { ok: true, error: null };
        console.error("[events-api] joinWaitlist", error.message);
        return { ok: false, error: "We could not add you to the waitlist. Please try again." };
    }
    return { ok: true, error: null };
}

/** The signed-in Yatri's waitlist row for an event, or null. */
export async function getMyWaitlistEntry(eventId: string): Promise<WaitlistEntry | null> {
    if (!eventId) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
        .from("event_waitlist")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
    if (error || !data) return null;
    return waitlistRowToEntry(data);
}

/** Admin read of every waitlist row for an event, oldest first. */
export async function getEventWaitlist(eventId: string): Promise<WaitlistEntry[]> {
    if (!eventId) return [];
    const { data, error } = await supabase
        .from("event_waitlist")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
    if (error) {
        console.error("[events-api] getEventWaitlist", error.message);
        return [];
    }
    return (data || []).map(waitlistRowToEntry);
}

/**
 * Admin action: mark a waitlist entry as notified and email the Yatri that a
 * seat has opened, with a direct link to register. The status is updated first
 * so a mail failure still records the notification for the admin.
 */
export async function notifyWaitlistEntry(entryId: string): Promise<{ ok: boolean; error?: string }> {
    const { data: entry, error: entryErr } = await supabase
        .from("event_waitlist")
        .select("*")
        .eq("id", entryId)
        .maybeSingle();
    if (entryErr || !entry) {
        console.error("[events-api] notifyWaitlistEntry(load)", entryErr?.message);
        return { ok: false, error: "We could not find that waitlist entry." };
    }

    const { error: updErr } = await supabase
        .from("event_waitlist")
        .update({ status: "notified", notified_at: new Date().toISOString() })
        .eq("id", entryId);
    if (updErr) {
        console.error("[events-api] notifyWaitlistEntry(update)", updErr.message);
        return { ok: false, error: "We could not update the waitlist entry." };
    }

    const { data: eventRow } = await supabase
        .from("events")
        .select("slug, name")
        .eq("id", entry.event_id)
        .maybeSingle();
    const eventSlug = eventRow?.slug || entry.event_id;
    const eventName = eventRow?.name || "the event";
    const link = `https://www.yatricloud.com/events/${eventSlug}`;
    const firstName = (entry.name || "Yatri").split(" ")[0] || "Yatri";

    try {
        await sendEmail({
            to: entry.email,
            subject: `A seat opened for ${eventName}`,
            html: `
                <div style="font-family:'Inter Tight',Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
                    <h2 style="font-size:22px;margin:0 0 16px;">Good news, ${firstName}</h2>
                    <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">A seat just opened for <strong>${eventName}</strong>. You are next on the waitlist, so this spot is yours to claim.</p>
                    <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">Please register now to lock it in. Seats are given on a first come basis.</p>
                    <p style="text-align:center;margin:24px 0;">
                        <a href="${link}" style="display:inline-block;padding:14px 28px;background:#007CFF;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Register now</a>
                    </p>
                    <p style="font-size:14px;line-height:1.6;color:#64748b;margin:24px 0 0;">If the button does not work, open this link: <a href="${link}" style="color:#007CFF;">${link}</a></p>
                    <p style="font-size:14px;line-height:1.6;color:#64748b;margin:16px 0 0;">See you there, from the Yatri Cloud team.</p>
                </div>
            `,
        });
    } catch (mailErr) {
        // The notified state is already saved; surface success so the admin sees it.
        console.error("[events-api] notifyWaitlistEntry(email)", mailErr);
    }
    return { ok: true };
}

/** Owner action: leave the waitlist (sets the row to cancelled). */
export async function leaveWaitlist(entryId: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase
        .from("event_waitlist")
        .update({ status: "cancelled" })
        .eq("id", entryId);
    if (error) {
        console.error("[events-api] leaveWaitlist", error.message);
        return { ok: false, error: "We could not update your waitlist entry." };
    }
    return { ok: true };
}

// ---------- media upload (Supabase Storage) ----------
export async function uploadEventMediaFile(
    fileName: string,
    fileData: File | Blob,
    mimeType: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
    try {
        const safeName = fileName.replace(/[^\w.-]+/g, "_");
        const path = `events/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage
            .from("product-images")
            .upload(path, fileData, { upsert: true, contentType: mimeType });
        if (error) throw error;
        const fileUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
        return { success: true, fileUrl };
    } catch (error: any) {
        console.error("[events-api] uploadEventMediaFile", error?.message);
        return { success: false, error: error?.message || "Upload failed" };
    }
}

// ---------- attendees-only event gallery (migration 074) ----------
// Photos live in the PRIVATE `event-gallery` bucket; `event_media` rows and the
// storage objects are both RLS-gated so only admins and users who ATTENDED the
// event can read them. Attendees view via short-lived signed URLs (which they
// can only mint because the storage SELECT policy checks their attendance).

const EVENT_GALLERY_BUCKET = "event-gallery";

export interface EventGalleryItem {
    id: string;
    url: string;
    mediaType: "photo" | "video";
    caption: string | null;
    path: string;
}

/** Admin: upload one or more photos/videos into an event's gallery. */
export async function uploadEventGalleryMedia(
    eventId: string,
    files: File[],
): Promise<{ uploaded: number; error?: string }> {
    try {
        const { data: last } = await supabase
            .from("event_media")
            .select("sort_order")
            .eq("event_id", eventId)
            .order("sort_order", { ascending: false })
            .limit(1);
        let sort = (last?.[0]?.sort_order ?? -1) + 1;
        let uploaded = 0;
        for (const file of files) {
            const safe = file.name.replace(/[^\w.-]+/g, "_");
            const path = `${eventId}/${Date.now()}-${sort}-${safe}`;
            const { error: upErr } = await supabase.storage
                .from(EVENT_GALLERY_BUCKET)
                .upload(path, file, { contentType: file.type, upsert: false });
            if (upErr) { console.error("[events-api] gallery upload", upErr.message); continue; }
            const media_type = file.type.startsWith("video") ? "video" : "photo";
            const { error: rowErr } = await supabase
                .from("event_media")
                .insert({ event_id: eventId, path, media_type, sort_order: sort });
            if (rowErr) {
                // Roll back the orphaned object if the row insert failed.
                await supabase.storage.from(EVENT_GALLERY_BUCKET).remove([path]);
                console.error("[events-api] gallery row", rowErr.message);
                continue;
            }
            uploaded++; sort++;
        }
        return { uploaded };
    } catch (e: any) {
        return { uploaded: 0, error: e?.message || "Upload failed" };
    }
}

/**
 * The event's gallery as signed URLs. Returns items only for admins + attendees
 * (RLS on `event_media` and the storage object both enforce this); everyone else
 * gets an empty list.
 */
export async function listEventGalleryMedia(eventId: string): Promise<EventGalleryItem[]> {
    const { data, error } = await supabase
        .from("event_media")
        .select("id, path, media_type, caption")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true });
    if (error || !data?.length) return [];
    const items: EventGalleryItem[] = [];
    for (const row of data as any[]) {
        const { data: signed } = await supabase.storage
            .from(EVENT_GALLERY_BUCKET)
            .createSignedUrl(row.path, 3600);
        if (signed?.signedUrl) {
            items.push({ id: row.id, url: signed.signedUrl, mediaType: row.media_type, caption: row.caption, path: row.path });
        }
    }
    return items;
}

/** Whether the current user may see this event's gallery (attended it, or admin). */
export async function canViewEventGallery(eventId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: attended } = await supabase.rpc("attended_event", { evt: eventId });
    if (attended === true) return true;
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return (prof as { role?: string } | null)?.role === "admin";
}

/** Admin: remove a gallery item (storage object + row). */
export async function deleteEventGalleryMedia(id: string, path: string): Promise<{ ok: boolean; error?: string }> {
    await supabase.storage.from(EVENT_GALLERY_BUCKET).remove([path]);
    const { error } = await supabase.from("event_media").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
