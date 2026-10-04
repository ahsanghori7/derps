import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Heading from "../Heading";
import { RiEdit2Line, RiDeleteBin6Line } from "react-icons/ri";
import { deleteRequest } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import DeleteConfirmationModal from "../DeleteModal";
import { getPreferenceOptions, isPreferenceRequired } from "../../Utils/preferenceExtra";

const PreferenceCard = ({ data, onEdit, onSuccess, fullWidth = false }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const accessToken = useSelector((state) => state.auth.accessToken);

    const deleteFile = async (id) => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
          const result = await deleteRequest(`${baseURl}application-preferences/${data?.id}`, accessToken);
          toast.success(result.messages || 'Preference deleted successfully');
          setShowDeleteModal(false);
          onSuccess();
        } catch (error) {
          toast.error(error.message || "Something went wrong while deleting preference");
        } finally {
          setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
    };

    return (
        <>
            <div
                style={{
                    backgroundColor: isHovered ? 'var(--surface-hover)' : 'var(--dashboard-card-bg)',
                    borderRadius: 16,
                    boxShadow: '1.84px 1.84px 8.75px 0px #0000001A',
                    cursor: 'pointer',
                    minHeight: 120,
                }}
                className={`${fullWidth ? 'w-full' : 'w-80'} p-5 flex flex-col justify-between relative`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="absolute top-4 right-4 flex space-x-2">
                    <RiEdit2Line
                        size={18}
                        className="text-blue-600 cursor-pointer hover:text-blue-800"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(data);
                        }}
                    />
                    <RiDeleteBin6Line
                        size={18}
                        className="text-red-600 cursor-pointer hover:text-red-800"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(data?.id); // Optional chaining
                        }}
                    />
                </div>

                <div className=" space-y-1 mt-4">
                    <Heading
                        Fontweight={700}
                        color="var(--sidebar-text-primary)"
                        Heading={'Preference Type: ' + data?.preference}
                        Fontsize={14}
                        ml={10}
                    />
                    <Heading
                        Fontweight={500}
                        color="var(--sidebar-text-primary)"
                        Heading={'Name: ' + data?.name}
                        Fontsize={14}
                        ml={10}
                    />
                    <Heading
                        Fontweight={500}
                        color="var(--sidebar-text-primary)"
                        Heading={'Required: ' + (isPreferenceRequired(data?.extra) ? 'Yes' : 'No')}
                        Fontsize={14}
                        ml={10}
                    />
                    {data?.preference === 'dropdown' && getPreferenceOptions(data?.extra).length > 0 && (
                        <Heading
                            Fontweight={500}
                            color="var(--sidebar-text-primary)"
                            Heading={'Options: ' + getPreferenceOptions(data.extra).map((item) => item.title).join(', ')}
                            Fontsize={14}
                            ml={10}
                        />
                    )}

                </div>
            </div>
            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Preference"
                subtitle="Are you sure you want to delete"
                entityName={data?.name || "this preference"}
                warningMessage="This action cannot be undone. The preference will be permanently removed from the system."
                onCancel={cancelDelete}
                onDelete={confirmDelete}
                isLoading={isDeleting}
            />
        </>
    );
};

export default PreferenceCard;
