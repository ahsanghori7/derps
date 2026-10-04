import Heading from "../../Components/Heading";
import dmsLogo from "../../assets/dolphinTechnologies.png";
// import backgroundLogin from "../../assets/backgroundLogin.png";
// import LoginGirl from "../../assets/LoginGirl.webp";
import loginBlackProfile from "../../assets/loginBlackProfile.png";
import lockloginBlack from "../../assets/lockloginBlack.png";
// import dashboardImage from "../../assets/dashboardImage.webp";
import dashboardImage from "../../assets/loginBanner.webp";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useState } from "react";
import MainButton from "../../Components/MainButton";
import { toast } from "react-toastify";
import { getRequestWithOutBody, postRequestWithBodyWithoutHeader } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Spinner from "../../Components/Spinner";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUserDetails } from "../../Store/Reducers/userDetailsSlice";
import { setCategories, setScopes, setModuleCodes, setTenantFeatures, setAuditLogModules, clearTenantGroup } from "../../Store/Reducers/authSlice";
// import { SVG } from "../../assets/svg";
import { getPostLoginPath } from "../../Utils/postLoginRedirect";
import { fetchAuditLogModules } from "../../Api/auditLogApi";
import { fetchAndApplyAuthMe } from "../../Utils/applyAuthMeSession";
import { clearTenantGroupStorage } from "../../Utils/tenantGroup";

const Login = () => {
    // const accessToken = useSelector((state) => state.auth.accessToken);
    // const userData = useSelector((state) => state.userData.userDetails);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setpassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // useEffect(() => {
    //     if (accessToken) {
    //         if (userData?.user?.roleTitle === "Admin") {
    //             navigate('/home/dashboard')
    //         } else if (userData?.user?.roleTitle !== "Admin") {
    //             navigate('/userdashboard/userMemo')
    //         }else{
    //             navigate('/')
    //         }
    //     }else{
    //         navigate('/')
    //     }
    // }, [])

    // const handleUsernameChange = (e) => {
    //     setUsername(e.target.value);
    // };

    // const handlePasswordChange = (e) => {
    //     setpassword(e.target.value);
    // };

    const togglePasswordVisibility = () => {
        setIsPasswordVisible((prev) => !prev);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    const handleLogin = async () => {
        if (username.trim() === "" || password.trim() === "") {
            toast.error("All fields are required");
            return;
        }

        if (password.length < 4) {
            toast.error("Password must be at least 4 characters long");
            return;
        }
        // Proceed with login logic
        setLoading(true);
        try {
            const apiData = {
                "username": username,
                "password": password,
            };
            const result = await postRequestWithBodyWithoutHeader(`${baseURl}auth/login`, apiData)
            
            if (result?.data?.accessToken) {
                const apiUser = result?.data?.user || {};
                const apiTenantId = result?.data?.tenantId ?? result?.data?.tenantID ?? result?.data?.tenant_id;
                const apiNestedTenantId = result?.data?.user?.tenant?.id ?? result?.data?.user?.tenant?.tenantId ?? result?.data?.user?.tenant?.tenantID;
                let mergedUserDetails = {
                    ...apiUser,
                    tenantId: apiUser?.tenantId ?? apiUser?.tenantID ?? apiUser?.tenant_id ?? apiTenantId ?? apiNestedTenantId,
                    tenant: result?.data?.user?.tenant || {}
                };

                // Hydrate user profile (name/username) once on login
                // This helps downstream features (e.g. video call join payload) have a reliable display name.
                try {
                    const token = result?.data?.accessToken;
                    const userId = mergedUserDetails?.id;
                    if (token && userId != null) {
                        const profileResponse = await getRequestWithOutBody(`${baseURl}user/${userId}`, token);
                        const profile = profileResponse?.data ?? profileResponse ?? {};
                        mergedUserDetails = {
                            ...mergedUserDetails,
                            ...(profile?.name ? { name: profile.name } : {}),
                            ...(profile?.username ? { username: profile.username } : {}),
                            ...(profile?.profilePicture ? { profilePicture: profile.profilePicture } : {}),
                        };
                    }
                } catch (e) {
                    // Non-blocking: login succeeded; profile hydration can fail independently.
                }

                // Save tenant logo directly to localStorage
                if (result?.data?.user?.tenant?.logo) {
                    localStorage.setItem('tenantLogo', result?.data?.user?.tenant?.logo);
                }

                const finalScopes =
                    result?.data?.user?.permissions?.length > 0
                        ? result.data.user.permissions
                        : result.data.scopes;
                localStorage.setItem('accessToken', result?.data?.accessToken);
                localStorage.setItem('userDetails', JSON.stringify(mergedUserDetails));
                localStorage.setItem("scopes", JSON.stringify(finalScopes));
                localStorage.setItem('categories', JSON.stringify(result?.data?.categories));
                localStorage.setItem('moduleCodes', JSON.stringify(result?.data?.moduleCodes));
                const tenantFeatures = Array.isArray(result?.data?.tenantFeatures)
                    ? result.data.tenantFeatures
                    : [];
                localStorage.setItem('tenantFeatures', JSON.stringify(tenantFeatures));

                dispatch(setUserDetails(mergedUserDetails));
                dispatch(setCategories(result?.data?.categories));
                dispatch(setScopes(finalScopes));
                dispatch(setModuleCodes(result?.data?.moduleCodes));
                dispatch(setTenantFeatures(tenantFeatures));

                clearTenantGroupStorage();
                dispatch(clearTenantGroup());
                try {
                    await fetchAndApplyAuthMe(dispatch, result.data.accessToken);
                } catch {
                    // Login succeeded; group payload can load on the next hydrate.
                }

                // Load audit-log modules right after login for sidebar + page gating
                try {
                    const auditModules = await fetchAuditLogModules(result.data.accessToken);
                    dispatch(setAuditLogModules(auditModules));
                } catch {
                    dispatch(setAuditLogModules([]));
                }

                navigate(getPostLoginPath(mergedUserDetails));
            }
        } catch (error) {
            toast.error(error.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen" style={{padding: "0 12%"}}>
            {/* Left Section (Blue Background) */}
            <div
                className="hidden lg:flex flex-col justify-between overflow-hidden text-white w-1/2 relative ml-10 my-5"
                // style={{ backgroundImage: `url(${backgroundLogin})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", borderRadius: 63 }}
            >
                        <img
                            src={dashboardImage}
                            alt="Dashboard"
                            className="rounded-lg shadow-lg w-full h-full object-contain"
                        />
                {/* <div className="p-10">
                    <h1 className="text-4xl font-bold mb-1">WELCOME BACK!</h1>
                    <p className="text-xl ">
                        Say goodbye to complicated POS Systems. With Dolphin’s all-in-one POS and portal,
                        you’ll manage sales, inventory, customers, and reports in one place
                    </p>
                    <div className="flex mt-6">
                    </div>
                </div> */}

                {/* <img src={LoginGirl} alt="Login Girl" className="w-48 ml-2 absolute bottom-0" /> */}
            </div>

            {/* Right Section (Login Form) */}
            <div className="flex flex-col justify-center items-center w-full lg:w-1/2 bg-white p-10">
                <img src={dmsLogo} alt="DMS Logo" className="w-52 h-14 object-cover mb-3" />

                <Heading
                    Fontweight={700}
                    color="text-black"
                    Heading="WELCOME BACK"
                    Fontsize={40}
                    txtAlign="center"
                />
                <p className="text-[#202224B2] text-center mb-4" style={{ fontSize: 20 }}>
                    Login To Access Your Dolphin Account
                </p>

                {/* Username Field */}
                <div className="w-full max-w-sm mb-3">
                    <label className="font-semibold text-sm">USERNAME</label>
                    <div className="flex items-center mt-1 rounded border border-[#0059F5] bg-gray-50">
                        <img src={loginBlackProfile} alt="Username Icon" className="w-4 h-4 ml-3" />
                        <input
                            type="text"
                            placeholder="USERNAME"
                            className="w-full px-3 py-2 bg-transparent outline-none"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div className="w-full max-w-sm mb-4">
                    <label className="font-semibold text-sm">PASSWORD</label>
                    <div className="relative flex items-center mt-1 rounded border border-[#0059F5] bg-gray-50">
                        <img src={lockloginBlack} alt="Password Icon" className="w-4 h-4 ml-3" />
                        <input
                            type={isPasswordVisible ? "text" : "password"}
                            placeholder="PASSWORD"
                            className="w-full px-3 py-2 bg-transparent outline-none"
                            value={password}
                            onChange={(e) => setpassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute right-3 text-gray-500"
                        >
                            {isPasswordVisible ? <FaRegEyeSlash /> : <FaRegEye />}
                        </button>
                    </div>
                </div>

                {/* Remember Me */}
                {/* <div className="flex items-center w-full max-w-md mb-6">
                    <input type="checkbox" id="remember" className="mr-2" />
                    <label htmlFor="remember" className="text-sm text-gray-600">Remember me</label>
                </div> */}

                {/* Login Button */}
                <MainButton
                    title={loading ? <Spinner /> : 'LOGIN'}
                    width={380}
                    onClick={handleLogin}
                    height={50}
                    disabled={loading}
                    className="bg-[#0059F5] text-white rounded-md shadow-md hover:bg-blue-600 transition"
                />

                {/* Forgot Password */}
                <div className="w-full max-w-sm mt-2 text-right">
                    <button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-sm text-[#4880FF] hover:underline"
                    >
                        Forgot password?
                    </button>
                </div>
            </div>
        </div>);
};

export default Login;
