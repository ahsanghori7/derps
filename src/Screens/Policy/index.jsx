import { useNavigate, useLocation } from "react-router-dom";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import addIcon from "../../assets/addIcon.png";
import { styled } from '@mui/material/styles';
import BottonWithIcon from "../../Components/ButtonWithIcon";
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

const Policy = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    
    // Update browser tab title
    usePageTitle("Support Request", location);
    const [loading, setLoading] = useState(false);
    const [policyList, setPolicyList] = useState([]);

    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}policy-forms`, accessToken
        )
            .then(result => {
                setPolicyList(result?.data?.results)
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData()
    }, [])

    const columns = [
        { id: 'id', label: 'POLICY NO', align: 'center' },
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            renderCell: (row) => formatDateTime(row?.createdAt),
        },
        { id: 'date', label: 'POLICY DATE', align: 'center' },
        { id: 'subject', label: 'SUBJECT', align: 'center' },
        { id: 'crossReference', label: 'CROSS REFERENCE', align: 'center' },
        { id: 'status', label: 'STATUS', align: 'center' },
        { id: 'edit', label: 'EDIT', align: 'center' },
    ];

    const handleButtonClick = () => {
        navigate('/home/addPolicy');
    };

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Support Request'}
                    Fontsize={30}
                // Tailwind CSS classes
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    // width={145}
                    title={'Add Policy'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    onClick={handleButtonClick}
                />
            </HeaderWrapper>
            {
                loading ? (
                    <div className="text-center w-full mx-auto">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : policyList?.length === 0 ? (
                    <NoDataFound title="No Data Found" description="No policies found." />
                ) : (
                    <div className="mt-3">
                        <MemoTable columns={columns} data={policyList} adminPolicyTable={true} />
                    </div>
                )}
        </div>
    );
};

export default Policy;
