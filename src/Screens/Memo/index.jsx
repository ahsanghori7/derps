import { useCallback, useEffect, useRef, useState } from "react";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import addIcon from "../../assets/addIcon.png";
import { styled } from '@mui/material/styles';
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import MemoViewModal from "../../Components/MemoViewModal";
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
const Memo = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const location = useLocation();
    
    // Update browser tab title
    usePageTitle("Memos", location);
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [memoList, setMemoList] = useState([]);
    const [memoListLoaded, setMemoListLoaded] = useState(false);
    const [selectedMemo, setSelectedMemo] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get('rowsPerPage')) || 25);
    const navigate = useNavigate();
    const [navigationMemoData] = useState(() => {
        if (location.state?.itemData) return location.state.itemData;
        const saved = sessionStorage.getItem('newTabMemoData');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return null;
    });

    useEffect(() => {
        sessionStorage.removeItem('newTabMemoData');
    }, []);

    const navigationMemoId = navigationMemoData?.id;
    const openedFromNotificationRef = useRef(false);
    const pendingNotificationMemoRef = useRef(null);
    const userDetails = useSelector((state) => state.userData?.userDetails);
    const canEdit = userDetails?.roleTitle?.toLowerCase().includes('admin') ||
                   userDetails?.roleTitle?.toLowerCase().includes('human resource') ||
                   (selectedMemo?.createdBy && selectedMemo.createdBy === userDetails?.id);

    // Capture notification target before location.state is cleared (e.g. by setSearchParams).
    useEffect(() => {
        if (!navigationMemoId || !navigationMemoData) return;
        pendingNotificationMemoRef.current = {
            id: navigationMemoId,
            data: navigationMemoData,
        };
        openedFromNotificationRef.current = false;
    }, [navigationMemoId, navigationMemoData]);

    // If user navigates here with a notification, auto-open the memo modal.
    useEffect(() => {
        const pending = pendingNotificationMemoRef.current;
        if (!pending?.id) return;
        if (openedFromNotificationRef.current) return;

        const memoFromList =
            memoList?.find((m) => String(m?.id) === String(pending.id)) || null;

        // Prefer list row when loaded; otherwise wait for fetch to finish.
        if (!memoFromList && !memoListLoaded) return;

        const memoToOpen = memoFromList || pending.data || null;
        if (!memoToOpen) return;

        setSelectedMemo(memoToOpen);
        setIsModalOpen(true);
        openedFromNotificationRef.current = true;
    }, [memoList, memoListLoaded]);

    const fetchData = useCallback(({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        getRequestWithOutBody(
            `${baseURl}memo?order=desc`, accessToken
        )
            .then(result => {
                const totalMemos = result?.data?.length ?? 0;
                const updatedMemoList = result?.data.map((item, index) => ({
                    ...item,
                    newId: `Memo #${totalMemos - index}`
                }));
                setMemoList(updatedMemoList);
                setMemoListLoaded(true);
            })
            .catch(() => {
                setMemoListLoaded(true);
            })
            .finally(() => {
                if (!silent) setLoading(false);
            });
    }, [accessToken]);

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Update URL parameters when pagination changes
    useEffect(() => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', page.toString());
        if (rowsPerPage !== 25) params.set('rowsPerPage', rowsPerPage.toString());

        const nextSearch = params.toString();
        const currentSearch = location.search.replace(/^\?/, '');
        if (nextSearch === currentSearch) return;

        setSearchParams(params, { replace: true, state: location.state });
    }, [page, rowsPerPage, setSearchParams, location.search, location.state]);

    const handleButtonClick = () => {
        navigate('/home/addMemo');
    };

    const handleMemoClick = (_event, memo) => {
        setSelectedMemo(memo);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedMemo(null);
    };


    const columns = [
        { id: 'newId', label: 'Memo No', align: 'center' },
        { id: 'title', label: 'Memo Title', align: 'center' },
        { id: 'date', label: 'Date', align: 'center' },
        { id: 'status', label: 'Status', align: 'center' },
    ];

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Memos'}
                    Fontsize={30}
                // Tailwind CSS classes
                />
                {canEdit && (
                    <BottonWithIcon
                        backgroundColor={'#0C79F7'}
                        icon={addIcon}
                        title={'Create Memo'}
                        height={40}
                        color={'var(--sidebar-text-selected)'}
                        fontSize={16}
                        fontWeight={500}
                        onClick={handleButtonClick}
                    />
                )}
            </HeaderWrapper>
            {loading ? (
                <div className="text-center w-full mx-auto mt-10">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (memoList?.length || 0) === 0 ? (
                <NoDataFound title="No Data Found" description="No memos found." />
            ) : (
                <div className="mt-4">
                    <MemoTable 
                        columns={columns} 
                        data={memoList} 
                        adminMemo={true} 
                        onRowClick={handleMemoClick}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        onRowsPerPageChange={(newRows) => {
                            setRowsPerPage(newRows);
                            setPage(1);
                        }}
                    />
                </div>
            )}
            <MemoViewModal 
                open={isModalOpen}
                onClose={handleCloseModal}
                memoData={selectedMemo}
                onAcknowledged={() => fetchData({ silent: true })}
            />
        </div >
    );
};

export default Memo;
