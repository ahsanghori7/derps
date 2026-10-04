import { useState } from "react";
import { toast } from "react-toastify";
import Heading from "../Heading";
import BottonCustom from "../ButtonCustom";

const ErrorModal = ({ isOpen, onClose, errors, fileName }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Parse and simplify error messages for non-technical users
  const parseErrorMessages = (errorArray) => {
    return errorArray.map((error) => {
      let simplifiedError = "";
      let merchantId = "";
      let rowNumber = "";

      // Extract merchant ID (keep as exact string, avoid any numeric conversion)
      const merchantMatch =
        error.match(/Merchant\s+ID\s*\(([^)]+)\)/i) ||
        error.match(/\bmerchant\s*\(([^)]+)\)/i) ||
        error.match(/\bMerchant\s+ID\s*:?\s*([^\s,]+)\b/i);
      if (merchantMatch) {
        // Keep the exact matched string without any numeric parsing
        merchantId = (merchantMatch[1] || '').trim();
        // Ensure it's not converted to scientific notation or rounded
        // by keeping it strictly as a string
        if (/^\d+$/.test(merchantId)) {
          // It's all digits, keep exact string representation
          merchantId = String(merchantId);
        }
      }

      // Extract row number
      const rowMatch = error.match(/row (\d+)/);
      if (rowMatch) {
        rowNumber = rowMatch[1];
      }

      // Simplify error messages
      if (error.includes("No merchant found")) {
        simplifiedError = `Merchant ID ${merchantId} doesn't exist in our system`;
      } else if (error.includes("Agent or revenue share is not configured")) {
        simplifiedError = `Payment setup is incomplete for Merchant ID ${merchantId}`;
      } else if (error.includes("Agent basis (by rate) is missing or invalid")) {
        simplifiedError = `Commission rate is not set for Merchant ID ${merchantId}`;
      } else {
        simplifiedError = error; // Fallback to original message
      }

      return {
        row: rowNumber,
        merchantId: merchantId,
        originalError: error,
        simplifiedError: simplifiedError,
        suggestedAction: getSuggestedAction(error)
      };
    });
  };

  const getSuggestedAction = (error) => {
    if (error.includes("No merchant found")) {
      return "Verify the merchant ID or add the merchant to the system";
    } else if (error.includes("Agent or revenue share is not configured")) {
      return "Configure the agent/revenue share settings for this merchant";
    } else if (error.includes("Agent basis (by rate) is missing or invalid")) {
      return "Set the commission rate for this merchant";
    } else {
      return "Contact support for assistance";
    }
  };

  const generateExcelFile = async () => {
    setIsGenerating(true);
    
    try {
      // Create a simple CSV format that can be opened in Excel
      const csvContent = generateCSVContent(errors);
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `payout_errors_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Error report downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download error report");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSVContent = (errorArray) => {
    const parsedErrors = parseErrorMessages(errorArray);
    
    // CSV Header
    let csv = "Row Number,Merchant ID,Error Description (Simple),What This Means,Suggested Action,Original Technical Error\n";
    
    // Add error rows
    parsedErrors.forEach((error) => {
      // Prefix merchantId with tab to force Excel to treat it as text (prevents scientific notation)
      const merchantIdForExcel = error.merchantId ? `\t${error.merchantId}` : '';
      csv += `"${error.row}","${merchantIdForExcel}","${error.simplifiedError}","${getWhatThisMeans(error.originalError)}","${error.suggestedAction}","${error.originalError}"\n`;
    });
    
    return csv;
  };

  const getWhatThisMeans = (error) => {
    if (error.includes("No merchant found")) {
      return "The merchant ID in your file doesn't match any merchant in our database";
    } else if (error.includes("Agent or revenue share is not configured")) {
      return "This merchant hasn't been set up to receive payments through agents";
    } else if (error.includes("Agent basis (by rate) is missing or invalid")) {
      return "The commission percentage for this merchant's agent is not properly set";
    } else {
      return "There's a technical issue that needs to be resolved";
    }
  };

  const parsedErrors = parseErrorMessages(errors);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      style={{ zIndex: 9999 }}
    >
      <div
        className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-6 w-full max-w-4xl relative max-h-[80vh] overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-[var(--sidebar-text-primary)] hover:text-[var(--sidebar-text-selected)]"
        >
          ×
        </button>

        {/* Header */}
        <div className="mb-6">
          <Heading
            Fontweight={600}
            color={'var(--sidebar-text-selected)'}
            Heading={'⚠️ File Upload Issues Found'}
            Fontsize={20}
          />
          <p className="text-[var(--sidebar-text-primary)] mt-2">
            Your file "{fileName}" couldn't be processed due to {errors.length} issue{errors.length > 1 ? 's' : ''}. 
            Please fix these errors and try again.
          </p>
        </div>

        {/* Error Summary */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">📊 Error Summary:</h3>
          <div className="text-sm text-yellow-700">
            <p>• Total Issues: {errors.length}</p>
            <p>• Merchants Not Found: {errors.filter(e => e.includes("No merchant found")).length}</p>
            <p>• Payment Setup Issues: {errors.filter(e => e.includes("Agent or revenue share")).length}</p>
            <p>• Commission Rate Issues: {errors.filter(e => e.includes("Agent basis")).length}</p>
          </div>
        </div>

        {/* Errors Table */}
        <div className="mb-6">
          <h3 className="font-semibold text-[var(--sidebar-text-primary)] mb-3">Detailed Issues:</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--dashboard-tab-box)]">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm">Row</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm">Merchant ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm">Issue</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm">What to Do</th>
                </tr>
              </thead>
              <tbody>
                {parsedErrors.slice(0, 10).map((error, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm">{error.row}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm font-mono">{error.merchantId}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{error.simplifiedError}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-blue-600">{error.suggestedAction}</td>
                  </tr>
                ))}
                {parsedErrors.length > 10 && (
                  <tr>
                    <td colSpan="4" className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-500">
                      ... and {parsedErrors.length - 10} more issues (download full report to see all)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-[var(--sidebar-text-primary)]">
            💡 <strong>Tip:</strong> Download the error report to get all details and suggested fixes.
          </div>
          <div className="flex gap-3">
            <BottonCustom
              backgroundColor={'var(--scroll-thumb)'}
              width={120}
              title={'Close'}
              height={40}
              color={'var(--sidebar-text-primary)'}
              fontSize={14}
              fontWeight={500}
              onClick={onClose}
            />
            <BottonCustom
              backgroundColor={'rgba(67, 121, 238, 1)'}
              width={200}
              title={isGenerating ? 'Generating...' : '📥 Download Error Report'}
              height={40}
              color={'var(--sidebar-text-selected)'}
              fontSize={14}
              fontWeight={600}
              onClick={generateExcelFile}
              disabled={isGenerating}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;

