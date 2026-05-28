import { useEffect, useRef } from 'react';

export const useIdleTimer = (timeoutMs = 5 * 60 * 1000, onIdle) => {
    const isIdle = useRef(false);

    useEffect(() => {
        let timeoutId;

        const handleActivity = () => {
            if (isIdle.current) return;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                isIdle.current = true;
                onIdle();
            }, timeoutMs);
        };

        const events = ['mousemove', 'keydown', 'wheel', 'touchstart', 'click'];

        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Initialize the timer
        handleActivity();

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [timeoutMs, onIdle]);
};
