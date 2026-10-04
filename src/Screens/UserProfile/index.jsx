import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import ProfileDiv from "../../Components/ProfileDiv";
import { useSelector } from "react-redux";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

const UserProfile = () => {
    const accessToken = useSelector((state) => state.auth?.accessToken);
    const userData = useSelector((state) => state.userData?.userDetails);
    const [agentProfile, setAgentProfile] = useState({});
    const [loading, setLoading] = useState(false);

    const fetchData = () => {
        if (!userData?.id || !accessToken) return;

        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}user/${userData.id}`, accessToken
        )
            .then(result => {
                setAgentProfile(result?.data ?? {});
                setLoading(false);
            })
            .catch(() => {
                setAgentProfile({});
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, [userData?.id, accessToken]);

    return (
        <>
            <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Agent Profile'}
                    Fontsize={30}
                />
                <div>
                    <ProfileDiv title={'Personal Information'} upload={true} data={agentProfile} />
                </div>
                <div style={{ marginTop: 30 }}>
                    <ProfileDiv title={'Agent Information'} data={agentProfile} />
                </div>
            </div>
        </>
    );
};

export default UserProfile;
