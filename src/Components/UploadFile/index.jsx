import { useEffect, useState } from "react";
import uplaadImageNew from "../../assets/uplaadImageNew.png";
import Heading from "../Heading";
import { toast } from "react-toastify";
import close from "../../assets/close.png"; // Import the close icon

const UploadFile = (props) => {
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
    useEffect(() => {
        if (props.droppedFiles && props.droppedFiles.length > 0) {
            const incomingFiles = Array.from(props.droppedFiles);
            setFiles(incomingFiles); // ✅ update local state without size limit
        }
    }, [props.droppedFiles]);

    const handleFileChange = (event) => {
        const selectedFiles = Array.from(event.target.files);
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles);
            setError("");
            props.onFileChange(selectedFiles);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const droppedFiles = Array.from(event.dataTransfer.files);
        if (droppedFiles.length > 0) {
            setFiles(droppedFiles);
            setError("");
            props.onFileChange(droppedFiles);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
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
  {/* WRAPPER MUST BE RELATIVE */}
  <div
    className="relative"
    onDrop={handleDrop}
    onDragOver={handleDragOver}
  >

    {/* FILE NAMES — OUT OF NORMAL FLOW */}
    {files.length > 0 && (
      <div className="absolute top-0 z-10 text-[10px] px-10 text-[var(--dashboard-text-primary)]">
        {files.slice(0, 2).map((file, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="max-w-[120px] truncate">
              {file.name}
            </span>

            <div
              className="bg-red-100 rounded-sm p-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation(); // IMPORTANT
                handleRemoveFile(index);
              }}
            >
              <img src={close} alt="Close" className="w-2 h-2" />
            </div>
          </div>
        ))}

        {files.length > 2 && (
          <div className="text-[var(--dashboard-text-secondary)]">
            +{files.length - 2} more files
          </div>
        )}
      </div>
    )}

    {/* HIDDEN INPUT */}
    <input
      type="file"
      onChange={handleFileChange}
      style={{ display: "none" }}
      id="file-upload"
      multiple
    />

    {/* UPLOAD BOX — NEVER MOVES */}
    <div
      onClick={triggerFileInput}
      className="flex flex-col justify-center items-center min-h-28 min-w-64  rounded-md"
    >
      <img
        src={uplaadImageNew}
        alt="Upload"
        style={{
          width: EditTicket || ticketDetails ? 43 : 28,
          height: EditTicket || ticketDetails ? 43 : 28,
        }}
      />

      <Heading
        Fontweight={500}
        color="var(--fieldsTitle)"
        Heading="Click to browse file"
        Fontsize={EditTicket || ticketDetails ? 13 : addTicket ? 10 : 8}
        txtAlign="center"
      />

      <div className="flex items-center justify-center gap-1">
        <div
          style={{
            height: 1,
            width: 20,
            backgroundColor: "var(--dashboard-border)",
          }}
        />
        <Heading
          Fontweight={500}
          color="var(--fieldsTitle)"
          Heading="or"
          Fontsize={10}
        />
        <div
          style={{
            height: 1,
            width: 20,
            backgroundColor: "var(--dashboard-border)",
          }}
        />
      </div>

      <Heading
        Fontweight={500}
        color="var(--fieldsTitle)"
        Heading="Drag and drop your files here"
        Fontsize={EditTicket || ticketDetails ? 13 : addTicket ? 10 : 8}
        txtAlign="center"
      />
    </div>
  </div>
</>

    );
};

export default UploadFile;
