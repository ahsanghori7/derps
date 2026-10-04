"use client"

import { useEffect, useState } from "react"
import LabeledInput from "../LabeledInput"
import { Loader2, X } from "lucide-react"
import { toast } from "react-toastify"

const OneFieldModal = ({
    isOpen,
    onClose,
    fieldTitle,
    fieldPlaceholder,
    modalTitle,
    onSubmit,
    defaultValue,
    buttonName
}) => {
    const [loading, setLoading] = useState(false)
    const [projectTitle, setProjectTitle] = useState(defaultValue || "")
    const [errors, setErrors] = useState({});

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    useEffect(() => {
        if (!isOpen) return;
        setProjectTitle(defaultValue || "");
        setErrors({});
        setLoading(false);
    }, [isOpen, defaultValue]);

    if (!isOpen) return null

    const handleTitleChange = (e) => {
        setProjectTitle(e.target.value)
        clearError("projectTitle");
    }

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
        }
    }

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !loading && typeof onClose === 'function') {
            onClose();
        }
    }

    const handleSubmit = async () => {
        setErrors({});

        const fieldErrors = {};
        if (!projectTitle || projectTitle.trim() === "") fieldErrors.projectTitle = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error(`${fieldTitle || "Title"} is required`);
            return;
        }

        if (projectTitle.trim().length < 2) {
            setErrors({ projectTitle: true });
            toast.error(`${fieldTitle || "Title"} must be at least 2 characters long`);
            return;
        }

        if (projectTitle.trim().length > 100) {
            setErrors({ projectTitle: true });
            toast.error(`${fieldTitle || "Title"} must be less than 100 characters`);
            return;
        }

        setLoading(true);
        try {
            if (typeof onSubmit !== 'function') {
                toast.error("Invalid submit handler");
                return;
            }

            await onSubmit(projectTitle);
            setProjectTitle("");

            if (typeof onClose === 'function') {
                onClose();
            }
        } catch (error) {
            console.error('One field modal submission error:', error);

            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to perform this action");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    toast.error(error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error(error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    }

    const trimmedLength = projectTitle.trim().length;
    const submitLabel = buttonName || "Create";

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
            style={{ zIndex: 9999 }}
            onClick={handleBackdropClick}
        >
            <div
                className="bg-[var(--dashboard-card-bg)] rounded-2xl shadow-2xl w-full max-w-md relative border border-[var(--sidebar-text-primary)]/5 overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="one-field-modal-title"
            >
                <div className="h-1 w-full bg-[#0C79F7]" />

                <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3 mb-5">
                        <div className="min-w-0">
                            <h2
                                id="one-field-modal-title"
                                className="text-xl text-[var(--sidebar-text-primary)] font-semibold tracking-tight"
                            >
                                {modalTitle}
                            </h2>
                            {fieldTitle ? (
                                <p className="mt-1 text-sm text-[var(--sidebar-text-primary)]/55">
                                    Enter a {fieldTitle.toLowerCase()} below
                                </p>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            aria-label="Close"
                            className="shrink-0 p-2 rounded-full text-[var(--sidebar-text-primary)]/60 hover:text-[var(--sidebar-text-primary)] hover:bg-[var(--sidebar-text-primary)]/8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <LabeledInput
                            label={fieldTitle}
                            inputPlaceholder={fieldPlaceholder}
                            inputValue={projectTitle}
                            addAgent={true}
                            onInputChange={handleTitleChange}
                            onKeyDown={handleInputKeyDown}
                            error={!!errors.projectTitle}
                        />
                        <div className="flex justify-end">
                            <span
                                className={`text-xs tabular-nums ${
                                    trimmedLength > 100
                                        ? "text-red-500"
                                        : "text-[var(--sidebar-text-primary)]/40"
                                }`}
                            >
                                {trimmedLength}/100
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--sidebar-text-primary)] bg-[var(--sidebar-text-primary)]/6 hover:bg-[var(--sidebar-text-primary)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${
                                loading
                                    ? "bg-[#0C79F7]/60 cursor-not-allowed"
                                    : "bg-[#0C79F7] hover:bg-[#0047c7] active:bg-[#003db0]"
                            }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                submitLabel
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OneFieldModal
