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

const Category = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [loading, setLoading] = useState(false);
    const [categoryList, setCategoryList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const fetchData = () => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}category`, accessToken
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
        { id: 'title', label: 'Category', align: 'left' },
        { id: 'edit', label: 'Edit', align: 'right' },
    ];

    const handleAddClick = () => {
        setEditingCategory(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (event, row) => {
        event?.stopPropagation?.();
        setEditingCategory(row);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const handleSubmit = async (title) => {
        const apiData = { title };
        if (editingCategory?.id) {
            const result = await putRequestWithBodyAndToken(
                `${baseURl}category/${editingCategory.id}`,
                accessToken,
                apiData
            );
            toast.success(result.message);
        } else {
            const result = await postRequestWithBodyAndToken(
                `${baseURl}category`,
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
                    Heading={'Categories'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    title={'Add Category'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    onClick={handleAddClick}
                />
            </HeaderWrapper>
            {loading ? (
                <div className="text-center w-full mx-auto mt-10">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {Array.isArray(categoryList) && categoryList.length === 0 ? (
                        <NoDataFound title="No Data Found" description="No categories found." />
                    ) : (
                        <MemoTable
                            columns={columns}
                            data={categoryList}
                            categoryadd={true}
                            onRowClick={handleEditClick}
                        />
                    )}
                </div>
            )}
            <OneFieldModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                fieldTitle="Category"
                fieldPlaceholder="Enter Category"
                modalTitle={editingCategory ? "Edit Category" : "Add Category"}
                defaultValue={editingCategory?.title || ""}
                buttonName={editingCategory ? "Update" : "Create"}
                onSubmit={handleSubmit}
            />
        </div>
    );
};

export default Category;
