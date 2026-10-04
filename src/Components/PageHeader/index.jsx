const PageHeader = ({ title, subtitle, actions, children }) => {
    return (
        <div className="page-header">
            <div className="page-header-titles">
                <h1 className="page-header-title">{title}</h1>
                {subtitle ? <p className="page-header-subtitle">{subtitle}</p> : null}
            </div>
            {(actions || children) ? (
                <div className="page-header-actions">
                    {actions || children}
                </div>
            ) : null}
        </div>
    );
};

export default PageHeader;
