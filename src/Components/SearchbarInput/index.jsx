import React, { useState, Fragment, useEffect } from "react";
import { HiSearch } from "react-icons/hi";
import { useNavigate } from "react-router-dom";

const SearchbarInput = ({ customerList, handleInputChangeParent, searchTextValue, onSearchTextChange, onEnter }) => {

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [discount, setdiscount] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 800);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchDiscount, setsearchDiscount] = useState(0);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [searchSelectedLocations, setsearchSelectedLocations] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const effectiveSearchText = searchTextValue !== undefined ? searchTextValue : searchText;

  useEffect(() => {
    if (searchTextValue !== undefined) {
      setSearchText(searchTextValue);
    }
  }, [searchTextValue]);

  const applySearch = (text) => {

    if (Array.isArray(customerList)) {
      const q = String(text || '').trim().toLowerCase();
      if (!q) {
        setFilteredCustomers([]);
        handleInputChangeParent(null);
        return;
      }

      const asText = (v) => {
        if (v === null || v === undefined) return '';
        return String(v).toLowerCase();
      };

      const includesQuery = (v) => asText(v).includes(q);

      const filtered = customerList.filter((customer) => {
        if (!customer) return false;

        const merchantIds = Array.isArray(customer.merchantIds) ? customer.merchantIds : [];
        const merchantIdMatch = merchantIds.some((m) => includesQuery(m?.merchantId));

        const agent = customer.agent || {};
        const account = customer.account || {};

        return (
          merchantIdMatch ||
          includesQuery(customer.id) ||
          includesQuery(customer.merchantId) ||
          includesQuery(customer.legalBusinessName) ||
          includesQuery(customer.dbaName) ||
          includesQuery(customer.firstName) ||
          includesQuery(customer.lastName) ||
          includesQuery(customer.ownerFirstName) ||
          includesQuery(customer.ownerLastName) ||
          includesQuery(customer.phoneNumber) ||
          includesQuery(customer.dbaPhoneNumber) ||
          includesQuery(customer.ownerPhoneNumber) ||
          includesQuery(customer.email) ||
          includesQuery(customer.ownerEmail) ||
          includesQuery(customer.website) ||
          includesQuery(customer.legalAddress) ||
          includesQuery(customer.dbaAddress) ||
          includesQuery(customer.legalCity) ||
          includesQuery(customer.businessCity) ||
          includesQuery(customer.legalState) ||
          includesQuery(customer.businessState) ||
          includesQuery(customer.legalZipCode) ||
          includesQuery(customer.businessZipCode) ||
          includesQuery(customer.status) ||
          includesQuery(customer.merchantStatus) ||
          includesQuery(customer.source) ||
          includesQuery(customer.assigneeId) ||
          includesQuery(agent?.id) ||
          includesQuery(agent?.name) ||
          includesQuery(agent?.username) ||
          includesQuery(account?.id) ||
          includesQuery(account?.name) ||
          includesQuery(account?.code)
        );
      });
      setFilteredCustomers(filtered);
      handleInputChangeParent(filtered);
    } else {
    }
  };

  useEffect(() => {
    applySearch(effectiveSearchText);
  }, [effectiveSearchText, customerList]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchText(text);
    if (onSearchTextChange) onSearchTextChange(text);
    applySearch(text);
  };


  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (onEnter) {
        onEnter(e);
        return;
      }
      searchAdsFunc();
    }
  };

  const searchAdsFunc = () => {
    setShowSuggestions(false);
    navigate(`search/${searchText}`);
  };
  return (
    <>
      <div >
        {/* <HiSearch className="text-[22px] text-gray-600 ml-3" /> */}
        <input
          type="text"
          placeholder={customerList ? "Search by name, phone, email, merchant ID, status..." : "Search"}
          className="mt-1 p-2 w-full"
          style={{
            border: '1px solid var(--dashboard-box-border)',
            borderRadius: 8,
            backgroundColor: 'var(--dashboard-tab-box)',
            height: 40,
          }}
          //   onFocus={handleInputFocus}
          //   onBlur={handleInputBlur}
          value={effectiveSearchText}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange}
        />
      </div>
    </>
  );
};

export default SearchbarInput;
