import DeletePayout from "../../Components/DeletePayout";
import Heading from "../../Components/Heading";
import PayoutDiv from "../../Components/PayoutDiv";
import { useLocation } from "react-router-dom";
import { usePageTitle } from "../../Hooks/usePageTitle";

const AgentPayout = () => {
    const location = useLocation();
    
    // Update browser tab title
    usePageTitle("Agent Payout", location);
    
    return (
        <>
            <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Agent payout'}
                    Fontsize={30}
                // Tailwind CSS classes
                />
                <div>
                    <PayoutDiv title={'Upload Payout'} upload={true} />
                </div>
                <div style={{marginTop: 20}}>
                    <DeletePayout title={'Delete Payout'} />
                </div>
            </div>
        </>
    );
};

export default AgentPayout;
