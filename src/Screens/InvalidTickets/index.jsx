import Heading from "../../Components/Heading";
import AgentTicketListTable from "../../Components/AgentsTicketListTable";
import { useCallback, useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { styled } from "@mui/material";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10
});

const InvalidTickets = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [loading, setLoading] = useState(false);
    const [ticketList, setTicketList] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const fetchData = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('status', 'in-active');
        params.set('paginate', true);
        params.set('page', String(page));
        params.set('limit', String(rowsPerPage));

        getRequestWithOutBody(`${baseURl}ticket?${params.toString()}`, accessToken)
            .then(result => {
                const apiData = result?.data;
                const rows = apiData?.results || apiData?.data?.results || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.totalCount ??
                    apiData?.total ??
                    apiData?.count ??
                    apiData?.data?.totalRecords ??
                    apiData?.data?.totalCount ??
                    apiData?.data?.total ??
                    apiData?.data?.count ??
                    0;

                setTicketList(Array.isArray(rows) ? rows : []);
                setTotalCount(Number(count) || 0);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }, [accessToken, page, rowsPerPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setPage(1);
    }, [rowsPerPage]);

    const columns = [
        { id: 'id', label: 'TICKET NO', align: 'center' },
        { id: 'category.title', label: 'CATEGORY', align: 'center' },
        { id: 'title', label: 'TITLE', align: 'center' },
        { id: 'priority', label: 'PRIORITY', align: 'center' },
        { id: 'assignee?.name', label: 'ASSIGNED TO', align: 'center' },
        { id: 'details', label: 'STATUS', align: 'center' },
    ];

    return (
        <>
            <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10, }}>
                <HeaderWrapper>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Inactive Tickets'}
                        Fontsize={30}
                    // Tailwind CSS classes
                    />

                </HeaderWrapper>
                <div className="w-full " style={{ borderRadius: 14 }}>
                    <div style={{  borderRadius: 14 }}>

                        {loading ? (
                            <div className="text-center w-full mx-auto">
                                <Loader message="Loading..." subMessage="Please wait" />
                            </div>
                        ) : (ticketList?.length || 0) === 0 ? (
                            <NoDataFound title="No Data Found" description="No in-active tickets found." />
                        ) : (
                            <div className="mt-4">
                                <AgentTicketListTable
                                    columns={columns}
                                    data={ticketList}
                                    page={page}
                                    rowsPerPage={rowsPerPage}
                                    totalCount={totalCount}
                                    onPageChange={setPage}
                                    onRowsPerPageChange={(next) => {
                                        setRowsPerPage(next);
                                        setPage(1);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </>
    );
};

export default InvalidTickets;
