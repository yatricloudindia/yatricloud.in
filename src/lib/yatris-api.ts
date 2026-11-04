/**
 * Yatris Users API, now backed by Supabase Auth + RLS-protected `profiles`
 * and `certifications` tables. Legacy function signatures are preserved so
 * all 13 consumer files keep working; the internals are fully modern:
 *  - real JWT sessions with auto-refresh (no tokens in spreadsheets)
 *  - no hardcoded test-credential backdoor (removed for security)
 *  - single-query certification lookups (no localStorage cache gymnastics)
 */

import {
  signUpWithPassword, signInWithPassword, signInWithGoogleIdToken,
  signOut, hasSession, getCachedUser, fetchMyProfile, updateMyProfile,
  changePassword as authChangePassword, changeEmail as authChangeEmail,
  deleteMyAccount,
  type YatriUser,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ensurePhotoIsUrl } from '@/lib/google-sheets';

/** Display provider name → DB enum. */
const PROVIDER_TO_ENUM: Record<string, string> = {
  AWS: 'AWS', Azure: 'AZURE', GCP: 'GCP', GitHub: 'GITHUB', Oracle: 'ORACLE',
  Salesforce: 'SALESFORCE', ServiceNow: 'SERVICENOW', OpenAI: 'OPENAI', Anthropic: 'ANTHROPIC',
  Snowflake: 'SNOWFLAKE', HashiCorp: 'HASHICORP', Kubernetes: 'KUBERNETES',
};

function normalizeProviderEnum(raw?: string | null): string {
  if (!raw) return 'OTHER';
  const clean = raw.trim();
  if (PROVIDER_TO_ENUM[clean]) return PROVIDER_TO_ENUM[clean];
  const upper = clean.toUpperCase();
  if (['AWS', 'AZURE', 'GCP', 'GITHUB', 'ORACLE', 'SALESFORCE', 'SERVICENOW', 'OPENAI', 'ANTHROPIC', 'SNOWFLAKE', 'HASHICORP', 'KUBERNETES', 'OTHER'].includes(upper)) {
    return upper;
  }
  if (/snowflake/i.test(clean)) return 'SNOWFLAKE';
  if (/anthropic|claude/i.test(clean)) return 'ANTHROPIC';
  return 'OTHER';
}

const ENUM_TO_PROVIDER: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_TO_ENUM).map(([k, v]) => [v, k])
);

interface User {
  email: string;
  fullName: string;
  linkedinUrl?: string;
  photoUrl?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  countryCode?: string;
  phoneNumber?: string;
  interestedCertifications?: string[];
  authProvider?: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  message?: string;
}

interface RegisterResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  message?: string;
}

/**
 * Register a new user
 */
export async function registerUser(data: {
  email: string;
  password: string;
  fullName: string;
  linkedinUrl?: string;
  photoUrl?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  countryCode?: string;
  phoneNumber?: string;
  interestedCertifications?: string[];
}): Promise<RegisterResponse> {
  const { user, error, needsEmailConfirm } = await signUpWithPassword(data);
  if (error) return { success: false, error };
  if (needsEmailConfirm) {
    return {
      success: true,
      message: 'Check your inbox to confirm your email, then sign in.',
    };
  }
  return { success: true, token: 'supabase-session', user: user ?? undefined };
}

/**
 * Login user
 */
export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  const { user, error } = await signInWithPassword(email, password);
  if (error) return { success: false, error };
  const fullProfile = await fetchMyProfile();
  return { success: true, token: 'supabase-session', user: fullProfile ?? user ?? undefined };
}

/**
 * Login or Register with Google
 */
export async function googleLogin(userProfile: {
  email: string;
  fullName: string;
  photoUrl: string;
  /** Raw Google ID token (JWT credential), required for secure verification. */
  idToken?: string;
  nonce?: string;
}): Promise<LoginResponse> {
  if (!userProfile.idToken) {
    return {
      success: false,
      error: 'Google sign-in needs a fresh credential, please try again.',
    };
  }
  const { user, error } = await signInWithGoogleIdToken(userProfile.idToken, userProfile.nonce);
  if (error) return { success: false, error };
  // Enrich profile with Google data on first login (photo/name may be empty)
  if (user && (!user.photoUrl || !user.fullName)) {
    await updateMyProfile({
      fullName: user.fullName || userProfile.fullName,
      photoUrl: user.photoUrl || userProfile.photoUrl,
    });
  }
  return { success: true, token: 'supabase-session', user: (await fetchMyProfile()) ?? undefined };
}

/**
 * Get current user from token
 */
export async function getCurrentUser(): Promise<User | null> {
  return await fetchMyProfile();
}

/**
 * Get user certifications from all provider sheets
 * Fetches from separate provider sheets (AWS, Azure, GCP, etc.) and filters by user email
 * Uses caching for immediate loading
 */
export async function getUserCertifications(): Promise<any[]> {
  // One indexed query replaces 10+ webhook fetches + localStorage caching.
  const user = getCachedUser();
  if (!user?.email) return [];
  const { data, error } = await supabase
    .from('certifications')
    .select('*')
    .eq('email', user.email.toLowerCase())
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Get user certifications error:', error.message);
    return [];
  }
  return (data || []).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    certificationProvider: ENUM_TO_PROVIDER[c.provider] ?? c.provider,
    certificationName: c.certification_name,
    examCode: c.exam_code || '',
    certificationDate: c.certification_date || '',
    linkedinUrl: c.linkedin_url || '',
    verifiedCredential: c.verified_credential_url || '',
    country: c.country || '',
    stateProvince: c.state_province || '',
    city: c.city || '',
    countryCode: c.country_code || '',
    phoneNumber: c.phone_number || '',
    photoUrl: c.photo_url || '',
    additionalNotes: c.additional_notes || '',
  }));
}

/**
 * Submit certification
 */
export async function submitCertification(data: {
  certificationProvider: string;
  certificationName: string;
  examCode: string;
  certificationDate: string;
  verifiedCredential?: string;
  additionalNotes?: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const profile = getCachedUser();
  if (!authUser || !profile) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.from('certifications').insert({
    user_id: authUser.id,
    email: profile.email.toLowerCase(),
    full_name: profile.fullName,
    provider: normalizeProviderEnum(data.certificationProvider),
    certification_name: data.certificationName,
    exam_code: data.examCode || null,
    certification_date: data.certificationDate || null,
    verified_credential_url: data.verifiedCredential || null,
    additional_notes: data.additionalNotes || null,
    linkedin_url: profile.linkedinUrl || null,
    // Base64 profile photos are uploaded to storage, never inlined in the row.
    photo_url: await ensurePhotoIsUrl(profile.photoUrl, authUser.id),
    country: profile.country || null,
    state_province: profile.stateProvince || null,
    city: profile.city || null,
    country_code: profile.countryCode || null,
    phone_number: profile.phoneNumber || null,
  });
  if (error) {
    console.error('Submit certification error:', error.message);
    return { success: false, error: 'Submission failed, please try again.' };
  }
  return { success: true, message: 'Certification submitted!' };
}

/**
 * Update user profile
 */
export async function updateProfile(data: {
  fullName?: string;
  linkedinUrl?: string;
  photoUrl?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  countryCode?: string;
  phoneNumber?: string;
  interestedCertifications?: string[];
}): Promise<{ success: boolean; user?: User; error?: string; message?: string }> {
  const { user, error } = await updateMyProfile(data);
  if (error) return { success: false, error };
  return { success: true, user: user ?? undefined, message: 'Profile updated!' };
}

/**
 * Logout user
 */
export function logout(): void {
  // Clear legacy keys too so pre-migration sessions can't linger
  localStorage.removeItem('yatris_token');
  localStorage.removeItem('yatris_user');
  void signOut();
}

/**
 * Check if user is authenticated (live Supabase session mirror)
 */
export function isAuthenticated(): boolean {
  return hasSession();
}

/**
 * Update certification
 */
export async function updateCertification(
  certificationId: number | string,
  data: {
    certificationProvider?: string;
    certificationName?: string;
    examCode?: string;
    certificationDate?: string;
    verifiedCredential?: string;
    additionalNotes?: string;
  }
): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!hasSession()) return { success: false, error: 'Not authenticated' };
  const patch: Record<string, unknown> = {};
  if (data.certificationProvider !== undefined) patch.provider = PROVIDER_TO_ENUM[data.certificationProvider] ?? 'OTHER';
  if (data.certificationName !== undefined) patch.certification_name = data.certificationName;
  if (data.examCode !== undefined) patch.exam_code = data.examCode || null;
  if (data.certificationDate !== undefined) patch.certification_date = data.certificationDate || null;
  if (data.verifiedCredential !== undefined) patch.verified_credential_url = data.verifiedCredential || null;
  if (data.additionalNotes !== undefined) patch.additional_notes = data.additionalNotes || null;

  // RLS guarantees users can only update their own rows.
  const { error } = await supabase.from('certifications').update(patch).eq('id', String(certificationId));
  if (error) {
    console.error('Update certification error:', error.message);
    return { success: false, error: 'Update failed, please try again.' };
  }
  return { success: true, message: 'Certification updated!' };
}

/**
 * Delete certification
 */
export async function deleteCertification(
  certificationId: number | string
): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!hasSession()) return { success: false, error: 'Not authenticated' };
  // RLS guarantees users can only delete their own rows.
  const { error } = await supabase.from('certifications').delete().eq('id', String(certificationId));
  if (error) {
    console.error('Delete certification error:', error.message);
    return { success: false, error: 'Delete failed, please try again.' };
  }
  return { success: true, message: 'Certification deleted.' };
}

/**
 * Change password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = getCachedUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  // Re-authenticate first so a stolen open session can't silently change the password.
  const { error: reauthError } = await signInWithPassword(user.email, currentPassword);
  if (reauthError) return { success: false, error: 'Current password is incorrect.' };
  const { error } = await authChangePassword(newPassword);
  if (error) return { success: false, error };
  return { success: true, message: 'Password changed!' };
}

/**
 * Change email
 */
export async function changeEmail(
  currentPassword: string,
  newEmail: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = getCachedUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  const { error: reauthError } = await signInWithPassword(user.email, currentPassword);
  if (reauthError) return { success: false, error: 'Current password is incorrect.' };
  const { error } = await authChangeEmail(newEmail);
  if (error) return { success: false, error };
  return { success: true, message: 'Confirmation links sent to both email addresses.' };
}

/**
 * Delete current user account and all data
 */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  return deleteMyAccount();
}

/**
 * Get stored user
 */
export function getStoredUser(): User | null {
  return getCachedUser();
}

/**
 * Check if user profile has all mandatory fields filled
 * Users will have incomplete profiles if missing country, state, city, phone, or interested certifications (LinkedIn is optional)
 */
export function isProfileComplete(user: any | null): boolean {
  if (!user) return false;
  const hasCountry = Boolean(user.country && String(user.country).trim().length > 0);
  const hasState = Boolean(user.stateProvince && String(user.stateProvince).trim().length > 0);
  const hasCity = Boolean(user.city && String(user.city).trim().length > 0);
  const hasPhone = Boolean(user.phoneNumber && String(user.phoneNumber).trim().length > 0);
  const hasCerts = Boolean(Array.isArray(user.interestedCertifications) && user.interestedCertifications.length > 0);
  return hasCountry && hasState && hasCity && hasPhone && hasCerts;
}

// Event Registration Types
export interface Attendee {
  name: string;
  email: string;
  phone?: string;
  ticketId: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  eventSlug?: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventImage: string;
  registrationDate: string;
  attendees: Attendee[];
  totalAmount: number;
  status: 'confirmed' | 'cancelled' | 'pending';
  /** Raw registration status from the database, so the UI can detect 'attended'. */
  rawStatus: 'registered' | 'attended' | 'cancelled';
}

/**
 * Register for an event
 * Stores registration in localStorage for persistence
 */
export async function registerForEvent(
  event: { id: string; name: string; date: string; location: any; imageUrl: string },
  attendees: Omit<Attendee, 'ticketId'>[]
): Promise<{ success: boolean; message?: string; registrationId?: string }> {
  const user = getCachedUser();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!user || !authUser) {
    return { success: false, message: 'You must be logged in to register.' };
  }

  const code = () =>
    'EVT-' + Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.floor(1000 + Math.random() * 9000);

  const people = attendees.length
    ? attendees
    : [{ name: user.fullName, email: user.email, phone: user.phoneNumber }];

  const rows = people.map((a) => ({
    event_id: event.id,
    user_id: authUser.id,
    registration_code: code(),
    name: a.name || user.fullName,
    email: (a.email || user.email).toLowerCase(),
    phone: a.phone || user.phoneNumber || null,
    city: user.city || null,
    state: user.stateProvince || null,
    country: user.country || null,
    linkedin_url: user.linkedinUrl || null,
  }));

  const { data, error } = await supabase
    .from('event_registrations')
    .insert(rows)
    .select('registration_code');

  if (error) {
    const msg = error.message.includes('duplicate')
      ? "You're already registered for this event, Yatri!"
      : 'Registration failed, please try again.';
    console.error('Registration error:', error.message);
    return { success: false, message: msg };
  }
  return { success: true, registrationId: data?.[0]?.registration_code, message: 'Registered!' };
}

/**
 * Get registered events for current user
 */
export async function getRegisteredEvents(): Promise<EventRegistration[]> {
  if (!hasSession()) return [];
  // Scope to the signed-in Yatri explicitly: RLS lets ADMINS read every
  // registration, so without this filter an admin's "My Events" showed all
  // Yatris' registrations and EventDetail marked them registered everywhere.
  const uid = getCachedUser()?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from('event_registrations')
    .select('id,registration_code,name,email,phone,status,payment_status,payment_id,amount,currency,created_at,events(id,slug,name,event_date,location,city,country,image_url)')
    .eq('user_id', uid)
    // Exclude abandoned checkout rows: only show free, paid, or no-payment registrations.
    .not('payment_status', 'eq', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching registrations:', error.message);
    return [];
  }
  return (data || []).map((r: any) => {
    const confirmed = r.status !== 'cancelled' && (r.payment_status === undefined || r.payment_status === 'free' || r.payment_status === 'paid' || r.payment_status === 'completed');
    return {
      id: r.id,
      eventId: r.events?.id ?? '',
      eventSlug: r.events?.slug,
      eventName: r.events?.name ?? '',
      eventDate: r.events?.event_date ?? '',
      eventLocation: [r.events?.location, r.events?.city, r.events?.country].filter(Boolean).join(', '),
      eventImage: r.events?.image_url ?? '',
      registrationDate: r.created_at,
      attendees: [{ name: r.name, email: r.email, phone: r.phone || undefined, ticketId: r.registration_code }],
      totalAmount: typeof r.amount === 'number' ? r.amount : 0,
      status: r.status === 'cancelled' ? 'cancelled' : confirmed ? 'confirmed' : 'pending',
      rawStatus: r.status === 'attended' ? 'attended' : r.status === 'cancelled' ? 'cancelled' : 'registered',
    };
  });
}

/**
 * Issue an attendance certificate for an event the current user attended.
 * The server only issues when the user's registration status is 'attended'.
 * Never throws; returns a plain result the UI can act on.
 */
export async function issueEventCertificate(
  eventId: string
): Promise<{ ok: boolean; serial?: string; message?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) return { ok: false, message: 'Please sign in first.' };

    const res = await fetch('/api/issue-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, access_token: accessToken }),
    });
    const body = await res.json().catch(() => ({}));
    return {
      ok: !!body?.ok,
      serial: body?.serial,
      message: body?.message,
    };
  } catch (err) {
    console.error('Issue event certificate error:', err);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
}

/**
 * Read the current user's certificate for an event, if one exists.
 * Returns { serial } or null. Never throws.
 */
export async function getMyEventCertificate(
  eventId: string
): Promise<{ serial: string } | null> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;
    const { data, error } = await supabase
      .from('certificates')
      .select('serial')
      .eq('user_id', authUser.id)
      .eq('event_id', eventId)
      .maybeSingle();
    if (error || !data) return null;
    return { serial: data.serial };
  } catch (err) {
    console.error('Get event certificate error:', err);
    return null;
  }
}

/**
 * Fetch all published events from Google Sheets API
 */
export async function fetchPublishedEvents(): Promise<any[]> {
  // RLS exposes published + archived (past) events to everyone.
  const { data, error } = await supabase
    .from('events')
    .select('id,slug,name,description,event_date,location,city,country,capacity,ticket_type,price_inr,image_url,meet_link,status,visibility')
    .order('event_date', { ascending: false });
  if (error) {
    console.error('Error fetching published events:', error.message);
    return [];
  }
  return (data || []).map((e) => ({
    id: e.id,
    slug: e.slug,
    name: e.name,
    description: e.description || '',
    imageUrl: e.image_url || '',
    date: e.event_date || '',
    timezone: 'Asia/Kolkata',
    location: {
      type: e.meet_link && !e.location ? 'online' : 'offline',
      venue: e.location || undefined,
      city: e.city || undefined,
      country: e.country || undefined,
    },
    category: 'Community',
    price: Number(e.price_inr ?? 0),
    seatsAvailable: e.capacity ?? undefined,
    isPast: e.status === 'archived',
    visibility: e.visibility === 'private' ? 'private' : 'public',
  }));
}
