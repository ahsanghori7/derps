import React, { useRef, useState } from 'react';
import BottonWithIcon from "../ButtonWithIcon";
import attachFile from "../../assets/attachFile.png";
import close from "../../assets/close.png"; // Import the close icon

const FileUpload = ({
    onFileChange,
    buttonWidth = 115,
    buttonHeight = 28,
    fontSize = 12,
    children,
}) => {
    const fileInputRef = useRef(null);
    const [files, setFiles] = useState([]);

    const handleAttachClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const selectedFiles = Array.from(event.target.files);
        const updatedFiles = [...files, ...selectedFiles];
        setFiles(updatedFiles);
        onFileChange(updatedFiles);
    };

    const handleRemoveFile = (indexToRemove) => {
        const updatedFiles = files.filter((_, index) => index !== indexToRemove);
        setFiles(updatedFiles);
        onFileChange(updatedFiles);
    };
    return (
        <div className="flex flex-col items-start w-auto shrink-0 max-w-md">
            {/* Display file names */}
            {files.length > 0 && (
                <ul className="mb-2 text-sm text-[var(--dashboard-tab-text-inactive)] list-disc pl-5 w-full">
                    {files.map((file, index) => (
                        <li key={index}>
                            {file.name}
                            <button
                                onClick={() => handleRemoveFile(index)}
                                className="ml-2"
                            >
                                <img src={close} alt="Close" className="w-2 h-2" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {/* Hidden input for file selection */}
            <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <div className="flex items-center gap-2">
                <BottonWithIcon
                    backgroundColor={'rgba(43, 75, 242, 0.06)'}
                    width={buttonWidth}
                    icon={attachFile}
                    title={'Attach File'}
                    height={buttonHeight}
                    borderRadius={6}
                    color={'var(--sidebar-text-primary)'}
                    fontSize={fontSize}
                    fontWeight={500}
                    border={"0.7px solid rgba(100, 153, 255, 1)"}
                    className="!mb-0 !mx-0 justify-center"
                    onClick={handleAttachClick}
                />
                {files.length > 0 && children}
            </div>
        </div>
    );
};

export default FileUpload;
