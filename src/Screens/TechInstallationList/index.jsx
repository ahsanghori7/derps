import Heading from "../../Components/Heading";
import { useEffect, useState, useCallback } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import AgentTable from "../../Components/AgentTable";
import { styled } from '@mui/material/styles';
import BottonWithIcon from "../../Components/ButtonWithIcon";
import addIcon from "../../assets/addIcon.png";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { usePageTitle } from "../../Hooks/usePageTitle";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10
});

const TechInstallationList = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Update browser tab title
    usePageTitle("Tech Installation List", location);
    
    const [attendanceList, setAttendanceList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);

    const fetchData = useCallback(() => {
        setLoading(true);

        const params = new URLSearchParams();
        params.append('paginate', 'true');
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));

        const api = `${baseURl}site-visits?${params.toString()}`;

        getRequestWithOutBody(api, accessToken)
            .then(result => {
                const apiData = result?.data;
                const rows = apiData?.results || apiData?.data?.results || apiData?.data || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.data?.totalRecords ??
                    rows.length;

                const mapped = (rows || []).map((item) => {
                    const dateStr = item?.date ? dayjs(item.date).format("MM/DD/YYYY") : "—";
                    const tIn = item?.timeIn ? String(item.timeIn).slice(0, 5) : "--:--";
                    const tOut = item?.timeOut ? String(item.timeOut).slice(0, 5) : "--:--";
                    const isDraft =
                        item?.submit === false
                        || String(item?.status || '').toLowerCase() === 'draft'
                        || (Number(item?.currentStep) > 0 && Number(item?.currentStep) < 9 && item?.submit !== true);
                    return {
                        ...item,
                        id: item?.id,
                        user: item?.technician?.name || item?.tech?.name || "—",
                        installationDate: dateStr,
                        installationTime: `${tIn} - ${tOut}`,
                        installationLocation: item?.businessName || item?.locationName || item?.merchantName || "—",
                        installationStatus: isDraft ? 'Draft' : (item?.jobStatus || "—"),
                    };
                });

                setAttendanceList(mapped);
                setTotalCount(Number(count) || 0);
                setLoading(false);
            })
            .catch(error => {
                setLoading(false);
            });
    }, [accessToken, page, rowsPerPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns = [
        { id: 'user', label: 'Employee Name', align: 'center' },
        { id: 'installationDate', label: 'Installation Date', align: 'center' },
        { id: 'installationTime', label: 'Installation Time', align: 'center' },
        { id: 'installationLocation', label: 'Installation Location', align: 'center' },
        { id: 'installationStatus', label: 'Installation Status', align: 'center' },
    ];

    const handleButtonClick = () => {
        navigate('/home/techInstallation');
    };

    // Backend handles pagination; use data directly

    // ✅ Pagination handlers
    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (newRows) => {
        setRowsPerPage(newRows);
        setPage(1);
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Tech Installation List'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    // width={145}
                    title={'Fill Form'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    onClick={handleButtonClick}
                />
            </HeaderWrapper>
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : attendanceList.length > 0 ? (
                <div className="w-full p-4 min-h-screen " style={{ borderRadius: 14 }}>
                    <AgentTable
                        columns={columns}
                        data={attendanceList}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        trackerSetup={true}
                        onSubmit={(row) => navigate('/home/techInstallation', { state: { rowData: row } })}
                    />
                </div>

            ) : (
                <NoDataFound
                    title="No Data Found"
                    description="No tech installation records are available right now."
                />)
            }
        </div>
    );
};

export default TechInstallationList;
