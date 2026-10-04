import Heading from "../../Components/Heading";
import { useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import AgentTable from "../../Components/AgentTable";
import { styled } from '@mui/material/styles';
import BottonWithIcon from "../../Components/ButtonWithIcon";
import addIcon from "../../assets/addIcon.png";
import { useNavigate } from "react-router-dom";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10
});

const TenantsList = () => {
    const navigate = useNavigate();

    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [tenantsList, setTenantsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);

    const fetchData2 = () => {
        setLoading(true);
        let api = '';

        api = `${baseURl}tenant?paginate=true&page=${page}&limit=${rowsPerPage}&orderBy=createdAt&order=desc`;

        getRequestWithOutBody(api, accessToken)
            .then(result => {
                const formattedData = (result?.data?.data || []).map((row) => ({
                    ...row,
                    parentCompany: row?.parent?.name || (row?.parentTenantId ? `Company #${row.parentTenantId}` : 'Top-level'),
                }));
                setTenantsList(formattedData);
                setTotalCount(result?.data?.totalRecords || 0);
                setLoading(false);
            })
            .catch(error => {
                setLoading(false);
            });
    };


    useEffect(() => {
        fetchData2()
    }, [userData])

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (newRowsPerPage) => {
        setRowsPerPage(newRowsPerPage);
        setPage(1); // Reset to first page
    };

    const columns = [
        { id: 'name', label: 'Merchant Name', align: 'center' },
        { id: 'parentCompany', label: 'Parent Company', align: 'center' },
        { id: 'businessType', label: 'Business Type', align: 'center' },
        { id: 'email', label: 'Email', align: 'center' },
        { id: 'isActive', label: 'Status', align: 'center' },
    ];

    const handleRowClick = (row) => {
        navigate('/masterDashboard/addTenants', { state: { itemData: row } });
    };

    const handleButtonClick = () => {
        navigate('/masterDashboard/addTenants');
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Merchant List'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    // width={145}
                    title={'Add Merchant'}
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
            ) : tenantsList.length > 0 ? (
                <div className="w-full p-4 min-h-screen " style={{ borderRadius: 14 }}>
                    <AgentTable
                        columns={columns}
                        data={tenantsList}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        onRowClick={handleRowClick}
                        containerMaxHeight={false}
                    />
                </div>
            ) : (
                <NoDataFound
                    title="No Data Found"
                    description="No merchants are available right now."
                />)
            }
        </div>
    );
};

export default TenantsList;
