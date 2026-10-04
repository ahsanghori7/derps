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

const PermissionsTable = ({ menuList, permissionslocal, onPermissionsChange }) => {
    const [permissions, setPermissions] = useState([]);
    useEffect(() => {
        setPermissions(permissionslocal || []);
    }, [permissionslocal]);

    const flattenRoutableItems = (items) => {
        const result = [];
        const walk = (list) => {
            (list || []).forEach((item) => {
                if (item?.route) {
                    result.push({ name: item?.name || item?.route, route: item.route });
                }
                if (Array.isArray(item?.subItems) && item.subItems.length > 0) {
                    walk(item.subItems);
                }
            });
        };
        walk(items);
        return result;
    };

    const permissionColumns = flattenRoutableItems(menuList);
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
                        <CustomTableCell>Roles</CustomTableCell>
                        {permissionColumns.map((col) => (
                            <CustomTableCell key={col.route}>{col.name}</CustomTableCell>
                        ))}
                    </TableRow>
                </CustomTableHeader>
                <TableBody>
                    <CustomTableRow>
                        <CustomTableCell>Permissions</CustomTableCell>
                        {permissionColumns.map((col) => (
                            <CustomTableCell key={col.route}>
                                <Checkbox
                                    checked={permissions.includes(col.route)}
                                    onChange={() => handleCheckboxChange(col.route)}
                                />
                            </CustomTableCell>
                        ))}
                    </CustomTableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default PermissionsTable;