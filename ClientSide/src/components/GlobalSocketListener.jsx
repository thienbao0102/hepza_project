import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@utils/socket';
import { queryKeys } from '@lib/queryClient';

const GlobalSocketListener = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleCompanyUpdate = (data) => {
            if (data?.company_id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(data.company_id) });
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
        };

        const handleZoneUpdate = (data) => {
            if (data?.zone_id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.zones.detail(data.zone_id) });
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.lists() });
        };

        const handleUserUpdate = (data) => {
            if (data?.user_id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(data.user_id) });
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
        };

        const handleRepresentativeChanged = (data) => {
            if (data?.company_id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(data.company_id) });
            }
            if (data?.previous_representative_user_id) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.users.detail(data.previous_representative_user_id),
                });
            }
            if (data?.next_representative_user_id) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.users.detail(data.next_representative_user_id),
                });
            }

            queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
            queryClient.refetchQueries({ queryKey: queryKeys.companies.all, type: 'active' });
            queryClient.refetchQueries({ queryKey: queryKeys.users.all, type: 'active' });
            queryClient.refetchQueries({ queryKey: queryKeys.auth.user, type: 'active' });

            window.dispatchEvent(
                new CustomEvent('auth-sync-required', {
                    detail: {
                        reason: 'company:representative_changed',
                        ...data,
                    },
                })
            );
        };

        socket.on('company:updated', handleCompanyUpdate);
        socket.on('company:representative_changed', handleRepresentativeChanged);
        socket.on('zone:updated', handleZoneUpdate);
        socket.on('user:updated', handleUserUpdate);

        return () => {
            socket.off('company:updated', handleCompanyUpdate);
            socket.off('company:representative_changed', handleRepresentativeChanged);
            socket.off('zone:updated', handleZoneUpdate);
            socket.off('user:updated', handleUserUpdate);
        };
    }, [queryClient]);

    return null; // This component doesn't render anything visible
};

export default GlobalSocketListener;
