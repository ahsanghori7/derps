import { useState } from "react";
import fileBlue from "../../assets/fileBlue.png";
import Heading from "../Heading";
import { toast } from "react-toastify";
import close from "../../assets/close.png"; // Import the close icon

const UploadSecondFile = (props) => {
    const {
        Stylefont,
        Fontweight,
        Fontsize,
        txtAlign,
        ml,
        mt,
        p,
        lh,
        // Heading,
        mx,
        color,
        as,
        backgroundColor,
        borderRadius,
        addTicket,
        aI,
        width,
        mv,
        mb,
        ls,
        fontfamily,
        EditTicket,
        ticketDetails,
        className, // add this to accept className prop
    } = props;
    const [files, setFiles] = useState([]); // State to hold the uploaded files
    const [error, setError] = useState(""); 
    const handleFileChange = (event) => {
        const selectedFiles = Array.from(event.target.files);
        const validFiles = selectedFiles.filter(file => file.size <= 20 * 1024 * 1024);
        if (validFiles.length > 0) {
            setFiles(prevFiles => [...prevFiles, ...validFiles]); // Append new files
            setError("");
            props.onFileChange(validFiles); // Send only valid files to parent
        } else {
            setError("Each file size should not exceed 20MB.");
            toast.error("Each file size should not exceed 20MB.");
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const droppedFiles = Array.from(event.dataTransfer.files);
        const validFiles = droppedFiles.filter(file => file.size <= 20 * 1024 * 1024);
        if (validFiles.length > 0) {
            setFiles(prevFiles => [...prevFiles, ...validFiles]); // Append new files
            setError("");
            props.onFileChange([...files, ...validFiles]); // Send updated files to parent
        } else {
            setError("Each file size should not exceed 20MB.");
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault(); // Prevent default to allow drop
    };
    // Add this function to trigger the file input click
    const triggerFileInput = () => {
        document.getElementById('file-upload').click();
    };

    const handleRemoveFile = (index) => {
        const newFiles = [...files];
        newFiles.splice(index, 1); // Remove the file at the specified index
        setFiles(newFiles);
        props.onFileChange(newFiles); // Update parent with new file list
    };
    return (
        <>

            {files.length > 0 && (
                <div className="file-names text-[10px]">
                    {files.slice(0, 2).map((file, index) => ( // Display only the first 2 files
                        <div key={index} className="flex items-center justify-between gap-2">
                            <span>{file.name}</span>
                            <div className="bg-red-100 rounded-sm p-1 cursor-pointer" onClick={() => handleRemoveFile(index)}>
                                <img src={close} alt="Close" className="w-2 h-2" /> {/* Smaller close icon */}
                            </div>
                        </div>
                    ))}
                    {files.length > 2 && ( // Show remaining files indicator if more than 2 files
                        <div className="text-gray-500">
                            +{files.length - 2} more file{files.length - 2 > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}
            <input
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-upload"
                multiple // Allow multiple file selection
            />
            <div onDrop={handleDrop}
                onDragOver={handleDragOver} style={{ border: '1px dashed rgba(184, 184, 184, 1)', borderRadius: 12, backgroundColor: backgroundColor }} className={`${EditTicket ? 'h-40 w-48' : ticketDetails ? 'h-40 w-52' : addTicket ? 'w-40 h-32 sm:h-36 sm:w-40 mt-3' : 'h-28 w-34'} ${ticketDetails ? '' : 'mt-3'} flex flex-col justify-center items-center mx-auto`}>
                <img src={fileBlue} alt="Status Icon" style={{ width: EditTicket ? 43 : ticketDetails ? 43 : addTicket ? 38 : 28, height: ticketDetails ? 43 : addTicket ? 38 : 28 }} />
                <Heading
                    Fontweight={500}
                    color={'rgba(0, 0, 0, 0.6)'}
                    Heading={'Drag and drop your files here'}
                    Fontsize={EditTicket || ticketDetails ? 13 : addTicket ? 10 : 8}
                    mt={4}
                    txtAlign={'center'}
                    className={'mx-2'}
                // Tailwind CSS classes
                />
                <div className="flex items-center justify-center gap-1" style={{}}>
                    <div style={{ height: 1, width: 20, backgroundColor: 'rgba(175, 175, 175, 1)' }} />
                    <Heading
                        Fontweight={500}
                        color={'rgba(0, 0, 0, 0.6)'}
                        Heading={'or'}
                        Fontsize={14}
                    // mt={2}
                    // Tailwind CSS classes
                    />
                    <div style={{ height: 1, width: 20, backgroundColor: 'rgba(175, 175, 175, 1)' }} />
                </div>
                <div className="mt-2">
                    <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                        <button
                            // onClick={onClick}
                            // disabled={disabled}
                            onClick={triggerFileInput}
                            className={`px-auto py-2  rounded`}
                            style={{
                                backgroundColor: 'rgba(55, 105, 230, 1)',
                                width: EditTicket || ticketDetails ? 94 : addTicket ? 70 : 60,
                                height: EditTicket || ticketDetails ? 28 : addTicket ? 22 : 18,
                                color: 'var(--scroll-thumb)',
                                fontSize: EditTicket || ticketDetails ? 14 : addTicket ? 10 : 8,
                                fontWeight: 400,
                                display: 'flex',          // Add flex display
                                alignItems: 'center',     // Center items vertically
                                justifyContent: 'center', // Center items horizontally
                                textAlign: 'center',
                                padding: '0',             // Ensure no additional padding interferes
                                margin: '0'
                            }}
                        >
                            Choose File
                        </button>
                    </label>
                </div>

            </div>
        </>
    );
};

export default UploadSecondFile;
