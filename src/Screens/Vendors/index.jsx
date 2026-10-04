import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import PageHeader from "../../Components/PageHeader";
import AppButton from "../../Components/AppButton";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useEffect, useState, useCallback } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import addIcon from "../../assets/addIcon.png";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { usePageTitle } from "../../Hooks/usePageTitle";

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const safeCellValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
};

const Vendors = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const userData = useSelector((state) => state?.userData?.userDetails);
    
    // Update browser tab title
    usePageTitle("Vendors", location);
    const [loading, setLoading] = useState(false);
    const [vendorList, setVendorList] = useState([]);
    const [page, setPage] = useState(Number(searchParams?.get('page')) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams?.get('rowsPerPage')) || 25);
    const [totalCount, setTotalCount] = useState(0);
    const fetchData = useCallback(() => {
        setLoading(true);

        const params = new URLSearchParams();
        params.append('paginate', 'true');
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));

        const apiUrl = `${baseURl}vendor?${params.toString()}`;

        getRequestWithOutBody(apiUrl, accessToken)
            .then(result => {
                const apiData = result?.data ?? result;
                const rows =
                    apiData?.results ??
                    apiData?.data?.results ??
                    apiData?.data ??
                    [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.data?.totalRecords ??
                    apiData?.pagination?.total ??
                    apiData?.pagination?.totalRecords ??
                    0;

                setVendorList(Array.isArray(rows) ? rows.filter(Boolean) : []);
                setTotalCount(Number(count) || 0);
                setLoading(false);
            })
            .catch(() => {
                setVendorList([]);
                setTotalCount(0);
                setLoading(false);
            });
    }, [accessToken, page, rowsPerPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Update URL parameters when pagination changes
    useEffect(() => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', page.toString());
        if (rowsPerPage !== 25) params.set('rowsPerPage', rowsPerPage.toString());
        
        setSearchParams(params);
    }, [page, rowsPerPage, setSearchParams]);
    const columns = [
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            renderCell: (row) => formatDateTime(row?.createdAt),
        },
        {
            id: 'companyName',
            label: 'COMPANY NAME',
            align: 'center',
            renderCell: (row) => safeCellValue(row?.companyName),
        },
        {
            id: 'email',
            label: 'EMAIL',
            align: 'center',
            renderCell: (row) => safeCellValue(row?.email),
        },
        // { id: 'services', label: 'SERVICE', align: 'center' },
        { id: 'edit', label: 'EDIT', align: 'center' },
        // { id: 'salesRepresentative', label: 'SALES REPRESNTATIVE', align: 'center' },
    ];

    const handleButtonClick = () => {
        navigate('/home/addSupplier', { state: { entityLabel: 'Vendor' } });
    };
    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <PageHeader
                title="Vendors"
                actions={(
                    <AppButton
                        icon={addIcon}
                        title="Add Vendor"
                        onClick={handleButtonClick}
                    />
                )}
            />
            {loading ? (
                <div className="text-center w-full mx-auto mt-10">
                    <Loader message="Loading..." subMessage="Please wait" />                    
                </div>
            ) : (vendorList?.length || 0) === 0 ? (
                <NoDataFound title="No Data Found" description="No vendors found." />
            ) : (
                <div className="mt-2">
                    <MemoTable
                        columns={columns}
                        data={vendorList ?? []}
                        vendorTable={true}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount ?? 0}
                        onPageChange={(newPage) => setPage(Number(newPage) || 1)}
                        onRowsPerPageChange={(newRows) => {
                            setRowsPerPage(Number(newRows) || 25);
                            setPage(1);
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default Vendors;
