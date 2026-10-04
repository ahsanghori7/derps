import Heading from "../../Components/Heading";
import LabeledInput from "../../Components/LabeledInput";
import DropdownMenu from "../../Components/dropdownMenu";
import BottonCustom from "../../Components/ButtonCustom";
import CustomDatePicker from "../../Components/CustomDatePicker";
import CustomTimePicker from "../../Components/CustomTimePicker";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { baseURl } from "../../Config/systemConfig";
import { getRequestWithOutBody, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import Loader from "../../Components/Loader";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import SignatureCanvas from 'react-signature-canvas';
import { usePageTitle } from "../../Hooks/usePageTitle";
import { IoIosArrowBack } from "react-icons/io";
import { FiTrash2, FiCamera, FiImage, FiX, FiDownload, FiMinus, FiPlus, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaCheck } from "react-icons/fa";
import styled from "styled-components";
import { downloadFileFromUrl } from "../../Utils/fileDownload";
import {
    isHeicLike,
    isImageFile,
    prepareImageForPreview,
    resolveDisplayableImageSrc,
    convertHeicToJpegFile,
    browserSupportsHeicInImg,
    sniffHeicBlob,
} from "../../Utils/heicConvert";

dayjs.extend(customParseFormat);


const BLUE = "#0D6EFD";
const RED = "#EF4444";
const GREEN = "#12B76A";
const BORDER = "#D9DEE3";
const LABEL_COLOR = "var(--sidebar-text-primary)";

const formatPhoneNumber = (raw) => {
    let value = String(raw || '').replace(/\D/g, '');
    if (value.length > 10) value = value.substring(0, 10);
    if (value.length > 6) {
        return `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
    }
    if (value.length > 3) {
        return `(${value.substring(0, 3)}) ${value.substring(3)}`;
    }
    if (value.length > 0) {
        return `(${value}`;
    }
    return '';
};

const toKebab = (val) => (val || '').toString().toLowerCase().replace(/\s+/g, '-');

/** API enums are the source of truth in form state (not display labels). */
const PRIORITY_OPTIONS = [
    { label: 'Routine', value: 'routine' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'Emergency', value: 'emergency' },
];
const PRIORITY_API_VALUES = PRIORITY_OPTIONS.map((o) => o.value);
const PRIORITY_LABEL_BY_API = Object.fromEntries(
    PRIORITY_OPTIONS.map((o) => [o.value, o.label])
);

const toPriorityApi = (val) => {
    const raw = (val || '').toString().trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (PRIORITY_API_VALUES.includes(lower)) return lower;
    const fromLabel = PRIORITY_OPTIONS.find((o) => o.label.toLowerCase() === lower);
    return fromLabel ? fromLabel.value : '';
};

const priorityLabel = (val) => PRIORITY_LABEL_BY_API[toPriorityApi(val)] || '';

/** Labels shown in UI → exact API enum values (not always naive kebab-case). */
const VISIT_TYPE_API_BY_LABEL = {
    'POS Install': 'pos-install',
    'ATM Install': 'atm-install',
    'Staff Training': 'staff-training',
    Troubleshooting: 'troubleshooting',
    'Hardware Upgrade': 'hardware-upgrade',
    'Update Software': 'update-software',
    'Collect Data': 'collect-data',
    Monitoring: 'monitoring',
    'Issue with POS': 'issue-pos',
    'Issue with ATM': 'issue-atm',
    Others: 'others',
};
const VISIT_TYPE_LABEL_BY_API = Object.fromEntries(
    Object.entries(VISIT_TYPE_API_BY_LABEL).map(([label, api]) => [api, label])
);

const toVisitTypeApi = (label) => VISIT_TYPE_API_BY_LABEL[label] || '';

const fromVisitTypeApi = (apiVal) => {
    const normalized = (apiVal || '').toString().trim().toLowerCase();
    if (!normalized) return '';
    return VISIT_TYPE_LABEL_BY_API[normalized] || '';
};

const fromKebabLabel = (kebab, options = []) => {
    const normalized = (kebab || '').toString().toLowerCase().replace(/\s+/g, '-');
    if (!normalized) return '';
    const found = options.find(
        (opt) => toKebab(typeof opt === 'object' ? opt.label : opt) === normalized
    );
    if (found) return typeof found === 'object' ? found.label : found;
    return normalized
        .split('-')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ');
};

const formatApiErrorMessage = (error) => {
    const raw = error?.data || error?.response?.data || error?.message;
    let payload = raw;
    if (typeof raw === 'string') {
        try {
            payload = raw.trim().startsWith('{') ? JSON.parse(raw) : raw;
        } catch (_) {
            return raw || 'Something went wrong';
        }
    }
    if (payload && typeof payload === 'object') {
        const fieldErrors = payload.errors && typeof payload.errors === 'object'
            ? Object.values(payload.errors).filter(Boolean)
            : [];
        if (fieldErrors.length) return fieldErrors.join(', ');
        if (payload.message) return payload.message;
    }
    return (typeof raw === 'string' && raw) || 'Something went wrong';
};

const parseVisitTime = (value) => {
    if (!value) return null;
    const parsed = dayjs(value, ['HH:mm:ss', 'HH:mm'], true);
    return parsed.isValid() ? parsed : null;
};

const ACTION_TAKEN_OPTIONS = ['Installed', 'Replaced', 'Repaired', 'Configured', 'Tested', 'Removed'];
const JOB_STATUS_LABELS = ['Completed', 'Follow-Up', 'Pending', 'Reschedule'];

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: 10,
    cursor: 'pointer'
});

/* Textarea styled to match LabeledInput / CustomDatePicker */
const StyledTextArea = ({ value, onChange, placeholder, error, rows = 3 }) => (
    <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        style={{
            width: '100%',
            maxWidth: 320,
            background: 'var(--dashboard-tab-box)',
            border: `1px solid ${error ? RED : '#D1D5DC'}`,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 14,
            color: 'var(--dashboard-text-primary)',
            outline: 'none',
            resize: 'vertical',
            minHeight: 70,
            boxSizing: 'border-box',
        }}
    />
);

/* ===== Segmented toggle (Priority, Yes/No, etc.) ===== */
const SegmentedGroup = ({ options, value, onChange, error }) => (
    <div
        className="inline-flex"
        style={{
            border: `1px solid ${error ? RED : BORDER}`,
            borderRadius: 6,
            overflow: 'hidden',
            background: 'var(--dashboard-tab-box)',
        }}
    >
        {options.map((opt, idx) => {
            const optValue = typeof opt === 'object' && opt !== null ? opt.value : opt;
            const optLabel = typeof opt === 'object' && opt !== null ? opt.label : opt;
            const selected = value === optValue;
            return (
                <button
                    key={String(optValue)}
                    type="button"
                    onClick={() => onChange(optValue)}
                    style={{
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 500,
                        border: 'none',
                        borderLeft: idx > 0 ? `1px solid ${BORDER}` : 'none',
                        background: selected ? BLUE : 'transparent',
                        color: selected ? '#FFFFFF' : '#667085',
                        cursor: 'pointer',
                        borderRadius: selected ? 6 : 0,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {optLabel}
                </button>
            );
        })}
    </div>
);

/* ===== Action Taken pill buttons ===== */
const PillGroup = ({ options, value, onChange, error }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 8, justifyContent: 'start' }}>
        {options.map((opt) => {
            const selected = value === opt;
            return (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    style={{
                        padding: '6px 16px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 6,
                        border: `1px solid ${selected ? BLUE : (error ? RED : BORDER)}`,
                        background: selected ? BLUE : 'var(--dashboard-tab-box)',
                        color: selected ? '#FFFFFF' : '#667085',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {opt}
                </button>
            );
        })}
    </div>
);

/* ===== Job status chips ===== */
const JOB_STATUS_OPTIONS = [
    { label: 'Completed', icon: '✓', activeColor: GREEN },
    { label: 'Follow-Up', icon: '↻', activeColor: BLUE },
    { label: 'Pending', icon: '◷', activeColor: '#F79009' },
    { label: 'Reschedule', icon: '⟳', activeColor: '#667085' },
];

const JobStatusGroup = ({ value, onChange, error }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: 8, justifyContent: 'start' }}>
        {JOB_STATUS_OPTIONS.map((opt) => {
            const selected = value === opt.label;
            return (
                <button
                    key={opt.label}
                    type="button"
                    onClick={() => onChange(opt.label)}
                    style={{
                        padding: '6px 16px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 6,
                        border: `1px solid ${selected ? opt.activeColor : (error ? RED : BORDER)}`,
                        background: selected ? `${opt.activeColor}14` : 'var(--dashboard-tab-box)',
                        color: selected ? opt.activeColor : '#667085',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                    }}
                >
                    <span>{opt.icon}</span> {opt.label}
                </button>
            );
        })}
    </div>
);

const InlineCheckbox = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: BLUE, cursor: 'pointer' }}
        />
        {label}
    </label>
);

/* ===== Row layout: label on left, input on right ===== */
const FieldRow = ({ label, required, children, alignTop }) => (
    <div
        className={`flex ${alignTop ? 'items-start' : 'items-center'} gap-x-6 gap-y-1 flex-wrap`}
        style={{ marginBottom: 14 }}
    >
        <div className="w-48 shrink-0" style={{ paddingTop: alignTop ? 6 : 0 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: LABEL_COLOR }}>
                {label}{required && <span style={{ color: RED }}> *</span>}
            </span>
        </div>
        {children}
    </div>
);

/* Checkbox row (Visit Type step) */
const CheckboxFieldRow = ({ label, checked, onChange }) => (
    <div className="flex items-center gap-x-6 flex-wrap" style={{ marginBottom: 12 }}>
        <div className="w-48 shrink-0">
            <span style={{ fontSize: 14, fontWeight: 500, color: LABEL_COLOR }}>{label}</span>
        </div>
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: BLUE, cursor: 'pointer' }}
        />
    </div>
);

/* ===== Wizard stepper ===== */
const STEPS = [
    'Store & Site Details',
    'Visit Type',
    'Inventory Check',
    'Arrival',
    'Hardware Worked On',
    'Work Performed',
    'Issues & Follow up',
    'Photos',
    'Sign Off',
];

const WizardStepper = ({ current, onStepClick }) => {
    const clickable = typeof onStepClick === 'function';
    return (
        <div className="w-full overflow-x-auto" style={{ paddingBottom: 6 }}>
            <div className="flex items-start" style={{ minWidth: 720, marginBottom: 22 }}>
                {STEPS.map((label, idx) => {
                    const stepNum = idx + 1;
                    const done = stepNum < current;
                    const active = stepNum === current;
                    const canClick = clickable && !active;
                    const highlighted = done || active || clickable;
                    return (
                        <div key={label} className="flex items-start" style={{ flex: idx === STEPS.length - 1 ? '0 0 auto' : 1 }}>
                            <div
                                className="flex flex-col items-center"
                                style={{ width: 78, cursor: canClick ? 'pointer' : 'default' }}
                                onClick={canClick ? () => onStepClick(stepNum) : undefined}
                                title={canClick ? `Go to ${label}` : undefined}
                                role={canClick ? 'button' : undefined}
                                tabIndex={canClick ? 0 : undefined}
                                onKeyDown={canClick ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onStepClick(stepNum);
                                    }
                                } : undefined}
                            >
                                <div
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10,
                                        fontWeight: 600,
                                        background: done ? BLUE : 'transparent',
                                        border: `1.5px solid ${highlighted ? BLUE : '#CBD2D9'}`,
                                        color: done ? '#FFFFFF' : highlighted ? BLUE : '#98A2B3',
                                        flexShrink: 0,
                                    }}
                                >
                                    {done ? <FaCheck size={10} /> : String(stepNum).padStart(2, '0')}
                                </div>
                                <div
                                    style={{
                                        marginTop: 6,
                                        fontSize: 10,
                                        fontWeight: 500,
                                        textAlign: 'center',
                                        lineHeight: 1.25,
                                        color: highlighted ? BLUE : '#98A2B3',
                                    }}
                                >
                                    {label}
                                </div>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div style={{ flex: 1, height: 1.5, background: done || clickable ? BLUE : '#D5DAE1', marginTop: 13, minWidth: 14, opacity: done || clickable ? 0.35 : 1 }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ===== Step footer with BottonCustom ===== */
const StepFooter = ({ onBack, backLabel = 'Back', onNext, nextLabel = 'Save & Continue', onDraft, draftLabel = 'Save Draft' }) => (
    <div className="flex justify-between items-center flex-wrap gap-3" style={{ marginTop: 40 }}>
        <BottonCustom
            title={backLabel}
            onClick={onBack}
            backgroundColor="#FFFFFF"
            color="#344054"
            fontSize={13}
            fontWeight={500}
            width={backLabel.length > 8 ? 150 : 100}
            height={36}
            border="1px solid #D9DEE3"
        />
        <div className="flex items-center gap-2 flex-wrap">
            {onDraft && (
                <BottonCustom
                    title={draftLabel}
                    onClick={onDraft}
                    backgroundColor="#FFFFFF"
                    color={BLUE}
                    fontSize={13}
                    fontWeight={500}
                    width={120}
                    height={36}
                    border={`1px solid ${BLUE}`}
                />
            )}
            <BottonCustom
                title={nextLabel}
                onClick={onNext}
                backgroundColor={BLUE}
                color="#FFFFFF"
                fontSize={13}
                fontWeight={500}
                width={nextLabel.length > 14 ? 160 : 150}
                height={36}
            />
        </div>
    </div>
);

const SectionTitle = ({ title }) => (
    <div style={{ fontSize: 16, fontWeight: 600, color: LABEL_COLOR, marginBottom: 18 }}>
        {title} :
    </div>
);

/* Dashed photo attach button */
const AttachButton = ({ onClick, label = 'Attach Photo', icon = 'image' }) => (
    <button
        type="button"
        onClick={onClick}
        style={{
            flex: '1 1 140px',
            maxWidth: '100%',
            padding: '7px 10px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 6,
            border: `1.5px dashed ${BLUE}`,
            background: `${BLUE}0A`,
            color: BLUE,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        }}
    >
        {icon === 'camera' ? <FiCamera size={14} /> : <FiImage size={14} />}
        {label}
    </button>
);

const IMAGE_ACCEPT = 'image/*,.heic,.heif,image/heic,image/heif';

/* Gallery + camera pickers (capture opens device camera on mobile) */
const PhotoAttachControls = ({
    galleryInputRef,
    cameraInputRef,
    onGalleryClick,
    onCameraClick,
    onGalleryChange,
    onCameraChange,
    galleryLabel = 'Attach Photo',
    cameraLabel = 'Take Photo',
    multiple = false,
}) => (
    <div className="flex flex-wrap gap-2" style={{ width: 320, maxWidth: '100%' }}>
        <input
            type="file"
            accept={IMAGE_ACCEPT}
            multiple={multiple}
            ref={galleryInputRef}
            style={{ display: 'none' }}
            onChange={onGalleryChange}
        />
        <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            style={{ display: 'none' }}
            onChange={onCameraChange}
        />
        <AttachButton icon="image" label={galleryLabel} onClick={onGalleryClick} />
        <AttachButton icon="camera" label={cameraLabel} onClick={onCameraClick} />
    </div>
);

/* Blue "+ Add" button using BottonCustom */
const AddButton = ({ onClick, label }) => (
    <BottonCustom
        title={`+ ${label}`}
        onClick={onClick}
        backgroundColor={`${BLUE}12`}
        color={BLUE}
        fontSize={12}
        fontWeight={600}
        height={32}
        width={160}
    />
);

/* ===== Inline signature pad ===== */
const SignaturePad = ({ sigRef, signed, onEnd, onClear, error, existingUrl }) => {
    const [reSigning, setReSigning] = useState(false);
    const showSaved = !!existingUrl && !reSigning;

    return (
        <div style={{ maxWidth: 320 }}>
            {showSaved ? (
                <img
                    src={existingUrl}
                    alt="Signature"
                    style={{
                        width: '100%',
                        maxWidth: 320,
                        height: 96,
                        objectFit: 'contain',
                        border: `1px solid ${error ? RED : '#D1D5DC'}`,
                        borderRadius: 8,
                        background: 'var(--dashboard-tab-box)',
                        display: 'block',
                    }}
                />
            ) : (
                <div
                    style={{
                        border: `1px solid ${error ? RED : '#D1D5DC'}`,
                        borderRadius: 8,
                        background: 'var(--dashboard-tab-box)',
                        overflow: 'hidden',
                    }}
                >
                    <SignatureCanvas
                        penColor="black"
                        ref={sigRef}
                        onEnd={onEnd}
                        canvasProps={{ width: 320, height: 96, style: { display: 'block', maxWidth: '100%' } }}
                    />
                </div>
            )}
            <div className="flex justify-between items-center" style={{ marginTop: 4 }}>
                {showSaved ? (
                    <button
                        type="button"
                        onClick={() => { sigRef.current?.clear(); setReSigning(true); }}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: BLUE, cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                        Re-sign
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onClear}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: '#98A2B3', cursor: 'pointer', padding: 0 }}
                    >
                        Clear
                    </button>
                )}
                {(signed || showSaved) && <span style={{ fontSize: 11, fontWeight: 600, color: GREEN }}>Signed</span>}
            </div>
        </div>
    );
};

/* Thumbnail that makes an unreachable image obvious instead of showing a blank box */
const PhotoThumb = ({ src, alt, size = 84, style, onClick, accessToken }) => {
    const [failed, setFailed] = useState(false);
    const [displaySrc, setDisplaySrc] = useState(src);
    const [converting, setConverting] = useState(false);
    const convertedUrlRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        const revokeConverted = () => {
            if (convertedUrlRef.current) {
                URL.revokeObjectURL(convertedUrlRef.current);
                convertedUrlRef.current = null;
            }
        };

        setFailed(false);
        revokeConverted();

        if (!src) {
            setDisplaySrc(src);
            setConverting(false);
            return undefined;
        }

        if (!isHeicLike(src) || browserSupportsHeicInImg()) {
            setDisplaySrc(src);
            setConverting(false);
            return undefined;
        }

        setDisplaySrc(null);
        setConverting(true);

        const run = async () => {
            try {
                const resolved = await resolveDisplayableImageSrc(src, accessToken);
                if (cancelled) {
                    if (resolved && resolved !== src && String(resolved).startsWith('blob:')) {
                        URL.revokeObjectURL(resolved);
                    }
                    return;
                }
                if (resolved && resolved !== src && String(resolved).startsWith('blob:')) {
                    convertedUrlRef.current = resolved;
                }
                setDisplaySrc(resolved);
            } catch {
                if (!cancelled) setFailed(true);
            } finally {
                if (!cancelled) setConverting(false);
            }
        };
        run();

        return () => { cancelled = true; };
    }, [src, accessToken]);

    useEffect(() => () => {
        if (convertedUrlRef.current) {
            URL.revokeObjectURL(convertedUrlRef.current);
            convertedUrlRef.current = null;
        }
    }, []);

    const base = {
        width: size,
        height: size,
        borderRadius: 6,
        border: '1px solid #D9DEE3',
        display: 'block',
        ...style,
    };

    if (!src || failed) {
        return (
            <div style={{ ...base, background: '#F9FAFB', color: '#98A2B3', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 4 }}>
                Image unavailable
            </div>
        );
    }

    if (converting || !displaySrc) {
        return (
            <div style={{ ...base, background: '#F9FAFB', color: '#98A2B3', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 4 }}>
                Loading…
            </div>
        );
    }

    return (
        <img
            src={displaySrc}
            alt={alt}
            onError={() => setFailed(true)}
            onClick={onClick}
            style={{ ...base, objectFit: 'cover', cursor: onClick ? 'zoom-in' : 'default' }}
        />
    );
};

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 25;

const fileNameFromSource = (src, fallback = 'image.png') => {
    if (!src || typeof src !== 'string') return fallback;
    if (src.startsWith('blob:') || src.startsWith('data:')) return fallback;
    try {
        const path = new URL(src, window.location.origin).pathname;
        const base = decodeURIComponent(path.split('/').pop() || '');
        if (base && /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(base)) return base;
    } catch (_) { /* ignore */ }
    return fallback;
};

const ImagePreviewModal = ({ open, onClose, slides = [], index = 0, onIndexChange, accessToken }) => {
    const [zoom, setZoom] = useState(100);
    const [downloading, setDownloading] = useState(false);
    const [displaySrc, setDisplaySrc] = useState(null);
    const [loadingSrc, setLoadingSrc] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);
    const displaySrcRef = useRef(null);
    const convertedUrlRef = useRef(null);
    const current = slides[index] || null;
    const src = current?.src;
    const alt = current?.alt;
    const fileName = current?.name;
    const hasMultiple = slides.length > 1;

    const goTo = (nextIndex) => {
        if (!hasMultiple || typeof onIndexChange !== 'function') return;
        const len = slides.length;
        onIndexChange(((nextIndex % len) + len) % len);
    };
    const goPrev = () => goTo(index - 1);
    const goNext = () => goTo(index + 1);

    useEffect(() => {
        if (open) setZoom(100);
    }, [open, src]);

    useEffect(() => {
        let cancelled = false;

        const revokeConverted = () => {
            if (convertedUrlRef.current) {
                URL.revokeObjectURL(convertedUrlRef.current);
                convertedUrlRef.current = null;
            }
        };

        setPreviewFailed(false);
        displaySrcRef.current = null;
        setDisplaySrc(null);
        revokeConverted();

        if (!open || !src) {
            setLoadingSrc(false);
            return undefined;
        }

        const needsConvert = isHeicLike(src) && !browserSupportsHeicInImg();
        if (!needsConvert) {
            displaySrcRef.current = src;
            setDisplaySrc(src);
            setLoadingSrc(false);
            return () => { cancelled = true; };
        }

        setLoadingSrc(true);

        const run = async () => {
            try {
                const resolved = await resolveDisplayableImageSrc(src, accessToken);
                if (cancelled) {
                    if (resolved && resolved !== src && String(resolved).startsWith('blob:')) {
                        URL.revokeObjectURL(resolved);
                    }
                    return;
                }
                if (resolved && resolved !== src && String(resolved).startsWith('blob:')) {
                    convertedUrlRef.current = resolved;
                }
                displaySrcRef.current = resolved;
                setDisplaySrc(resolved);
                setPreviewFailed(false);
            } catch {
                if (!cancelled) setPreviewFailed(true);
            } finally {
                if (!cancelled) setLoadingSrc(false);
            }
        };
        run();

        // Do not revoke in cleanup — React Strict Mode would kill the active blob URL.
        return () => { cancelled = true; };
    }, [open, src, accessToken]);

    useEffect(() => () => {
        if (convertedUrlRef.current) {
            URL.revokeObjectURL(convertedUrlRef.current);
            convertedUrlRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') goPrev();
            if (e.key === 'ArrowRight') goNext();
        };
        const prevOverflow = document.body.style.overflow;
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose, index, slides.length, hasMultiple]);

    if (!open || !src) return null;

    const displayName = fileName || fileNameFromSource(src, alt ? `${String(alt).replace(/\s+/g, '_')}.png` : 'image.png');
    const downloadName = /\.(heic|heif)$/i.test(displayName)
        ? displayName.replace(/\.(heic|heif)$/i, '.jpg')
        : displayName;
    const navButtonStyle = (disabled) => ({
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid #EAECF0',
        background: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(16, 24, 40, 0.12)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: '#344054',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    });

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const href = displaySrc || src;
            if (href.startsWith('blob:') || href.startsWith('data:')) {
                const link = document.createElement('a');
                link.href = href;
                link.download = downloadName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }
            await downloadFileFromUrl(src, displayName, accessToken);
        } catch (_) {
            window.open(src, '_blank', 'noopener,noreferrer');
        } finally {
            setDownloading(false);
        }
    };

    const handleImgError = (e) => {
        // Ignore stale errors from a previous src (e.g. HEIC before conversion).
        if (e?.currentTarget?.src && displaySrcRef.current && e.currentTarget.src !== displaySrcRef.current) {
            return;
        }
        setPreviewFailed(true);
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 4000,
                background: 'rgba(16, 24, 40, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 720,
                    maxHeight: '90vh',
                    background: '#FFFFFF',
                    borderRadius: 12,
                    boxShadow: '0 20px 40px rgba(16, 24, 40, 0.16)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <div className="flex items-start justify-between gap-3" style={{ padding: '16px 20px 14px', borderBottom: '1px solid #EAECF0' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#101828' }}>Image Preview</div>
                        <div style={{ fontSize: 13, color: '#667085', marginTop: 2 }}>
                            {displayName}
                            {hasMultiple ? `  ·  ${index + 1} of ${slides.length}` : ''}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close preview"
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 4,
                            cursor: 'pointer',
                            color: '#667085',
                            display: 'flex',
                            lineHeight: 0,
                        }}
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        background: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: hasMultiple ? '24px 56px' : 24,
                        minHeight: 280,
                        position: 'relative',
                    }}
                >
                    {hasMultiple && (
                        <button
                            type="button"
                            onClick={goPrev}
                            aria-label="Previous image"
                            style={{ ...navButtonStyle(false), left: 12 }}
                        >
                            <FiChevronLeft size={20} />
                        </button>
                    )}
                    {previewFailed ? (
                        <div style={{ color: '#98A2B3', fontSize: 14 }}>Image unavailable</div>
                    ) : loadingSrc || !displaySrc ? (
                        <div style={{ color: '#98A2B3', fontSize: 14 }}>Loading…</div>
                    ) : (
                        <img
                            src={displaySrc}
                            alt={alt || 'Preview'}
                            onError={handleImgError}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '52vh',
                                objectFit: 'contain',
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: 'center center',
                                transition: 'transform 0.15s ease',
                                display: 'block',
                                boxShadow: '0 1px 4px rgba(16, 24, 40, 0.08)',
                                background: '#FFFFFF',
                            }}
                        />
                    )}
                    {hasMultiple && (
                        <button
                            type="button"
                            onClick={goNext}
                            aria-label="Next image"
                            style={{ ...navButtonStyle(false), right: 12 }}
                        >
                            <FiChevronRight size={20} />
                        </button>
                    )}
                </div>

                <div
                    className="flex items-center justify-between gap-3 flex-wrap"
                    style={{ padding: '12px 20px', borderTop: '1px solid #EAECF0', background: '#FFFFFF' }}
                >
                    <div
                        className="inline-flex items-center"
                        style={{ border: '1px solid #D0D5DD', borderRadius: 8, overflow: 'hidden', background: '#FFFFFF' }}
                    >
                        <button
                            type="button"
                            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                            disabled={zoom <= ZOOM_MIN}
                            aria-label="Zoom out"
                            style={{
                                width: 36,
                                height: 34,
                                border: 'none',
                                background: 'none',
                                cursor: zoom <= ZOOM_MIN ? 'not-allowed' : 'pointer',
                                color: zoom <= ZOOM_MIN ? '#D0D5DD' : '#344054',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <FiMinus size={14} />
                        </button>
                        <div
                            style={{
                                minWidth: 52,
                                height: 34,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#344054',
                                borderLeft: '1px solid #EAECF0',
                                borderRight: '1px solid #EAECF0',
                            }}
                        >
                            {zoom}%
                        </div>
                        <button
                            type="button"
                            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                            disabled={zoom >= ZOOM_MAX}
                            aria-label="Zoom in"
                            style={{
                                width: 36,
                                height: 34,
                                border: 'none',
                                background: 'none',
                                cursor: zoom >= ZOOM_MAX ? 'not-allowed' : 'pointer',
                                color: zoom >= ZOOM_MAX ? '#D0D5DD' : '#344054',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <FiPlus size={14} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={downloading}
                            style={{
                                height: 36,
                                padding: '0 14px',
                                borderRadius: 8,
                                border: '1px solid #D0D5DD',
                                background: '#FFFFFF',
                                color: '#344054',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: downloading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <FiDownload size={14} />
                            {downloading ? 'Downloading...' : 'Download'}
                        </button>
                        <BottonCustom
                            title="Close"
                            onClick={onClose}
                            backgroundColor={BLUE}
                            color="#FFFFFF"
                            fontSize={13}
                            fontWeight={600}
                            width={88}
                            height={36}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ===== Summary helpers ===== */
const SummarySectionHeader = ({ title }) => (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: '#98A2B3', textTransform: 'uppercase', padding: '12px 0 6px', borderBottom: '1px solid #F2F4F7' }}>
        {title}
    </div>
);

const SummaryRow = ({ label, children, alignTop }) => (
    <div className={`flex justify-between gap-3 ${alignTop ? 'items-start' : 'items-center'}`} style={{ padding: '9px 0', borderBottom: '1px solid #F2F4F7' }}>
        <span style={{ fontSize: 12, color: '#98A2B3', flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sidebar-text-primary)', textAlign: 'right', maxWidth: '70%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{children || '-'}</span>
    </div>
);

const SummaryItemHeader = ({ title }) => (
    <div style={{ fontSize: 13, fontWeight: 700, color: LABEL_COLOR, padding: '12px 0 2px' }}>
        {title}
    </div>
);

const SummarySignature = ({ url, alt, onClick }) => (
    <img
        src={url}
        alt={alt}
        onClick={onClick}
        style={{
            width: 180,
            height: 60,
            objectFit: 'contain',
            border: '1px solid #EAECF0',
            borderRadius: 6,
            background: '#FFFFFF',
            display: 'block',
            marginLeft: 'auto',
            cursor: onClick ? 'zoom-in' : 'default',
        }}
    />
);

const Chip = ({ text, color, bg, icon }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color, background: bg, borderRadius: 5, padding: '3px 8px' }}>
        {icon}{text}
    </span>
);

/* ===== Data constants ===== */
const VISIT_TYPE_OPTIONS = [
    'POS Install', 'ATM Install', 'Staff Training', 'Troubleshooting',
    'Hardware Upgrade', 'Update Software', 'Collect Data', 'Monitoring',
    'Issue with POS', 'Issue with ATM', 'Others',
];

const TYPE_CHIP_COLORS = [
    { color: '#6938EF', bg: '#F4F1FE' }, { color: '#DD2590', bg: '#FDF2FA' },
    { color: '#0D6EFD', bg: '#EFF6FF' }, { color: '#079455', bg: '#ECFDF3' },
    { color: '#B54708', bg: '#FFFAEB' },
];

/* POST /files echoes the uploaded file back under a key tied to the `type` it was sent with. */
const SITE_VISIT_UPLOADS = {
    sitePhoto: { type: 'site-visit', responseKey: 'fileUrl' },
    hardwarePhoto: { type: 'site-visit-hardware-photo', responseKey: 'photo' },
    merchantSignature: { type: 'site-visit-merchant-signature', responseKey: 'merchantSignature' },
    technicianSignature: { type: 'site-visit-technician-signature', responseKey: 'technicianSignature' },
};

/* Upload responses use a few different shapes depending on the endpoint. */
const extractFileUrl = (source) => {
    if (!source) return '';
    if (typeof source === 'string') return source;
    const candidate = source.url
        || source.location
        || source.path
        || (typeof source.fileUrl === 'string' ? source.fileUrl : source.fileUrl?.url)
        || (typeof source.dLFileUrl === 'string' ? source.dLFileUrl : source.dLFileUrl?.url)
        || source.photo?.url
        || '';
    return typeof candidate === 'string' ? candidate : '';
};

const uniqueUploadName = (name) => {
    const safe = String(name || 'image.png');
    const dot = safe.lastIndexOf('.');
    const stem = dot > 0 ? safe.slice(0, dot) : safe;
    const ext = dot > 0 ? safe.slice(dot) : '.png';
    return `${stem}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
};

const emptyInventoryItem = () => ({ itemName: '', categoryId: '', loaded: false, tested: false, notes: '' });
const emptyDevice = () => ({ deviceType: '', model: '', serialNo: '', actionTaken: '', photo: null, photoPreview: '', notes: '' });

const isVisitDraft = (visit) => {
    if (!visit) return false;
    if (visit.submit === true) return false;
    if (visit.submit === false) return true;
    if (String(visit.status || '').toLowerCase() === 'draft') return true;
    const savedStep = Number(visit.currentStep);
    return Number.isFinite(savedStep) && savedStep > 0 && savedStep < 9;
};

/* ===== Main component ===== */
const TechInstallation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [customerLoading, setCustomerLoading] = useState(true);
    const [itemServicesLoading, setItemServicesLoading] = useState(true);
    const [techniciansLoading, setTechniciansLoading] = useState(true);
    const [itemCategoriesLoading, setItemCategoriesLoading] = useState(true);
    const [modelOptionsLoading, setModelOptionsLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [isDraft, setIsDraft] = useState(false);
    const [visitRef, setVisitRef] = useState('');
    const [errors, setErrors] = useState({});
    const [editVisitId, setEditVisitId] = useState(location.state?.rowData?.id || null);
    const [editStoreId, setEditStoreId] = useState(location.state?.rowData?.storeId || null);
    const [detailLoading, setDetailLoading] = useState(!!location.state?.rowData?.id);
    const [existingMerchantSigUrl, setExistingMerchantSigUrl] = useState(null);
    const [existingTechSigUrl, setExistingTechSigUrl] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSlides, setPreviewSlides] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);

    usePageTitle(editVisitId ? "Edit Tech Installation" : "Tech Installation", location);

    const [itemServicesList, setItemServicesList] = useState([]);
    const [customerList, setCustomerList] = useState([]);
    const [technicianList, setTechnicianList] = useState([]);
    const [itemCategories, setItemCategories] = useState([]);
    const [modelOptions, setModelOptions] = useState([]);
    const initialCustomersRef = useRef([]);
    const customerSearchTimerRef = useRef(null);
    const customerSearchRequestRef = useRef(0);

    /* Step 1 */
    const [storeName, setStoreName] = useState('');
    const [visitDate, setVisitDate] = useState(
        new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
    );
    const [priority, setPriority] = useState('routine');
    const [businessName, setBusinessName] = useState('');
    const [address, setAddress] = useState('');
    const [merchantContact, setMerchantContact] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    /* Step 2 */
    const [visitTypes, setVisitTypes] = useState([]);
    const [otherVisitType, setOtherVisitType] = useState('');
    const [visitPurpose, setVisitPurpose] = useState('');

    /* Step 3 */
    const [inventoryItems, setInventoryItems] = useState([emptyInventoryItem()]);

    /* Step 4 */
    const [technicianId, setTechnicianId] = useState('');
    const [technicianName, setTechnicianName] = useState('');
    const [technicianBadge, setTechnicianBadge] = useState('');
    const [timeIn, setTimeIn] = useState(null);   // dayjs object

    /* Step 5 */
    const [devices, setDevices] = useState([emptyDevice()]);
    const devicePhotoInputRefs = useRef([]);
    const deviceCameraInputRefs = useRef([]);

    /* Step 6 */
    const [workDescription, setWorkDescription] = useState('');

    /* Step 7 */
    const [issuesEncountered, setIssuesEncountered] = useState('');
    const [followUpRequired, setFollowUpRequired] = useState('');
    const [jobStatus, setJobStatus] = useState('');
    const [followUpNotes, setFollowUpNotes] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');

    /* Step 8 */
    const [sitePhotos, setSitePhotos] = useState([]);
    const sitePhotoInputRef = useRef(null);
    const siteCameraInputRef = useRef(null);

    /* Step 9 */
    const [timeOut, setTimeOut] = useState(null);  // dayjs object
    const [equipmentAccounted, setEquipmentAccounted] = useState('');
    const [merchantPrintedName, setMerchantPrintedName] = useState('');
    const merchantSigRef = useRef(null);
    const techSigRef = useRef(null);
    const [merchantSigned, setMerchantSigned] = useState(false);
    const [techSigned, setTechSigned] = useState(false);

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    /* ===== Data fetching (page stays interactive while lists load) ===== */
    const normalizeCustomerList = (result) => {
        const apiData = result?.data ?? result;
        const rows =
            apiData?.results
            || apiData?.data?.results
            || (Array.isArray(apiData?.data) ? apiData.data : null)
            || (Array.isArray(apiData) ? apiData : null)
            || [];
        return Array.isArray(rows) ? rows : [];
    };

    const fetchCustomersPage = (keyword = '') => {
        const term = String(keyword || '').trim();
        const params = new URLSearchParams({
            paginate: 'true',
            page: '1',
            limit: term ? '30' : '50',
            orderBy: 'createdAt',
            order: 'desc',
        });
        if (term.length >= 2) params.set('keyword', term);
        return getRequestWithOutBody(`${baseURl}customer?${params.toString()}`, accessToken)
            .then(normalizeCustomerList);
    };

    const handleCustomerSearch = (value) => {
        const term = String(value || '').trim();
        if (customerSearchTimerRef.current) clearTimeout(customerSearchTimerRef.current);

        if (term.length < 2) {
            customerSearchRequestRef.current += 1;
            setCustomerList(initialCustomersRef.current);
            return;
        }

        customerSearchTimerRef.current = setTimeout(() => {
            const requestId = ++customerSearchRequestRef.current;
            fetchCustomersPage(term)
                .then((list) => {
                    if (requestId !== customerSearchRequestRef.current) return;
                    setCustomerList(list);
                })
                .catch(() => {
                    if (requestId !== customerSearchRequestRef.current) return;
                    setCustomerList([]);
                });
        }, 300);
    };

    const fetchData2 = () => {
        setItemServicesLoading(true);
        setCustomerLoading(true);
        setTechniciansLoading(true);
        setItemCategoriesLoading(true);
        setModelOptionsLoading(true);

        getRequestWithOutBody(`${baseURl}item-services`, accessToken)
            .then((result) => setItemServicesList(result?.data))
            .catch(() => setItemServicesList([]))
            .finally(() => setItemServicesLoading(false));

        fetchCustomersPage()
            .then((list) => {
                initialCustomersRef.current = list;
                setCustomerList(list);
            })
            .catch(() => {
                initialCustomersRef.current = [];
                setCustomerList([]);
            })
            .finally(() => setCustomerLoading(false));

        getRequestWithOutBody(`${baseURl}user`, accessToken)
            .then((result) => {
                const activeUsers = result?.data?.results?.filter(
                    (user) => user?.status === 'active'
                ) || [];
                setTechnicianList(activeUsers);
            })
            .catch(() => setTechnicianList([]))
            .finally(() => setTechniciansLoading(false));

        getRequestWithOutBody(`${baseURl}item-category/`, accessToken)
            .then((result) => {
                const list = result?.data?.data || result?.data?.results || result?.data || [];
                const flat = Array.isArray(list) ? list : [];
                setItemCategories(
                    flat.map((category) => ({
                        id: category.id,
                        name: category.name || category.title || '',
                    }))
                );
            })
            .catch(() => setItemCategories([]))
            .finally(() => setItemCategoriesLoading(false));

        getRequestWithOutBody(`${baseURl}support-setup?type=model`, accessToken)
            .then((result) => {
                const options = (result?.data || []).map((item) => ({
                    id: item?.id,
                    name: item?.title,
                    title: item?.title,
                }));
                setModelOptions(options);
            })
            .catch(() => setModelOptions([]))
            .finally(() => setModelOptionsLoading(false));
    };

    useEffect(() => { fetchData2(); }, []);

    useEffect(() => () => {
        if (customerSearchTimerRef.current) clearTimeout(customerSearchTimerRef.current);
    }, []);

    const populateFromVisit = (visit) => {
        if (!visit) return;

        setEditVisitId(visit.id || null);
        setEditStoreId(visit.storeId || visit.store?.id || null);
        setVisitRef(visit.id ? String(visit.id) : '');

        setStoreName(visit.businessName || visit.store?.dbaName || visit.locationName || '');
        setVisitDate(
            visit.date
                ? dayjs(visit.date).format('MM/DD/YYYY')
                : new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        );
        const mappedPriority = toPriorityApi(visit.priority);
        setPriority(mappedPriority || 'routine');
        setBusinessName(visit.businessName || '');
        setAddress(visit.address || '');
        setMerchantContact(formatPhoneNumber(visit.merchantContactNumber || ''));
        setContactPhone(formatPhoneNumber(visit.contactPhone || ''));

        const apiVisitTypes = Array.isArray(visit.visitTypes) ? visit.visitTypes : [];
        const mappedTypes = apiVisitTypes.map((t) => fromVisitTypeApi(t)).filter(Boolean);
        const unknownCustom = apiVisitTypes.filter((t) => !fromVisitTypeApi(t));
        const hasOthers = mappedTypes.includes('Others') || !!visit.otherVisitTypeDescription || unknownCustom.length > 0;
        const nextTypes = mappedTypes.filter((t) => t !== 'Others');
        if (hasOthers) nextTypes.push('Others');
        setVisitTypes(nextTypes);
        setOtherVisitType(visit.otherVisitTypeDescription || unknownCustom[0] || '');
        setVisitPurpose(visit.purposeOfVisit || '');

        const inv = Array.isArray(visit.inventoryItems) ? visit.inventoryItems : [];
        setInventoryItems(
            inv.length
                ? inv.map((i) => ({
                    itemName: i.itemName || '',
                    categoryId: i.categoryId || '',
                    loaded: !!i.loaded,
                    tested: !!(i.testedWorking ?? i.tested),
                    notes: i.notes || '',
                }))
                : [emptyInventoryItem()]
        );

        setTechnicianId(visit.technicianId || visit.technician?.id || '');
        setTechnicianName(visit.technician?.name || visit.tech?.name || '');
        setTechnicianBadge(visit.technicianBadgeNo || '');
        setTimeIn(parseVisitTime(visit.timeIn));
        setTimeOut(parseVisitTime(visit.timeOut));

        const hw = Array.isArray(visit.hardwareItems) ? visit.hardwareItems : [];
        setDevices(
            hw.length
                ? hw.map((d) => ({
                    deviceType: d.deviceType || '',
                    model: d.model || '',
                    serialNo: d.serialNo || '',
                    actionTaken: fromKebabLabel(d.actionTaken, ACTION_TAKEN_OPTIONS),
                    photo: extractFileUrl(d.photo) || null,
                    photoPreview: extractFileUrl(d.photo),
                    notes: d.notes || '',
                }))
                : [emptyDevice()]
        );

        setWorkDescription(visit.workDescription || '');
        setIssuesEncountered(visit.issuesEncountered || '');
        setFollowUpRequired(
            typeof visit.followUpRequired === 'boolean'
                ? (visit.followUpRequired ? 'Yes' : 'No')
                : ''
        );
        setJobStatus(fromKebabLabel(visit.jobStatus, JOB_STATUS_LABELS));
        setFollowUpNotes(visit.followUpNotes || '');
        setFollowUpDate(
            visit.targetFollowUpDate
                ? dayjs(visit.targetFollowUpDate).format('MM/DD/YYYY')
                : ''
        );

        const photos = Array.isArray(visit.photos) ? visit.photos : [];
        setSitePhotos(
            photos
                .map((p) => {
                    const url = extractFileUrl(p);
                    if (!url) return null;
                    return { file: url, preview: url };
                })
                .filter(Boolean)
        );

        setEquipmentAccounted(
            typeof visit.equipmentAccountedFor === 'boolean'
                ? (visit.equipmentAccountedFor ? 'All Accounted For' : 'Something Missing')
                : ''
        );
        setMerchantPrintedName(visit.merchantNamePrinted || '');

        const merchantSigUrl = extractFileUrl(visit.merchantSignature) || null;
        const techSigUrl = extractFileUrl(visit.technicianSignature) || null;
        setExistingMerchantSigUrl(merchantSigUrl);
        setExistingTechSigUrl(techSigUrl);
        setMerchantSigned(!!merchantSigUrl);
        setTechSigned(!!techSigUrl);
    };

    useEffect(() => {
        const rowId = location.state?.rowData?.id;
        if (!rowId) return;

        setDetailLoading(true);
        getRequestWithOutBody(`${baseURl}site-visits/${rowId}`, accessToken)
            .then((result) => {
                const visit = result?.data || location.state?.rowData;
                populateFromVisit(visit);
                const draft = isVisitDraft(visit);
                setIsDraft(draft);
                if (draft) {
                    const savedStep = Number(visit?.currentStep) || 1;
                    setStep(Math.min(9, Math.max(1, savedStep)));
                    setSubmitted(false);
                } else {
                    setSubmitted(true);
                }
            })
            .catch(() => {
                if (location.state?.rowData) {
                    const visit = location.state.rowData;
                    populateFromVisit(visit);
                    const draft = isVisitDraft(visit);
                    setIsDraft(draft);
                    if (draft) {
                        const savedStep = Number(visit?.currentStep) || 1;
                        setStep(Math.min(9, Math.max(1, savedStep)));
                        setSubmitted(false);
                    } else {
                        setSubmitted(true);
                    }
                }
            })
            .finally(() => setDetailLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state?.rowData?.id, accessToken]);

    /* ===== Signature upload helpers (unchanged) ===== */
    const dataUrlToBlob = async (dataUrl) => {
        const res = await fetch(dataUrl);
        return await res.blob();
    };

    /* ===== Store selection (auto-fills address + business name) ===== */
    const handleStoreSelect = (selectedValue) => {
        const val = typeof selectedValue === 'string' ? selectedValue : selectedValue?.dbaName || '';
        setStoreName(val);
        clearError("storeName");
        const found = Array.isArray(customerList)
            ? customerList.find((c) => c?.dbaName === val)
            : null;
        if (found) {
            setEditStoreId(found?.id || null);
            setBusinessName(found?.dbaName || '');
            setAddress(found?.dbaAddress || '');
            setMerchantContact(formatPhoneNumber(found?.dbaPhoneNumber || ''));
            clearError("businessName");
            clearError("address");
        }
    };

    /* ===== Per-step validation ===== */
    const getStepErrors = (s) => {
        const e = {};
        if (s === 1) {
            if (!storeName) e.storeName = true;
            if (!visitDate) e.visitDate = true;
            if (!PRIORITY_API_VALUES.includes(priority)) e.priority = true;
            if (!businessName) e.businessName = true;
            if (!address) e.address = true;
        }
        if (s === 2) {
            if (!visitTypes.length) e.visitTypes = true;
            if (visitTypes.includes('Others') && !otherVisitType.trim()) e.otherVisitType = true;
            if (!visitPurpose.trim()) e.visitPurpose = true;
        }
        if (s === 4) {
            if (!technicianName) e.technicianName = true;
            if (!technicianBadge) e.technicianBadge = true;
            if (!timeIn) e.timeIn = true;
        }
        if (s === 5) {
            devices.forEach((d, idx) => {
                if (!d.deviceType) e[`deviceType_${idx}`] = true;
                if (!ACTION_TAKEN_OPTIONS.includes(d.actionTaken)) e[`actionTaken_${idx}`] = true;
            });
        }
        if (s === 6) {
            if (!workDescription.trim()) e.workDescription = true;
        }
        if (s === 7) {
            if (!issuesEncountered.trim()) e.issuesEncountered = true;
            if (!followUpRequired) e.followUpRequired = true;
            if (!JOB_STATUS_LABELS.includes(jobStatus)) e.jobStatus = true;
        }
        if (s === 9) {
            if (!timeOut) e.timeOut = true;
            if (!equipmentAccounted) e.equipmentAccounted = true;
            if (!merchantPrintedName.trim()) e.merchantPrintedName = true;
            const merchantOk = (merchantSigned && merchantSigRef.current && !merchantSigRef.current.isEmpty())
                || !!existingMerchantSigUrl;
            const techOk = (techSigned && techSigRef.current && !techSigRef.current.isEmpty())
                || !!existingTechSigUrl;
            if (!merchantOk) e.merchantSignature = true;
            if (!techOk) e.techSignature = true;
        }
        return e;
    };

    const validateStep = (s) => {
        const e = getStepErrors(s);
        if (Object.keys(e).length > 0) {
            setErrors(e);
            toast.error("Please fill all the required fields");
            return false;
        }
        setErrors({});
        return true;
    };

    const validateAllSteps = () => {
        for (let s = 1; s <= 9; s += 1) {
            const e = getStepErrors(s);
            if (Object.keys(e).length > 0) {
                setErrors(e);
                setStep(s);
                toast.error("Please fill all the required fields");
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return false;
            }
        }
        setErrors({});
        return true;
    };

    const handleNext = () => {
        if (!validateStep(step)) return;
        setStep((p) => Math.min(p + 1, 9));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setErrors({});
        setStep((p) => Math.max(p - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStepClick = (targetStep) => {
        if ((!editVisitId && !isDraft) || targetStep === step) return;
        setErrors({});
        setStep(targetStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleExitToSummary = () => {
        setSubmitted(true);
        setErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleGoBack = () => {
        if (editVisitId && !submitted && !isDraft) {
            handleExitToSummary();
            return;
        }
        navigate(-1);
    };
    const handleCancel = () => {
        if (editVisitId && !isDraft) {
            handleExitToSummary();
            return;
        }
        navigate(-1);
    };

    /* ===== Submit / draft to POST|PUT /site-visits ===== */
    const saveSiteVisit = async ({ asDraft = false } = {}) => {
        if (!asDraft && !validateAllSteps()) return false;

        const priorityApi = toPriorityApi(priority);
        if (!asDraft && !priorityApi) {
            setStep(1);
            setErrors({ priority: true });
            toast.error("Please select a valid priority");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return false;
        }
        // Keep UI state in sync with the exact enum we will send
        if (priority !== priorityApi) setPriority(priorityApi);
        const visitTypesApi = visitTypes.map(toVisitTypeApi).filter(Boolean);
        if (!visitTypesApi.length || visitTypesApi.length !== visitTypes.length) {
            setStep(2);
            setErrors({ visitTypes: true });
            toast.error("Please select a valid visit type");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!asDraft) {
            const year = dayjs(visitDate).year();
            if (year < 1900 || year > 2100) { toast.error("Please select a valid date."); return false; }
        }

        const merchantSigData = merchantSigRef.current && !merchantSigRef.current.isEmpty()
            ? merchantSigRef.current.toDataURL()
            : existingMerchantSigUrl;
        const techSigData = techSigRef.current && !techSigRef.current.isEmpty()
            ? techSigRef.current.toDataURL()
            : existingTechSigUrl;

        const selectedCustomer = Array.isArray(customerList)
            ? customerList.find((c) => c.dbaName === storeName)
            : null;
        const storeId = selectedCustomer?.id || editStoreId || null;
        if (!storeId) {
            toast.error(asDraft ? "Please select a store to save draft" : "Selected store is invalid");
            setStep(1);
            setErrors((prev) => ({ ...prev, storeName: true }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return false;
        }

        const uploadImageObject = async (source, uploadKind, fallbackName = 'image.png') => {
            if (!source) return null;
            if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
                return {
                    url: source,
                    mimetype: source.match(/\.jpg|\.jpeg$/i) ? 'image/jpeg' : (source.match(/\.png$/i) ? 'image/png' : 'image/png'),
                    originalname: source.split('/').pop() || fallbackName,
                };
            }
            let file = null;
            if (source instanceof File) {
                const needsHeicConvert = isHeicLike(source)
                    || ((!source.type || source.type === 'application/octet-stream') && await sniffHeicBlob(source));
                if (needsHeicConvert) {
                    try {
                        file = await convertHeicToJpegFile(source);
                    } catch {
                        file = source;
                    }
                } else {
                    file = source;
                }
            } else if (typeof source === 'string' && source.startsWith('data:')) {
                const blob = await dataUrlToBlob(source);
                file = new File([blob], fallbackName, { type: blob.type || 'image/png' });
            } else if (typeof source === 'string' && source.startsWith('blob:')) {
                const blob = await fetch(source).then((r) => r.blob());
                const needsHeicConvert = isHeicLike(blob) || isHeicLike(fallbackName) || await sniffHeicBlob(blob);
                if (needsHeicConvert) {
                    try {
                        file = await convertHeicToJpegFile(blob, fallbackName);
                    } catch {
                        file = new File([blob], fallbackName.replace(/\.(heic|heif)$/i, '.jpg'), {
                            type: blob.type || 'image/jpeg',
                        });
                    }
                } else {
                    file = new File([blob], fallbackName, { type: blob.type || 'image/png' });
                }
            }
            if (!file) return null;
            file = new File([file], uniqueUploadName(file.name || fallbackName), { type: file.type || 'image/png' });

            const { type, responseKey } = SITE_VISIT_UPLOADS[uploadKind];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            const result = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
            const uploaded = result?.data?.[responseKey] || {};
            const url = extractFileUrl(uploaded);
            if (!url) throw new Error(`Could not upload ${file.name}. Please try again.`);
            return {
                url,
                mimetype: uploaded.mimetype || file.type,
                originalname: uploaded.originalname || file.name,
            };
        };

        setLoading(true);
        try {
            const [hardwarePhotos, sitePhotoPayloads, merchantSignature, technicianSignature] = await Promise.all([
                Promise.all(devices.map((d, idx) => uploadImageObject(d.photo, 'hardwarePhoto', `device-${idx + 1}.png`))),
                Promise.all(sitePhotos.map((p, idx) => uploadImageObject(p.file, 'sitePhoto', p.file?.name || `site-${idx + 1}.png`))),
                uploadImageObject(merchantSigData, 'merchantSignature', 'merchant-sign.png'),
                uploadImageObject(techSigData, 'technicianSignature', 'tech-sign.png'),
            ]);

            const hardwareItems = devices.map((d, idx) => ({
                deviceType: d.deviceType || null,
                model: d.model || null,
                serialNo: d.serialNo || null,
                actionTaken: ACTION_TAKEN_OPTIONS.includes(d.actionTaken) ? toKebab(d.actionTaken) : null,
                photo: hardwarePhotos[idx] || null,
                notes: d.notes || null,
            }));

            const parsedDate = visitDate ? dayjs(visitDate) : null;
            const payload = {
                storeId,
                date: parsedDate?.isValid?.() ? parsedDate.format("YYYY-MM-DD") : null,
                businessName: businessName || null,
                address: address || null,
                merchantContactNumber: merchantContact || null,
                contactPhone: contactPhone || null,
                visitTypes: visitTypesApi,
                otherVisitTypeDescription: visitTypes.includes('Others') ? otherVisitType || null : null,
                purposeOfVisit: visitPurpose || null,
                inventoryItems: inventoryItems.map((i) => ({
                    itemName: i.itemName || null,
                    categoryId: i.categoryId || null,
                    loaded: !!i.loaded,
                    testedWorking: !!i.tested,
                    notes: i.notes || null,
                })),
                technicianId: technicianId || userData?.id || null,
                technicianBadgeNo: technicianBadge || null,
                timeIn: timeIn && typeof timeIn.format === 'function' ? timeIn.format("HH:mm") : null,
                timeOut: timeOut && typeof timeOut.format === 'function' ? timeOut.format("HH:mm") : null,
                hardwareItems,
                workDescription: workDescription || null,
                issuesEncountered: issuesEncountered || null,
                followUpNotes: followUpRequired === 'Yes' ? followUpNotes || null : null,
                targetFollowUpDate: (followUpRequired === 'Yes' && followUpDate) ? dayjs(followUpDate).format("YYYY-MM-DD") : null,
                photos: sitePhotoPayloads,
                merchantNamePrinted: merchantPrintedName || null,
                merchantSignature,
                technicianSignature,
                currentStep: asDraft ? step : 9,
                submit: !asDraft,
            };

            if (priorityApi) payload.priority = priorityApi;
            if (JOB_STATUS_LABELS.includes(jobStatus)) payload.jobStatus = toKebab(jobStatus);
            else if (!asDraft) payload.jobStatus = toKebab(jobStatus);

            if (followUpRequired === 'Yes' || followUpRequired === 'No') {
                payload.followUpRequired = followUpRequired === 'Yes';
            } else if (!asDraft) {
                payload.followUpRequired = false;
            }

            if (equipmentAccounted) {
                payload.equipmentAccountedFor = equipmentAccounted === 'All Accounted For';
            } else if (!asDraft) {
                payload.equipmentAccountedFor = false;
            }

            const result = editVisitId
                ? await putRequestWithBodyAndToken(`${baseURl}site-visits/${editVisitId}`, accessToken, payload)
                : await postRequestWithBodyAndToken(`${baseURl}site-visits`, accessToken, payload);

            const savedId = result?.data?.id || editVisitId;
            if (savedId) {
                setEditVisitId(savedId);
                setEditStoreId(storeId);
                setVisitRef(String(savedId));
            } else {
                setVisitRef(dayjs().format('MMDDHHmmss'));
            }
            if (merchantSignature?.url) setExistingMerchantSigUrl(merchantSignature.url);
            if (technicianSignature?.url) setExistingTechSigUrl(technicianSignature.url);
            setDevices((prev) => prev.map((d, idx) => ({
                ...d,
                photo: hardwarePhotos[idx]?.url || d.photo,
                photoPreview: hardwarePhotos[idx]?.url || d.photoPreview,
            })));
            setSitePhotos((prev) => prev.map((p, idx) => ({
                ...p,
                file: sitePhotoPayloads[idx]?.url || p.file,
                preview: sitePhotoPayloads[idx]?.url || p.preview,
            })));

            if (asDraft) {
                setIsDraft(true);
                setSubmitted(false);
                toast.success(result?.message || "Saved as draft");
            } else {
                setIsDraft(false);
                setSubmitted(true);
                toast.success(result?.message || (editVisitId ? "Updated successfully" : "Saved successfully"));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return true;
        } catch (error) {
            const apiErrors = (() => {
                const raw = error?.data || error?.response?.data || error?.message;
                if (raw && typeof raw === 'object') return raw.errors;
                if (typeof raw === 'string' && raw.trim().startsWith('{')) {
                    try { return JSON.parse(raw)?.errors; } catch (_) { return null; }
                }
                return null;
            })();
            if (apiErrors?.priority || apiErrors?.visitTypes || apiErrors?.['visitTypes[0]']) {
                const nextErrors = {};
                if (apiErrors?.priority) nextErrors.priority = true;
                if (apiErrors?.visitTypes || apiErrors?.['visitTypes[0]']) nextErrors.visitTypes = true;
                setErrors((prev) => ({ ...prev, ...nextErrors }));
                setStep(apiErrors?.priority ? 1 : 2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            toast.error(formatApiErrorMessage(error));
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleReviewAndSubmit = () => saveSiteVisit({ asDraft: false });
    const handleSaveDraft = () => saveSiteVisit({ asDraft: true });

    const isEditingSubmitted = Boolean(editVisitId && !isDraft);
    const wizardFooterProps = isEditingSubmitted
        ? {
            backLabel: 'Back to Summary',
            onBack: handleExitToSummary,
            nextLabel: 'Update',
            onNext: handleReviewAndSubmit,
        }
        : {
            backLabel: step === 1 ? 'Cancel' : 'Back',
            onBack: step === 1 ? handleCancel : handleBack,
            nextLabel: step === 9 ? 'Review & Submit' : 'Save & Continue',
            onNext: step === 9 ? handleReviewAndSubmit : handleNext,
            onDraft: handleSaveDraft,
        };

    /* ===== Inventory helpers ===== */
    const updateInventoryItem = (idx, patch) =>
        setInventoryItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
    const addInventoryItem = () => setInventoryItems((prev) => [...prev, emptyInventoryItem()]);
    const removeInventoryItem = (idx) => setInventoryItems((prev) => prev.filter((_, i) => i !== idx));

    /* ===== Device helpers ===== */
    const updateDevice = (idx, patch) =>
        setDevices((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
    const addDevice = () => setDevices((prev) => [...prev, emptyDevice()]);
    const removeDevice = (idx) => setDevices((prev) => prev.filter((_, i) => i !== idx));
    const handleDevicePhoto = async (idx, file) => {
        if (!file || !isImageFile(file)) return;
        try {
            const prepared = await prepareImageForPreview(file);
            if (!prepared) return;
            updateDevice(idx, { photo: prepared.file, photoPreview: prepared.previewUrl });
        } catch {
            toast.error('Could not read this photo. Try converting HEIC to JPG first.');
        }
    };

    /* ===== Photos helpers ===== */
    const handleSitePhotos = async (files) => {
        const list = Array.from(files || []).filter(isImageFile);
        if (!list.length) return;
        try {
            const prepared = await Promise.all(list.map((file) => prepareImageForPreview(file)));
            const next = prepared.filter(Boolean).map(({ file, previewUrl }) => ({ file, preview: previewUrl }));
            if (!next.length) return;
            setSitePhotos((prev) => [...prev, ...next]);
        } catch {
            toast.error('Could not read one or more photos. HEIC files may need conversion.');
        }
    };
    const removeSitePhoto = (idx) => setSitePhotos((prev) => prev.filter((_, i) => i !== idx));

    const openLightbox = (slides, index = 0) => {
        const valid = (slides || []).filter((s) => s?.src);
        if (!valid.length) return;
        setPreviewSlides(valid);
        setPreviewIndex(Math.min(Math.max(index, 0), valid.length - 1));
        setPreviewOpen(true);
    };

    const devicePhotoSlides = devices
        .map((d, idx) => (d.photoPreview ? {
            src: d.photoPreview,
            alt: d.deviceType ? `${d.deviceType} photo` : `Device ${idx + 1}`,
            name: `Device_${String(idx + 1).padStart(2, '0')}.png`,
        } : null))
        .filter(Boolean);
    const sitePhotoSlides = sitePhotos
        .filter((p) => p.preview)
        .map((p, idx) => ({
            src: p.preview,
            alt: `Site photo ${idx + 1}`,
            name: (p.file instanceof File && p.file.name) || `Site_photo_${String(idx + 1).padStart(2, '0')}.png`,
        }));
    const signatureSlides = [
        existingMerchantSigUrl && { src: existingMerchantSigUrl, alt: 'Merchant signature', name: 'merchant-signature.png' },
        existingTechSigUrl && { src: existingTechSigUrl, alt: 'Technician signature', name: 'technician-signature.png' },
    ].filter(Boolean);
    const allPhotoSlides = [...devicePhotoSlides, ...sitePhotoSlides, ...signatureSlides];

    /* ===== Derived values ===== */
    const storeMenuItems = Array.isArray(customerList)
        ? customerList.map((c) => ({ name: c?.dbaName })).filter((c) => c.name)
        : [];

    const selectedCategoryIds = inventoryItems
        .map((item) => item.categoryId)
        .filter(Boolean)
        .map(String);

    const filteredDeviceOptions = (() => {
        const list = Array.isArray(itemServicesList) ? itemServicesList : [];
        if (!selectedCategoryIds.length) return list;
        return list.filter((item) => {
            const itemCategoryId = String(
                item?.categoryId ?? item?.category?.id ?? ''
            );
            return selectedCategoryIds.includes(itemCategoryId);
        });
    })();

    const durationLabel = (() => {
        if (!timeIn || !timeOut) return '-';
        let end = timeOut;
        if (end.valueOf() < timeIn.valueOf()) end = end.add(1, 'day');
        const mins = end.diff(timeIn, 'minute');
        if (mins < 60) return `${mins} minutes`;
        const h = Math.floor(mins / 60), m = mins % 60;
        return m ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
    })();

    const priorityChip = priority === 'routine'
        ? { color: '#0D6EFD', bg: '#EFF6FF' }
        : { color: '#D92D20', bg: '#FEF3F2' };
    const priorityDisplay = priorityLabel(priority) || priority;

    const selectedVisitTypes = visitTypes.includes('Others') && otherVisitType
        ? [...visitTypes.filter((t) => t !== 'Others'), otherVisitType]
        : visitTypes;

    /* ===== Step 1: Store & Site Details ===== */
    const renderStoreAndSite = () => (
        <div>
            <SectionTitle title="Store & Site Details" />
            <FieldRow label="Select store" required>
                <DropdownMenu
                    menuItems={storeMenuItems}
                    businessType={true}
                    defaultText={customerLoading ? "loading..." : "--- select store ---"}
                    onSelect={handleStoreSelect}
                    selectedValue={storeName}
                    searchable={!customerLoading}
                    onSearchChange={handleCustomerSearch}
                    disabled={customerLoading}
                    wrapText={true}
                    error={!!errors.storeName}
                />
            </FieldRow>
            <FieldRow label="Date" required>
                <CustomDatePicker
                    value={visitDate}
                    onChange={(val) => { setVisitDate(val); clearError("visitDate"); }}
                    bussiness={true}
                    fieldError={!!errors.visitDate}
                />
            </FieldRow>
            <FieldRow label="Priority" required>
                <SegmentedGroup
                    options={PRIORITY_OPTIONS}
                    value={priority}
                    onChange={(val) => { setPriority(val); clearError("priority"); }}
                    error={!!errors.priority}
                />
            </FieldRow>
            <FieldRow label="Business Name" required>
                <LabeledInput
                    inputPlaceholder="e.g retail store"
                    inputValue={businessName}
                    onInputChange={(e) => { setBusinessName(e.target.value); clearError("businessName"); }}
                    bussiness={true}
                    error={!!errors.businessName}
                />
            </FieldRow>
            <FieldRow label="Address" required>
                <LabeledInput
                    inputPlaceholder="Street, State, City and ZIP"
                    inputValue={address}
                    onInputChange={(e) => { setAddress(e.target.value); clearError("address"); }}
                    bussiness={true}
                    error={!!errors.address}
                />
            </FieldRow>
            <FieldRow label="Merchant Contact Number">
                <LabeledInput
                    inputPlaceholder="(123) 456-7890"
                    inputValue={merchantContact}
                    onInputChange={(e) => setMerchantContact(formatPhoneNumber(e.target.value))}
                    bussiness={true}
                />
            </FieldRow>
            <FieldRow label="Contact phone">
                <LabeledInput
                    inputPlaceholder="(123) 456-7890"
                    inputValue={contactPhone}
                    onInputChange={(e) => setContactPhone(formatPhoneNumber(e.target.value))}
                    bussiness={true}
                />
            </FieldRow>
            <StepFooter {...wizardFooterProps} />
        </div>
    );

    /* ===== Step 2: Visit Type ===== */
    const renderVisitType = () => (
        <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: LABEL_COLOR, marginBottom: 6 }}>
                Visit Type <span style={{ color: RED }}>*</span> :
            </div>
            <div style={{ fontSize: 12, color: '#667085', marginBottom: errors.visitTypes ? 6 : 18 }}>
                Select at least one
            </div>
            {errors.visitTypes && (
                <div style={{ fontSize: 12, color: RED, marginBottom: 12 }}>
                    Please select at least one visit type
                </div>
            )}
            <div>
                {VISIT_TYPE_OPTIONS.map((type) => (
                    <CheckboxFieldRow
                        key={type}
                        label={type}
                        checked={visitTypes.includes(type)}
                        onChange={(checked) => {
                            setVisitTypes((prev) => {
                                if (checked) return [...prev, type];
                                if (type === 'Others') setOtherVisitType('');
                                return prev.filter((t) => t !== type);
                            });
                            clearError("visitTypes");
                        }}
                    />
                ))}
            </div>
            {visitTypes.includes('Others') && (
                <FieldRow label={'Describe "Other"'} required>
                    <LabeledInput
                        inputPlaceholder="Type of visit not listed above"
                        inputValue={otherVisitType}
                        onInputChange={(e) => { setOtherVisitType(e.target.value); clearError("otherVisitType"); }}
                        bussiness={true}
                        error={!!errors.otherVisitType}
                    />
                </FieldRow>
            )}
            <FieldRow label="Purpose / reason for visit" required alignTop>
                <StyledTextArea
                    value={visitPurpose}
                    onChange={(e) => { setVisitPurpose(e.target.value); clearError("visitPurpose"); }}
                    placeholder="what was reported or requested before you arrived"
                    error={!!errors.visitPurpose}
                />
            </FieldRow>
            <StepFooter {...wizardFooterProps} />
        </div>
    );

    /* ===== Step 3: Inventory Check ===== */
    const renderInventoryCheck = () => (
        <div>
            <SectionTitle title="Inventory Check" />
            {inventoryItems.map((item, idx) => (
                <div key={idx} style={{ borderBottom: idx < inventoryItems.length - 1 ? '1px solid #EAECF0' : 'none', paddingBottom: 18, marginBottom: 18 }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: LABEL_COLOR }}>
                            Item: {String(idx + 1).padStart(2, '0')}
                        </span>
                        {idx > 0 && (
                            <button
                                type="button"
                                onClick={() => removeInventoryItem(idx)}
                                style={{ background: '#FEF3F2', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#D92D20', display: 'flex' }}
                            >
                                <FiTrash2 size={14} />
                            </button>
                        )}
                    </div>
                    <FieldRow label="Item Name">
                        <div>
                            <DropdownMenu
                                menuItems={itemCategories}
                                idSet={true}
                                businessType={true}
                                defaultText={itemCategoriesLoading ? "loading..." : "--- select item ---"}
                                onSelect={(id) => {
                                    const category = itemCategories.find(
                                        (c) => String(c?.id) === String(id)
                                    );
                                    updateInventoryItem(idx, {
                                        categoryId: id,
                                        itemName: category?.name || '',
                                    });
                                }}
                                selectedValue={item.itemName}
                                searchable={!itemCategoriesLoading}
                                disabled={itemCategoriesLoading}
                                wrapText={true}
                            />
                            <div className="flex items-center gap-6" style={{ marginTop: 8 }}>
                                <InlineCheckbox
                                    label="Loaded"
                                    checked={item.loaded}
                                    onChange={(checked) => updateInventoryItem(idx, { loaded: checked })}
                                />
                                <InlineCheckbox
                                    label="Tested working"
                                    checked={item.tested}
                                    onChange={(checked) => updateInventoryItem(idx, { tested: checked })}
                                />
                            </div>
                        </div>
                    </FieldRow>
                    <FieldRow label="Notes" alignTop>
                        <div>
                            <StyledTextArea
                                value={item.notes}
                                onChange={(e) => updateInventoryItem(idx, { notes: e.target.value })}
                                placeholder="specifies what was done to this device"
                            />
                            <div className="flex justify-center" style={{ marginTop: 12 }}>
                                <AddButton onClick={addInventoryItem} label="Add Item To Check" />
                            </div>
                        </div>
                    </FieldRow>
                </div>
            ))}
            <StepFooter {...wizardFooterProps} />
        </div>
    );

    /* ===== Step 4: Arrival ===== */
    const renderArrival = () => (
        <div>
            <SectionTitle title="Arrival" />
            <FieldRow label="Technician Name" required>
                <DropdownMenu
                    menuItems={technicianList}
                    idSet={true}
                    businessType={true}
                    defaultText={techniciansLoading ? "loading..." : "--- select technician ---"}
                    onSelect={(id) => {
                        const technician = technicianList.find(
                            (user) => String(user?.id) === String(id)
                        );
                        setTechnicianId(id);
                        setTechnicianName(technician?.name || '');
                        clearError("technicianName");
                    }}
                    selectedValue={technicianName}
                    searchable={!techniciansLoading}
                    disabled={techniciansLoading}
                    wrapText={true}
                    error={!!errors.technicianName}
                />
            </FieldRow>
            <FieldRow label="Technician ID / Badge #" required>
                <LabeledInput
                    inputPlaceholder="e.g DP 104"
                    inputValue={technicianBadge}
                    onInputChange={(e) => { setTechnicianBadge(e.target.value); clearError("technicianBadge"); }}
                    bussiness={true}
                    error={!!errors.technicianBadge}
                />
            </FieldRow>
            <FieldRow label="Time In" required>
                <div className="flex items-center gap-2">
                    <CustomTimePicker
                        value={timeIn}
                        onChange={(val) => { setTimeIn(val); clearError("timeIn"); }}
                        techInstallation={true}
                        customWidth={true}
                        innerLabel="In"
                        fieldError={!!errors.timeIn}
                    />
                    <BottonCustom
                        title="Now"
                        onClick={() => { setTimeIn(dayjs()); clearError("timeIn"); }}
                        backgroundColor="#FFFFFF"
                        color="#344054"
                        fontSize={12}
                        fontWeight={500}
                        width={56}
                        height={36}
                        border="1px solid #D9DEE3"
                    />
                </div>
            </FieldRow>
            <StepFooter {...wizardFooterProps} />
        </div>
    );

    /* ===== Step 5: Hardware Worked On ===== */
    const renderHardwareWorkedOn = () => (
        <div>
            <SectionTitle title="Hardware Worked On" />
            {devices.map((device, idx) => (
                <div key={idx} style={{ borderBottom: idx < devices.length - 1 ? '1px solid #EAECF0' : 'none', paddingBottom: 18, marginBottom: 18 }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: LABEL_COLOR }}>
                            Device: {String(idx + 1).padStart(2, '0')}
                        </span>
                        {idx > 0 && (
                            <button
                                type="button"
                                onClick={() => removeDevice(idx)}
                                style={{ background: '#FEF3F2', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#D92D20', display: 'flex' }}
                            >
                                <FiTrash2 size={14} />
                            </button>
                        )}
                    </div>
                    <FieldRow label="Item Name" required>
                        <DropdownMenu
                            menuItems={filteredDeviceOptions}
                            businessType={true}
                            defaultText={itemServicesLoading ? "loading..." : "--- select device ---"}
                            onSelect={(val) => { updateDevice(idx, { deviceType: val }); clearError(`deviceType_${idx}`); }}
                            selectedValue={device.deviceType}
                            searchable={!itemServicesLoading}
                            disabled={itemServicesLoading}
                            wrapText={true}
                            error={!!errors[`deviceType_${idx}`]}
                        />
                    </FieldRow>
                    <FieldRow label="Model">
                        <DropdownMenu
                            menuItems={modelOptions}
                            businessType={true}
                            defaultText={modelOptionsLoading ? "loading..." : "--- select model ---"}
                            onSelect={(val) => updateDevice(idx, { model: val })}
                            selectedValue={device.model}
                            searchable={!modelOptionsLoading}
                            disabled={modelOptionsLoading}
                            wrapText={true}
                        />
                    </FieldRow>
                    <FieldRow label="Serial No">
                        <LabeledInput
                            inputPlaceholder="e.g #1234"
                            inputValue={device.serialNo}
                            onInputChange={(e) => updateDevice(idx, { serialNo: e.target.value })}
                            bussiness={true}
                        />
                    </FieldRow>
                    <FieldRow label="Action Taken" required alignTop>
                        <PillGroup
                            options={['Installed', 'Replaced', 'Repaired', 'Configured', 'Tested', 'Removed']}
                            value={device.actionTaken}
                            onChange={(val) => { updateDevice(idx, { actionTaken: val }); clearError(`actionTaken_${idx}`); }}
                            error={!!errors[`actionTaken_${idx}`]}
                        />
                    </FieldRow>
                    <FieldRow label="Photo of Device" alignTop>
                        <div>
                            <PhotoAttachControls
                                galleryInputRef={(el) => { devicePhotoInputRefs.current[idx] = el; }}
                                cameraInputRef={(el) => { deviceCameraInputRefs.current[idx] = el; }}
                                onGalleryClick={() => devicePhotoInputRefs.current[idx]?.click()}
                                onCameraClick={() => deviceCameraInputRefs.current[idx]?.click()}
                                onGalleryChange={(e) => {
                                    handleDevicePhoto(idx, e.target.files?.[0]);
                                    e.target.value = '';
                                }}
                                onCameraChange={(e) => {
                                    handleDevicePhoto(idx, e.target.files?.[0]);
                                    e.target.value = '';
                                }}
                                galleryLabel="Attach Photo"
                                cameraLabel="Take Photo"
                            />
                            {device.photoPreview && (
                                <PhotoThumb
                                    src={device.photoPreview}
                                    alt={`Device ${idx + 1}`}
                                    size={64}
                                    style={{ marginTop: 8 }}
                                    accessToken={accessToken}
                                    onClick={() => {
                                        const slides = devices
                                            .map((d, i) => (d.photoPreview ? {
                                                src: d.photoPreview,
                                                alt: `Device ${i + 1}`,
                                                name: `Device_${String(i + 1).padStart(2, '0')}.png`,
                                            } : null))
                                            .filter(Boolean);
                                        const start = devices
                                            .slice(0, idx)
                                            .filter((d) => d.photoPreview).length;
                                        openLightbox(slides, start);
                                    }}
                                />
                            )}
                        </div>
                    </FieldRow>
                    <FieldRow label="Notes" alignTop>
                        <div>
                            <StyledTextArea
                                value={device.notes}
                                onChange={(e) => updateDevice(idx, { notes: e.target.value })}
                                placeholder="specifies what was done to this device"
                            />
                            <div className="flex justify-center" style={{ marginTop: 12 }}>
                                <AddButton onClick={addDevice} label="Add Another Hardware" />
                            </div>
                        </div>
                    </FieldRow>
                </div>
            ))}
            <StepFooter {...wizardFooterProps} />
        </div>
    );

    /* ===== Step 6: Work Performed ===== */
    const renderWorkPerformed = () => (
        <div>
            <SectionTitle title="Work Performed" />
            <FieldRow label="Describe Your Work" required alignTop>
                <StyledTextArea
                    value={workDescription}
                    onChange={(e) => { setWorkDescription(e.target.value); clearError("workDescription"); }}
                    placeholder="Describe your work performance step by step..."
                    rows={4}
                    error={!!errors.workDescription}
                />
            </FieldRow>
            <StepFooter {...wizardFooterProps} />
        </div>
    );

    /* ===== Step 7: Issues & Follow Up ===== */
    const renderIssuesFollowUp = () => (
        <div>
            <SectionTitle title="Issues & Follow Up" />
            <FieldRow label="Issues Encountered" required alignTop>
                <StyledTextArea
                    value={issuesEncountered}
                    onChange={(e) => { setIssuesEncountered(e.target.value); clearError("issuesEncountered"); }}
                    placeholder="Describe your work performance step by step..."
                    error={!!errors.issuesEncountered}
                />
            </FieldRow>
            <FieldRow label="Follow-Up Required?" required>
                <SegmentedGroup
                    options={['Yes', 'No']}
                    value={followUpRequired}
                    onChange={(val) => { setFollowUpRequired(val); clearError("followUpRequired"); }}
                    error={!!errors.followUpRequired}
                />
            </FieldRow>
            <FieldRow label="Job status" required alignTop>
                <JobStatusGroup
                    value={jobStatus}
                    onChange={(val) => { setJobStatus(val); clearError("jobStatus"); }}
                    error={!!errors.jobStatus}
                />
            </FieldRow>
            {followUpRequired === 'Yes' && (
                <>
                    <FieldRow label="Follow-Up Notes" alignTop>
                        <StyledTextArea
                            value={followUpNotes}
                            onChange={(e) => setFollowUpNotes(e.target.value)}
                            placeholder="what still need to happen....."
                        />
                    </FieldRow>
                    <FieldRow label="Target Follow-Up Date">
                        <CustomDatePicker
                            value={followUpDate}
                            onChange={(val) => setFollowUpDate(val)}
                            bussiness={true}
                        />
                    </FieldRow>
                </>
            )}
            <StepFooter {...wizardFooterProps} />
        </div>
    );

    /* ===== Step 8: Photos ===== */
    const renderPhotos = () => (
        <div>
            <SectionTitle title="Photos" />
            <FieldRow label="Site Photos" alignTop>
                <div>
                    <PhotoAttachControls
                        galleryInputRef={sitePhotoInputRef}
                        cameraInputRef={siteCameraInputRef}
                        onGalleryClick={() => sitePhotoInputRef.current?.click()}
                        onCameraClick={() => siteCameraInputRef.current?.click()}
                        onGalleryChange={(e) => {
                            handleSitePhotos(e.target.files);
                            e.target.value = '';
                        }}
                        onCameraChange={(e) => {
                            handleSitePhotos(e.target.files);
                            e.target.value = '';
                        }}
                        galleryLabel="Attach Photos"
                        cameraLabel="Take Photo"
                        multiple
                    />
                    {sitePhotos.length > 0 && (
                        <div className="flex flex-wrap gap-3" style={{ marginTop: 12 }}>
                            {sitePhotos.map((photo, idx) => (
                                <div key={photo.preview || idx} style={{ position: 'relative' }}>
                                    <PhotoThumb
                                        src={photo.preview}
                                        alt={`Site ${idx + 1}`}
                                        accessToken={accessToken}
                                        onClick={() => openLightbox(
                                            sitePhotos
                                                .filter((p) => p.preview)
                                                .map((p, i) => ({
                                                    src: p.preview,
                                                    alt: `Site photo ${i + 1}`,
                                                    name: (p.file instanceof File && p.file.name) || `Site_photo_${String(i + 1).padStart(2, '0')}.png`,
                                                })),
                                            idx
                                        )}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeSitePhoto(idx)}
                                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#D92D20', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </FieldRow>
            <StepFooter {...wizardFooterProps} />
        </div>
    );

    /* ===== Step 9: Sign Off ===== */
    const renderSignOff = () => (
        <div>
            <SectionTitle title="Sign Off" />
            <FieldRow label="Time Out" required>
                <div className="flex items-center gap-2">
                    <CustomTimePicker
                        value={timeOut}
                        onChange={(val) => { setTimeOut(val); clearError("timeOut"); }}
                        techInstallation={true}
                        customWidth={true}
                        innerLabel="Out"
                        fieldError={!!errors.timeOut}
                    />
                    <BottonCustom
                        title="Now"
                        onClick={() => { setTimeOut(dayjs()); clearError("timeOut"); }}
                        backgroundColor="#FFFFFF"
                        color="#344054"
                        fontSize={12}
                        fontWeight={500}
                        width={56}
                        height={36}
                        border="1px solid #D9DEE3"
                    />
                </div>
            </FieldRow>
            <FieldRow label="Equipment Accounted For?" required>
                <SegmentedGroup
                    options={['All Accounted For', 'Something Missing']}
                    value={equipmentAccounted}
                    onChange={(val) => { setEquipmentAccounted(val); clearError("equipmentAccounted"); }}
                    error={!!errors.equipmentAccounted}
                />
            </FieldRow>
            <FieldRow label="Merchant name (printed)" required>
                <LabeledInput
                    inputPlaceholder="Name of person signing"
                    inputValue={merchantPrintedName}
                    onInputChange={(e) => { setMerchantPrintedName(e.target.value); clearError("merchantPrintedName"); }}
                    bussiness={true}
                    error={!!errors.merchantPrintedName}
                />
            </FieldRow>
            <FieldRow label="Merchant signature" required alignTop>
                <SignaturePad
                    sigRef={merchantSigRef}
                    signed={merchantSigned}
                    existingUrl={existingMerchantSigUrl}
                    onEnd={() => { setMerchantSigned(true); clearError("merchantSignature"); }}
                    onClear={() => {
                        merchantSigRef.current?.clear();
                        setMerchantSigned(false);
                        setExistingMerchantSigUrl(null);
                    }}
                    error={!!errors.merchantSignature}
                />
            </FieldRow>
            <FieldRow label="Technician signature" required alignTop>
                <SignaturePad
                    sigRef={techSigRef}
                    signed={techSigned}
                    existingUrl={existingTechSigUrl}
                    onEnd={() => { setTechSigned(true); clearError("techSignature"); }}
                    onClear={() => {
                        techSigRef.current?.clear();
                        setTechSigned(false);
                        setExistingTechSigUrl(null);
                    }}
                    error={!!errors.techSignature}
                />
            </FieldRow>
            <StepFooter {...wizardFooterProps} />
        </div>
    );

    /* ===== Post-submit / edit Site Visit Log summary ===== */
    const handleEditFromSummary = () => {
        setSubmitted(false);
        setStep(1);
        setErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderSummary = () => (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
            {editVisitId && (
                <div className="flex justify-end" style={{ marginBottom: 12 }}>
                    <BottonCustom
                        title="Edit"
                        onClick={handleEditFromSummary}
                        backgroundColor={BLUE}
                        color="#FFFFFF"
                        fontSize={13}
                        fontWeight={500}
                        width={100}
                        height={36}
                    />
                </div>
            )}
            <div style={{ background: 'var(--dashboard-card-bg)', borderRadius: 10, border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(16,24,40,0.06)', padding: '18px 22px' }}>
                <div className="flex justify-between items-start gap-3 flex-wrap" style={{ paddingBottom: 12, borderBottom: '1px solid #F2F4F7' }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: '#98A2B3', textTransform: 'uppercase' }}>
                            {storeName ? `${storeName.toUpperCase()} - ` : ''}#SV-{visitRef}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: LABEL_COLOR, marginTop: 2 }}>Site Visit Log</div>
                    </div>
                    <div className="flex gap-2">
                        {priorityDisplay && <Chip text={priorityDisplay} color={priorityChip.color} bg={priorityChip.bg} icon={<span style={{ fontSize: 9 }}>⏱</span>} />}
                        {jobStatus && <Chip text={jobStatus} color={GREEN} bg="#ECFDF3" icon={<span style={{ fontSize: 9 }}>✓</span>} />}
                    </div>
                </div>
                <SummarySectionHeader title="Store & Site Details" />
                <SummaryRow label="Store">{storeName}</SummaryRow>
                <SummaryRow label="Date">{visitDate ? dayjs(visitDate).format('MMM D, YYYY') : '-'}</SummaryRow>
                <SummaryRow label="Priority">{priority ? <Chip text={priority} color={priorityChip.color} bg={priorityChip.bg} /> : '-'}</SummaryRow>
                <SummaryRow label="Business Name">{businessName}</SummaryRow>
                <SummaryRow label="Address" alignTop>{address}</SummaryRow>
                <SummaryRow label="Merchant Contact Number">{merchantContact}</SummaryRow>
                <SummaryRow label="Contact phone">{contactPhone}</SummaryRow>

                <SummarySectionHeader title="Visit Type" />
                <SummaryRow label="Type">
                    {selectedVisitTypes.length ? (
                        <span className="flex gap-1.5 flex-wrap justify-end">
                            {selectedVisitTypes.map((type, idx) => {
                                const c = TYPE_CHIP_COLORS[idx % TYPE_CHIP_COLORS.length];
                                return <Chip key={type} text={type} color={c.color} bg={c.bg} />;
                            })}
                        </span>
                    ) : '-'}
                </SummaryRow>
                {visitTypes.includes('Others') && (
                    <SummaryRow label={'Describe "Other"'}>{otherVisitType}</SummaryRow>
                )}
                <SummaryRow label="Purpose / reason for visit" alignTop>{visitPurpose}</SummaryRow>

                <SummarySectionHeader title="Inventory Check" />
                {inventoryItems.some((i) => i.itemName || i.notes || i.loaded || i.tested) ? (
                    inventoryItems.map((item, idx) => (
                        (item.itemName || item.notes || item.loaded || item.tested) ? (
                            <div key={`inv-${idx}`}>
                                <SummaryItemHeader title={`Item ${String(idx + 1).padStart(2, '0')}`} />
                                <SummaryRow label="Item Name">{item.itemName}</SummaryRow>
                                <SummaryRow label="Loaded">
                                    {item.loaded
                                        ? <span style={{ color: GREEN }}>✓ Yes</span>
                                        : <span style={{ color: '#98A2B3' }}>No</span>}
                                </SummaryRow>
                                <SummaryRow label="Tested working">
                                    {item.tested
                                        ? <span style={{ color: GREEN }}>✓ Yes</span>
                                        : <span style={{ color: '#98A2B3' }}>No</span>}
                                </SummaryRow>
                                <SummaryRow label="Notes" alignTop>{item.notes}</SummaryRow>
                            </div>
                        ) : null
                    ))
                ) : (
                    <SummaryRow label="Items">-</SummaryRow>
                )}

                <SummarySectionHeader title="Arrival" />
                <SummaryRow label="Technician Name">{technicianName}</SummaryRow>
                <SummaryRow label="Technician ID / Badge #">{technicianBadge}</SummaryRow>
                <SummaryRow label="Time In">{timeIn?.format ? timeIn.format('hh:mm A') : '-'}</SummaryRow>

                <SummarySectionHeader title="Hardware Worked On" />
                {devices.some((d) => d.deviceType || d.model || d.serialNo || d.actionTaken || d.photoPreview || d.notes) ? (
                    devices.map((device, idx) => (
                        (device.deviceType || device.model || device.serialNo || device.actionTaken || device.photoPreview || device.notes) ? (
                            <div key={`hw-${idx}`}>
                                <SummaryItemHeader title={`Device ${String(idx + 1).padStart(2, '0')}`} />
                                <SummaryRow label="Item Name">{device.deviceType}</SummaryRow>
                                <SummaryRow label="Model">{device.model}</SummaryRow>
                                <SummaryRow label="Serial No">{device.serialNo}</SummaryRow>
                                <SummaryRow label="Action Taken">
                                    {device.actionTaken
                                        ? <Chip text={device.actionTaken} color={BLUE} bg="#EFF6FF" />
                                        : '-'}
                                </SummaryRow>
                                <SummaryRow label="Photo of Device">
                                    {device.photoPreview ? (
                                        <PhotoThumb
                                            src={device.photoPreview}
                                            alt={device.deviceType ? `${device.deviceType} photo` : `Device ${idx + 1}`}
                                            size={72}
                                            accessToken={accessToken}
                                            onClick={() => {
                                                const start = allPhotoSlides.findIndex((s) => s.src === device.photoPreview);
                                                openLightbox(allPhotoSlides, start >= 0 ? start : 0);
                                            }}
                                        />
                                    ) : '-'}
                                </SummaryRow>
                                <SummaryRow label="Notes" alignTop>{device.notes}</SummaryRow>
                            </div>
                        ) : null
                    ))
                ) : (
                    <SummaryRow label="Devices">-</SummaryRow>
                )}

                <SummarySectionHeader title="Work Performed" />
                <SummaryRow label="Describe Your Work" alignTop>{workDescription}</SummaryRow>

                <SummarySectionHeader title="Issues & Follow Up" />
                <SummaryRow label="Issues Encountered" alignTop>{issuesEncountered}</SummaryRow>
                <SummaryRow label="Follow-Up Required?">{followUpRequired}</SummaryRow>
                {followUpRequired === 'Yes' && (
                    <>
                        <SummaryRow label="Follow-Up Notes" alignTop>{followUpNotes}</SummaryRow>
                        <SummaryRow label="Target Follow-Up Date">
                            {followUpDate ? dayjs(followUpDate).format('MMM D, YYYY') : '-'}
                        </SummaryRow>
                    </>
                )}
                <SummaryRow label="Job status">
                    {jobStatus ? <Chip text={jobStatus} color={GREEN} bg="#ECFDF3" icon={<span style={{ fontSize: 9 }}>•</span>} /> : '-'}
                </SummaryRow>

                <SummarySectionHeader title="Photos" />
                <SummaryRow label="Site Photos">
                    {sitePhotos.some((p) => p.preview) ? (
                        <div className="flex flex-wrap gap-2 justify-end">
                            {sitePhotos.map((photo, idx) => (
                                photo.preview ? (
                                    <PhotoThumb
                                        key={photo.preview || idx}
                                        src={photo.preview}
                                        alt={`Site photo ${idx + 1}`}
                                        size={72}
                                        accessToken={accessToken}
                                        onClick={() => {
                                            const start = sitePhotoSlides.findIndex((s) => s.src === photo.preview);
                                            openLightbox(sitePhotoSlides, start >= 0 ? start : 0);
                                        }}
                                    />
                                ) : null
                            ))}
                        </div>
                    ) : '-'}
                </SummaryRow>

                <SummarySectionHeader title="Sign Off" />
                <SummaryRow label="Time Out">{timeOut?.format ? timeOut.format('hh:mm A') : '-'}</SummaryRow>
                <SummaryRow label="Duration"><span style={{ color: BLUE }}>{durationLabel}</span></SummaryRow>
                <SummaryRow label="Equipment Accounted For?">
                    {equipmentAccounted === 'All Accounted For'
                        ? <span style={{ color: GREEN }}>✓ All Accounted For</span>
                        : equipmentAccounted === 'Something Missing'
                            ? <span style={{ color: '#D92D20' }}>✕ Something Missing</span>
                            : '-'}
                </SummaryRow>
                <SummaryRow label="Merchant name (printed)">{merchantPrintedName}</SummaryRow>
                <SummaryRow label="Merchant signature">
                    {existingMerchantSigUrl ? (
                        <SummarySignature
                            url={existingMerchantSigUrl}
                            alt="Merchant signature"
                            onClick={() => {
                                const start = allPhotoSlides.findIndex((s) => s.src === existingMerchantSigUrl);
                                openLightbox(allPhotoSlides, start >= 0 ? start : 0);
                            }}
                        />
                    ) : '-'}
                </SummaryRow>
                <SummaryRow label="Technician signature">
                    {existingTechSigUrl ? (
                        <SummarySignature
                            url={existingTechSigUrl}
                            alt="Technician signature"
                            onClick={() => {
                                const start = allPhotoSlides.findIndex((s) => s.src === existingTechSigUrl);
                                openLightbox(allPhotoSlides, start >= 0 ? start : 0);
                            }}
                        />
                    ) : '-'}
                </SummaryRow>
            </div>
        </div>
    );

    const renderStep = () => {
        switch (step) {
            case 1: return renderStoreAndSite();
            case 2: return renderVisitType();
            case 3: return renderInventoryCheck();
            case 4: return renderArrival();
            case 5: return renderHardwareWorkedOn();
            case 6: return renderWorkPerformed();
            case 7: return renderIssuesFollowUp();
            case 8: return renderPhotos();
            case 9: return renderSignOff();
            default: return null;
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <div className="flex items-center gap-2" onClick={handleGoBack}>
                    <IoIosArrowBack size={20} color="var(--sidebar-text-primary)" />
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={editVisitId && !isDraft ? 'Edit Tech Installation' : 'Tech Installation'}
                        Fontsize={24}
                    />
                    {isDraft && !submitted && (
                        <Chip text="Draft" color="#B54708" bg="#FFFAEB" />
                    )}
                </div>
            </HeaderWrapper>
            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 5, paddingTop: 15, borderRadius: 14 }} className="sm:m-8 p-3 pt-4 sm:p-6 m-2">
                    {detailLoading || (loading && !submitted) ? (
                        <div className="text-center w-full mx-auto my-20">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : submitted ? (
                        renderSummary()
                    ) : (
                        <>
                            <WizardStepper
                                current={step}
                                onStepClick={editVisitId || isDraft ? handleStepClick : undefined}
                            />
                            <div>
                                {renderStep()}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <ImagePreviewModal
                open={previewOpen}
                onClose={() => { setPreviewOpen(false); setPreviewSlides([]); setPreviewIndex(0); }}
                slides={previewSlides}
                index={previewIndex}
                onIndexChange={setPreviewIndex}
                accessToken={accessToken}
            />
        </div>
    );
};

export default TechInstallation;
