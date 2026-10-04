import { useNavigate } from 'react-router-dom';
import Heading from '../../Components/Heading';
import { useState, useEffect } from 'react';
import { Button, Box, Typography, CircularProgress } from '@mui/material';
import { IoIosArrowBack } from 'react-icons/io';
import { toast } from 'react-toastify';
import TaxTable from './taxtable';
import TaxDashboardBox from '../../Components/TaxDashboardBox';
import { getRequestWithOutBody } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';

const TaxReports = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [taxData, setTaxData] = useState([]);
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    const [taxSummary, setTaxSummary] = useState([]); // Changed to array for dynamic boxes

    // Helper function to determine subtitle based on tax name
    const getTaxSubtitle = (taxName) => {
        const name = taxName.toLowerCase();
        if (name.includes('sales') || name.includes('state')) return 'City';
        if (name.includes('federal') || name.includes('income')) return 'National';
        if (name.includes('local') || name.includes('city') || name.includes('county')) return 'County';
        return 'General'; // Default subtitle
    };

    // Mock data for demonstration
    const mockTaxData = [
        { id: 1, date: '2024-01-15', taxName: 'State Tax', taxAmount: 2500.00 },
        { id: 2, date: '2024-01-20', taxName: 'Federal Tax', taxAmount: 1800.00 },
        { id: 3, date: '2024-02-10', taxName: 'City Tax', taxAmount: 750.00 },
        { id: 4, date: '2024-02-15', taxName: 'State Tax', taxAmount: 3200.00 },
        { id: 5, date: '2024-03-05', taxName: 'Local Tax', taxAmount: 1200.00 },
    ];

    useEffect(() => {
        fetchTaxSummary();
    }, [startDate, endDate]);

    const fetchTaxSummary = () => {
        setLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        
        const url = `${baseURl}account-report/tax-summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        
        getRequestWithOutBody(url, accessToken)
            .then((result) => {
                if (result && result.data && Array.isArray(result.data)) {
                    // Set tax summary as array for dynamic boxes
                    setTaxSummary(result.data);
                    
                    // Transform API data to match existing structure for table
                    setTaxData(result.data);
                }
            })
            .catch((error) => {
                toast.error('Failed to fetch tax summary data');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const totalTaxLiability = taxData.reduce((sum, item) => sum + item.taxAmount, 0);

    const columns = [
        { id: 'date', label: 'Date', align: 'center' },
        { id: 'taxName', label: 'Tax Name', align: 'center' },
        { id: 'taxAmount', label: 'Tax Amount', align: 'center' },
    ];

    const tableData = [
        ...taxData.map(item => ({
            ...item,
            date: new Date().toLocaleDateString(), // API doesn't provide date, using current date
            taxAmount: `$${(item.total || 0).toFixed(2)}`, // Map 'total' to 'taxAmount'
            taxName: item.taxName || 'Unknown Tax'
        })),
        {
            id: '__total__',
            date: null,
            taxName: 'Total Tax Liability',
            taxAmount: `$${taxData.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}`,
            isTotalRow: true
        }
    ];

    const handleBack = () => {
        navigate('/home/accountsReports');
    };

    const handleClear = () => {
        setStartDate('');
        setEndDate('');
    };

    const handleSelectionChange = (selectedIds) => {
        // Filter out the total row ID from selection
        const filteredIds = selectedIds.filter(id => id !== '__total__');
        setSelectedRowIds(filteredIds);
    };

    const handleDeleteSelected = () => {
        if (selectedRowIds.length === 0) {
            toast.error('Please select rows to delete');
            return;
        }
        
        // Filter out selected rows (excluding the total row)
        const updatedTaxData = taxData.filter(item => 
            !selectedRowIds.includes(item.id) && item.id !== '__total__'
        );
        setTaxData(updatedTaxData);
        setSelectedRowIds([]);
        toast.success(`Deleted ${selectedRowIds.length} tax record(s)`);
    };

    return (
        <div className="min-h-screen" style={{ 
            marginTop: -65, 
            backgroundColor: 'var(--dashboard-bg)', 
            padding: 10 
        }}>
            {/* Header with Back Button and Title */}
            <div className="flex items-center gap-1 mb-6">
                <Button
                    onClick={handleBack}
                    sx={{
                        minWidth: 'auto',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        }
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-primary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Tax Reports'}
                    Fontsize={30}
                />
            </div>

            {/* Dashboard Boxes */}
            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" padding="40px" mb={4}>
                    <CircularProgress size={40} />
                    <Typography variant="body1" sx={{ ml: 2 }}>Loading tax summary...</Typography>
                </Box>
            ) : (
                <div className="flex gap-4 mb-4 flex-wrap" >
                    {taxSummary.map((taxItem, index) => (
                        <div 
                            key={taxItem.accountId || index} 
                            onClick={() => navigate('/home/taxReports/stateTax', { 
                                state: { 
                                        accountId: taxItem.accountId,
                                        taxName: taxItem.taxName 
                                    }
                            })} 
                            style={{ cursor: 'pointer' }}
                        >
                            <TaxDashboardBox
                                title={taxItem.taxName}
                                amount={`$${(taxItem.total || 0).toFixed(2)}`}
                                subtitle={getTaxSubtitle(taxItem.taxName)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Date Filters */}
            <div className="flex justify-start items-end gap-3 flex-wrap mb-6">
                <div style={{ minWidth: 180 }}>
                    <label style={{ 
                        fontSize: 12, 
                        fontWeight: 600, 
                        color: 'var(--dashboard-text-primary)',
                        display: 'block',
                        marginBottom: '4px'
                    }}>
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full"
                        style={{
                            border: '1px solid var(--dashboard-box-border)',
                            borderRadius: 8,
                            backgroundColor: 'var(--dashboard-tab-box)',
                            height: 40,
                            padding: '8px 12px',
                            color: 'var(--dashboard-text-primary)'
                        }}
                    />
                </div>

                <div style={{ minWidth: 180 }}>
                    <label style={{ 
                        fontSize: 12, 
                        fontWeight: 600, 
                        color: 'var(--dashboard-text-primary)',
                        display: 'block',
                        marginBottom: '4px'
                    }}>
                        End Date
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full"
                        style={{
                            border: '1px solid var(--dashboard-box-border)',
                            borderRadius: 8,
                            backgroundColor: 'var(--dashboard-tab-box)',
                            height: 40,
                            padding: '8px 12px',
                            color: 'var(--dashboard-text-primary)'
                        }}
                    />
                </div>

                <Button
                    onClick={handleClear}
                    sx={{
                        backgroundColor: '#6B7280',
                        color: 'white',
                        height: 40,
                        minWidth: 120,
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: 16,
                        '&:hover': {
                            backgroundColor: '#4B5563',
                        }
                    }}
                >
                    Clear
                </Button>
            </div>

            {/* Tax Table */}
            <div>
                {selectedRowIds.length > 0 && (
                    <div className="flex justify-end mb-4">
                        <Button
                            onClick={handleDeleteSelected}
                            sx={{
                                backgroundColor: '#EF4444',
                                color: 'white',
                                height: 40,
                                minWidth: 120,
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: 16,
                                '&:hover': {
                                    backgroundColor: '#DC2626',
                                }
                            }}
                        >
                            Delete ({selectedRowIds.length})
                        </Button>
                    </div>
                )}

                <TaxTable />
            </div>
        </div>
    );
};

export default TaxReports;
