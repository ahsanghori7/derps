import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { styled } from '@mui/material/styles';
import addIcon from "../../assets/addIcon.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState, useCallback } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { usePageTitle } from "../../Hooks/usePageTitle";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10
});

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

const Training = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    
    // Update browser tab title
    usePageTitle("Training & Development", location);
    const [loading, setLoading] = useState(false);
    const [trainingList, setTrainingList] = useState([]);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);

    const fetchData = useCallback(() => {
        setLoading(true);

        const params = new URLSearchParams();
        params.append('paginate', 'true');
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));

        const apiUrl = `${baseURl}training-form?${params.toString()}`;

        getRequestWithOutBody(apiUrl, accessToken)
            .then(result => {
                const apiData = result?.data;
                const rows = apiData?.results || apiData?.data?.results || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.data?.totalRecords ??
                    0;

                setTrainingList(Array.isArray(rows) ? rows : []);
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
        { id: 'id', label: 'TRAINING NO', align: 'center' },
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            renderCell: (row) => formatDateTime(row?.createdAt),
        },
        { id: 'date', label: 'TRAINING DATE', align: 'center' },
        { id: 'subject', label: 'SUBJECT', align: 'center' },
        { id: 'crossReference', label: 'CROSS REFERENCE', align: 'center' },
        { id: 'status', label: 'STATUS', align: 'center' },
        { id: 'edit', label: 'EDIT', align: 'center' },
    ];

    // const rows = [
    //     { id: 1, trainingNo: '4182016', trainingDate: 'April/18/2016', subject: 'Interchange Pricing Knowledge', crossRef: '', status: 'Active', edit: '' },
    //     { id: 2, trainingNo: '4182016', trainingDate: 'April/18/2016', subject: 'Tierd Pricing Strucutre Knowledge', crossRef: '', status: 'In-Active', edit: '' },
    //     { id: 3, trainingNo: '6302016', trainingDate: 'June/30/2016', subject: 'Consultative selling knowledge', crossRef: '', status: 'Active', edit: '' },
    // ];

    const handleButtonClick = () => {
        navigate('/home/addTraining');
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Training & Development'}
                    Fontsize={30}
                // Tailwind CSS classes
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    // width={145}
                    title={'Add Training'}
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
            ) : (
                <div className="mt-2">
                    {Array.isArray(trainingList) && trainingList.length > 0 ? (
                        <MemoTable
                            columns={columns}
                            data={trainingList}
                            adminTrainingTable={true}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            totalCount={totalCount}
                            onPageChange={setPage}
                            onRowsPerPageChange={(newRows) => {
                                setRowsPerPage(newRows);
                                setPage(1);
                            }}
                        />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No training records are available right now."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default Training;
