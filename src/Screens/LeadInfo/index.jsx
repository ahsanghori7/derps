import React, { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import styled from '@mui/material/styles/styled';
import LeadDetail from './LeadDetail';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  '& .MuiTableCell-head': {
    backgroundColor: '#f8f9fa',
    fontWeight: 600,
    color: '#2c3e50',
    borderBottom: '2px solid #e9ecef',
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: '#f8f9fa',
    cursor: 'pointer',
  },
}));

const StatusChip = styled(Chip)(({ theme, status }) => {
  const statusColors = {
    'working': { bg: '#e3f2fd', color: '#1976d2' },
    'completed': { bg: '#e8f5e8', color: '#2e7d32' },
    'closed': { bg: '#ffebee', color: '#c62828' },
    'converted': { bg: '#f3e5f5', color: '#7b1fa2' },
  };
  
  const colors = statusColors[status] || statusColors.working;
  
  return {
    backgroundColor: colors.bg,
    color: colors.color,
    fontWeight: 500,
    fontSize: '0.75rem',
  };
});

const dummyLeads = [
  {
    id: 1,
    name: 'John Carter',
    company: 'Carter Supplies Inc.',
    title: 'Procurement Manager',
    phone: '+1 (312) 555-0198',
    email: 'john.carter@cartersupplies.com',
    status: 'working',
    statusText: 'Working - Contacted',
    revenue: '$2,400,000',
    industry: 'Wholesale Distribution',
    step: 2,
  },
  {
    id: 2,
    name: 'Alice Johnson',
    company: 'Tech Solutions LLC',
    title: 'CEO',
    phone: '+1 (415) 555-0142',
    email: 'alice.johnson@techsolutions.com',
    status: 'completed',
    statusText: 'Completed',
    revenue: '$5,200,000',
    industry: 'Technology',
    step: 1,
  },
  {
    id: 3,
    name: 'Michael Davis',
    company: 'Davis Manufacturing',
    title: 'Operations Director',
    phone: '+1 (212) 555-0187',
    email: 'michael.davis@davismanufacturing.com',
    status: 'closed',
    statusText: 'Closed - Not Contacted',
    revenue: '$1,800,000',
    industry: 'Manufacturing',
    step: 3,
  },
  {
    id: 4,
    name: 'Sarah Wilson',
    company: 'Global Retail Co.',
    title: 'VP of Sales',
    phone: '+1 (617) 555-0123',
    email: 'sarah.wilson@globalretail.com',
    status: 'converted',
    statusText: 'Lead Converted',
    revenue: '$8,500,000',
    industry: 'Retail',
    step: 4,
  },
  {
    id: 5,
    name: 'Robert Brown',
    company: 'Brown Industries',
    title: 'Purchasing Manager',
    phone: '+1 (713) 555-0156',
    email: 'robert.brown@brownindustries.com',
    status: 'working',
    statusText: 'Working - Contacted',
    revenue: '$3,100,000',
    industry: 'Industrial',
    step: 2,
  },
];

const LeadInfo = () => {
  const navigate = useNavigate();

  const handleRowClick = (lead) => {
    navigate(`/home/sales/lead/${lead.id}`, { state: { lead } });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#2c3e50' }}>
        Sales Pipeline
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="body1" sx={{ color: '#6c757d' }}>
          Manage your sales leads and track progress through the sales process
        </Typography>
        <Button 
          variant="contained" 
          sx={{ 
            backgroundColor: '#1976d2',
            '&:hover': { backgroundColor: '#1565c0' },
            borderRadius: '8px',
            textTransform: 'none',
          }}
        >
          Add New Lead
        </Button>
      </Box>

      <StyledTableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lead Name</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Annual Revenue</TableCell>
              <TableCell>Industry</TableCell>
              <TableCell>Step</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dummyLeads.map((lead) => (
              <TableRow key={lead.id} onClick={() => handleRowClick(lead)}>
                <TableCell sx={{ fontWeight: 500 }}>{lead.name}</TableCell>
                <TableCell>{lead.company}</TableCell>
                <TableCell>{lead.title}</TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>
                  <StatusChip 
                    label={lead.statusText} 
                    status={lead.status}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{lead.revenue}</TableCell>
                <TableCell>{lead.industry}</TableCell>
                <TableCell>
                  <Chip 
                    label={`Step ${lead.step}`} 
                    size="small"
                    sx={{ 
                      backgroundColor: '#f0f0f0',
                      color: '#333',
                      fontSize: '0.75rem',
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
    </Box>
  );
};

export default LeadInfo;
