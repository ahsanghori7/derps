/**
 * Extracts error message from error object
 * Handles JSON string errors from API responses
 * @param {Error} error - The error object
 * @param {string} fallbackMessage - Fallback message if error message cannot be extracted
 * @returns {string} - The error message
 */
export const getErrorMessage = (error, fallbackMessage = "Something went wrong") => {
  // Try to parse error.message if it's a JSON string
  let parsedError = null;
  try {
    parsedError = JSON.parse(error.message);
  } catch (e) {
    // error.message is not JSON, use it as is
  }

  // Check for errors object in parsed error or direct error response
  const errorsObj = parsedError?.errors || error?.response?.data?.errors || error?.data?.errors;
  
  if (errorsObj && typeof errorsObj === 'object') {
    // Extract all error messages from the errors object
    const errorMessages = [];
    
    Object.entries(errorsObj).forEach(([field, messages]) => {
      if (Array.isArray(messages)) {
        // If it's an array, add each message
        messages.forEach(msg => {
          if (msg) errorMessages.push(msg);
        });
      } else if (messages) {
        // If it's a single string
        errorMessages.push(messages);
      }
    });

    if (errorMessages.length > 0) {
      // Prefer concrete field errors over generic wrapper messages
      const mainMessage = parsedError?.message || error?.response?.data?.message || error?.data?.message || "";
      const isGenericFixMessage = /please fix the following errors\.?/i.test(String(mainMessage).trim());
      if (isGenericFixMessage || !mainMessage) {
        return errorMessages.join(", ");
      }
      return `${mainMessage}: ${errorMessages.join(", ")}`;
    }
  }

  if (error?.message?.includes("Failed to fetch")) {
    return "Failed to fetch data. Please check your internet connection and try again.";
  }

  // Check parsed error message first, then fallback to other error sources
  return (
    parsedError?.message ||
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};
