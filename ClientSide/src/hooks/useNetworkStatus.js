import { useState, useEffect } from 'react';

/**
 * Custom hook to track the online status of the browser.
 * @returns {boolean} True if the browser is online, false otherwise.
 */
export const useNetworkStatus = () => {
    // Initialize state with the browser's current online status
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        // Handler to update state to true when browser goes online
        const handleOnline = () => setIsOnline(true);
        // Handler to update state to false when browser goes offline
        const handleOffline = () => setIsOnline(false);

        // Add event listeners for online and offline events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Cleanup function to remove event listeners when the component unmounts
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []); // Empty dependency array ensures this effect runs only once on mount

    return isOnline;
};
