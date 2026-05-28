import { useState, useCallback } from 'react';
import {
    getRegulationData,
    createRegulation,
    updateRegulation,
    deleteRegulation,
    deleteMultipleRegulations
} from '@/services/regulationService';

export const useRegulation = () => {
    const [regulations, setRegulations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchRegulations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getRegulationData();
            // Map Backend Schema to Frontend expected format (if needed)
            // Backend: regulation_name, des_short, link, effective_date, tags (Refs)
            // Component might expect: title, summary, link, effectiveDate, tags
            // Let's standardize on Backend Schema in the Component for long term, 
            // OR map here. Let's map for easier migration, then update Component to use mapped props.

            const mapped = data.map(item => ({
                ...item,
                id: item.regulation_id, // Component expects 'id'
                title: item.regulation_name,
                summary: item.des_short,
                effectiveDate: item.effective_date, // Date string or object
                mockTags: item.tags || [] // Needs handling if tags are Objects
            }));

            setRegulations(mapped);
        } catch (err) {
            setError(err.message || 'Failed to fetch regulations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const addRegulation = async (data) => {
        try {
            // Map frontend data to backend schema
            const payload = {
                regulation_name: data.title,
                des_short: data.summary,
                link: data.link,
                effective_date: data.effectiveDate,
                group_regulation: data.group || "Khác", // Default or form field
                // Handle tags later
            };
            await createRegulation(payload);
            await fetchRegulations();
            return { success: true };
        } catch (err) {
            setError(err.message || 'Failed to create regulation');
            return { success: false, error: err };
        }
    };

    const editRegulation = async (id, data) => {
        try {
            // Map frontend data to backend schema
            const payload = {
                regulation_name: data.title,
                des_short: data.summary,
                link: data.link,
                effective_date: data.effectiveDate,
                group_regulation: data.group || "Khác",
                __v: data.__v,
            };
            await updateRegulation(id, payload);
            await fetchRegulations();
            return { success: true };
        } catch (err) {
            setError(err.message || 'Failed to update regulation');
            return { success: false, error: err };
        }
    };

    const removeRegulation = async (id) => {
        try {
            await deleteRegulation(id);
            await fetchRegulations();
            return { success: true };
        } catch (err) {
            setError(err.message || 'Failed to delete regulation');
            return { success: false, error: err };
        }
    };

    return {
        regulations,
        loading,
        error,
        fetchRegulations,
        addRegulation,
        editRegulation,
        removeRegulation
    };
};
