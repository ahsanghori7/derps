import React, { useMemo, useState, useEffect } from "react";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
// Using simple inputs for tight inline cells (labels add extra spacing)
import { Select, MenuItem, FormControl, InputLabel, Button, Box } from "@mui/material";

export default function AccountRegister() {
  const [accountType, setAccountType] = useState("");
  const [rows, setRows] = useState([]);
  const [editableRowId, setEditableRowId] = useState(null);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setRows([
      { id: 1, date: "03/10/2025", ref: "INV-873", type: "Bill", payee: "Auto Repair Co.", memo: "Truck Maintenance", classLocation: "Service Dept", payment: "$1,200.00", deposit: "-", balance: "$375.00" },
      { id: 2, date: "03/10/2025", ref: "JV-209", type: "Journal", payee: "Depreciation Entry", memo: "Monthly Depreciation", classLocation: "Accounting", payment: "$375.00", deposit: "-", balance: "$375.00" },
      { id: 3, date: "03/10/2025", ref: "JV-209", type: "Journal", payee: "Depreciation Entry", memo: "Monthly Depreciation", classLocation: "Accounting", payment: "$375.00", deposit: "-", balance: "$375.00" },
      { id: 4, date: "12/13/2024", ref: "CHQ-112", type: "Expense", payee: "Shell Fuel Station", memo: "Monthly Fuel Expense", classLocation: "Fleet Dept", payment: "$90,210.43", deposit: "-", balance: "$90,210.43" },
      { id: 5, date: "04/01/2025", ref: "REC-098", type: "Deposit", payee: "Sale of Old Tires", memo: "Recovered Part Sales", classLocation: "Inventory Adj.", payment: "-", deposit: "$200.00", balance: "$200.00" }
    ]);
  }, []);

  const columns = useMemo(() => [
    { id: "date", label: "DATE", align: "left" },
    { id: "ref", label: "REF NO", align: "center" },
    { id: "type", label: "TYPE", align: "center" },
    { id: "payee", label: "PAYEE / ACCOUNT", align: "center" },
    { id: "memo", label: "MEMO", align: "center" },
    { id: "classLocation", label: "CLASS LOCATION", align: "center" },
    { id: "payment", label: "PAYMENT", align: "right" },
    { id: "deposit", label: "DEPOSIT", align: "right" },
    { id: "balance", label: "BALANCE", align: "right" },
  ], []);

  const handleRowClick = (row) => {
    setEditableRowId(row.id);
    setDraft(row);
  };

  const handleDraftChange = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const saveDraft = () => {
    setRows((prev) => prev.map((r) => (r.id === editableRowId ? { ...r, ...draft } : r)));
    setEditableRowId(null);
    setDraft({});
  };

  const cancelDraft = () => {
    setEditableRowId(null);
    setDraft({});
  };

  const deleteRow = () => {
    setRows((prev) => prev.filter((r) => r.id !== editableRowId));
    setEditableRowId(null);
    setDraft({});
  };

  const baseInput = {
    width: '100%',
    background: '#ffffff',
    border: '1px solid var(--sidebar-selected-bg)',
    borderRadius: 8,
    padding: '6px 10px',
    height: 32,
    boxSizing: 'border-box',
    fontSize: 12,
    color: 'var(--dashboard-text-primary)'
  };

  const renderEditableCell = (columnId, row) => {
    switch (columnId) {
      case 'date':
        return (
          <input
            type="date"
            value={(draft.dateIso) || ''}
            onChange={(e) => {
              // keep display like 03/10/2025 while store iso for draft
              const iso = e.target.value;
              handleDraftChange('dateIso', iso);
              try {
                const d = new Date(iso);
                const disp = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                handleDraftChange('date', disp);
              } catch {}
            }}
            style={{ ...baseInput, minWidth: 140 }}
          />
        );
      case 'ref':
        return (
          <input
            placeholder="Ref No"
            value={draft.ref || ''}
            onChange={(e) => handleDraftChange('ref', e.target.value)}
            style={{ ...baseInput, minWidth: 140 }}
          />
        );
      case 'type':
        return (
          <FormControl size="small" fullWidth sx={{ minWidth: 140, '& .MuiSelect-select': { height: 32, display: 'flex', alignItems: 'center', paddingY: 0.5, fontSize: 12, backgroundColor: '#ffffff', borderRadius: 1 } }}>
            <Select value={draft.type || ''} onChange={(e) => handleDraftChange('type', e.target.value)}>
              <MenuItem value="Journal">Journal</MenuItem>
              <MenuItem value="Bill">Bill</MenuItem>
              <MenuItem value="Expense">Expense</MenuItem>
              <MenuItem value="Deposit">Deposit</MenuItem>
            </Select>
          </FormControl>
        );
      case 'payee':
        return (
          <input
            placeholder="Payee / Account"
            value={draft.payee || ''}
            onChange={(e) => handleDraftChange('payee', e.target.value)}
            style={{ ...baseInput, minWidth: 260 }}
          />
        );
      case 'memo':
        return (
          <input
            placeholder="Memo"
            value={draft.memo || ''}
            onChange={(e) => handleDraftChange('memo', e.target.value)}
            style={{ ...baseInput, minWidth: 220 }}
          />
        );
      case 'classLocation':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
            <FormControl size="small" fullWidth sx={{ minWidth: 140, '& .MuiSelect-select': { height: 32, display: 'flex', alignItems: 'center', paddingY: 0.5, fontSize: 12, backgroundColor: '#ffffff', borderRadius: 1 } }}>
              <Select value={draft.class || ''} onChange={(e) => handleDraftChange('class', e.target.value)} displayEmpty>
                <MenuItem value="">Class</MenuItem>
                <MenuItem value="Service Dept">Service Dept</MenuItem>
                <MenuItem value="Accounting">Accounting</MenuItem>
                <MenuItem value="Fleet Dept">Fleet Dept</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth sx={{ minWidth: 140, '& .MuiSelect-select': { height: 32, display: 'flex', alignItems: 'center', paddingY: 0.5, fontSize: 12, backgroundColor: '#ffffff', borderRadius: 1 } }}>
              <Select value={draft.location || ''} onChange={(e) => handleDraftChange('location', e.target.value)} displayEmpty>
                <MenuItem value="">Location</MenuItem>
                <MenuItem value="HQ">HQ</MenuItem>
                <MenuItem value="Warehouse">Warehouse</MenuItem>
              </Select>
            </FormControl>
          </div>
        );
      case 'payment':
        return (
          <input
            placeholder="0.00"
            type="number"
            value={(draft.payment || '').toString().replace(/[^0-9.\-]/g, '')}
            onChange={(e) => handleDraftChange('payment', e.target.value)}
            style={{ ...baseInput, minWidth: 160, textAlign: 'right' }}
          />
        );
      case 'deposit':
        return (
          <input
            placeholder="0.00"
            type="number"
            value={(draft.deposit || '').toString().replace(/[^0-9.\-]/g, '')}
            onChange={(e) => handleDraftChange('deposit', e.target.value)}
            style={{ ...baseInput, minWidth: 160, textAlign: 'right' }}
          />
        );
      case 'balance':
        return (
          <input
            placeholder="$0.00"
            value={(draft.balance || '').toString()}
            onChange={(e) => handleDraftChange('balance', e.target.value)}
            style={{ ...baseInput, minWidth: 160, textAlign: 'right' }}
          />
        );
      default:
        return draft[columnId] || row[columnId];
    }
  };

  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
      <div className="flex items-center justify-between">
        <Heading Fontweight={700} color={'var(--sidebar-text-primary)'} Heading={'Bank Register'} Fontsize={30} />
        <Heading Fontweight={700} color={'var(--sidebar-text-primary)'} Heading={'Ending Balance'} Fontsize={14} />
      </div>

      <div className="mt-2" style={{ maxWidth: 280 }}>
        <FormControl size="small" fullWidth>
          <InputLabel id="acc-select-label">Account Type</InputLabel>
          <Select labelId="acc-select-label" label="Account Type" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            <MenuItem value="">--select account--</MenuItem>
            <MenuItem value="Bank">Bank</MenuItem>
            <MenuItem value="Other Current Assets">Other Current Assets</MenuItem>
          </Select>
        </FormControl>
      </div>

      <div className="mt-3">
        <MemoTable
          data={rows}
          columns={columns}
          customerTable
          registerTable
          editableRowId={editableRowId}
          onRowClick={handleRowClick}
          renderEditableCell={renderEditableCell}
          renderEditActions={() => (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="outlined" color="error" size="small" onClick={(e) => { e.stopPropagation(); deleteRow(); }}>Delete</Button>
              <Button variant="outlined" size="small" onClick={(e) => { e.stopPropagation(); cancelDraft(); }}>Cancel</Button>
              <Button variant="contained" size="small" onClick={(e) => { e.stopPropagation(); saveDraft(); }}>Save</Button>
            </Box>
          )}
        />
      </div>
    </div>
  );
}
