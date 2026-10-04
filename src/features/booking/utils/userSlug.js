/**
 * Booking links embed a readable username alongside the numeric host id
 * (e.g. "john-doe-62") since the public booking API only knows hosts by
 * numeric userId — there's no username lookup endpoint. Same slug-with-
 * trailing-id pattern used elsewhere in the app (see AttendanceReport).
 */
export const slugifyUsername = (str) =>
    String(str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export const buildHostSlug = (name, userId) => {
    const base = slugifyUsername(name);
    return base ? `${base}-${userId}` : String(userId);
};

export const userIdFromHostSlug = (slug) => {
    if (!slug) return null;
    const parts = String(slug).split('-');
    const last = parts[parts.length - 1];
    return /^\d+$/.test(last) ? last : slug;
};
