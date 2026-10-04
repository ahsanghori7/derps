import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";

const UserTraining = () => {
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const [loading, setLoading] = useState(false);
    const [trainingList, setTrainingList] = useState([]);

    const fetchData = () => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}training-form?status=active`, accessToken
        )
            .then(result => {
                const apiData = result?.data ?? result;
                const rows =
                    apiData?.results ??
                    apiData?.data?.results ??
                    apiData?.data ??
                    [];

                setTrainingList(Array.isArray(rows) ? rows.filter(Boolean) : []);
                setLoading(false);
            })
            .catch(() => {
                setTrainingList([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData()
    }, [])

    const columns = [
        { id: 'date', label: 'DATE', align: 'center' },
        { id: 'subject', label: 'DESCRIPTION', align: 'center' },
        { id: 'id', label: 'TRANING', align: 'center' },
    ];

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Training & Development'}
                Fontsize={30}
            />
            {loading ? (
                <div className="text-center w-full mx-auto mt-10">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {Array.isArray(trainingList) && trainingList.length > 0 ? (
                        <MemoTable columns={columns} data={trainingList} trainingTable={true} />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No training records are available right now."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default UserTraining;
