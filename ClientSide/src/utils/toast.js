/**
 * Global Toast Utility
 * Briges between normal JS files and the React-based NotificationProvider
 * Includes deduplication to prevent spamming identical notifications
 */

let notifyRef = null;

// Dedup: track recent toast keys to prevent duplicates
const recentToasts = new Map();
const DEDUP_INTERVAL = 2000; // ms — same toast blocked within this window

/**
 * Internal function to set the notification reference
 * Called by NotificationProvider on mount
 */
export const setToastRef = (ref) => {
    notifyRef = ref;
};

/**
 * Display a notification (with dedup)
 * @param {Object} options - { type, title, description, duration, actionText, onActionClick }
 */
export const toast = (options) => {
    if (!notifyRef) {
        console.warn('Toast utility called before NotificationProvider was mounted.');
        return null;
    }

    // Dedup key: type + title + description
    const key = `${options.type || ''}::${options.title || ''}::${options.description || ''}`;
    const now = Date.now();
    const lastShown = recentToasts.get(key);

    if (lastShown && now - lastShown < DEDUP_INTERVAL) {
        return null; // Skip duplicate
    }

    recentToasts.set(key, now);

    // Cleanup old entries periodically
    if (recentToasts.size > 50) {
        for (const [k, t] of recentToasts) {
            if (now - t > DEDUP_INTERVAL) recentToasts.delete(k);
        }
    }

    return notifyRef(options);
};

// Convenience methods
toast.success = (title, description, options = {}) =>
    toast({ type: 'success', title, description, ...options });

toast.error = (title, description, options = {}) =>
    toast({ type: 'error', title, description, ...options });

toast.warning = (title, description, options = {}) =>
    toast({ type: 'warning', title, description, ...options });

toast.info = (title, description, options = {}) =>
    toast({ type: 'info', title, description, ...options });

export default toast;
