import { useSelector } from "react-redux";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRequestWithOutBody } from "../../Api/fetch";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";

const PayoutDetails = () => {
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const [loading, setLoading] = useState(false);
    const [memoList, setMemoList] = useState([]);
    const location = useLocation();

    const payoutData = Array.isArray(location.state?.payoutData) ? location.state.payoutData : [];

    const columns = [
        { id: 'merchant.dbaName', label: 'MERCHANT', align: 'center' },
        { id: 'agentRevenueShare', label: 'REVENUE SHARE', align: 'center' },
        { id: 'agentPayout', label: 'PAYOUT ($)', align: 'center' },
    ];

    const totalPayout = payoutData.reduce(
        (acc, item) => acc + (Number(item?.agentPayout) || 0),
        0
    );

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div className="">
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Payout Details'}
                    Fontsize={30}
                />
            </div>
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : payoutData.length === 0 ? (
                <NoDataFound title="No Data Found" description="No payout details found." />
            ) : (
                <div className="mt-4">
                    <MemoTable columns={columns} data={payoutData} payoutdetailsList={true} />
                    <div style={{
                        backgroundColor: 'var(--dashboard-tab-box)',
                        border: '1px solid var(--dashboard-box-border)',
                        borderRadius: 20,
                        padding: 20,
                        marginTop: 20,
                        textAlign: 'left'
                    }} className="w-80 ml-auto">
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--sidebar-text-primary)' }}>Payout Summary</h2>
                        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--sidebar-text-primary)' }} className="mt-6">Residual Payout: <span style={{ color: 'var(--Gray)', fontSize: 15, marginLeft: 10 }}>${(totalPayout ?? 0).toFixed(2)}</span></p>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--sidebar-text-primary)' }} className="mt-3">Total Payout: <span style={{ color: 'var(--Gray)', fontSize: 15, marginLeft: 10 }}>${(totalPayout ?? 0).toFixed(2)}</span></p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayoutDetails;
