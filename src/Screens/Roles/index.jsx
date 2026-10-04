import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { styled } from '@mui/material/styles';
import addIcon from "../../assets/addIcon.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
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

const Roles = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    
    // Update browser tab title
    usePageTitle("Roles", location);
    
    const [loading, setLoading] = useState(false);
    const [roleList, setRoleList] = useState([]);

    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}role`, accessToken
        )
            .then(result => {
                setRoleList(result?.data)
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
        { id: 'title', label: 'Roles', align: 'left' },
        { id: 'edit', label: 'Edit', align: 'left' },
    ];

    const handleButtonClick = () => {
        navigate('/home/addRoles');
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Roles'}
                    Fontsize={30}
                />
                <div>
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    // width={145}
                    title={'Add Role'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    onClick={handleButtonClick}
                />
                </div>
            </HeaderWrapper>
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : roleList?.length === 0 ? (
                <NoDataFound title="No Data Found" description="No roles found." />
            ) : (
                <div className="mt-2">
                    <MemoTable columns={columns} data={roleList} roles={true} />
                </div>
            )}
        </div>
    );
};

export default Roles;
