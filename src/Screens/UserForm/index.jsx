import { useNavigate } from "react-router-dom";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";

const UserForm = () => {
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [loading, setLoading] = useState(false);
    const [formList, setFormList] = useState([]);

    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}form?status=active`, accessToken
        )
            .then(result => {
                setFormList(result?.data?.results)
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
        { id: 'date', label: 'DATE', align: 'center' },
        { id: 'subject', label: 'FORM', align: 'center' },
        { id: 'id', label: 'FORM NO', align: 'center' },
    ];

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Form List'}
                Fontsize={30}
            />
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {Array.isArray(formList) && formList.length > 0 ? (
                        <MemoTable columns={columns} data={formList} formTable={true} />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No forms are available right now."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default UserForm;
