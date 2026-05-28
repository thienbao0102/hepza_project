import React from 'react';
import ImportStatsCards from '@/components/common/Import/ImportStatsCards';

const ResourceStatsCards = ({ file, stats, onDownloadTemplate, extraContent = null }) => {
    return (
        <ImportStatsCards
            file={file}
            stats={stats}
            onDownloadTemplate={onDownloadTemplate}
            templateName="Template_Import_Resources.xlsx"
            extraContent={extraContent}
        />
    );
};

export default ResourceStatsCards;
