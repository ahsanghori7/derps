import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { styled } from '@mui/material/styles';
import addIcon from "../../assets/addIcon.png";
import { useNavigate } from "react-router-dom";
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

const UserApplicationList = () => {
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [loading, setLoading] = useState(false);
    const [trainingList, setTrainingList] = useState([]);
    const userData = useSelector((state) => state.userData.userDetails);

    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}application?agentId=${userData?.id}`, accessToken
        )
            .then(result => {
                setTrainingList(result?.data?.results)
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
        { id: 'id', label: 'APPLICATION NO', align: 'center' },
        { id: 'solution', label: 'APPLICATION TYPE', align: 'center' },
        { id: 'businessName', label: 'BUSINESS NAME', align: 'center' },
        { id: 'agent.username', label: 'AGENT', align: 'center' },
        { id: 'status', label: 'STATUS', align: 'center' },
        { id: 'edit', label: 'EDIT', align: 'center' },
    ];

    const handleButtonClick = () => {
        navigate('/userdashboard/userActivations');
    };

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Application'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    // width={145}
                    title={'Add Application'}
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
                    {Array.isArray(trainingList) && trainingList.length > 0 ? (
                        <MemoTable columns={columns} data={trainingList} userApplication={true} />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No applications are available right now."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default UserApplicationList;
