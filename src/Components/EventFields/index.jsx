"use client"

import { useState } from "react";
import CustomDatePicker from "../CustomDatePicker"
import LabeledInput from "../LabeledInput"
import Heading from "../Heading"
import MultiSelectDropdown from "../MultiSelectDropdown"
import GroupPicker from "../../features/chat/shared/GroupPicker"
import CustomTimePicker from "../CustomTimePicker"

const EventFields = ({
    accessToken,
    projectTitle,
    onTitleChange,
    startDate,
    onStartDateChange,
    startTime,
    onStartTimeChange,
    endTime,
    onEndTimeChange,
    userList,
    selectedItems,
    onSelectionChange,
    selectedGroupIds,
    onGroupChange,
    meetingLink,
    onMeetingLinkChange,
    onGenerateMeetingLink,
    generatingLink,
    description,
    onDescriptionChange,
    externalEmails,
    onExternalEmailsChange,
    errors,
}) => {
    const [externalEmailInput, setExternalEmailInput] = useState("");

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

    const handleAddExternalEmail = () => {
        const trimmed = externalEmailInput.trim();
        if (!trimmed || !isValidEmail(trimmed)) return;
        if (!externalEmails.includes(trimmed)) {
            onExternalEmailsChange([...externalEmails, trimmed]);
        }
        setExternalEmailInput("");
    };

    const handleRemoveExternalEmail = (email) => {
        onExternalEmailsChange(externalEmails.filter((e) => e !== email));
    };

    const handleExternalEmailKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            handleAddExternalEmail();
        } else if (e.key === "Backspace" && !externalEmailInput && externalEmails.length > 0) {
            onExternalEmailsChange(externalEmails.slice(0, -1));
        }
    };

    const handleExternalEmailBlur = () => {
        if (externalEmailInput.trim()) handleAddExternalEmail();
    };
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="">
                    <LabeledInput
                        label="Event Title"
                        inputPlaceholder="Enter title"
                        inputValue={projectTitle}
                        addAgent={true}
                        onInputChange={onTitleChange}
                        className="w-56 sm:w-full h-7 mt-[4px] placeholder:pl-1 pl-1 "
                        required={true}
                        error={errors.projectTitle}
                    />
                </div>

                <div className="">
                    <div className="flex ">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Date"} Fontsize={10} mb={2} required={true} />
                    </div>
                    <CustomDatePicker label="Date" value={startDate} onChange={onStartDateChange} addEvent={true} error={errors.startDate} />
                </div>

                <div className="">
                    <CustomTimePicker
                        label="Start Time"
                        value={startTime}
                        createEvent={true}
                        onChange={onStartTimeChange}
                        required={true}
                        error={errors.startTime}
                    />
                </div>
                <div className="">
                    <CustomTimePicker
                        label="End Time"
                        value={endTime}
                        createEvent={true}
                        onChange={onEndTimeChange}
                        required={true}
                        error={errors.endTime}
                    />
                </div>

                <div className="">
                    <div className="flex">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Add Team Members"} Fontsize={10} mb={2} />
                    </div>
                    <MultiSelectDropdown
                        label="Select Team Members"
                        menuItems={userList}
                        defaultText="--select team members--"
                        onChange={onSelectionChange}
                        addAgent={true}
                        idSet={true}
                        selectedValue={selectedItems}
                        eventScreen={true}
                        error={errors.selectedItems}
                    />
                </div>
                <div className="">
                    <div className="flex">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Notify Chat Groups (optional)"} Fontsize={10} mb={2} />
                    </div>
                    <GroupPicker
                        accessToken={accessToken}
                        value={selectedGroupIds}
                        onChange={onGroupChange}
                    />
                </div>
                <div className="">
                    <LabeledInput
                        label="Meeting Link"
                        inputPlaceholder="Enter link"
                        inputValue={meetingLink}
                        meetingLink={true}
                        onInputChange={onMeetingLinkChange}
                        eventScreen={true}
                    />
                    <button
                        type="button"
                        onClick={onGenerateMeetingLink}
                        disabled={generatingLink}
                        className="mt-2 text-xs text-[#0C79F7] hover:text-blue-700 disabled:opacity-50"
                    >
                        {generatingLink ? 'Generating…' : 'Generate Meeting Link'}
                    </button>
                </div>

                <div className="md:col-span-2">
                    <div className="flex">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"External Emails (optional)"} Fontsize={10} mb={2} />
                    </div>
                    <div
                        className="w-full min-h-[38px] p-2 rounded-md flex flex-wrap items-center gap-1 cursor-text"
                        style={{ border: '1px solid #D1D5DC', backgroundColor: 'var(--dashboard-tab-box)' }}
                        onClick={() => document.getElementById('external-email-input')?.focus()}
                    >
                        {externalEmails.map((email) => (
                            <span
                                key={email}
                                className="flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                                {email}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveExternalEmail(email)}
                                    className="ml-1 text-blue-800 hover:text-blue-900 leading-none"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        <input
                            id="external-email-input"
                            type="text"
                            value={externalEmailInput}
                            onChange={(e) => setExternalEmailInput(e.target.value)}
                            onKeyDown={handleExternalEmailKeyDown}
                            onBlur={handleExternalEmailBlur}
                            placeholder={externalEmails.length === 0 ? 'Enter external email and press Enter/Comma' : ''}
                            className="bg-transparent border-none outline-none flex-1 min-w-[150px] text-sm px-1"
                        />
                    </div>
                </div>
            </div>

            <div className="w-full mb-4 mt-2">
                <div className="flex">
                    <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Agenda"} Fontsize={10} mb={2} />
                </div>
                <textarea
                    type="text"
                    placeholder="Enter project details..."
                    value={description}
                    onChange={onDescriptionChange}
                    maxLength={240}
                    className="mt-1 p-3 w-full mb-5"
                    rows={4}
                    style={{
                        border: errors.description ? "1px solid #ef4444" : "1px solid #D1D5DC",
                        fontSize: 14,
                        borderRadius: 8,
                        backgroundColor: "var(--dashboard-tab-box)",
                        color: "var(--sidebar-text-primary)",
                    }}
                />
                <div className="flex justify-between items-start" style={{ marginTop: -16 }}>
                    <span>
                        {errors.description && (
                            <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>
                                {errors.description}
                            </p>
                        )}
                    </span>
                    <p style={{ color: 'var(--fieldsTitle)', fontSize: 12, margin: 0 }}>
                        {description.length}/240 characters
                    </p>
                </div>
            </div>
        </>
    )
}

export default EventFields
