export interface Event {
    id: string;
    slug?: string; // URL-friendly name
    name: string;
    description?: string;
    fullDescription?: string;
    imageUrl: string;
    date: string; // ISO 8601 format - Start Date
    endDate?: string; // ISO 8601 format - End Date
    timezone: string;
    location: {
        type: 'online' | 'offline';
        venue?: string;
        mapLink?: string;
        city?: string;
        state?: string;
        country?: string;
    };
    category: string;
    status: 'upcoming' | 'past' | 'draft';
    /** 'public' = listed on /events; 'private' = unlisted, reachable only via its direct link. */
    visibility?: 'public' | 'private';
    hiddenSections?: string[]; // IDs of sections hidden from public view

    // Collaboration flags for upcoming events
    isUpcoming?: boolean; // Published as upcoming event needing community help
    lookingForVenue?: boolean;
    lookingForSpeakers?: boolean;
    lookingForSponsors?: boolean;
    spreadsheetId?: string; // Google Sheet ID for storing submissions

    price?: string | number;
    /** Optional admin-set platform fee as a % of the base price, added on top of it. 0/undefined = no fee. */
    platformFeePct?: number;
    registrationDeadline?: string;
    seatsAvailable?: number;
    communityLink?: string;
    organizer?: {
        name: string;
        logo?: string;
        email?: string;
        phone?: string;
    };
    techStack?: string[];
    requiresLogin?: boolean;
    sponsors?: Sponsor[];
    speakers?: EventSpeaker[];
    tickets?: Ticket[];
    attendees?: Attendee[];
    gallery?: GalleryAlbum[];
    driveFolderId?: string; // Root event folder ID in Google Drive
}

export interface Ticket {
    id: string;
    type: string;
    price: string | number;
    description: string;
    available: boolean;
    capacity?: number;
    benefits?: string[];
}

export interface Attendee {
    id: string;
    name: string;
    role: string;
    company?: string;
    imageUrl: string;
    registrationCode?: string;
    status?: 'registered' | 'attended' | 'cancelled';
}

export interface EventSpeaker {
    id: string;
    fullName: string;
    email?: string;
    linkedinUrl?: string;
    profileImage?: string; // Data URL or URL
    companyName?: string;
    about: string; // Summary/Bio
    country?: string;
    phone?: string;
    state?: string;
    city?: string;

    // Session Details
    sessionName?: string;
    sessionDescription?: string;
    sessionTopics?: string[];
    sessionStartTime?: string; // HH:mm
    sessionEndTime?: string; // HH:mm
}

export interface GalleryMedia {
    id: string;
    type: 'photo' | 'video';
    url: string;
    driveFileId?: string;
    thumbnailUrl?: string;
    caption?: string;
    uploadedAt: string;
}

export interface GalleryAlbum {
    id: string;
    name: string;
    driveFolderId?: string; // Google Drive folder ID for this album
    media: GalleryMedia[];
    createdAt: string;
}

export interface Sponsor {
    name: string;
    tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Partner';
    website?: string;
    logo?: string;
}

// Initial Mock Data
export const INITIAL_MOCK_EVENTS: Event[] = [];

/**
 * Data access now lives in the Supabase-backed layer (events-api.ts).
 * These are thin async wrappers so existing call-sites keep the same names
 * (callers must now `await` them). Interfaces above remain the source of
 * truth for the rich frontend `Event` shape.
 */
import * as eventsApi from "./events-api";

export async function getAllEvents(): Promise<Event[]> {
    return eventsApi.getAllEvents();
}

export async function getPublishedEvents(): Promise<Event[]> {
    return eventsApi.getPublishedEvents();
}

export async function getEventBySlug(slug: string): Promise<Event | undefined> {
    return eventsApi.getEventBySlug(slug);
}

export async function getEventById(id: string): Promise<Event | undefined> {
    return eventsApi.getEventById(id);
}

export async function saveEvent(event: Event): Promise<Event | undefined> {
    return eventsApi.saveEvent(event);
}

export const createEvent = saveEvent;
export const updateEvent = saveEvent;

export async function deleteEvent(id: string): Promise<void> {
    return eventsApi.deleteEvent(id);
}

export async function publishEvent(id: string): Promise<void> {
    return eventsApi.publishEvent(id);
}

export async function unpublishEvent(id: string): Promise<void> {
    return eventsApi.unpublishEvent(id);
}


// Helper to determine status based on date
export function getEventStatus(event: Event): 'upcoming' | 'past' | 'draft' {
    if (event.status === 'draft') return 'draft';
    const now = new Date();
    const eventDate = new Date(event.date);
    return eventDate > now ? 'upcoming' : 'past';
}
