import Heading from "../../Components/Heading"
import Stepper from "../../Components/Stepper";
import { useState } from "react";
import BottonCustom from "../../Components/ButtonCustom";
import { useLocation, useNavigate } from "react-router-dom";
import RequestSubmittedIcon from "../../assets/RequestSubmitted.png";
import { useSelector } from "react-redux";
import { isGuestSession } from "../../Utils/applicationNavigation";


const RequestSubmitted = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userData = useSelector((state) => state.userData.userDetails);
    const roleTitleNormalized = (userData?.roleTitle || "").toLowerCase();
    const isGuest = isGuestSession(location);

    const handleButtonClick = () => {
        if (roleTitleNormalized === "agent") {
            navigate('/userdashboard/userApplicationList');
        } else {
            navigate('/home/adminApplication');
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Application'}
                Fontsize={30}
            // Tailwind CSS classes
            />

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 30, paddingTop: 40, borderRadius: 14 }} className="sm:m-8 p-3 pt-4 sm:p-8 m-2">
                    <Stepper activeStep={5} />
                    <div className="flex mt-12 gap-8 justify-center ">
                        <div
                            style={{
                                borderRadius: 8,
                                backgroundColor: 'var(--scroll-thumb)',
                                // padding: 45, 
                                boxShadow: '3px 4px 16px 0px rgba(0, 0, 0, 0.25)'
                            }}
                            className="flex flex-col items-center my-10 py-4 p-2 sm:p-12 mb-20"
                        >
                            <img src={RequestSubmittedIcon} alt={`icon`} className="w-20 h-20 " />
                            <Heading
                                Fontweight={600}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Your Request Successfully Submitted'}
                                // Fontsize={32}
                                mt={10}
                                // width={350}
                                txtAlign={'center'}
                                className={' text-[16px] w-56 sm:w-96 sm:text-[32px] sm:mx-16'}
                            // Tailwind CSS classes
                            />
                            {!isGuest && (
                                <BottonCustom
                                    backgroundColor={'rgba(67, 121, 238, 1)'}
                                    width={130}
                                    title={'Go Back'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    mt={20}
                                    onClick={handleButtonClick}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestSubmitted;
