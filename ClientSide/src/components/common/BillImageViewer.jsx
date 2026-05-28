import React, { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Image as ImageIcon } from 'lucide-react';

const BillImageViewer = ({ imageUrl, alt = 'Hóa đơn' }) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);

    if (!imageUrl) {
        return (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100">
                <ImageIcon className="size-4 text-slate-300" />
            </span>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLightboxOpen(true);
                }}
                className="inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg"
                title={`Xem ${alt}`}
            >
                <img
                    src={imageUrl}
                    alt={alt}
                    className="w-8 h-8 object-cover rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                    loading="lazy"
                />
            </button>

            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={[{ src: imageUrl, alt }]}
            />
        </>
    );
};

export default BillImageViewer;
