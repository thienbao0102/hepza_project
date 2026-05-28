import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@lib/queryClient';
import {
    handlerDeleteZone,
    handlerRestoreZone,
    handlerDeleteZones,
    handlerRestoreZones,
    handlerHardDeleteZone,
    handlerHardDeleteZones,
    handlerPreviewSoftDeleteZone,
    handlerPreviewHardDeleteZone
} from '@services/zoneService';

// ======================== SINGLE ZONE MUTATIONS ========================

export const useDeleteZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (zoneId) => handlerDeleteZone(zoneId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
        },
    });
};

export const useRestoreZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (zoneId) => handlerRestoreZone(zoneId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
        },
    });
};

export const useHardDeleteZone = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (zoneId) => handlerHardDeleteZone(zoneId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
        },
    });
};

// ======================== MULTIPLE ZONES MUTATIONS ========================

export const useDeleteZones = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (zoneIds) => handlerDeleteZones(zoneIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
        },
    });
};

export const useRestoreZones = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (zoneIds) => handlerRestoreZones(zoneIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
        },
    });
};

export const useHardDeleteZones = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (zoneIds) => handlerHardDeleteZones(zoneIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.zones.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
        },
    });
};

// ======================== PREVIEW MUTATIONS ========================

export const usePreviewSoftDeleteZone = () => {
    return useMutation({
        mutationFn: (zoneIds) => handlerPreviewSoftDeleteZone(zoneIds),
    });
};

export const usePreviewHardDeleteZone = () => {
    return useMutation({
        mutationFn: (zoneIds) => handlerPreviewHardDeleteZone(zoneIds),
    });
};
