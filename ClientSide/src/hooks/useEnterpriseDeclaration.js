import { useState, useCallback } from 'react';
import { getEnterpriseList, getUndeclaredEnterpriseList, getYearlyDeclarationMatrix } from '../services/enterpriseListService';

export const useEnterpriseDeclaration = () => {
    const [loading, setLoading] = useState(false);
    const [declared, setDeclared] = useState([]);
    const [undeclared, setUndeclared] = useState([]);
    const [yearlyMatrix, setYearlyMatrix] = useState([]);

    const fetchDeclarationStatus = useCallback(async (periodKey, year, search = '', filters = {}, resourceCategory = null) => {
        setLoading(true);
        try {
            // Chuẩn bị payload filters (gỡ các keys rỗng)
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => (Array.isArray(v) ? v.length > 0 : v))
            );

            const [resDec, resUndec, resYearly] = await Promise.all([
                periodKey ? getEnterpriseList({ periodKey, limit: 500, search, filters: activeFilters, resourceCategory }) : Promise.resolve({ enterprises: [] }),
                periodKey ? getUndeclaredEnterpriseList({ periodKey, limit: 500, search, filters: activeFilters, resourceCategory }) : Promise.resolve({ enterprises: [] }),
                year ? getYearlyDeclarationMatrix({ year, limit: 500, search, filters: activeFilters }) : Promise.resolve({ enterprises: [] })
            ]);

            setDeclared(resDec.enterprises || []);
            setUndeclared(resUndec.enterprises || []);
            setYearlyMatrix(resYearly.enterprises || []);
        } catch (error) {
            console.error("Fetch declaration status error", error);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        declared,
        undeclared,
        yearlyMatrix,
        fetchDeclarationStatus
    };
};
