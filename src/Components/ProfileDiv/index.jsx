import Heading from "../Heading";

const ProfileDiv = (props) => {
    const { title, upload, data } = props;

    return (
        <>
            <div>
                <div style={{ backgroundColor: 'var(--navbar-dropdown-hover)', borderTopLeftRadius: 12, borderTopRightRadius: 12, }} className="mt-4 py-2 w-[90%] xl:w-[60%]">
                    <Heading
                        Fontweight={600}
                        color={'var(--sidebar-text-selected)'}
                        Heading={title}
                        Fontsize={18}
                        ml={30}
                    // Tailwind CSS classes
                    />
                </div>
                <div style={{ backgroundColor: 'var(--scroll-thumb)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, }} className="flex justify-between flex-wrap w-[90%] xl:w-[60%]  py-4 px-4">
                    <div className="flex gap-4 sm:gap-16 flex-wrap">
                        <div className="">
                            <div>
                                <Heading
                                    Fontweight={600}
                                    color={'var(--fieldsTitle)'}
                                    Heading={upload ? 'Username' : 'Agent Code'}
                                    Fontsize={16}
                                // Tailwind CSS classes
                                />
                                <Heading
                                    Fontweight={500}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={upload ? data?.username : data.code}
                                    Fontsize={14}
                                // Tailwind CSS classes
                                />
                            </div>
                            <div className="mt-3 sm:mt-7">
                                <Heading
                                    Fontweight={600}
                                    color={'var(--fieldsTitle)'}
                                    Heading={upload ? 'Is Active' : 'Contact No'}
                                    Fontsize={16}
                                // Tailwind CSS classes
                                />
                                <Heading
                                    Fontweight={500}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={upload ? data?.status : data.contact}
                                    Fontsize={14}
                                // Tailwind CSS classes
                                />
                            </div>
                        </div>
                        <div className=" " >
                            <div>
                                <Heading
                                    Fontweight={600}
                                    color={'var(--fieldsTitle)'}
                                    Heading={upload ? 'Revenue Share' : 'Agent Name'}
                                    Fontsize={16}
                                // Tailwind CSS classes
                                />
                                <Heading
                                    Fontweight={500}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={upload ? data?.revenueShare : data.name}
                                    Fontsize={14}
                                // Tailwind CSS classes
                                />
                            </div>
                            <div className="mt-3 sm:mt-7">
                                <Heading
                                    Fontweight={600}
                                    color={'var(--fieldsTitle)'}
                                    Heading={upload ? '' : 'Address'}
                                    Fontsize={16}
                                // Tailwind CSS classes
                                />
                                <Heading
                                    Fontweight={500}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={upload ? null : data.address}
                                    Fontsize={14}
                                // Tailwind CSS classes
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default ProfileDiv;
