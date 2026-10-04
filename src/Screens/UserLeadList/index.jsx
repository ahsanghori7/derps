import { useNavigate } from "react-router-dom";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { styled } from '@mui/material/styles';
import BottonWithIcon from "../../Components/ButtonWithIcon";
import addIcon from "../../assets/addIcon.png";
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

const UserLeadsList = () => {
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const [loading, setLoading] = useState(false);
    const [leadsList, setLeadsList] = useState([]);

    const fetchData = () => {
        setLoading(true);
        getRequestWithOutBody(`${baseURl}lead`, accessToken)
            .then((result) => {
                const rows = result?.data?.results ?? [];
                setLeadsList(Array.isArray(rows) ? rows : []);
                setLoading(false);
            })
            .catch(() => {
                setLeadsList([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData()
    }, [])

    const columns = [
        { id: 'fullName', label: 'LEAD NAME', align: 'center' },
        { id: 'email', label: 'EMAIL', align: 'center' },
        { id: 'services', label: 'SERVICE', align: 'center' },
        { id: 'edit', label: 'EDIT', align: 'center' },
    ];

    const handleButtonClick = () => {
        navigate('/userdashboard/addLeads');
    };

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Leads'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    // width={145}
                    title={'Add Lead'}
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
                <div className="mt-4">
                    {Array.isArray(leadsList) && leadsList.length > 0 ? (
                        <MemoTable
                            columns={columns}
                            data={leadsList ?? []}
                            UserLeadsList={true}
                        />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No leads are available right now."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default UserLeadsList;
