import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Heading from "../Heading";
import { RiEdit2Line } from "react-icons/ri";
import { useSelector } from "react-redux";

const PricingPlanBox = ({ data, onEdit, onSuccess }) => {
    const [isHovered, setIsHovered] = useState(false);
    const accessToken = useSelector((state) => state.auth.accessToken);

    return (
        <div
            style={{
                backgroundColor: isHovered ? 'var(--surface-hover)' : 'var(--dashboard-card-bg)',
                borderRadius: 16,
                boxShadow: '1.84px 1.84px 8.75px 0px #0000001A',
                cursor: 'pointer',
                minHeight: 120,
            }}
            className="w-80 p-5 flex flex-col justify-between relative"
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
            </div>

            <div className=" space-y-1 mt-4">
                <Heading
                    Fontweight={700}
                    color="var(--sidebar-text-primary)"
                    Heading={'Plan Name: ' + data?.name}
                    Fontsize={14}
                    ml={10}
                />
                <Heading
                    Fontweight={500}
                    color="var(--sidebar-text-primary)"
                    Heading={'Service: ' + data?.service}
                    Fontsize={14}
                    ml={10}
                />
                <Heading
                    Fontweight={500}
                    color="var(--sidebar-text-primary)"
                    Heading={'Description: ' + data?.description}
                    Fontsize={14}
                    ml={10}
                />

            </div>
        </div>
    );
};

export default PricingPlanBox;
