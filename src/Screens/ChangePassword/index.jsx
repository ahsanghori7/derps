import { useState } from "react";
import Heading from "../../Components/Heading";
import MainButton from "../../Components/MainButton";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";
import { baseURl } from "../../Config/systemConfig";
import { patchRequestWithBodyAndToken } from "../../Api/fetch";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import tickIcon from "../../assets/tickIcon.png";
import { usePageTitle } from "../../Hooks/usePageTitle";

const ChangePassword = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Update browser tab title
    usePageTitle("Change Password", location);
    
    const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isConfirmPasswordMatch, setIsConfirmPasswordMatch] = useState(false);

    const inputWrapperStyle = {
        position: 'relative',
        borderRadius: 8,
        backgroundColor: 'var(--dashboard-tab-box)',
        border: '1px solid var(--sidebar-selected-bg)',
    };

    const inputStyle = {
        border: 'none',
        fontSize: 14,
        borderRadius: 8,
        backgroundColor: 'transparent',
        padding: '12px 44px 12px 14px',
        width: '100%',
        color: 'var(--dashboard-text-primary)',
        outline: 'none',
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("All fields are required");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New password and confirm password should be the same");
            return;
        }

        if (newPassword.length < 4) {
            toast.error("Password must be at least 4 characters long");
            return;
        }

        // Proceed with password change logic
        setLoading(true);
        try {
            const apiData = {
                "newPassword": newPassword,
                "currentPassword": currentPassword,
            };
            const result = await patchRequestWithBodyAndToken(`${baseURl}user/edit-password`, accessToken, apiData)
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--dashboard-bg)' }}
        >
            <div
                className="w-full max-w-md"
                style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}
            >
                <div className="p-6 sm:p-8">
                    <div className="text-center">
                        <Heading
                            Fontweight={700}
                            color={'var(--dashboard-text-primary)'}
                            Heading={'Change Your Password'}
                            Fontsize={'clamp(24px, 5vw, 32px)'}
                            txtAlign={'center'}
                        // Tailwind CSS classes
                        />
                        <Heading
                            Fontweight={600}
                            color={'var(--dashboard-text-primary)'}
                            Heading={'Please enter you password to continue'}
                            Fontsize={'clamp(14px, 3vw, 18px)'}
                            txtAlign={'center'}
                            mt={20}
                        // Tailwind CSS classes
                        />
                    </div>

                    <div className="mt-8 flex flex-col gap-5">
                        <div>
                        <Heading
                            Fontweight={600}
                            color={'var(--fieldsTitle)'}
                            Heading={'Current Password'}
                            Fontsize={'clamp(16px, 2.5vw, 18px)'}
                        // Tailwind CSS classes
                        />
                        <div className="mt-2" style={inputWrapperStyle}>
                            <input
                                type={isCurrentPasswordVisible ? "text" : "password"}
                                placeholder="Current Password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setIsCurrentPasswordVisible((prev) => !prev)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                                style={{ color: 'var(--dashboard-text-primary)' }}
                            >
                                {isCurrentPasswordVisible ? <FaRegEyeSlash /> : <FaRegEye />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <Heading
                            Fontweight={600}
                            color={'var(--fieldsTitle)'}
                            Heading={'New Password'}
                            Fontsize={'clamp(16px, 2.5vw, 18px)'}
                        // Tailwind CSS classes
                        />
                        <div className="mt-2" style={inputWrapperStyle}>
                            <input
                                type={isNewPasswordVisible ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setIsNewPasswordVisible((prev) => !prev)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                                style={{ color: 'var(--dashboard-text-primary)' }}
                            >
                                {isNewPasswordVisible ? <FaRegEyeSlash /> : <FaRegEye />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center">
                            <Heading
                                Fontweight={600}
                                color={'var(--fieldsTitle)'}
                                Heading={'Confirm Password'}
                                Fontsize={'clamp(16px, 2.5vw, 18px)'}
                            // Tailwind CSS classes
                            />
                            {isConfirmPasswordMatch && (
                                <img src={tickIcon} alt={`icon`} className="w-4 h-4 xl:w-4 xl:h-4" />
                            )}
                        </div>
                        <div className="mt-2" style={inputWrapperStyle}>
                                <input
                                    type={isConfirmPasswordVisible ? "text" : "password"}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setIsConfirmPasswordMatch(newPassword === e.target.value); // Check match on change
                                    }}
                                    style={inputStyle}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmPasswordVisible((prev) => !prev)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                                    style={{ color: 'var(--dashboard-text-primary)' }}
                                >
                                    {isConfirmPasswordVisible ? <FaRegEyeSlash /> : <FaRegEye />}
                                </button>
                        </div>
                    </div>

                    <div className="flex justify-center mt-6">
                        <MainButton
                            backgroundColor={'var(--sidebar-selected-bg)'}
                            title={'Change Password'}
                            width={'clamp(280px, 80vw, 330px)'}
                            height={50}
                            color={'#ffffff'}
                            onClick={handleChangePassword} // Added onClick handler
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>
        </div>
        </div>

    );
};

export default ChangePassword;
