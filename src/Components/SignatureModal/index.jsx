import React, { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignatureModal({
  showSignatureModal,
  setShowSignatureModal,
  setSignatureDataUrl,
}) {
  const [activeTab, setActiveTab] = useState("draw"); // draw | type | upload
  const [typedName, setTypedName] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const signatureRef = useRef();

  const handleAccept = () => {
    if (activeTab === "draw" && signatureRef.current && !signatureRef.current.isEmpty()) {
      const dataUrl = signatureRef.current.toDataURL();
      setSignatureDataUrl(dataUrl);
    } else if (activeTab === "type" && typedName.trim() !== "") {
      setSignatureDataUrl(`typed:${typedName}`);
    } else if (activeTab === "upload" && uploadedFile) {
      const fileUrl = URL.createObjectURL(uploadedFile);
      setSignatureDataUrl(fileUrl);
    }
    setShowSignatureModal(false);
  };

  return (
    showSignatureModal && (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[10000]">
        <div className="bg-white p-6 rounded-lg shadow-lg w-[95%] max-w-lg">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Signature</h2>
            <button
              onClick={() => setShowSignatureModal(false)}
              className="text-gray-500 hover:text-black"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b mb-4">
            {["draw", "type", "upload"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 -mb-[1px] ${
                  activeTab === tab
                    ? "border-b-2 border-[#0C79F7] text-blue-600"
                    : "text-gray-500"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="border border-gray-300 rounded p-4 flex items-center justify-center min-h-[120px]">
            {activeTab === "draw" && (
              <SignatureCanvas
                penColor="black"
                ref={signatureRef}
                canvasProps={{
                  width: 400,
                  height: 150,
                  className: "border border-gray-200 rounded w-full",
                }}
              />
            )}

            {activeTab === "type" && (
              <input
                type="text"
                placeholder="Type your name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full text-center font-[cursive] text-xl outline-none"
              />
            )}

            {activeTab === "upload" && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadedFile(e.target.files[0])}
              />
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowSignatureModal(false)}
              className="px-4 py-2 rounded bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 rounded bg-blue-600 text-white"
            >
              Accept and Sign
            </button>
          </div>
        </div>
      </div>
    )
  );
}
