import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import SearchbarInput from "../../Components/SearchbarInput";
import DropdownMenu from "../../Components/dropdownMenu";
import addIcon from "../../assets/addIcon.png";
import allStatusIcon from "../../assets/allStatusIcon.png";
import pendingStatusIcon from "../../assets/pendingStatusIcon.png";
import inProgressStatusIcon from "../../assets/inProgressStatusIcon.png";
import completeStatusIcon from "../../assets/completeStatusIcon.png";
import AgentTicketListTable from "../../Components/AgentsTicketListTable";
import { useNavigate } from "react-router-dom";
import { styled } from '@mui/material/styles';
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10
});

const UserTickets = () => {
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const userData = useSelector((state) => state?.userData?.userDetails);

    const [loading, setLoading] = useState(false);
    const [ticketList, setTicketList] = useState([]);
    const [selectedStatusType, setSelectedStatusType] = useState("");

    const fetchData = () => {
        if (!userData?.id) {
            return;
        }
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}ticket?agentId=${userData?.id}`, accessToken
        )
            .then(result => {
                const apiData = result?.data ?? result;
                const rows =
                    apiData?.results ??
                    apiData?.data?.results ??
                    apiData?.data ??
                    [];
                setTicketList(Array.isArray(rows) ? rows : []);
                setLoading(false);
            })
            .catch(() => {
                setTicketList([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (userData?.id) {
            fetchData();
        }
    }, [userData?.id]);

    const safeTicketList = Array.isArray(ticketList) ? ticketList : [];

    const filteredTicketList = selectedStatusType
        ? safeTicketList.filter(ticket => ticket?.status === selectedStatusType)
        : safeTicketList;

    const data = [
        {
            id: 1, // New entry for 'All Status'
            text: 'All status',
            value: 'all'
        },
        {
            id: 2,
            icon: pendingStatusIcon,
            text: 'Pending',
            value: 'pending'
        },
        {
            id: 3,
            icon: inProgressStatusIcon,
            text: 'In Progress',
            value: 'in-progress'
        },
        {
            id: 4,
            icon: completeStatusIcon,
            text: 'Complete',
            value: 'complete'
        },
    ]


    const handleStatusChange = (value) => {
        setSelectedStatusType(value === 'all' ? '' : (value ?? ''));
    };

    const columns = [
        { id: 'id', label: 'TICKET NO', align: 'center' },
        { id: 'category.title', label: 'CATEGORY', align: 'center' },
        { id: 'title', label: 'Title', align: 'center' },
        { id: 'status', label: 'STATUS', align: 'center' },
        { id: 'edit', label: 'EDIT', align: 'center' },
    ];

    const handleButtonClick = () => {
        navigate('/userdashboard/addTickets');
    };
    
    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Tickets List'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    title={'Create Tickets'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    onClick={handleButtonClick}
                />
            </HeaderWrapper>
            <div className="flex justify-between gap-3 flex-wrap items-center mt-3">
                <DropdownMenu onSelect={handleStatusChange} icon={allStatusIcon} menuItems={data} defaultText={'All status'} />
                <SearchbarInput />
            </div>
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {filteredTicketList?.length > 0 ? (
                        <AgentTicketListTable columns={columns} data={filteredTicketList} ticketList={true} />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No tickets are available for the selected status."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default UserTickets;
