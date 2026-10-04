import { useSelector } from "react-redux";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useEffect, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";

const UserMemo = () => {
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const [loading, setLoading] = useState(false);
    const [memoList, setMemoList] = useState([]);
    const columns = [
        { id: 'date', label: 'DATE', align: 'center' },
        { id: 'title', label: 'MEMO TITLE', align: 'center' },
        { id: 'id', label: 'MEMO NO', align: 'center' },
    ];

    const fetchData = () => {
        if (!accessToken) return;
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}memo?status=active`, accessToken
        )
            .then(result => {
                const apiData = result?.data ?? result;
                const rows =
                    apiData?.results ??
                    apiData?.data?.results ??
                    apiData?.data ??
                    (Array.isArray(apiData) ? apiData : []);

                const updatedMemoList = (Array.isArray(rows) ? rows : [])
                    .filter(Boolean)
                    .map((item, index) => ({
                        ...item,
                        newId: `Memo #${index + 1}`,
                    }));

                setMemoList(updatedMemoList);
                setLoading(false);
            })
            .catch(() => {
                setMemoList([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData()
    }, [accessToken])

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div className="">
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Memo Summary'}
                    Fontsize={30}
                />
            </div>
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {Array.isArray(memoList) && memoList.length > 0 ? (
                        <MemoTable columns={columns} data={memoList} memoUserList={true} />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No memo records are available right now."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default UserMemo;
