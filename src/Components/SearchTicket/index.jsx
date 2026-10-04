import React, { useState, Fragment, useEffect } from "react";
import { HiSearch } from "react-icons/hi";
import { useNavigate } from "react-router-dom";

const SearchTicket = ({  handleInputChangeParent, ChartOfAccounts, ChartOfAccountsDetails, value }) => {

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchText, setSearchText] = useState(value || "");
    const [filteredCustomers, setFilteredCustomers] = useState([]);

    useEffect(() => {
        setSearchText(value || "");
    }, [value]);

    const handleInputChange = (e) => {
        const text = e.target.value;
        setSearchText(text);
        handleInputChangeParent(text); // Pass the search text to the parent component
    };


    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            searchAdsFunc();
        }
    };

    const searchAdsFunc = () => {
        setShowSuggestions(false);
        navigate(`search/${searchText}`);
    };
    return (
        <>
            <div style={{ borderRadius: 8, backgroundColor: ChartOfAccountsDetails && ChartOfAccounts ? '#F8FAFC' : 'var(--dashboard-tab-box)', height: 35, borderColor: 'rgba(100, 153, 255, 1)', borderWidth: 1 }} className="w-52 lg:w-96 max-w-96 relative bg-[var(--scroll-thumb)] gap-2 items-center rounded-full flex-grow flex">
            <HiSearch className="text-[24px] text-dashboard-card-text-primary-light dark:text-dashboard-card-text-primary-dark ml-3" />
            <input
                    type="text"
                    placeholder={ChartOfAccounts ? "Search accounts..." : ChartOfAccountsDetails ? "Search transaction......" : "Search Title"}
                    className="bg-transparent outline-none text-[14px] p-1 notranslate flex-1 min-w-0"
                    style={{ color: 'var(--dashboard-text-primary)' }}
                    //   onFocus={handleInputFocus}
                    //   onBlur={handleInputBlur}
                    value={searchText}
                    onKeyDown={handleKeyDown}
                    onChange={handleInputChange}
                />
            </div>
        </>
    );
};

export default SearchTicket;
