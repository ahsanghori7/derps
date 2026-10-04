import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { styled } from '@mui/material/styles';
import addIcon from "../../assets/addIcon.png";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getRequestWithOutBody, postRequestWithBodyAndToken, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import OneFieldModal from "../../Components/OneFieldModal";
import { toast } from "react-toastify";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10
});

const TicketTypes = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [loading, setLoading] = useState(false);
    const [categoryList, setCategoryList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTicketType, setEditingTicketType] = useState(null);

    const fetchData = () => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}ticket-type`, accessToken
        )
            .then(result => {
                setCategoryList(result?.data)
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
        { id: 'title', label: 'Types', align: 'left' },
        { id: 'edit', label: 'Edit', align: 'right' },
    ];

    const handleAddClick = () => {
        setEditingTicketType(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (event, row) => {
        event?.stopPropagation?.();
        setEditingTicketType(row);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingTicketType(null);
    };

    const handleSubmit = async (title) => {
        const apiData = { title };
        if (editingTicketType?.id) {
            const result = await putRequestWithBodyAndToken(
                `${baseURl}ticket-type/${editingTicketType.id}`,
                accessToken,
                apiData
            );
            toast.success(result.message);
        } else {
            const result = await postRequestWithBodyAndToken(
                `${baseURl}ticket-type`,
                accessToken,
                apiData
            );
            toast.success(result.message);
        }
        fetchData();
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Ticket Types'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    title={'Add Ticket Type'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    onClick={handleAddClick}
                />
            </HeaderWrapper>
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {Array.isArray(categoryList) && categoryList.length > 0 ? (
                        <MemoTable
                            columns={columns}
                            data={categoryList}
                            editTicketType={true}
                            onRowClick={handleEditClick}
                        />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No ticket types are available right now."
                        />
                    )}
                </div>
            )}
            <OneFieldModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                fieldTitle="Ticket Type"
                fieldPlaceholder="Enter Type"
                modalTitle={editingTicketType ? "Edit Ticket Type" : "Add Ticket Type"}
                defaultValue={editingTicketType?.title || ""}
                buttonName={editingTicketType ? "Update" : "Create"}
                onSubmit={handleSubmit}
            />
        </div>
    );
};

export default TicketTypes;
