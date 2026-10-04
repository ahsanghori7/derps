import { useState } from "react";
import fileBlue from "../../assets/fileBlue.png";
import Heading from "../Heading";
import { toast } from "react-toastify";

const UploadPayoutFile = (props) => {
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
    const [file, setFile] = useState(null); // State to hold the uploaded file
    const [error, setError] = useState(""); 
    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.size <= 20 * 1024 * 1024) {
            setFile(selectedFile);
            // setFileName(selectedFile.name); // Set the file name
            setError("");
            props.onFileChange(selectedFile); // Send file to parent
        } else {
            setError("File size should not exceed 20MB.");
            toast.error("File size should not exceed 20MB.");
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile && droppedFile.size <= 20 * 1024 * 1024) {
            setFile(droppedFile);
            // setFileName(droppedFile.name); // Set the file name
            setError("");
            props.onFileChange(droppedFile); // Send file to parent
        } else {
            setError("File size should not exceed 20MB.");
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault(); // Prevent default to allow drop
    };
    // Add this function to trigger the file input click
    const triggerFileInput = () => {
        document.getElementById('file-upload').click();
    };
    return (
        <>

            <div onDrop={handleDrop}
                onDragOver={handleDragOver} style={{ border: '1px dashed #D1D5DC', borderRadius: 12, backgroundColor: backgroundColor }} className={`${EditTicket ? 'h-40 w-48' : ticketDetails ? 'h-40 w-52' : addTicket ? 'w-40 h-32 sm:h-36 sm:w-40 mt-6' : 'h-28 w-34'} ${ticketDetails ? '' : 'mt-3'} flex flex-col justify-center items-center mx-auto`}>
                {file?.name && <div className="file-name text-[8px] pb-2">{file?.name}</div>}
                <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="file-upload"
                />
                <img src={fileBlue} alt="Status Icon" style={{ width: EditTicket ? 43 : ticketDetails ? 43 : addTicket ? 38 : 28, height: ticketDetails ? 43 : addTicket ? 38 : 28 }} />
                <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
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
                        color={'var(--fieldsTitle)'}
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

export default UploadPayoutFile;
