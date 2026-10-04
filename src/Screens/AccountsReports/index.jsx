import { useNavigate, useLocation } from 'react-router-dom';
import Heading from '../../Components/Heading';
import { useState } from 'react';
import BalanceSheet from "../../assets/BalanceSheet.png";
import profitAndLossReport from "../../assets/profitAndLossReport.png";
import { styled } from '@mui/material/styles';
import { usePageTitle } from "../../Hooks/usePageTitle";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: '100%',
    textAlign: 'left',
    marginTop: '20px',
    flexWrap: 'wrap',
    gap: 10
});

const AccountsReports = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Update browser tab title
    usePageTitle("Accounts Reports", location);
    
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const data = [
        {
            id: 1,
            name: 'Profit & Loss',
            image: profitAndLossReport,
            route: '/home/profitLossReport'
        },
        {
            id: 2,
            name: 'Balance Sheet',
            image: BalanceSheet,
            route: '/home/balanceSheet'
        },
        {
            id: 3,
            name: 'Trial Balance',
            image: BalanceSheet,
            route: '/home/trialBalance'
        },
        {
            id: 3,
            name: 'Expense Report',
            image: BalanceSheet,
            route: '/home/expenseReport'
        },
        // {
        //     id: 4,
        //     name: 'Tax Reports',
        //     image: BalanceSheet,
        //     route: '/home/taxReports'
        // },
    ];

    return (
        <div
            className="min-h-screen"
            style={{
                marginTop: -80,
                padding: 10,
                backgroundColor: 'var(--dashboard-bg)' // main screen background
            }}
        >
            <div className="gap-3 mb-1 flex-wrap">
                <HeaderWrapper>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Reports'}
                        Fontsize={30}
                    />
                </HeaderWrapper>

                <div className="flex mt-10 gap-5 flex-wrap">
                    {data.map((item, index) => {
                        const isHovered = hoveredIndex === index;
                        return (
                            <div
                                key={index}
                                className={`flex flex-col cursor-pointer p-6 gap-5 w-[90%] sm:w-[30%] rounded-[33px] border transition-all duration-300`}
                                style={{
                                    backgroundColor: isHovered
                                        ? 'rgba(100, 100, 100, 0.2)' // hover background
                                        : 'rgba(100, 100, 100, 0.1)', // normal background (lighter than screen)
                                    borderColor: isHovered
                                        ? 'var(--sidebar-text-primary)'
                                        : 'rgba(255,255,255,0.2)',
                                    color: isHovered
                                        ? 'var(--sidebar-text-primary)'
                                        : 'inherit',
                                    boxShadow: isHovered
                                        ? '0 4px 12px rgba(0,0,0,0.2)'
                                        : 'none'
                                }}
                                onClick={() =>
                                    item.route &&
                                    navigate(item.route, {
                                        state: {
                                            fromAccountsReports: true,
                                        },
                                    })
                                }
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div className="flex items-end justify-center sm:justify-end">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        style={{ 
                                            width: 40, 
                                            height: 43, 
                                            filter: document.documentElement.classList.contains('dark') ? 'invert(1) brightness(1.2)' : 'none'
                                        }}
                                    />
                                </div>
                                <Heading
                                    Heading={item.name}
                                    Fontsize={20}
                                    className="text-center sm:text-left font-medium"
                                    color={document.documentElement.classList.contains('dark') ? '#FFFFFF' : 'black'}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AccountsReports;
