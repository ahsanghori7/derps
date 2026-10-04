import React, { useState, useEffect, useCallback } from "react";
import { Radio } from "@mui/material";
import { useSelector } from "react-redux";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

const NewOpportunityModal = ({ isOpen, onClose, onNext }) => {
    const authData = useSelector((state) => state.auth);
    let accessToken = authData?.accessToken || localStorage.getItem("accessToken") || authData?.token;

    if (typeof accessToken === "string") {
        try {
            const parsed = JSON.parse(accessToken);
            accessToken = parsed.token || parsed.accessToken || accessToken;
        } catch (e) {
            // already a plain string
        }
    }

    const [recordTypes, setRecordTypes] = useState([]);
    const [selectedRecordType, setSelectedRecordType] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchRecordTypes = useCallback(() => {
        if (!accessToken) return;

        setLoading(true);
        getRequestWithOutBody(`${baseURl}item-category/`, accessToken)
            .then((result) => {
                const list =
                    result?.data?.data
                    || result?.data?.results
                    || (Array.isArray(result?.data) ? result.data : [])
                    || [];
                const types = (Array.isArray(list) ? list : [])
                    .map((item) => item.title || item.name || "")
                    .filter(Boolean);

                setRecordTypes(types);
                setSelectedRecordType((prev) =>
                    types.includes(prev) ? prev : (types[0] || "")
                );
            })
            .catch(() => {
                setRecordTypes([]);
                setSelectedRecordType("");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [accessToken]);

    useEffect(() => {
        if (isOpen) {
            fetchRecordTypes();
        }
    }, [isOpen, fetchRecordTypes]);

    const handleClose = () => {
        setSelectedRecordType(recordTypes[0] || "");
        onClose();
    };

    const handleNext = () => {
        if (!selectedRecordType) return;
        onNext?.(selectedRecordType);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-[2100]"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            onClick={handleClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-[480px]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 20px",
                        borderBottom: "1px solid var(--dashboard-border)",
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 20,
                            fontWeight: 700,
                            color: "var(--sidebar-text-primary)",
                        }}
                    >
                        New Opportunity
                    </h2>
                    <button
                        onClick={handleClose}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: 22,
                            color: "var(--dashboard-text-secondary)",
                            cursor: "pointer",
                            lineHeight: 1,
                            padding: 0,
                        }}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: "20px 24px 8px" }}>
                    <p
                        style={{
                            margin: "0 0 16px",
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.5px",
                            color: "var(--dashboard-text-secondary)",
                            textTransform: "uppercase",
                        }}
                    >
                        <span style={{ color: "#e53935" }}>* </span>
                        Select Opportunity Record Type
                    </p>

                    {loading ? (
                        <p
                            style={{
                                color: "var(--dashboard-text-secondary)",
                                fontSize: 14,
                                padding: "8px 0 16px",
                            }}
                        >
                            Loading...
                        </p>
                    ) : recordTypes.length === 0 ? (
                        <p
                            style={{
                                color: "var(--dashboard-text-secondary)",
                                fontSize: 14,
                                padding: "8px 0 16px",
                            }}
                        >
                            No record types found
                        </p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {recordTypes.map((type) => {
                                const isSelected = selectedRecordType === type;

                                return (
                                    <label
                                        key={type}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            cursor: "pointer",
                                            color: "var(--dashboard-text-primary)",
                                            fontSize: 14,
                                            fontWeight: isSelected ? 500 : 400,
                                        }}
                                        onClick={() => setSelectedRecordType(type)}
                                    >
                                        <Radio
                                            checked={isSelected}
                                            onChange={() => setSelectedRecordType(type)}
                                            size="small"
                                            sx={{
                                                padding: 0,
                                                color: "var(--dashboard-border)",
                                                "&.Mui-checked": {
                                                    color: "var(--dashboard-primary)",
                                                },
                                            }}
                                        />
                                        {type}
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        padding: "16px 24px 20px",
                    }}
                >
                    <button
                        onClick={handleNext}
                        disabled={!selectedRecordType || loading}
                        style={{
                            backgroundColor: "#1976d2",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "8px 24px",
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: !selectedRecordType || loading ? "not-allowed" : "pointer",
                            minWidth: 80,
                            opacity: !selectedRecordType || loading ? 0.6 : 1,
                        }}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewOpportunityModal;
