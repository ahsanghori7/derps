import Heading from "../../Components/Heading";
import dmsLogo from "../../assets/logo4k.png";
import backgroundLogin from "../../assets/backgroundLogin.webp";
import LoginGirl from "../../assets/LoginGirl.webp";
import loginBlackProfile from "../../assets/loginBlackProfile.png";
import dashboardImage from "../../assets/dashboardImage.webp";
import { useState } from "react";
import MainButton from "../../Components/MainButton";
import { toast } from "react-toastify";
import { postRequestWithBodyWithoutHeader } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Spinner from "../../Components/Spinner";
import { useNavigate, useLocation } from "react-router-dom";
import { usePageTitle } from "../../Hooks/usePageTitle";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    usePageTitle("Forgot Password", location);

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [emailError, setEmailError] = useState("");

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleForgotPassword();
        }
    };

    const handleForgotPassword = async () => {
        if (loading) return;
        const trimmedEmail = email.trim();

        if (trimmedEmail === "") {
            setEmailError("You'll need to enter an email address to continue.");
            return;
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            setEmailError("Please enter a valid email address.");
            return;
        }

        setEmailError("");
        setLoading(true);
        try {
            const apiData = { email: trimmedEmail };
            const result = await postRequestWithBodyWithoutHeader(`${baseURl}auth/forgot-password`, apiData);
            toast.success(result?.message || "Password reset link sent to your email");
            setSubmitted(true);
        } catch (error) {
            setEmailError(error.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left Section (Blue Background) */}
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

            {/* Right Section (Forgot Password Form) */}
            <div className="flex flex-col justify-center items-center w-full lg:w-1/2 bg-white p-10">
                <img src={dmsLogo} alt="DMS Logo" className="w-52 mb-6" />

                <Heading
                    Fontweight={700}
                    color="text-black"
                    Heading="FORGOT PASSWORD"
                    Fontsize={40}
                    txtAlign="center"
                />
                <p className="text-[#202224B2] text-center mb-8" style={{ fontSize: 20 }}>
                    {submitted
                        ? "Check your inbox for a link to reset your password"
                        : "Enter your email and we'll send you a reset link"}
                </p>

                {!submitted && (
                    <>
                        {/* Email Field */}
                        <div className="w-full max-w-sm mb-6">
                            <label
                                htmlFor="forgot-password-email"
                                className={`font-semibold text-sm ${emailError ? "text-red-600" : ""}`}
                            >
                                EMAIL
                            </label>
                            <div className={`flex items-center mt-1 rounded border bg-gray-50 ${emailError ? "border-red-500" : "border-[#4880FF]"}`}>
                                <img src={loginBlackProfile} alt="Email Icon" className="w-4 h-4 ml-3" />
                                <input
                                    id="forgot-password-email"
                                    type="email"
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-2 bg-transparent outline-none"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError("");
                                    }}
                                    onKeyPress={handleKeyPress}
                                    aria-invalid={Boolean(emailError)}
                                    aria-describedby={emailError ? "forgot-password-email-error" : undefined}
                                />
                            </div>
                            {emailError && (
                                <p
                                    id="forgot-password-email-error"
                                    role="alert"
                                    className="mt-2 flex items-start gap-1.5 text-xs text-red-600"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="mt-px inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold leading-none"
                                    >
                                        !
                                    </span>
                                    <span>{emailError}</span>
                                </p>
                            )}
                        </div>

                        <MainButton
                            title={loading ? <Spinner /> : "SEND RESET LINK"}
                            width={380}
                            onClick={handleForgotPassword}
                            height={50}
                            disabled={loading}
                            className="bg-[#4880FF] text-white rounded-md shadow-md hover:bg-blue-600 transition"
                        />
                    </>
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

export default ForgotPassword;
