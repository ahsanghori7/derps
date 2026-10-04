import Heading from "../../Components/Heading";
import { useState } from "react";
import { useSelector } from "react-redux";
import UploadFile from "../../Components/UploadFile";
import { useNavigate, useLocation } from "react-router-dom";
import { usePageTitle } from "../../Hooks/usePageTitle";

const Support = () => {
    const location = useLocation();
    usePageTitle("Support Forms", location);

    const navigate = useNavigate();
    const [feedback, setFeedback] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [btnHovered, setBtnHovered] = useState(false);

    const handleSubmit = () => {
        navigate(-1);
    };

    const handleFileUpload = (file) => {
        setUploadedFile(file);
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: '10px 16px' }}>

            {/* Page Header */}
            <div className="mb-6">
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Support Forms'}
                    Fontsize={30}
                />
                <p style={{ fontSize: 14, color: 'var(--dashboard-text-secondary)', marginTop: 4 }}>
                    Having trouble? Describe your issue and we'll get back to you shortly.
                </p>
            </div>

            {/* Form Card */}
            <div
                className="w-full"
                style={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    borderRadius: 16,
                    padding: '32px 36px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
            >
                {/* Describe Issue */}
                <div className="mb-5">
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fieldsTitle)', display: 'block', marginBottom: 8 }}>
                        Describe Issue <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                        placeholder="Please describe your issue in detail..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={6}
                        className="w-full"
                        style={{
                            border: '1px solid var(--sidebar-selected-bg)',
                            fontSize: 14,
                            borderRadius: 10,
                            backgroundColor: 'var(--dashboard-tab-box)',
                            color: 'var(--sidebar-text-primary)',
                            padding: '12px 14px',
                            resize: 'vertical',
                            outline: 'none',
                            lineHeight: 1.6,
                        }}
                    />
                </div>

                {/* Attachment */}
                <div className="mb-6">
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fieldsTitle)', display: 'block', marginBottom: 8 }}>
                        Attachment <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--dashboard-text-secondary)' }}>(optional)</span>
                    </label>
                    <div
                        className="h-32 w-full sm:w-[80%] flex flex-col items-center"
                        style={{
                            backgroundColor: 'var(--dashboard-tab-box)',
                            border: '1px dashed var(--sidebar-selected-bg)',
                            borderRadius: 8,
                        }}
                    >
                        <UploadFile
                            backgroundColor={'var(--scroll-thumb)'}
                            addTicket={true}
                            onFileChange={handleFileUpload}
                        />
                    </div>
                    {uploadedFile && (
                        <p style={{ fontSize: 12, color: 'var(--dashboard-text-secondary)', marginTop: 6 }}>
                            Attached: {uploadedFile.name}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--dashboard-text-secondary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px 0',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        onMouseEnter={() => setBtnHovered(true)}
                        onMouseLeave={() => setBtnHovered(false)}
                        style={{
                            backgroundColor: btnHovered ? '#0047cc' : '#0C79F7',
                            color: '#ffffff',
                            fontSize: 14,
                            fontWeight: 600,
                            height: 38,
                            padding: '0 24px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            transform: btnHovered ? 'translateY(-2px)' : 'translateY(0)',
                            boxShadow: btnHovered ? '0 6px 20px rgba(0, 89, 245, 0.4)' : '0 2px 6px rgba(0, 89, 245, 0.2)',
                            transition: 'all 0.3s ease',
                            letterSpacing: 0.3,
                        }}
                    >
                        Submit Ticket
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Support;
