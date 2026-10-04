import { useEffect } from 'react';
import { useSelector } from 'react-redux';

export const usePageTitle = (pageTitle, location) => {
  const userData = useSelector((state) => state.userData.userDetails);
  
  useEffect(() => {
    // Get tenant name from Redux store or use default
    const tenantName = userData?.tenant?.name || "Dolphin Merchant System";
    
    // Set the document title
    document.title = `${tenantName} | ${pageTitle}`;
    
    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = `${tenantName}`;
    };
  }, [pageTitle, userData, location]);
};