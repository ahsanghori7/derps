import React, { useRef, useState } from 'react';
import { FaCamera, FaTrash } from 'react-icons/fa';

const LogoUpload = ({
    onLogoChange,
    currentLogo,
    label = "Business Logo",
    emptyText = "Click to upload logo",
    removeLabel = "Remove Logo",
    size = 150
}) => {
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(currentLogo || null);
    const [isDragging, setIsDragging] = useState(false);

    React.useEffect(() => {
        if (currentLogo) {
            setPreview(currentLogo);
        }
    }, [currentLogo]);

    const handleFileSelect = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
                onLogoChange([file]); // Send as array to match existing pattern
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        handleFileSelect(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleRemoveLogo = () => {
        setPreview(null);
        onLogoChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClick = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="flex flex-col items-center">
            {label ? (
                <label className="text-sm font-medium mb-3 text-[var(--sidebar-text-primary)]">
                    {label}
                </label>
            ) : null}
            
            <div
                className={`
                    relative border-2 border-dashed rounded-full cursor-pointer
                    transition-all duration-200 ease-in-out
                    flex items-center justify-center
                    ${isDragging 
                        ? 'border-[#0C79F7] bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    }
                `}
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                }}
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Business Logo"
                            className="w-full h-full rounded-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <FaCamera className="text-white text-2xl" />
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                        <FaCamera className="text-3xl mb-2" />
                        <span className="text-xs text-center">{emptyText}</span>
                    </div>
                )}
            </div>

            {preview && (
                <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="mt-3 px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors duration-200 flex items-center gap-2"
                >
                    <FaTrash className="text-xs" />
                    {removeLabel}
                </button>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
            />
            
            <p className="text-xs text-gray-500 mt-2 text-center">
                Recommended: Square image, at least 200x200px
            </p>
        </div>
    );
};

export default LogoUpload;
