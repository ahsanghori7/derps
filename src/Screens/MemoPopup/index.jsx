import { Dialog, Transition } from "@headlessui/react";
import { Fragment, forwardRef, useState } from "react";
import close from "../../assets/close.png";
import pin from "../../assets/pin.png";
import Heading from "../../Components/Heading";
import BottonCustom from "../../Components/ButtonCustom";
import { styled } from '@mui/material/styles';
import './style.css'
function MemoPopup({ trigger, payoutdetailsList, onClose, rowData, memoUserList, customerTable, formTable, policyTable, trainingTable }) {
    const StyledList = styled('ul')(({ theme }) => ({
        // paddingLeft: theme.spacing(3), // Indent the entire list
        marginTop: 0,
        marginBottom: theme.spacing(2),
        width: '80%',
        '& li': {
            marginTop: 20,
            marginBottom: theme.spacing(1),
            position: 'relative',
            paddingLeft: theme.spacing(2), // Space for the custom bullet
            listStyleType: 'none', // Remove default bullets
            '&::before': {
                content: '"•"',
                position: 'absolute',
                left: 0,
                // color: theme.palette.primary.main, // Use your desired color
                fontWeight: 'bold',
            },
        },
    }));

    const displayValue = (value) => value ? value : '-';

    return (
        <Transition appear show={trigger} as={Fragment}>
            <Dialog
                as="div"
                className="relative"
                style={{ zIndex: 9999 }}
                onClose={onClose}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center sm:p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel
                                className="w-[50%] sm:w-full max-w-[50%] transform overflow-auto
                rounded-2xl bg-white py-2 align-middle shadow-xl transition-all "
                                style={{ zIndex: 9999, position: "relative" }}
                            >
                                {/* Add your content here */}
                                {/* <button onClick={onClose} className="text-red-500 right-0">Close</button> */}
                                {/* Close Button with Image */}
                                <button
                                    onClick={onClose}
                                    style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none' }}
                                >
                                    <img src={close} alt="Close" className="w-2 h-2" />
                                </button>
                                <div>
                                    <div className="flex justify-center my-1 " style={{ borderBottom: '1px solid rgba(130, 130, 130, 0.6)' }}>
                                        <Heading
                                            Fontweight={700}
                                            color={'var(--sidebar-selected-bg)'}
                                            Heading={formTable || policyTable || trainingTable ? rowData?.title || rowData?.subject : customerTable || payoutdetailsList ? 'Merchant Information' : rowData?.title || 'Welcome to Portfoilio Manager'}
                                            Fontsize={20}
                                        // Tailwind CSS classes
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mx-4 mt-2">
                                            {!payoutdetailsList && !customerTable && (
                                                <Heading
                                                    Fontweight={400}
                                                    color={'rgba(0, 0, 0, 1)'}
                                                    Heading={new Date(rowData?.date).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                    Fontsize={20}
                                                // Tailwind CSS classes
                                                />
                                            )}
                                            {!formTable && !policyTable && (
                                                <Heading
                                                    Fontweight={400}
                                                    color={'rgba(0, 0, 0, 1)'}
                                                    Heading={rowData?.memoNo}
                                                    Fontsize={20}
                                                // Tailwind CSS classes
                                                />
                                            )}
                                        </div>
                                        <div className="mx-10 mt-3 mb-4">
                                            <Heading
                                                Fontweight={400}
                                                color={'rgba(0, 0, 0, 1)'}
                                                Heading={policyTable ? rowData?.policyNo : rowData?.memo}
                                                Fontsize={10}
                                            // Tailwind CSS classes
                                            />
                                            {policyTable && (
                                                <Heading
                                                    Fontweight={400}
                                                    color={'rgba(46, 46, 46, 1)'}
                                                    Heading={rowData?.memo}
                                                    Fontsize={10}
                                                    mt={10}
                                                // Tailwind CSS classes
                                                />
                                            )}
                                            {trainingTable && (
                                                <Heading
                                                    Fontweight={500}
                                                    color={'rgba(46, 46, 46, 1)'}
                                                    Heading={rowData?.training}
                                                    Fontsize={15}
                                                    mt={10}
                                                // Tailwind CSS classes
                                                />
                                            )}
                                            {memoUserList && (
                                                <>
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(46, 46, 46, 1)'}
                                                        Heading={'Content:'}
                                                        Fontsize={12}
                                                        mt={10}
                                                    // Tailwind CSS classes
                                                    />
                                                    <div
                                                        className="memo-content"
                                                        dangerouslySetInnerHTML={{ __html: rowData?.subject }}
                                                        style={{
                                                            fontSize: '14px',
                                                            color: 'rgba(0, 0, 0, 1)',
                                                            fontWeight: 400,
                                                            marginTop: '10px',
                                                            lineHeight: '1.5'
                                                        }}
                                                    />
                                                </>
                                            )}
                                            {(formTable || policyTable || trainingTable) && rowData?.subject && (
                                                <>
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(46, 46, 46, 1)'}
                                                        Heading={'Content:'}
                                                        Fontsize={12}
                                                        mt={10}
                                                    // Tailwind CSS classes
                                                    />
                                                    <div
                                                        className="memo-content"
                                                        dangerouslySetInnerHTML={{ __html: rowData?.subject }}
                                                        style={{
                                                            fontSize: '14px',
                                                            color: 'rgba(0, 0, 0, 1)',
                                                            fontWeight: 400,
                                                            marginTop: '10px',
                                                            lineHeight: '1.5'
                                                        }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        {formTable || policyTable || trainingTable ? (
                                            <div className="mx-10 mt-8 mb-10">
                                                <Heading
                                                    Fontweight={500}
                                                    color={'rgba(0, 0, 0, 1)'}
                                                    Heading={'Cross Reference:'}
                                                    Fontsize={10}
                                                // Tailwind CSS classes
                                                />
                                                <Heading
                                                    Fontweight={400}
                                                    color={'rgba(0, 0, 0, 1)'}
                                                    Heading={rowData?.crossReference}
                                                    Fontsize={10}
                                                // Tailwind CSS classes
                                                />
                                                <Heading
                                                    Fontweight={500}
                                                    color={'rgba(0, 0, 0, 1)'}
                                                    Heading={'Description'}
                                                    Fontsize={10}
                                                    mt={10}
                                                // Tailwind CSS classes
                                                />
                                                <div
                                                    className="description-container"
                                                    dangerouslySetInnerHTML={{ __html: rowData?.description }}
                                                    style={{
                                                        fontSize: '10px',
                                                        color: 'rgba(0, 0, 0, 1)',
                                                        fontWeight: 400
                                                    }}
                                                />



                                            </div>
                                        ) : null}
                                        {payoutdetailsList && <>
                                            <div className="px-7">
                                                <div className="mb-3 flex">
                                                    <Heading
                                                        Fontweight={700}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={'Merchant Id: '}
                                                        Fontsize={10}
                                                    // Tailwind CSS classes
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={rowData?.merchant?.merchantId}
                                                        Fontsize={10}
                                                        ml={10}
                                                    // Tailwind CSS classes
                                                    />
                                                </div>
                                                <div className="mb-3 flex">
                                                    <Heading
                                                        Fontweight={700}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={'First Name: '}
                                                        Fontsize={10}
                                                    // Tailwind CSS classes
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={rowData?.merchant?.firstName}
                                                        Fontsize={10}
                                                        ml={10}
                                                    // Tailwind CSS classes
                                                    />
                                                </div>
                                                <div className="mb-3 flex">
                                                    <Heading
                                                        Fontweight={700}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={'Last Name: '}
                                                        Fontsize={10}
                                                    // Tailwind CSS classes
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={rowData?.merchant?.lastName}
                                                        Fontsize={10}
                                                        ml={10}
                                                    // Tailwind CSS classes
                                                    />
                                                </div>
                                                <div className="mb-3 flex">
                                                    <Heading
                                                        Fontweight={700}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={'Dba Name: '}
                                                        Fontsize={10}
                                                    // Tailwind CSS classes
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={rowData?.merchant?.dbaName}
                                                        Fontsize={10}
                                                        ml={10}
                                                    // Tailwind CSS classes
                                                    />
                                                </div>
                                                <div className="mb-3 flex">
                                                    <Heading
                                                        Fontweight={700}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={'Created At: '}
                                                        Fontsize={10}
                                                    // Tailwind CSS classes
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={new Date(rowData?.merchant?.createdAt).toLocaleDateString('en-US', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                        Fontsize={10}
                                                        ml={10}
                                                    // Tailwind CSS classes
                                                    />
                                                </div>
                                            </div>
                                        </>}
                                        {memoUserList || formTable || policyTable || trainingTable ? (
                                            <div className="mx-10 mb-10">
                                                {rowData?.fileUrl && rowData.fileUrl.length > 0 && (
                                                    <>
                                                        <div className="flex items-center gap-4 ">
                                                            <img src={pin} alt="Close" className="w-12 h-12" />
                                                            <Heading
                                                                Fontweight={600}
                                                                color={'rgba(0, 0, 0, 1)'}
                                                                Heading={'Attachments'}
                                                                Fontsize={15}
                                                            />
                                                        </div>
                                                        <div>
                                                            {rowData.fileUrl.map((file, index) => (
                                                                <div
                                                                    key={index}
                                                                    onClick={() => window.open(file.url, '_blank')}
                                                                    className="px-4 cursor-pointer mt-2"
                                                                    style={{
                                                                        border: '1px solid var(--sidebar-selected-bg)',
                                                                        fontSize: 14,
                                                                        borderRadius: 9,
                                                                        backgroundColor: 'var(--dashboard-tab-box)',
                                                                        paddingTop: 8,
                                                                        paddingBottom: 8,
                                                                        width: '60%',
                                                                        color: 'blue'
                                                                    }}
                                                                >
                                                                    <Heading
                                                                        Fontweight={500}
                                                                        color={'blue'}
                                                                        Heading={file.originalname}
                                                                        Fontsize={10}
                                                                        mb={4}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                    {customerTable && (
                                        <>
                                            <div className="flex flex-wrap md:grid md:grid-cols-6 gap-2  px-3 md:px-7 pb-2 ">
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Merchant Id'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.merchantIds?.map(idObj => idObj.merchantId).join(', '))}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'First Name'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.firstName)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Last Name'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.lastName)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Legal Business Name'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.legalBusinessName)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Legal Address'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.legalAddress)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Legal City'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.legalCity)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Legal State'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.state)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Legal Zip Code'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.legalZipCode)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Contact'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.phoneNumber)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Email'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.email)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'DBA Name'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.dbaName)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'DBA Address'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.dbaAddress)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'DBA City'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.businessCity)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'DBA State'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.businessState)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'DBA Zip Code'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.businessZipCode)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'DBA PhoneNumber'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.dbaPhoneNumber)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Owner First Name'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.ownerFirstName)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Owner Last Name'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.ownerLastName)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Owner Address'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.ownerAddress)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Owner City'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.ownerCity)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Owner State'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.ownerState)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Owner Zip Code'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.ownerZipcode)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>

                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Owner Email'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.ownerEmail)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Website'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.website)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 0.5)'}
                                                        Heading={'Owner PhoneNumber'}
                                                        Fontsize={10}
                                                    />
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'rgba(32, 34, 36, 1)'}
                                                        Heading={displayValue(rowData?.ownerPhoneNumber)}
                                                        Fontsize={10}
                                                        className={'break-all overflow-wrap'}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    <div style={{ display: '' }} className="flex justify-end mx-5" >

                                        <BottonCustom
                                            backgroundColor={'rgba(67, 121, 238, 1)'}
                                            width={130}
                                            title={'Close'}
                                            height={40}
                                            color={'var(--sidebar-text-selected)'}
                                            fontSize={16}
                                            fontWeight={700}
                                            onClick={onClose}
                                        />
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

export default MemoPopup;
