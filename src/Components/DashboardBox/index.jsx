import Heading from "../Heading";
import ticketNewUIogo from "../../assets/ticketNewUIogo.png";
import { useState } from "react";

const DashboardBox = ({ data, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            style={{ 
                backgroundColor: isHovered ? 'var(--dashboard-box-bg-hover)' : 'var(--dashboard-tab-box)', 
                borderRadius: 10, 
                borderWidth: 1, 
                borderColor: 'var(--dashboard-box-border)', 
                cursor: 'pointer' 
            }}
            className="w-24 h-24 p-1 mb-1"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="mx-1">
                <img 
                    src={isHovered ? ticketNewUIogo : ticketNewUIogo} 
                    alt={`${data.heading} icon`} 
                    className="w-5 h-5" 
                />
                <Heading
                    Fontweight={600}
                    color={isHovered ? 'var(--dashboard-box-text-hover)' : 'var(--dashboard-box-text)'}
                    Heading={data.ticketQuantity}
                    Fontsize={14}
                />
                <Heading
                    Fontweight={500}
                    color={isHovered ? 'var(--dashboard-box-text-hover)' : 'var(--dashboard-box-text)'}
                    Heading={data.heading}
                    Fontsize={13}
                />
                {/* <img src={isHovered ? data.hoverIcon : data.icon} alt={`${data.heading} icon`} className="w-12 h-12" /> */}

            </div>
            {/* <div className="mx-3 mt-5">
                
            </div> */}
            {/* {data.status === 'Up' ? (
                <>
                    <div className="flex items-center space-x-2 mx-3 mt-1">
                        <img src={isHovered ? UpIconWhite : UpIcon} alt={'UpIcon'} className="w-5 h-3" />

                        <Heading
                            Fontweight={400}
                            color={isHovered ? 'var(--scroll-thumb)' : '#00B69B'}
                            Heading={data.value}
                            Fontsize={16}
                        />
                        <Heading
                            Fontweight={400}
                            color={isHovered ? 'var(--scroll-thumb)' : '#606060'}
                            Heading={'Up from yesterday'}
                            Fontsize={16}
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center space-x-2 mx-3 mt-1">
                        <img src={isHovered ? UpIconWhite : UpIcon} alt={'UpIcon'} className="w-5 h-3" />

                        <Heading
                            Fontweight={400}
                            color={isHovered ? 'var(--scroll-thumb)' : '#00B69B'}
                            Heading={data.value}
                            Fontsize={16}
                        />
                        <Heading
                            Fontweight={400}
                            color={isHovered ? 'var(--scroll-thumb)' : '#606060'}
                            Heading={'Down from yesterday'}
                            Fontsize={16}
                        />
                    </div>
                </>
            )} */}
        </div>
    );
};

export default DashboardBox;
