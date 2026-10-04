import React, { useMemo, useState } from "react";
import { FormControl, InputLabel, Select, MenuItem, TextField, IconButton, Divider, Tabs, Tab, Box } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import AmountCard from "../../Components/AmountCard";
import Suppliers from "../Suppliers";

export default function Expenses() {
  // Tabs for Expense and Suppliers
  const [tab, setTab] = useState(0);

  // Category details table
  const [categoryRows, setCategoryRows] = useState([
    { id: 1, category: 'Office Supplies', description: 'Printer ink & copy paper', amount: 42.90 },
    { id: 2, category: 'Utilities', description: 'Internet bill for March', amount: 65.00 },
  ]);

  const [itemRows, setItemRows] = useState([
    { id: 1, product: 'POS Paper Roll', description: 'Thermal paper for POS terminals', qty: 5, rate: 2.50 },
    { id: 2, product: 'USB Keyboard', description: 'Replacement keyboard for accounting', qty: 1, rate: 15.00 },
    { id: 3, product: 'Cleaning Kit', description: 'Screen cleaning wipes', qty: 3, rate: 4.00 },
  ]);

  const amountTotal = useMemo(() => categoryRows.reduce((s, r) => s + Number(r.amount || 0), 0), [categoryRows]);
  const itemsTotal = useMemo(() => itemRows.reduce((s, r) => s + (Number(r.qty || 0) * Number(r.rate || 0)), 0), [itemRows]);

  const [showCategory, setShowCategory] = useState(true);
  const [showItems, setShowItems] = useState(true);

  // Draft input row for Category Details
  const [draftCategory, setDraftCategory] = useState({ category: '', description: '', amount: '' });
  const addDraftCategory = () => {
    if (!draftCategory.category || !draftCategory.amount) return;
    setCategoryRows((rows) => [
      ...rows,
      {
        id: Math.max(0, ...rows.map(r => r.id)) + 1,
        category: draftCategory.category,
        description: draftCategory.description,
        amount: Number(draftCategory.amount || 0)
      }
    ]);
    setDraftCategory({ category: '', description: '', amount: '' });
  };

  const categoryColumns = [
    { id: 'category', label: 'CATEGORY', align: 'left' },
    { id: 'description', label: 'DESCRIPTION', align: 'left' },
    { id: 'amount', label: (<div style={{ width: '100%', textAlign: 'center' }}>AMOUNT</div>), align: 'right' },
    { id: 'actionCell', label: (<div style={{ width: '100%', textAlign: 'center' }}>ACTION</div>), align: 'right' },
  ];
  const categoryData = categoryRows.map((r) => ({
    id: r.id,
    category: r.category,
    description: r.description,
    amount: `$${Number(r.amount).toFixed(2)}`,
    actionCell: (
      <IconButton color="error" onClick={() => setCategoryRows((rows) => rows.filter((x) => x.id !== r.id))}>
        <DeleteOutlineIcon />
      </IconButton>
    )
  }));

  // Display totals as a grey footer bar (not inside the table) to match mock

  const itemColumns = [
    { id: 'product', label: 'PRODUCT/SERVICE', align: 'left' },
    { id: 'description', label: 'DESCRIPTION', align: 'left' },
    { id: 'qty', label: (<div style={{ width: '100%', textAlign: 'center' }}>QTY</div>), align: 'right' },
    { id: 'rate', label: (<div style={{ width: '100%', textAlign: 'center' }}>RATE</div>), align: 'right' },
    { id: 'amount', label: (<div style={{ width: '100%', textAlign: 'center' }}>AMOUNT</div>), align: 'right' },
    { id: 'actionCell', label: (<div style={{ width: '100%', textAlign: 'center' }}>ACTION</div>), align: 'right' },
  ];
  const itemData = itemRows.map((r) => ({
    id: r.id,
    product: r.product,
    description: r.description,
    qty: r.qty,
    rate: `$${Number(r.rate).toFixed(2)}`,
    amount: `$${(Number(r.qty) * Number(r.rate)).toFixed(2)}`,
    actionCell: (
      <IconButton color="error" onClick={() => setItemRows((rows) => rows.filter((x) => x.id !== r.id))}>
        <DeleteOutlineIcon />
      </IconButton>
    )
  }));

  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 20 }}>
      {/* Header */}
      {/* <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginBottom: 8 }}>
        <Heading Fontweight={700} color={'var(--sidebar-text-primary)'} Heading={'Expense'} Fontsize={30} />
      </div> */}

      {/* Primary tabs */}
      {/* <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ minHeight: 36 }}>
          <Tab label="Expense" sx={{ minHeight: 36 }} />
          <Tab label="Suppliers" sx={{ minHeight: 36 }} />
        </Tabs>
      </Box> */}

      {tab === 0 && (
        <>
          <AmountCard
            title="Amount"
            value={`$${(amountTotal || itemsTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subtitle="Overall Financial Standing"
            bgColor="#E3F2FD"
            barColor="#90CAF9"
          />

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap mt-2" style={{
            background: 'var(--dashboard-card-bg)',
            border: '1px solid var(--dashboard-box-border)',
            borderRadius: 16,
            padding: '12px 12px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
          }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="payee-label">Payee</InputLabel>
              <Select labelId="payee-label" label="Payee" value="">
                <MenuItem value="">Select</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="payment-account-label">Payment Account</InputLabel>
              <Select labelId="payment-account-label" label="Payment Account" value="">
                <MenuItem value="">Select</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="payment-method-label">Payment Method</InputLabel>
              <Select labelId="payment-method-label" label="Payment Method" value="">
                <MenuItem value="">Select</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="Payment Date" InputLabelProps={{ shrink: true }} />
          </div>

          {/* Category Details */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IconButton size="small" onClick={() => setShowCategory((v) => !v)}
                sx={{ border: '1px solid #D1D5DB', borderRadius: 1, background: '#fff' }}>
                {showCategory ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <span style={{ fontWeight: 700, color: '#374151', background:'#E5E7EB', padding:'6px 10px', borderRadius:8 }}>Category Details</span>
            </div>
            <div style={{
              borderRadius: 12,
              background: 'var(--dashboard-card-bg)',
              border: '1px solid var(--dashboard-box-border)',
              overflow: 'hidden'
            }}>
              {showCategory && (
                <div style={{ padding: 12 }}>
                  <MemoTable data={categoryData} columns={categoryColumns} disableFooter onRowClick={() => {}} accountingTable />
                  {/* Draft Input Row */}
                  <div className="grid" style={{ gridTemplateColumns: '1.2fr 1.2fr 0.6fr 60px', gap: 8, marginTop: 12 }}>
                    <FormControl size="small">
                      <Select
                        displayEmpty
                        value={draftCategory.category}
                        onChange={(e) => setDraftCategory(dc => ({ ...dc, category: e.target.value }))}
                        sx={{ background:'#fff' }}
                      >
                        <MenuItem value=""><em>-select category-</em></MenuItem>
                        <MenuItem value="Office Supplies">Office Supplies</MenuItem>
                        <MenuItem value="Utilities">Utilities</MenuItem>
                        <MenuItem value="Travel">Travel</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      placeholder="enter description"
                      value={draftCategory.description}
                      onChange={(e) => setDraftCategory(dc => ({ ...dc, description: e.target.value }))}
                      sx={{ background:'#fff' }}
                    />
                    <TextField
                      size="small"
                      placeholder="$0.00"
                      value={draftCategory.amount}
                      onChange={(e) => setDraftCategory(dc => ({ ...dc, amount: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') addDraftCategory(); }}
                      sx={{ background:'#fff' }}
                    />
                    <IconButton color="error" onClick={() => setDraftCategory({ category:'', description:'', amount:'' })}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Item Details */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IconButton size="small" onClick={() => setShowItems((v) => !v)}
                sx={{ border: '1px solid #D1D5DB', borderRadius: 1, background: '#fff' }}>
                {showItems ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <span style={{ fontWeight: 700, color: '#374151', background:'#E5E7EB', padding:'6px 10px', borderRadius:8 }}>Item Details</span>
            </div>
            <div style={{
              borderRadius: 12,
              background: 'var(--dashboard-card-bg)',
              border: '1px solid var(--dashboard-box-border)',
              overflow: 'hidden'
            }}>
              {showItems && (
                <>
                  <div style={{ padding: 12 }}>
                    <MemoTable data={itemData} columns={itemColumns} disableFooter onRowClick={() => {}} accountingTable />
                  </div>
                  <div style={{ background:'#E5E7EB', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', fontWeight:800, color:'#111827', borderTop:'1px solid rgba(0,0,0,0.08)' }}>
                    <span>Totals</span>
                    <span>{`$${itemsTotal.toFixed(2)}`}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 1 && (
        <div style={{ marginTop: 50 }}>
          <Suppliers />
        </div>
      )}
    </div>
  );
}
