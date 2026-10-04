import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";

const UserPolicy = () => {
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const [loading, setLoading] = useState(false);
    const [policyList, setPolicyList] = useState([]);

    const fetchData = () => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}policy-forms?status=active`, accessToken
        )
            .then(result => {
                const apiData = result?.data ?? result;
                const rows =
                    apiData?.results ??
                    apiData?.data?.results ??
                    apiData?.data ??
                    [];

                setPolicyList(Array.isArray(rows) ? rows.filter(Boolean) : []);
                setLoading(false);
            })
            .catch(() => {
                setPolicyList([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData()
    }, [])
    const columns = [
        { id: 'date', label: 'DATE', align: 'center' },
        { id: 'subject', label: 'POLICY', align: 'center' },
        { id: 'id', label: 'POLICY NO', align: 'center' },
    ];

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Policies'}
                Fontsize={30}
            />
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {Array.isArray(policyList) && policyList.length > 0 ? (
                        <MemoTable columns={columns} data={policyList} policyTable={true} />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No policies are available right now."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default UserPolicy;
