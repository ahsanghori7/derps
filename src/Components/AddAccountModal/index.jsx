import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControlLabel, Checkbox, Select, MenuItem, InputLabel, FormControl, Box, CircularProgress } from "@mui/material";
import Heading from "../../Components/Heading";
import LabeledInput from "../../Components/LabeledInput";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

/** postRequestWithBodyAndToken throws Error(bodyText); body is often JSON with message / errors */
function resolveApiErrorMessage(err, fallback) {
  const raw =
    (typeof err === "string" && err) ||
    err?.message ||
    err?.error?.message ||
    err?.data?.message ||
    "";

  if (raw == null || typeof raw !== "string") {
    return fallback;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      const s = parsed.trim();
      return s || fallback;
    }
    if (parsed && typeof parsed === "object") {
      const direct =
        (typeof parsed.message === "string" && parsed.message.trim()) ||
        (typeof parsed.error === "string" && parsed.error.trim()) ||
        (typeof parsed.msg === "string" && parsed.msg.trim()) ||
        (typeof parsed.detail === "string" && parsed.detail.trim()) ||
        (parsed.data && typeof parsed.data.message === "string" && parsed.data.message.trim());
      if (direct) {
        return direct;
      }

      if (Array.isArray(parsed.errors)) {
        const joined = parsed.errors
          .map((e) => (typeof e === "string" ? e : e?.message || e?.msg || ""))
          .filter(Boolean)
          .join(", ");
        if (joined) {
          return joined;
        }
      }

      if (parsed.errors && typeof parsed.errors === "object" && !Array.isArray(parsed.errors)) {
        const joined = Object.entries(parsed.errors)
          .map(([, v]) => (Array.isArray(v) ? v.join(", ") : String(v)))
          .filter(Boolean)
          .join(", ");
        if (joined) {
          return joined;
        }
      }
    }
  } catch (_) {
    /* use trimmed raw below */
  }

  if (trimmed && trimmed !== "An error occurred") {
    return trimmed;
  }
  return fallback;
}

export default function AddAccountModal({ open, onClose, accessToken, onCreated, mode = 'create', initialAccount = null, editableFields = [], onSubmit }) {
  const userData = useSelector((state) => state.userData.userDetails);
  const localUserData = useMemo(() => {
    try {
      const raw = localStorage.getItem('userDetails');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }, []);
  const tenantId = useMemo(() => {
    const source = (userData && Object.keys(userData).length ? userData : null) || localUserData;
    const direct = source?.tenantId ?? source?.tenantID ?? source?.tenant_id;
    if (direct != null && direct !== '') return Number(direct);
    const nested = source?.tenant?.id ?? source?.tenant?.tenantId ?? source?.tenant?.tenantID;
    if (nested != null && nested !== '') return Number(nested);
    return null;
  }, [userData, localUserData]);
  const [form, setForm] = useState({
    accountName: "",
    accountType: "assets",
    accountClass: "general",
    isSub: false,
    description: "",
    openingBalance: "",
    currentBalance: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [parentAccounts, setParentAccounts] = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [selectedParent, setSelectedParent] = useState("");

  useEffect(() => {
    if (!open) {
      setForm({ accountName: '', accountType: 'assets', accountClass: 'general', isSub: false, description: '', openingBalance: '', currentBalance: '' });
      setSelectedParent('');
      setParentAccounts([]);
      setError('');
      setSaving(false);
      return;
    }
    // If editing, prefill from initialAccount
    if (open && mode === 'edit' && initialAccount) {
      setForm({
        accountName: initialAccount.name || '',
        accountType: initialAccount.type || 'assets',
        accountClass: initialAccount.accountClass || 'general',
        isSub: !!initialAccount.parentId,
        description: initialAccount.description || '',
        openingBalance: initialAccount.openingBalance != null ? String(initialAccount.openingBalance) : '',
        currentBalance: initialAccount.currentBalance != null ? String(initialAccount.currentBalance) : ''
      });
      setSelectedParent(initialAccount.parentId ? Number(initialAccount.parentId) : '');
      // Ensure parent accounts are loaded so the disabled select can display the current parent label
      if (initialAccount.parentId && initialAccount.type) {
        fetchParentAccounts(initialAccount.type);
      }
    }
  }, [open, mode, initialAccount]);

  const nameToSnakeCase = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const getTypeColor = (type) => {
    const colors = {
      'assets': '#3B82F6',
      'liability': '#F59E0B',
      'capital': '#8B5CF6',
      'expenses': '#EF4444',
      'income': '#10B981',
      'other': '#6B7280'
    };
    return colors[type?.toLowerCase()] || '#6B7280';
  };

  const fetchParentAccounts = async (accountType) => {
    if (!accountType) return;
    setLoadingParents(true);
    try {
      const queryParams = new URLSearchParams({ type: accountType });
      if (tenantId) queryParams.append('tenantId', String(tenantId));
      const url = `${baseURl}account/categories/?${queryParams.toString()}`;
      const response = await getRequestWithOutBody(url, accessToken);
      const accounts = response?.data || [];
      const normalized = Array.isArray(accounts) ? accounts : [];
      const filtered = tenantId
        ? normalized.filter((a) => {
            const aTenantId = a?.tenantId ?? a?.tenantID ?? a?.tenant_id;
            return aTenantId == null ? true : Number(aTenantId) === Number(tenantId);
          })
        : normalized;
      setParentAccounts(filtered);
    } catch (err) {
      setParentAccounts([]);
    } finally {
      setLoadingParents(false);
    }
  };

  const createAccount = async () => {
    if (!form.accountName.trim()) {
      setError('Account name is required');
      return;
    }
    // In edit mode, delegate submit to parent
    if (mode === 'edit') {
      if (form.isSub && !selectedParent) {
        setError('Select Account Type is required');
        return;
      }
      if (onSubmit) {
        setSaving(true);
        setError('');
        try {
          let subType;
          if (form.isSub && selectedParent) {
            const selectedParentAccount = parentAccounts.find(account => account.id === selectedParent);
            if (selectedParentAccount) {
              subType = nameToSnakeCase(selectedParentAccount.name);
            } else {
              subType = nameToSnakeCase(form.accountName);
            }
          } else {
            subType = nameToSnakeCase(form.accountName);
          }

          await onSubmit({
            name: form.accountName.trim(),
            description: form.description.trim(),
            openingBalance: form.openingBalance === '' ? null : parseFloat(form.openingBalance) || 0,
            type: form.accountType,
            accountClass: form.accountClass,
            subType: subType,
            parentId: form.isSub ? Number(selectedParent) : null,
          });
          if (onClose) onClose();
        } catch (err) {
          setError(resolveApiErrorMessage(err, "Failed to save changes. Please try again."));
        } finally {
          setSaving(false);
        }
      }
      return;
    }
    setSaving(true);
    setError('');
    try {
      // If it's a subaccount and parent is selected, use parent account's name
      // Otherwise, generate subType from account name
      let subType;
      if (form.isSub && selectedParent) {
        const selectedParentAccount = parentAccounts.find(account => account.id === selectedParent);
        if (selectedParentAccount) {
          subType = nameToSnakeCase(selectedParentAccount.name);
        } else {
          subType = nameToSnakeCase(form.accountName);
        }
      } else {
        subType = nameToSnakeCase(form.accountName);
      }

      const accountData = {
        name: form.accountName.trim(),
        type: form.accountType,
        accountClass: form.accountClass,
        subType: subType,
        description: form.description.trim() || `${form.accountName} account`,
        openingBalance: parseFloat(form.openingBalance) || 0,
        currentBalance: parseFloat(form.currentBalance) || 0,
        isActive: true,
      };

      if (tenantId) {
        accountData.tenantId = tenantId;
      }

      if (form.isSub && selectedParent) {
        accountData.parentId = parseInt(selectedParent);
      }

      const result = await postRequestWithBodyAndToken(`${baseURl}account/`, accessToken, accountData);
      const created = result?.data?.data || result?.data || {};

      if (onCreated) onCreated(created);
      if (onClose) onClose();
    } catch (err) {
      setError(resolveApiErrorMessage(err, "Failed to create account. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose && onClose()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1.5 }}>
        <Heading Heading={'Account Details'} Fontweight={700} Fontsize={20} color={'var(--sidebar-selected-bg)'} />
      </DialogTitle>
      <DialogContent sx={{ pt: 3, overflow: 'visible' }}>
        {error && (
          <div style={{ 
            padding: 12, 
            marginBottom: 16, 
            backgroundColor: '#FEF2F2', 
            border: '1px solid #FECACA', 
            borderRadius: 8, 
            color: '#DC2626',
            fontSize: 14
          }}>
            {error}
          </div>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3, mt: 2, '& .MuiFormControl-root': { width: '100%' } }}>
          <LabeledInput
            label="Account Name"
            inputPlaceholder="Enter account name (e.g., My Cash, Office Supplies)"
            inputValue={form.accountName}
            onInputChange={(e) => setForm({ ...form, accountName: e.target.value })}
            ticketDetails
            required
            disabled={mode === 'edit' && !editableFields.includes('accountName')}
          />
          
          <FormControl size="small" fullWidth>
            <InputLabel id="acc-type-label">Account Category</InputLabel>
            <Select
              labelId="acc-type-label"
              label="Account Category"
              value={form.accountType}
              onChange={(e) => {
                const newAccountType = e.target.value;
                setForm({ ...form, accountType: newAccountType });
                if (form.isSub && newAccountType) {
                  setSelectedParent('');
                  fetchParentAccounts(newAccountType);
                }
              }}
              disabled={mode === 'edit' && !editableFields.includes('accountType')}
            >
              <MenuItem value="assets">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                  <span style={{ fontWeight: 600 }}>Assets</span>
                </div>
              </MenuItem>
              <MenuItem value="liability">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <span style={{ fontWeight: 600 }}>Liability</span>
                </div>
              </MenuItem>
              <MenuItem value="capital">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#8B5CF6' }} />
                  <span style={{ fontWeight: 600 }}>Capital</span>
                </div>
              </MenuItem>
              <MenuItem value="expenses">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  <span style={{ fontWeight: 600 }}>Expenses</span>
                </div>
              </MenuItem>
              <MenuItem value="income">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span style={{ fontWeight: 600 }}>Income</span>
                </div>
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="acc-class-label">Account Class</InputLabel>
            <Select
              labelId="acc-class-label"
              label="Account Class"
              value={form.accountClass}
              onChange={(e) => setForm({ ...form, accountClass: e.target.value })}
              disabled={mode === 'edit' && !editableFields.includes('accountClass')}
            >
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="vendor">Vendor</MenuItem>
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="employee">Employee</MenuItem>
              <MenuItem value="bank">Bank</MenuItem>
              <MenuItem value="tax">Tax</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, py: 1 }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={form.isSub} 
                  disabled={!form.accountType || mode === 'edit'}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setForm({ ...form, isSub: isChecked });
                    if (isChecked && form.accountType) {
                      fetchParentAccounts(form.accountType);
                    } else {
                      setParentAccounts([]);
                      setSelectedParent('');
                    }
                  }}
                  sx={{
                    color: 'var(--sidebar-selected-bg)',
                    '&.Mui-checked': {
                      color: 'var(--sidebar-selected-bg)',
                    },
                  }}
                />
              }
              label="Make this a subaccount"
              sx={{
                '& .MuiFormControlLabel-label': {
                  fontSize: '14px',
                  color: form.accountType ? 'var(--sidebar-text-primary)' : '#9CA3AF'
                }
              }}
            />
          </Box>

          {form.isSub && (
            <FormControl size="small" fullWidth>
              <InputLabel id="parent-account-label">
                {loadingParents ? 'Loading Account Type...' : 'Select Account Type'}
              </InputLabel>
              <Select
                labelId="parent-account-label"
                label={loadingParents ? 'Loading Account Type...' : 'Select Account Type'}
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={loadingParents || parentAccounts.length === 0 || (mode === 'edit' && !editableFields.includes('parentId'))}
              >
                {parentAccounts.length === 0 && !loadingParents ? (
                  <MenuItem disabled>
                    <em style={{ color: '#9CA3AF' }}>No parent accounts available for {form.accountType}</em>
                  </MenuItem>
                ) : (
                  parentAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                        <div style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          backgroundColor: getTypeColor(account.type) 
                        }} />
                        <span style={{ fontWeight: 500 }}>{account.name}</span>
                        {account.code && (
                          <span style={{ 
                            color: '#748092', 
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            marginLeft: 'auto'
                          }}>
                            ({account.code})
                          </span>
                        )}
                      </div>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <LabeledInput
              label="Opening Balance (Optional)"
              inputPlaceholder="0.00"
              inputValue={form.openingBalance}
              onInputChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setForm({ ...form, openingBalance: value });
                }
              }}
              ticketDetails
              disabled={mode === 'edit' && !editableFields.includes('openingBalance')}
            />
            <LabeledInput
              label="Current Balance (Optional)"
              inputPlaceholder="0.00"
              inputValue={form.currentBalance}
              onInputChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setForm({ ...form, currentBalance: value });
                }
              }}
              ticketDetails
              disabled={mode === 'edit'}
            />
          </Box>

          <LabeledInput
            label="Description (Optional)"
            inputPlaceholder="Enter account description"
            inputValue={form.description}
            onInputChange={(e) => setForm({ ...form, description: e.target.value })}
            ticketDetails
            disabled={mode === 'edit' && !editableFields.includes('description')}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={() => {
            if (onClose) onClose();
          }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={createAccount}
          disabled={saving || !form.accountName.trim()}
          sx={{ minWidth: 100 }}
        >
          {saving ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Account')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
