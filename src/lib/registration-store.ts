export interface EventRegistration {
    id: string;
    userId: string;
    eventId: string;
    eventSlug: string;
    eventName: string;
    registrationCode: string;
    registeredAt: string;
    status: 'registered' | 'attended' | 'cancelled';
    attendedAt?: string;
    userDetails: {
        name: string;
        email: string;
        phone: string;
        city: string;
        state: string;
        country: string;
        linkedIn?: string;
    };
    // Payment fields
    ticketType: 'free' | 'paid';
    ticketPrice?: number;
    paymentStatus?: 'pending' | 'completed' | 'failed';
    paymentId?: string; // Razorpay payment ID
    paymentAmount?: number;
    paymentTimestamp?: string;
    orderId?: string; // Razorpay order ID
    currency?: string; // Default: INR
}

const REGISTRATIONS_KEY = 'event_registrations';

/**
 * Generate a unique registration code
 * Format: EVT-XXXX1234 (EVT- + 4 letters + 4 numbers)
 */
export function generateRegistrationCode(): string {
    const prefix = 'EVT';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    let code = prefix + '-';

    // Generate 4 random letters
    for (let i = 0; i < 4; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Generate 4 random numbers
    for (let i = 0; i < 4; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return code;
}

/**
 * Check if a registration code already exists
 */
export function codeExists(code: string): boolean {
    const registrations = getAllRegistrations();
    return registrations.some(r => r.registrationCode === code);
}

/**
 * Generate a unique registration code (checks for duplicates)
 */
export function generateUniqueCode(): string {
    let code = generateRegistrationCode();
    let attempts = 0;

    // Retry up to 10 times if code exists
    while (codeExists(code) && attempts < 10) {
        code = generateRegistrationCode();
        attempts++;
    }

    return code;
}

/**
 * Get all registrations from localStorage
 */
export function getAllRegistrations(): EventRegistration[] {
    try {
        const data = localStorage.getItem(REGISTRATIONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading registrations:', error);
        return [];
    }
}

/**
 * Save registrations to localStorage
 */
function saveRegistrations(registrations: EventRegistration[]): void {
    try {
        localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(registrations));
    } catch (error) {
        console.error('Error saving registrations:', error);
    }
}

/**
 * Add a new registration
 */
export function addRegistration(registration: EventRegistration): void {
    const registrations = getAllRegistrations();
    registrations.push(registration);
    saveRegistrations(registrations);
}

/**
 * Get all registrations for a specific user
 */
export function getUserRegistrations(userId: string): EventRegistration[] {
    const registrations = getAllRegistrations();
    return registrations.filter(r => r.userId === userId);
}

/**
 * Get registration by code
 */
export function getRegistrationByCode(code: string): EventRegistration | null {
    const registrations = getAllRegistrations();
    return registrations.find(r => r.registrationCode === code) || null;
}

/**
 * Check if user is already registered for an event
 */
export function isUserRegistered(userId: string, eventId: string): boolean {
    const registrations = getAllRegistrations();
    return registrations.some(
        r => r.userId === userId && r.eventId === eventId && r.status !== 'cancelled'
    );
}

/**
 * Get user's registration for a specific event
 */
export function getUserEventRegistration(userId: string, eventId: string): EventRegistration | null {
    const registrations = getAllRegistrations();
    return registrations.find(
        r => r.userId === userId && r.eventId === eventId && r.status !== 'cancelled'
    ) || null;
}

/**
 * Update registration status
 */
export function updateRegistrationStatus(
    code: string,
    status: 'registered' | 'attended' | 'cancelled',
    attendedAt?: string
): boolean {
    const registrations = getAllRegistrations();
    const index = registrations.findIndex(r => r.registrationCode === code);

    if (index === -1) return false;

    registrations[index].status = status;
    if (attendedAt) {
        registrations[index].attendedAt = attendedAt;
    }

    saveRegistrations(registrations);
    return true;
}

/**
 * Cancel a registration
 */
export function cancelRegistration(registrationId: string): boolean {
    const registrations = getAllRegistrations();
    const index = registrations.findIndex(r => r.id === registrationId);

    if (index === -1) return false;

    registrations[index].status = 'cancelled';
    saveRegistrations(registrations);
    return true;
}

/**
 * Get all registrations for a specific event
 */
export function getEventRegistrations(eventId: string): EventRegistration[] {
    const registrations = getAllRegistrations();
    return registrations.filter(r => r.eventId === eventId && r.status !== 'cancelled');
}

/**
 * Get registration statistics for an event
 */
export function getEventRegistrationStats(eventId: string) {
    const registrations = getEventRegistrations(eventId);

    return {
        total: registrations.length,
        attended: registrations.filter(r => r.status === 'attended').length,
        pending: registrations.filter(r => r.status === 'registered').length,
    };
}

/**
 * Update registration details
 */
export function updateRegistration(
    registrationId: string,
    updates: Partial<EventRegistration['userDetails']>
): EventRegistration | null {
    const registrations = getAllRegistrations();
    const index = registrations.findIndex(r => r.id === registrationId);

    if (index === -1) return null;

    registrations[index].userDetails = {
        ...registrations[index].userDetails,
        ...updates
    };

    saveRegistrations(registrations);
    return registrations[index];
}
