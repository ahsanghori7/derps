import Heading from "../../Components/Heading";
import dmsLogo from "../../assets/logo4k.png";
import loginBlackProfile from "../../assets/loginBlackProfile.png";
import lockloginBlack from "../../assets/lockloginBlack.png";
import emailLoginBlack from "../../assets/emailLoginBlack.png";
import phoneLoginBlack from "../../assets/phoneLoginBlack.png";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useState } from "react";
import MainButton from "../../Components/MainButton";

const Signup = () => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const togglePasswordVisibility = () => {
        setIsPasswordVisible((prev) => !prev);
    };

    return (
        <>
            <div style={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto',
            }}>
                <div>
                    <div className="flex justify-center mt-32">
                        <img src={dmsLogo} alt="Status Icon" style={{ width: 430, height: 129 }} />
                        {/* <div style={{ marginTop: -40, textAlign: 'center' }}>
                            <Heading
                                Fontweight={500}
                                color={'var(--sidebar-text-selected)'}
                                Heading={'LOGIN'}
                                Fontsize={40}
                            // Tailwind CSS classes
                            />
                        </div> */}
                    </div>
                    <div>
                        <Heading
                            Fontweight={700}
                            color={'rgba(32, 34, 36, 1)'}
                            Heading={'SIGN UP'}
                            Fontsize={40}
                            txtAlign={'center'}
                            mt={20}
                        // Tailwind CSS classes
                        />
                        <Heading
                            Fontweight={500}
                            color={'rgba(32, 34, 36, 1)'}
                            Heading={'Sign up to create your dolphin account'}
                            Fontsize={20}
                            txtAlign={'center'}
                        // Tailwind CSS classes
                        />
                    </div>
                    <div style={{ marginTop: 50 }} className="grid grid-cols-2 gap-5">
                        <div>
                            <Heading
                                Fontweight={700}
                                color={'rgba(32, 34, 36, 1)'}
                                Heading={'FIRST NAME'}
                                Fontsize={17}
                            // Tailwind CSS classes
                            />
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, borderRadius: 5, backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', marginBottom: 10 }}>
                                <img src={loginBlackProfile} alt="Username Icon" style={{ width: 24, height: 24, marginLeft: 16 }} />
                                <input
                                    type="text"
                                    placeholder="FIRST NAME"
                                    style={{
                                        border: 'none',
                                        fontSize: 15,
                                        borderRadius: 8,
                                        backgroundColor: 'transparent', // Ensure background is transparent
                                        padding: '12px 25px',

                                        width: 270,
                                        color: 'rgba(32, 34, 36, 1)',
                                        outline: 'none' // Remove focus border
                                    }}
                                />

                            </div>
                        </div>
                        <div>
                            <Heading
                                Fontweight={700}
                                color={'rgba(32, 34, 36, 1)'}
                                Heading={'LAST NAME'}
                                Fontsize={17}
                            // Tailwind CSS classes
                            />
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, borderRadius: 5, backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', marginBottom: 10 }}>
                                <img src={loginBlackProfile} alt="Username Icon" style={{ width: 24, height: 24, marginLeft: 16 }} />
                                <input
                                    type="text"
                                    placeholder="LAST NAME"
                                    style={{
                                        border: 'none',
                                        fontSize: 15,
                                        borderRadius: 8,
                                        backgroundColor: 'transparent', // Ensure background is transparent
                                        padding: '12px 25px',

                                        width: 270,
                                        color: 'rgba(32, 34, 36, 1)',
                                        outline: 'none' // Remove focus border
                                    }}
                                />

                            </div>
                        </div>
                        <div>
                            <Heading
                                Fontweight={700}
                                color={'rgba(32, 34, 36, 1)'}
                                Heading={'E-MAIL'}
                                Fontsize={17}
                            // Tailwind CSS classes
                            />
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, borderRadius: 5, backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', marginBottom: 10 }}>
                                <img src={emailLoginBlack} alt="Username Icon" style={{ width: 24, height: 24, marginLeft: 16 }} />
                                <input
                                    type="text"
                                    placeholder="E-MAIL"
                                    style={{
                                        border: 'none',
                                        fontSize: 15,
                                        borderRadius: 8,
                                        backgroundColor: 'transparent', // Ensure background is transparent
                                        padding: '12px 25px',

                                        width: 270,
                                        color: 'rgba(32, 34, 36, 1)',
                                        outline: 'none' // Remove focus border
                                    }}
                                />

                            </div>
                        </div>
                        <div>
                            <Heading
                                Fontweight={700}
                                color={'rgba(32, 34, 36, 1)'}
                                Heading={'PHONE NUMBER'}
                                Fontsize={17}
                            // Tailwind CSS classes
                            />
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, borderRadius: 5, backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', marginBottom: 10 }}>
                                <img src={phoneLoginBlack} alt="Username Icon" style={{ width: 24, height: 24, marginLeft: 16 }} />
                                <input
                                    type="text"
                                    placeholder="PHONE NUMBER"
                                    style={{
                                        border: 'none',
                                        fontSize: 15,
                                        borderRadius: 8,
                                        backgroundColor: 'transparent', // Ensure background is transparent
                                        padding: '12px 25px',

                                        width: 270,
                                        color: 'rgba(32, 34, 36, 1)',
                                        outline: 'none' // Remove focus border
                                    }}
                                />

                            </div>
                        </div>
                        <div>
                            <Heading
                                Fontweight={700}
                                color={'rgba(32, 34, 36, 1)'}
                                Heading={'PASSWORD'}
                                Fontsize={17}
                            // mt={20}
                            // Tailwind CSS classes
                            />
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: 4, borderRadius: 5, backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', }}>
                                <img src={lockloginBlack} alt="Username Icon" style={{ width: 24, height: 24, marginLeft: 16 }} />

                                <input
                                    type={isPasswordVisible ? "text" : "password"}
                                    placeholder="PASSWORD"
                                    style={{
                                        border: 'none',
                                        fontSize: 15,
                                        borderRadius: 8,
                                        backgroundColor: 'transparent',
                                        padding: '12px 25px',

                                        width: 270,
                                        color: 'rgba(32, 34, 36, 1)',
                                        outline: 'none' // Remove focus border
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute right-5 top-6 transform -translate-y-1/2 cursor-pointer"
                                >
                                    {isPasswordVisible ? <FaRegEyeSlash /> : <FaRegEye />}
                                </button>

                            </div>
                        </div>
                        <div>
                            <Heading
                                Fontweight={700}
                                color={'rgba(32, 34, 36, 1)'}
                                Heading={'PASSWORD'}
                                Fontsize={17}
                            // mt={20}
                            // Tailwind CSS classes
                            />
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: 4, borderRadius: 5, backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', }}>
                                <img src={lockloginBlack} alt="Username Icon" style={{ width: 24, height: 24, marginLeft: 16 }} />

                                <input
                                    type={isPasswordVisible ? "text" : "password"}
                                    placeholder="PASSWORD"
                                    style={{
                                        border: 'none',
                                        fontSize: 15,
                                        borderRadius: 8,
                                        backgroundColor: 'transparent',
                                        padding: '12px 25px',

                                        width: 270,
                                        color: 'rgba(32, 34, 36, 1)',
                                        outline: 'none' // Remove focus border
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute right-5 top-6 transform -translate-y-1/2 cursor-pointer"
                                >
                                    {isPasswordVisible ? <FaRegEyeSlash /> : <FaRegEye />}
                                </button>

                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-10">
                        <MainButton backgroundColor={'var(--sidebar-selected-bg)'} title={'CREATE ACCOUNT'} width={330} height={40} color={'var(--scroll-thumb)'} />
                    </div>
                    
                </div>
            </div>
        </>
    );
};

export default Signup;
