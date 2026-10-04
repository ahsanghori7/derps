import Heading from "../../Components/Heading";
import dmsLogo from "../../assets/logo4k.png";
import backgroundLogin from "../../assets/backgroundLogin.webp";
import LoginGirl from "../../assets/LoginGirl.webp";
import lockloginBlack from "../../assets/lockloginBlack.png";
import dashboardImage from "../../assets/dashboardImage.webp";
import tickIcon from "../../assets/tickIcon.png";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useMemo, useState } from "react";
import MainButton from "../../Components/MainButton";
import { toast } from "react-toastify";
import { postRequestWithBodyWithoutHeader } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Spinner from "../../Components/Spinner";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { usePageTitle } from "../../Hooks/usePageTitle";
import {
    getPasswordRuleStatus,
    getPasswordStrength,
    isPasswordValid,
} from "../../Utils/passwordValidation";

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    usePageTitle("Reset Password", location);

    const token = searchParams.get("token") || "";

    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const passwordRules = useMemo(() => getPasswordRuleStatus(password), [password]);
    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
    const passwordsMatch = password.length > 0 && password === confirmPassword;
    const canSubmit = isPasswordValid(password) && passwordsMatch && !loading;

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && canSubmit) {
            handleResetPassword();
        }
    };

    const handleResetPassword = async () => {
        if (!token) {
            return;
        }

        if (!isPasswordValid(password)) {
            toast.error("Please meet all password requirements");
            return;
        }

        if (!passwordsMatch) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const apiData = { token, password };
            const result = await postRequestWithBodyWithoutHeader(`${baseURl}auth/reset-password`, apiData);
            toast.success(result?.message || "Password reset successfully. Please log in.");
            navigate("/");
        } catch (error) {
            toast.error(error.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            <div
                className="hidden lg:flex flex-col justify-between overflow-hidden text-white w-1/2 relative ml-10 my-5"
                style={{ backgroundImage: `url(${backgroundLogin})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", borderRadius: 63 }}
            >
                <div className="p-10">
                    <h1 className="text-4xl font-bold mb-1">COMING SOON!</h1>
                    <p className="text-xl ">
                        Say goodbye to complicated POS Systems. With Dolphin’s all-in-one POS and portal,
                        you’ll manage sales, inventory, customers, and reports in one place
                    </p>
                    <div className="flex mt-6">
                        <img
                            src={dashboardImage}
                            alt="Dashboard"
                            className="rounded-lg shadow-lg w-full max-w-full h-auto object-contain"
                        />
                    </div>
                </div>

                <img src={LoginGirl} alt="Login Girl" className="w-48 ml-2 absolute bottom-0" />
            </div>

            <div className="flex flex-col justify-center items-center w-full lg:w-1/2 bg-white p-10">
                <img src={dmsLogo} alt="DMS Logo" className="w-52 mb-6" />

                <Heading
                    Fontweight={700}
                    color="text-black"
                    Heading="RESET PASSWORD"
                    Fontsize={40}
                    txtAlign="center"
                />
                <p className="text-[#202224B2] text-center mb-8" style={{ fontSize: 20 }}>
                    {token
                        ? "Enter and confirm your new password"
                        : "This password reset link is invalid or has expired. Please request a new one."}
                </p>

                {token ? (
                    <>
                        <div className="w-full max-w-sm mb-4">
                            <label className="font-semibold text-sm">NEW PASSWORD</label>
                            <div className="relative flex items-center mt-1 rounded border border-[#4880FF] bg-gray-50">
                                <img src={lockloginBlack} alt="Password Icon" className="w-4 h-4 ml-3" />
                                <input
                                    type={isPasswordVisible ? "text" : "password"}
                                    placeholder="NEW PASSWORD"
                                    className="w-full px-3 py-2 bg-transparent outline-none"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordVisible((prev) => !prev)}
                                    className="absolute right-3 text-gray-500"
                                >
                                    {isPasswordVisible ? <FaRegEyeSlash /> : <FaRegEye />}
                                </button>
                            </div>

                            {password.length > 0 && (
                                <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-gray-500">Password strength</span>
                                        <span
                                            className="text-xs font-semibold"
                                            style={{ color: passwordStrength.color }}
                                        >
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: passwordStrength.width,
                                                backgroundColor: passwordStrength.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <ul className="mt-3 space-y-1.5">
                                {passwordRules.map((rule) => (
                                    <li
                                        key={rule.id}
                                        className="flex items-center gap-2 text-xs"
                                        style={{ color: rule.passed ? "#22C55E" : "#9CA3AF" }}
                                    >
                                        <span
                                            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                                            style={{
                                                backgroundColor: rule.passed ? "#DCFCE7" : "#F3F4F6",
                                                color: rule.passed ? "#16A34A" : "#9CA3AF",
                                            }}
                                        >
                                            {rule.passed ? "✓" : "○"}
                                        </span>
                                        {rule.label}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="w-full max-w-sm mb-6">
                            <div className="flex justify-between items-center">
                                <label className="font-semibold text-sm">CONFIRM PASSWORD</label>
                                {passwordsMatch && (
                                    <img src={tickIcon} alt="Passwords match" className="w-4 h-4" />
                                )}
                            </div>
                            <div className="relative flex items-center mt-1 rounded border border-[#4880FF] bg-gray-50">
                                <img src={lockloginBlack} alt="Password Icon" className="w-4 h-4 ml-3" />
                                <input
                                    type={isConfirmPasswordVisible ? "text" : "password"}
                                    placeholder="CONFIRM PASSWORD"
                                    className="w-full px-3 py-2 bg-transparent outline-none"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmPasswordVisible((prev) => !prev)}
                                    className="absolute right-3 text-gray-500"
                                >
                                    {isConfirmPasswordVisible ? <FaRegEyeSlash /> : <FaRegEye />}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && !passwordsMatch && (
                                <p className="mt-2 text-xs text-red-500">Passwords do not match</p>
                            )}
                        </div>

                        <MainButton
                            title={loading ? <Spinner /> : "RESET PASSWORD"}
                            width={380}
                            onClick={handleResetPassword}
                            height={50}
                            disabled={!canSubmit}
                            className={`text-white rounded-md shadow-md transition ${
                                canSubmit
                                    ? "bg-[#4880FF] hover:bg-blue-600"
                                    : "bg-gray-300 cursor-not-allowed"
                            }`}
                        />
                    </>
                ) : (
                    <MainButton
                        title="REQUEST NEW LINK"
                        width={380}
                        onClick={() => navigate("/forgot-password")}
                        height={50}
                        className="bg-[#4880FF] text-white rounded-md shadow-md hover:bg-blue-600 transition"
                    />
                )}

                <div className="w-full max-w-sm mt-4 text-center">
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="text-sm text-[#4880FF] hover:underline"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
