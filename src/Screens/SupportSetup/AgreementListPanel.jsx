import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Heading from '../../Components/Heading';
import BottonWithIcon from '../../Components/ButtonWithIcon';
import Loader from '../../Components/Loader';
import NoDataFound from '../../Components/NoDataFound';
import DeleteConfirmationModal from '../../Components/DeleteModal';
import DropdownMenu from '../../Components/dropdownMenu';
import SignaturePlacementPicker from '../MerchantChangeRequest/SignaturePlacementPicker';
import SignedDocumentPreview from '../MerchantChangeRequest/SignedDocumentPreview';
import {
    normalizeSignaturePlacements,
    serializeSignaturePlacements,
} from '../MerchantChangeRequest/utils';
import addIcon from '../../assets/addIcon.png';
import {
    deleteRequest,
    deleteRequestWithBody,
    getRequestWithOutBody,
    postRequestWithFormData,
    buildAuthHeaders,
} from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';

const PAGE_LIMIT = 20;

const extractPagedRows = (result) => {
    const rows =
        result?.data?.data ||
        result?.data?.results ||
        (Array.isArray(result?.data) ? result.data : []) ||
        (Array.isArray(result) ? result : []);
    const list = Array.isArray(rows) ? rows : [];
    const total =
        result?.totalRecords ||
        result?.data?.totalRecords ||
        result?.data?.total ||
        result?.total ||
        list.length;
    return { rows: list, total };
};

const AGREEMENT_TEMPLATE_KEYS = [
    'owner-operator',
    'placement',
    'sofp',
    'mpa-clover',
    'mpa-tsys',
    'ach-authorization',
];

const normalizeTemplateKey = (value) => String(value || '').trim();

const getTemplateKeyOptions = (currentKey = '') => {
    const selected = normalizeTemplateKey(currentKey);
    if (selected && !AGREEMENT_TEMPLATE_KEYS.includes(selected)) {
        return [selected, ...AGREEMENT_TEMPLATE_KEYS];
    }
    return AGREEMENT_TEMPLATE_KEYS;
};

const normalizeFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (Array.isArray(fileUrl)) return fileUrl[0] || null;
    return fileUrl;
};

const getFileHref = (fileUrl) => {
    const file = normalizeFileUrl(fileUrl);
    if (!file) return '';
    if (typeof file === 'string') return file;
    return file.url || '';
};

const getFileName = (fileUrl) => {
    const file = normalizeFileUrl(fileUrl);
    if (!file) return '';
    if (typeof file === 'string') return file.split('/').pop() || file;
    return file.originalname || file.name || getFileHref(file).split('/').pop() || '';
};

const isPdfSource = (file, fileUrl) => {
    if (file) {
        return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    }
    const href = getFileHref(fileUrl);
    const name = getFileName(fileUrl);
    const mime = typeof fileUrl === 'object' ? fileUrl?.mimetype || fileUrl?.mimeType : '';
    return mime === 'application/pdf' || /\.pdf$/i.test(name) || /\.pdf($|\?)/i.test(href);
};

const getErrorMessage = (error, fallback) => {
    const raw = error?.message || '';
    try {
        const parsed = JSON.parse(raw);
        return parsed?.message || parsed?.error || fallback;
    } catch {
        return raw || fallback;
    }
};

const getDeletePayload = (resultOrError) => {
    if (resultOrError?.requiresConfirmation) return resultOrError;
    if (resultOrError?.response?.data) return resultOrError.response.data;
    if (resultOrError?.data?.requiresConfirmation) return resultOrError.data;
    return resultOrError || {};
};

const getInUseWarningMessage = (payload) => {
    const usage = payload?.data?.usage || payload?.usage;
    const parts = [];
    if (usage?.applicationDocuments) {
        parts.push(
            `${usage.applicationDocuments} application document${usage.applicationDocuments === 1 ? '' : 's'}`
        );
    }
    if (usage?.agreementRules) {
        parts.push(`${usage.agreementRules} agreement rule${usage.agreementRules === 1 ? '' : 's'}`);
    }

    if (parts.length) {
        return `This agreement is already in use in ${parts.join(' and ')}. Are you sure you want to delete it? Related links and documents will also be removed.`;
    }

    return (
        payload?.message ||
        'This agreement is already in use in an application. Are you sure you want to delete it?'
    );
};

const extractUploadedFile = (result, fallbackName = '') => {
    const candidates = [
        result?.data?.fileUrl,
        result?.data?.uploadedFiles,
        result?.data?.agreementSignatureFileUrl,
        result?.data?.merchantSignatureFileUrl,
        result?.fileUrl,
        result?.data,
    ];

    for (const candidate of candidates) {
        const file = normalizeFileUrl(candidate);
        if (!file) continue;
        if (typeof file === 'string') {
            return { url: file, originalname: fallbackName };
        }
        const url =
            file.url ||
            (typeof file.fileUrl === 'string' ? file.fileUrl : file.fileUrl?.url);
        if (url) {
            return {
                url,
                mimetype: file.mimetype || file.fileUrl?.mimetype,
                originalname: file.originalname || file.name || fallbackName,
            };
        }
    }
    return null;
};

const saveAgreementRequest = async (url, method, payload, token) => {
    const response = await fetch(url, {
        method,
        headers: buildAuthHeaders(token, {
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
    });

    const text = await response.text();
    let result = {};
    if (text) {
        try {
            result = JSON.parse(text);
        } catch {
            result = { message: text };
        }
    }

    if (!response.ok) {
        throw new Error(result?.message || text || 'Failed to save agreement');
    }

    return result;
};

const StatusBadge = ({ active }) => (
    <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{
            backgroundColor: active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: active ? '#059669' : '#DC2626',
        }}
    >
        <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: active ? '#10B981' : '#EF4444' }}
        />
        {active ? 'Active' : 'In-Active'}
    </span>
);

const fieldStyle = {
    backgroundColor: 'var(--dashboard-tab-box)',
    color: 'var(--dashboard-text-primary)',
    border: '1px solid rgba(100, 153, 255, 0.35)',
};

const modalOverlayStyle = {
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10000,
};

const AgreementFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    isEdit,
    title,
    setTitle,
    templateKey,
    setTemplateKey,
    isActive,
    setIsActive,
    file,
    setFile,
    existingFileUrl,
    signaturePlacements = [],
    onOpenPlacementPicker,
    btnLoading,
}) => {
    if (!isOpen) return null;

    const existingName = getFileName(existingFileUrl);
    const hasPdf = isPdfSource(file, existingFileUrl);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center px-4"
            style={modalOverlayStyle}
        >
            <div
                className="w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
                style={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    borderRadius: 14,
                    boxShadow: '0 10px 35px rgba(0,0,0,0.18)',
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={isEdit ? 'Edit Agreement' : 'Add Agreement'}
                        Fontsize={22}
                    />
                    <button
                        onClick={onClose}
                        className="text-sm px-3 py-1 rounded-md"
                        style={{
                            backgroundColor: 'var(--dashboard-tab-box)',
                            color: 'var(--dashboard-text-primary)',
                            border: '1px solid rgba(0,0,0,0.08)',
                        }}
                    >
                        Close
                    </button>
                </div>

                <div className="mb-4">
                    <label
                        className="block mb-2 text-sm font-medium"
                        style={{ color: 'var(--dashboard-text-primary)' }}
                    >
                        Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter title"
                        className="w-full px-3 py-3 rounded-lg outline-none"
                        style={fieldStyle}
                    />
                </div>

                <div className="mb-4">
                    <label
                        className="block mb-2 text-sm font-medium"
                        style={{ color: 'var(--dashboard-text-primary)' }}
                    >
                        Template Key
                    </label>
                    <DropdownMenu
                        menuItems={getTemplateKeyOptions(templateKey).map((key) => ({
                            id: key,
                            title: key,
                        }))}
                        idSet
                        defaultText="Select template key"
                        selectedValue={templateKey || ''}
                        onSelect={(id) => setTemplateKey(String(id || ''))}
                        fullWidth
                        searchable
                    />
                </div>

                <div className="mb-4">
                    <label
                        className="block mb-2 text-sm font-medium"
                        style={{ color: 'var(--dashboard-text-primary)' }}
                    >
                        File
                    </label>
                    <input
                        key={isEdit ? 'edit' : 'create'}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-3 rounded-lg outline-none text-sm"
                        style={fieldStyle}
                    />
                    {file ? (
                        <p className="mt-2 text-xs" style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}>
                            Selected: {file.name}
                        </p>
                    ) : existingName ? (
                        <p className="mt-2 text-xs" style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}>
                            Current file: {existingName}
                        </p>
                    ) : null}
                    {hasPdf && (
                        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-xs m-0" style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}>
                                {signaturePlacements.length
                                    ? `${signaturePlacements.length} signature location${signaturePlacements.length === 1 ? '' : 's'} selected`
                                    : 'Click the PDF to mark where the merchant should sign.'}
                            </p>
                            <button
                                type="button"
                                onClick={onOpenPlacementPicker}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap"
                                style={{
                                    border: '1px solid #0C79F7',
                                    background: '#fff',
                                    color: '#0C79F7',
                                }}
                            >
                                {signaturePlacements.length
                                    ? 'Edit signature locations'
                                    : 'Place signature locations'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="mb-5 flex items-center justify-between">
                    <label
                        className="text-sm font-medium"
                        style={{ color: 'var(--dashboard-text-primary)' }}
                    >
                        Status
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsActive(!isActive)}
                        className="flex items-center gap-3"
                    >
                        <span className="text-sm" style={{ color: 'var(--dashboard-text-primary)' }}>
                            {isActive ? 'Active' : 'In-Active'}
                        </span>
                        <span
                            className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                            style={{ backgroundColor: isActive ? '#10B981' : '#A7ABAD' }}
                        >
                            <span
                                className="inline-block h-5 w-5 rounded-full bg-white transition-transform"
                                style={{ transform: isActive ? 'translateX(22px)' : 'translateX(4px)' }}
                            />
                        </span>
                    </button>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg"
                        style={{
                            backgroundColor: 'var(--dashboard-tab-box)',
                            color: 'var(--dashboard-text-primary)',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={btnLoading}
                        className="px-4 py-2 rounded-lg"
                        style={{
                            backgroundColor: '#0C79F7',
                            color: '#fff',
                            opacity: btnLoading ? 0.7 : 1,
                        }}
                    >
                        {btnLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AgreementViewModal = ({ isOpen, onClose, loading, agreement, accessToken }) => {
    if (!isOpen) return null;

    const fileHref = getFileHref(agreement?.fileUrl);
    const fileName = getFileName(agreement?.fileUrl);
    const signaturePlacements = normalizeSignaturePlacements(
        agreement?.signaturePlacements || agreement?.signature_placements
    );
    const isPdf = isPdfSource(null, agreement?.fileUrl);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center px-4"
            style={modalOverlayStyle}
        >
            <div
                className="w-full max-w-3xl p-5 max-h-[90vh] overflow-y-auto"
                style={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    borderRadius: 14,
                    boxShadow: '0 10px 35px rgba(0,0,0,0.18)',
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Agreement Details'}
                        Fontsize={22}
                    />
                    <button
                        onClick={onClose}
                        className="text-sm px-3 py-1 rounded-md"
                        style={{
                            backgroundColor: 'var(--dashboard-tab-box)',
                            color: 'var(--dashboard-text-primary)',
                            border: '1px solid rgba(0,0,0,0.08)',
                        }}
                    >
                        Close
                    </button>
                </div>

                {loading ? (
                    <div className="w-full flex justify-center py-8">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}>
                                    Title
                                </p>
                                <p className="text-sm font-semibold" style={{ color: 'var(--dashboard-text-primary)' }}>
                                    {agreement?.title || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}>
                                    Template Key
                                </p>
                                <p className="text-sm font-semibold" style={{ color: 'var(--dashboard-text-primary)' }}>
                                    {agreement?.templateKey || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}>
                                    Status
                                </p>
                                <StatusBadge active={Boolean(agreement?.isActive)} />
                            </div>
                            <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}>
                                    File
                                </p>
                                {fileHref ? (
                                    <button
                                        onClick={() => window.open(fileHref, '_blank')}
                                        className="text-sm font-semibold underline"
                                        style={{ color: '#0C79F7' }}
                                    >
                                        {fileName || 'Open file'}
                                    </button>
                                ) : (
                                    <p className="text-sm" style={{ color: 'var(--dashboard-text-primary)' }}>-</p>
                                )}
                            </div>
                        </div>

                        {isPdf && signaturePlacements.length > 0 && (
                            <p className="text-xs mb-2" style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}>
                                {signaturePlacements.length} signature location
                                {signaturePlacements.length === 1 ? '' : 's'} on the PDF
                            </p>
                        )}

                        {isPdf ? (
                            <SignedDocumentPreview
                                fileUrl={agreement?.fileUrl}
                                placements={signaturePlacements}
                                accessToken={accessToken}
                            />
                        ) : fileHref ? (
                            <iframe
                                src={`${fileHref}#toolbar=1&navpanes=0&view=FitH`}
                                title={agreement?.title || 'Agreement'}
                                className="w-full rounded-lg"
                                style={{ height: 420, border: '1px solid rgba(100, 153, 255, 0.18)' }}
                            />
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
};

const AgreementListPanel = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);

    const [loading, setLoading] = useState(false);
    const [list, setList] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [isModalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [formTitle, setFormTitle] = useState('');
    const [formTemplateKey, setFormTemplateKey] = useState('');
    const [formIsActive, setFormIsActive] = useState(true);
    const [formFile, setFormFile] = useState(null);
    const [formPlacements, setFormPlacements] = useState([]);
    const [placementPickerOpen, setPlacementPickerOpen] = useState(false);
    const [btnLoading, setBtnLoading] = useState(false);

    const [viewAgreement, setViewAgreement] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    const [deleteAgreement, setDeleteAgreement] = useState(null);
    const [deleteWarning, setDeleteWarning] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchList = (nextPage = page) => {
        if (!accessToken) return;
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}agreement?paginate=true&page=${nextPage}&limit=${PAGE_LIMIT}`,
            accessToken
        )
            .then((result) => {
                const { rows, total: totalRecords } = extractPagedRows(result);
                setList(rows);
                setTotal(totalRecords);
            })
            .catch(() => {
                setList([]);
                setTotal(0);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchList(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, page]);

    const closeFormModal = () => {
        setModalOpen(false);
        setPlacementPickerOpen(false);
        setEditData(null);
        setFormTitle('');
        setFormTemplateKey('');
        setFormIsActive(true);
        setFormFile(null);
        setFormPlacements([]);
    };

    const openCreateModal = () => {
        setEditData(null);
        setFormTitle('');
        setFormTemplateKey('');
        setFormIsActive(true);
        setFormFile(null);
        setFormPlacements([]);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditData(item);
        setFormTitle(item?.title || '');
        setFormTemplateKey(normalizeTemplateKey(item?.templateKey));
        setFormIsActive(item?.isActive !== false);
        setFormFile(null);
        setFormPlacements(normalizeSignaturePlacements(item?.signaturePlacements));
        setModalOpen(true);
    };

    const handleFormFileChange = (nextFile) => {
        setFormFile(nextFile);
        setFormPlacements([]);
    };

    const uploadFile = async (file, type) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        const result = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
        const uploaded = extractUploadedFile(result, file.name);
        if (!uploaded?.url) {
            throw new Error('File upload failed');
        }
        return uploaded;
    };

    const toAgreementFileUrl = (file, fallbackName = '') => {
        const extracted = extractUploadedFile({ data: { fileUrl: file } }, fallbackName);
        if (!extracted?.url) return null;
        return {
            url: extracted.url,
            mimetype: extracted.mimetype || 'application/pdf',
            originalname: extracted.originalname || fallbackName || extracted.url.split('/').pop() || 'file.pdf',
        };
    };

    const handleSave = async () => {
        if (!formTitle.trim()) {
            toast.error('Title is required');
            return;
        }
        const templateKeyValue = normalizeTemplateKey(formTemplateKey);
        if (!templateKeyValue) {
            toast.error('Please select a template key');
            return;
        }
        if (!editData && !formFile) {
            toast.error('Please upload a file');
            return;
        }

        const hasPdf = isPdfSource(formFile, editData?.fileUrl);
        const placements = serializeSignaturePlacements(formPlacements);
        if (hasPdf && !placements.length) {
            toast.error('Place at least one signature location on the PDF.');
            setPlacementPickerOpen(true);
            return;
        }

        try {
            setBtnLoading(true);
            let fileUrl = toAgreementFileUrl(editData?.fileUrl, getFileName(editData?.fileUrl));
            if (formFile) {
                fileUrl = toAgreementFileUrl(
                    await uploadFile(formFile, 'agreement-template'),
                    formFile.name
                );
            }
            if (!fileUrl) {
                toast.error('Please upload a file');
                return;
            }

            const payload = {
                title: formTitle.trim(),
                templateKey: templateKeyValue,
                fileUrl,
                signaturePlacements: placements,
            };

            const result = await saveAgreementRequest(
                editData?.id ? `${baseURl}agreement/${editData.id}` : `${baseURl}agreement`,
                editData?.id ? 'PUT' : 'POST',
                payload,
                accessToken
            );

            closeFormModal();
            fetchList();
            toast.success(
                typeof result?.message === 'string'
                    ? result.message
                    : (editData ? 'Agreement updated successfully' : 'Agreement created successfully')
            );
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to save agreement'));
        } finally {
            setBtnLoading(false);
        }
    };

    const handleView = async (item) => {
        setViewAgreement(item);
        if (!item?.id) return;
        try {
            setViewLoading(true);
            const result = await getRequestWithOutBody(`${baseURl}agreement/${item.id}`, accessToken);
            const detail = result?.data || result;
            if (detail) {
                setViewAgreement({
                    ...item,
                    ...detail,
                    fileUrl: detail?.fileUrl || item?.fileUrl,
                    signaturePlacements:
                        detail?.signaturePlacements ||
                        detail?.signature_placements ||
                        item?.signaturePlacements ||
                        item?.signature_placements,
                });
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to load agreement'));
        } finally {
            setViewLoading(false);
        }
    };

    const handleDeleteClick = async (item) => {
        if (!item?.id) return;
        setDeletingId(item.id);
        try {
            const result = await deleteRequest(`${baseURl}agreement/${item.id}`, accessToken);
            const payload = getDeletePayload(result);
            if (payload?.requiresConfirmation) {
                setDeleteAgreement(item);
                setDeleteWarning(payload);
                return;
            }
            toast.success(
                typeof result?.message === 'string' ? result.message : 'Agreement deleted successfully'
            );
            fetchList();
        } catch (error) {
            const payload = getDeletePayload(error);
            if (payload?.requiresConfirmation) {
                setDeleteAgreement(item);
                setDeleteWarning(payload);
                return;
            }
            toast.error(getErrorMessage(error, 'Failed to delete agreement'));
        } finally {
            setDeletingId(null);
        }
    };

    const closeDeleteModal = () => {
        setDeleteAgreement(null);
        setDeleteWarning(null);
    };

    const handleConfirmDelete = async () => {
        if (!deleteAgreement?.id) return;
        try {
            setDeleting(true);
            const result = await deleteRequestWithBody(
                `${baseURl}agreement/${deleteAgreement.id}`,
                accessToken,
                { confirm: true }
            );
            toast.success(
                typeof result?.message === 'string' ? result.message : 'Agreement deleted successfully'
            );
            closeDeleteModal();
            fetchList();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to delete agreement'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between flex-wrap gap-3">
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Agreement List'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    title={'Add Agreement'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    onClick={openCreateModal}
                />
            </div>

            {loading ? (
                <div className="w-full flex justify-center py-8">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : list.length > 0 ? (
                <>
                    <div
                        className="w-full overflow-x-auto mt-4 rounded-xl"
                        style={{ border: '1px solid rgba(100, 153, 255, 0.18)' }}
                    >
                        <table className="w-full text-sm" style={{ color: 'var(--dashboard-text-primary)' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--dashboard-tab-box)' }}>
                                    <th className="text-left px-4 py-3 font-semibold">Title</th>
                                    <th className="text-left px-4 py-3 font-semibold">Template Key</th>
                                    <th className="text-left px-4 py-3 font-semibold">File</th>
                                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                                    <th className="text-left px-4 py-3 font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((item, index) => {
                                    const fileHref = getFileHref(item?.fileUrl);
                                    const fileName = getFileName(item?.fileUrl);
                                    return (
                                        <tr
                                            key={item?.id || index}
                                            style={{ borderTop: '1px solid rgba(100, 153, 255, 0.12)' }}
                                        >
                                            <td className="px-4 py-3 font-medium">{item?.title || '-'}</td>
                                            <td className="px-4 py-3">{item?.templateKey || '-'}</td>
                                            <td className="px-4 py-3">
                                                {fileHref ? (
                                                    <button
                                                        onClick={() => window.open(fileHref, '_blank')}
                                                        className="underline"
                                                        style={{ color: '#0C79F7' }}
                                                    >
                                                        {fileName || 'View file'}
                                                    </button>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge active={Boolean(item?.isActive)} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleView(item)}
                                                        className="px-3 py-1.5 text-sm rounded-lg"
                                                        style={{
                                                            backgroundColor: 'var(--dashboard-tab-box)',
                                                            color: 'var(--dashboard-text-primary)',
                                                        }}
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="px-3 py-1.5 text-sm rounded-lg"
                                                        style={{ backgroundColor: '#0C79F7', color: '#fff' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(item)}
                                                        disabled={deletingId === item?.id}
                                                        className="px-3 py-1.5 text-sm rounded-lg"
                                                        style={{
                                                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                                            color: '#DC2626',
                                                            opacity: deletingId === item?.id ? 0.7 : 1,
                                                        }}
                                                    >
                                                        {deletingId === item?.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {total > PAGE_LIMIT && (
                        <div className="flex items-center justify-end gap-3 mt-4">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                                style={{
                                    backgroundColor: 'var(--dashboard-tab-box)',
                                    color: 'var(--dashboard-text-primary)',
                                }}
                            >
                                Previous
                            </button>
                            <span className="text-sm" style={{ color: 'var(--dashboard-text-primary)' }}>
                                Page {page} of {Math.max(1, Math.ceil(total / PAGE_LIMIT))}
                            </span>
                            <button
                                disabled={page >= Math.ceil(total / PAGE_LIMIT)}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                                style={{
                                    backgroundColor: 'var(--dashboard-tab-box)',
                                    color: 'var(--dashboard-text-primary)',
                                }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <NoDataFound title="No Data Found" description="No agreements found." />
            )}

            <AgreementFormModal
                isOpen={isModalOpen}
                onClose={closeFormModal}
                onSubmit={handleSave}
                isEdit={Boolean(editData)}
                title={formTitle}
                setTitle={setFormTitle}
                templateKey={formTemplateKey}
                setTemplateKey={setFormTemplateKey}
                isActive={formIsActive}
                setIsActive={setFormIsActive}
                file={formFile}
                setFile={handleFormFileChange}
                existingFileUrl={editData?.fileUrl}
                signaturePlacements={formPlacements}
                onOpenPlacementPicker={() => setPlacementPickerOpen(true)}
                btnLoading={btnLoading}
            />

            <SignaturePlacementPicker
                open={placementPickerOpen}
                onClose={() => setPlacementPickerOpen(false)}
                fileUrl={formFile ? null : editData?.fileUrl}
                pdfFile={formFile}
                placements={formPlacements}
                accessToken={accessToken}
                onSave={setFormPlacements}
            />

            <AgreementViewModal
                isOpen={Boolean(viewAgreement)}
                onClose={() => setViewAgreement(null)}
                loading={viewLoading}
                agreement={viewAgreement}
                accessToken={accessToken}
            />

            <DeleteConfirmationModal
                open={Boolean(deleteWarning)}
                title="Delete Agreement"
                subtitle="This agreement is already in use in an application."
                entityName={deleteWarning?.data?.title || deleteAgreement?.title || ''}
                warningMessage={getInUseWarningMessage(deleteWarning)}
                onCancel={closeDeleteModal}
                onDelete={handleConfirmDelete}
                isLoading={deleting}
            />
        </>
    );
};

export default AgreementListPanel;
