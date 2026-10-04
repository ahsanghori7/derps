import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";

const UserCustomer = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [loading, setLoading] = useState(false);
    const [customerList, setCustomerList] = useState([]);
    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}customer?AssigneeId=${userData?.id}`, accessToken
        )
            .then(result => {
                setCustomerList(result?.data?.data)
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
        { id: 'merchantIds', label: 'MERCHANT ID', align: 'center' },
        { id: 'legalBusinessName', label: 'LEGAL NAME', align: 'center' },
        { id: 'dbaName', label: 'DBA NAME', align: 'center' },
    ];

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Merchant'}
                Fontsize={30}
            />
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {Array.isArray(customerList) && customerList.length > 0 ? (
                        <MemoTable columns={columns} data={customerList} customerTable={true} />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No merchants are available right now."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default UserCustomer;
