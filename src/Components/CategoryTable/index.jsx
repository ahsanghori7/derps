import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import { useSelector } from 'react-redux';
import { getRequestWithOutBody } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';

// Styled components for table cells and rows
const CustomTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: 'var(--sidebar-selected-bg)',
        color: 'var(--sidebar-text-selected)',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        padding: '16px',
        border: 'none',
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 16,
        fontWeight: 600,
        height: 67,
        textAlign: 'center',
        borderRight: 'none',
        borderBottom: 'none',
        padding: '16px 40px',
        color: 'var(--sidebar-text-primary)'
    },
}));

const CustomTableRow = styled(TableRow)(({ theme }) => ({
    '& td': {
        backgroundColor: 'var(--dashboard-tab-box)',
    },
    boxShadow: '0 0 0 1px #e0e0e0',
    cursor: 'pointer',
}));

const CustomTableHeader = styled(TableHead)(({ theme }) => ({
    position: 'sticky',
    top: 0,
    zIndex: 1,
    '& .MuiTableRow-root': {
        backgroundColor: 'var(--sidebar-selected-bg)',
        margin: 0,
    },
    '& .MuiTableCell-root': {
        borderBottom: 'none',
        padding: '16px 8px',
        textAlign: 'center'
    },
}));

const CategoryTable = ({ menuList, permissionslocal, onPermissionsChange }) => {
    const [permissions, setPermissions] = useState([]);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [categories, setCategories] = useState([]);
    useEffect(() => {
        setPermissions(permissionslocal || []);
    }, [permissionslocal]);
    const fetchData = () => {
        // setLoading(true)
        // setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}category`, accessToken
        )
            .then(result => {
                setCategories(result?.data)
                // setCompanyCategoryArray(options);
                // setCompanyCategoryArray(result)setLoadin
                // setLoading(false)
            })
            .catch(error => {
                // setLoading(false)
            })
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCheckboxChange = (route) => {
        setPermissions((prevPermissions) => {
            const updatedPermissions = prevPermissions.includes(route)
                ? prevPermissions.filter((r) => r !== route)
                : [...prevPermissions, route];
            onPermissionsChange(updatedPermissions); // Notify parent component
            return updatedPermissions;
        });
    };
    // ... existing code ...

    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 700 }} stickyHeader aria-label="permissions table">
                <CustomTableHeader>
                    <TableRow>
                        <CustomTableCell>Categories</CustomTableCell>
                        {categories.map((item) => (
                            item.subItems ? item.subItems.map((subItem) => (
                                <CustomTableCell key={subItem.route}>{subItem.title}</CustomTableCell>
                            )) : (
                                <CustomTableCell key={item.route}>{item.title}</CustomTableCell>
                            )
                        ))}
                    </TableRow>
                </CustomTableHeader>
                <TableBody>
                    <CustomTableRow>
                        <CustomTableCell>Permissions</CustomTableCell>
                        {categories.map((item) => (
                            item.subItems ? item.subItems.map((subItem) => (
                                <CustomTableCell key={subItem.title}>
                                    <Checkbox
                                        checked={permissions.includes(subItem.title)}
                                        onChange={() => handleCheckboxChange(subItem.title)}
                                    />
                                </CustomTableCell>
                            )) : (
                                <CustomTableCell key={item.title}>
                                    <Checkbox
                                        checked={permissions.includes(item.title)}
                                        onChange={() => handleCheckboxChange(item.title)}
                                    />
                                </CustomTableCell>
                            )
                        ))}
                    </CustomTableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default CategoryTable;