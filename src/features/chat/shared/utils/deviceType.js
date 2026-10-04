/**
 * Detects how the user is joining (desktop PC, mobile phone, or tablet).
 * Used in video calls to show an icon per participant.
 * @returns {'desktop'|'mobile'|'tablet'}
 */
export function getDeviceType() {
    if (typeof navigator === 'undefined' || !navigator.userAgent) return 'desktop';
    const ua = navigator.userAgent;
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const width = typeof window !== 'undefined' ? window.screen?.width : 0;

    // Tablet: iPad, Android tablets, etc.
    if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))|Kindle/i.test(ua)) return 'tablet';
    if (touch && width >= 768 && /Mobile/i.test(ua)) return 'tablet';

    // Mobile (phone)
    if (/Mobile|Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(ua)) return 'mobile';

    return 'desktop';
}
