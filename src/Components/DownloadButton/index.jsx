import React from 'react';
import Heading from "../../Components/Heading";
import downloadPdf from "../../assets/downloadPdf.png";

const DownloadButton = ({ onClick }) => (
    <div className="flex justify-between items-center py-2 px-6"
        style={{ border: '1px solid rgba(128, 128, 128, 1)', borderRadius: 12, cursor: 'pointer' }}
        onClick={onClick}>
        <div>
            <img src={downloadPdf} alt="icon" className="w-6 h-6 mr-3" />
        </div>
        <div>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Download Invoice.pdf'}
                Fontsize={16}
            />
        </div>
    </div>
);

export default DownloadButton;