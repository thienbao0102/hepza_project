import { createContext, useState, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import Notification from '@components/common/Notifications';
import { setToastRef } from '@/utils/toast';
const NotificationContext = createContext(null);

let seed = 0;
const createId = () => {
    seed += 1;
    return `${Date.now()}-${seed}`;
};

export const NotificationProvider = ({ children }) => { //Update các trang chưa sử dụng hook useNotification đi 
    const [notifications, setNotifications] = useState([]);

    const close = useCallback((id) => {
        setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const notify = useCallback(
        ({ type = 'info', title = '', description = '', duration = 5000, actionText, onActionClick, sender }) => {
            const id = createId();
            setNotifications((prev) => [
                ...prev,
                {
                    id,
                    type,
                    title,
                    description,
                    duration,
                    actionText,
                    onActionClick,
                    sender,
                },
            ]);
            return id;
        },
        []
    );

    useEffect(() => {
        setToastRef(notify);
    }, [notify]);

    const contextValue = useMemo(() => ({ notify, close }), [notify, close]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            {notifications.map((notification, index) => {
                const reverseIndex = notifications.length - index - 1;
                return (
                    <Notification
                        key={notification.id}
                        open
                        type={notification.type}
                        title={notification.title}
                        description={notification.description}
                        duration={notification.duration}
                        actionText={notification.actionText}
                        onActionClick={notification.onActionClick}
                        sender={notification.sender}
                        onClose={() => close(notification.id)}
                        offset={20 + reverseIndex * 96}
                    />
                )
            })}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};
