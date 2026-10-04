import PropTypes from 'prop-types';

const PrintPreview = ({ labelImage, loading, error, trackingNumber }) => {
    if (loading) {
        return (
            <div
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                style={{ minHeight: 180 }}
            >
                <div className="flex items-center justify-center h-full py-12">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                        <p className="text-sm text-gray-500">Generating label...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden"
                style={{ minHeight: 180 }}
            >
                <div className="flex items-center justify-center h-full py-12 px-4">
                    <div className="text-center">
                        <p className="text-sm text-red-600 mb-2">Error generating label</p>
                        <p className="text-xs text-gray-500">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!labelImage) {
        return (
            <div
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                style={{ minHeight: 180 }}
            >
                <div className="flex items-center justify-center h-full py-12">
                    <p className="text-sm text-gray-400">No label preview available</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            style={{ minHeight: 180 }}
        >
            <div className="p-4">
                {trackingNumber && (
                    <div className="mb-3 pb-3 border-b border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Tracking Number:</p>
                        <p className="text-sm font-semibold text-gray-900">{trackingNumber}</p>
                    </div>
                )}
                <div className="flex items-center justify-center">
                    <img
                        src={labelImage}
                        alt="Shipping Label Preview"
                        className="max-w-full h-auto"
                        onError={(e) => {
                        }}
                        onLoad={() => {
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

PrintPreview.propTypes = {
    labelImage: PropTypes.string,
    loading: PropTypes.bool,
    error: PropTypes.string,
    trackingNumber: PropTypes.string,
};

export default PrintPreview;

