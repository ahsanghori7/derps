import Heading from "../../Components/Heading";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import addIcon from "../../assets/addIcon.png";
import MemoTable from "../../Components/MemoTable";
import { useNavigate, useLocation } from "react-router-dom";
import { styled } from '@mui/material/styles';
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

const Form = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    
    // Update browser tab title
    usePageTitle("Form", location);
    
    const [loading, setLoading] = useState(false);
    const [formList, setFormList] = useState([]);

    const fetchData = () => {
        // setLoading(true)
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}form`, accessToken
        )
            .then(result => {
                setFormList(result?.data?.results)
                // setCompanyCategoryArray(options);
                // setCompanyCategoryArray(result)setLoadin
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
        { id: 'id', label: 'Form No', align: 'center' },
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            renderCell: (row) => formatDateTime(row?.createdAt),
        },
        { id: 'date', label: 'Form Date', align: 'center' },
        { id: 'subject', label: 'Subject', align: 'center' },
        { id: 'crossReference', label: 'Cross Reference', align: 'center' },
        { id: 'status', label: 'Status', align: 'center' },
        { id: 'edit', label: 'Edit', align: 'center' },
    ];

    const handleButtonClick = () => {
        navigate('/home/addForm');
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Form List'}
                    Fontsize={30}
                // Tailwind CSS classes
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    // width={145}
                    title={'Create Form'}
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
            ) : Array.isArray(formList) && formList.length === 0 ? (
                <NoDataFound title="No Data Found" description="No forms found." />
            ) : (
                <div className="mt-4">
                    <MemoTable columns={columns} data={formList} adminFormTable={true} />
                </div>
            )}
        </div>
    );
};

export default Form;
