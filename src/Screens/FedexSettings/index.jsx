import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Heading from '../../Components/Heading';
import Loader from '../../Components/Loader';
import { usePageTitle } from '../../Hooks/usePageTitle';
import { resolveTenantId } from '../../Utils/helper';
import {
  deleteFedexConnection,
  getFedexConnection,
  getFedexErrorToast,
  parseFedexErrorMessage,
  saveFedexConnection,
} from '../../Api/FedExApi';

const statusChip = (label, color) => (
  <Chip
    size="small"
    label={label}
    color={color}
    variant="outlined"
    sx={{ fontWeight: 600 }}
  />
);

const SectionCard = ({ title, description, children }) => (
  <Box
    sx={{
      p: 2.5,
      mb: 2.5,
      borderRadius: 2,
      border: '1px solid var(--sidebar-selected-bg, #e5e7eb)',
      backgroundColor: 'var(--dashboard-card-bg, #fff)',
    }}
  >
    <Typography
      variant="h6"
      sx={{ fontSize: 16, fontWeight: 700, color: 'var(--dashboard-text-primary)', mb: 0.5 }}
    >
      {title}
    </Typography>
    {description ? (
      <Typography
        variant="body2"
        sx={{ color: 'var(--dashboard-text-secondary)', mb: 2, maxWidth: 720 }}
      >
        {description}
      </Typography>
    ) : null}
    {children}
  </Box>
);

const emptyForm = () => ({
  clientId: '',
  clientSecret: '',
  accountNumber: '',
  environment: 'sandbox',
  senderName: '',
  senderPhone: '',
  senderAddress1: '',
  senderCity: '',
  senderState: '',
  senderZip: '',
});

const formFromConnection = (data, prev = emptyForm()) => ({
  ...emptyForm(),
  environment:
    data?.environment === 'production' || data?.environment === 'sandbox'
      ? data.environment
      : prev.environment || 'sandbox',
  senderName: data?.shipper?.name || '',
  senderPhone: data?.shipper?.phone || '',
  senderAddress1: data?.shipper?.address1 || '',
  senderCity: data?.shipper?.city || '',
  senderState: data?.shipper?.state || '',
  senderZip: data?.shipper?.zip || '',
});

const FedexSettings = () => {
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  const tenantFeatures = useSelector((state) => state.auth.tenantFeatures) || [];

  usePageTitle('FedEx', location);

  const isAdmin = String(userData?.roleTitle || '')
    .trim()
    .toLowerCase() === 'admin';

  const tenantId = resolveTenantId(userData);

  const hasShippingAccess = useMemo(() => {
    const enabled = new Set(
      (Array.isArray(tenantFeatures) ? tenantFeatures : [])
        .filter((tf) => tf && (tf.isEnabled === true || tf.isEnabled === 1 || tf.isEnabled === '1'))
        .map((tf) =>
          String(tf?.feature?.code ?? tf?.code ?? tf?.featureCode ?? '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    );
    return enabled.has('inventory') || enabled.has('invoices');
  }, [tenantFeatures]);

  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const refreshConnection = useCallback(async () => {
    if (!accessToken) return null;
    const data = await getFedexConnection(accessToken);
    setConnection(data || { configured: false });
    setForm((prev) => formFromConnection(data, prev));
    return data;
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        await refreshConnection();
      } catch (error) {
        if (!cancelled) {
          toast.error(parseFedexErrorMessage(error) || 'Failed to load FedEx settings');
          setConnection({ configured: false });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshConnection]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = async () => {
    if (!accessToken || saving) return;

    const clientId = String(form.clientId || '').trim();
    const clientSecret = String(form.clientSecret || '').trim();
    const accountNumber = String(form.accountNumber || '').trim();

    if (!clientId) {
      toast.error('Client ID is required');
      return;
    }
    if (!clientSecret) {
      toast.error('Client Secret is required');
      return;
    }
    if (!accountNumber) {
      toast.error('Account Number is required');
      return;
    }
    if (clientId.length > 255 || clientSecret.length > 255 || accountNumber.length > 255) {
      toast.error('Client ID, Client Secret, and Account Number must be 255 characters or fewer');
      return;
    }

    setSaving(true);
    try {
      const data = await saveFedexConnection(accessToken, {
        clientId,
        clientSecret,
        accountNumber,
        environment: form.environment,
        senderName: form.senderName,
        senderPhone: form.senderPhone,
        senderAddress1: form.senderAddress1,
        senderCity: form.senderCity,
        senderState: form.senderState,
        senderZip: form.senderZip,
      });
      setConnection(data || { configured: true });
      setForm((prev) => ({
        ...formFromConnection(data, prev),
        clientId: '',
        clientSecret: '',
        accountNumber: '',
      }));
      toast.success('FedEx credentials saved successfully');
      try {
        await refreshConnection();
      } catch {
        // status already updated from save response
      }
    } catch (error) {
      toast.error(getFedexErrorToast(error, 'Failed to save credentials'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!accessToken || removing) return;
    setRemoving(true);
    try {
      await deleteFedexConnection(accessToken);
      setConnection({ configured: false, tenantId: connection?.tenantId ?? tenantId });
      setForm(emptyForm());
      setRemoveOpen(false);
      toast.success('FedEx credentials removed');
    } catch (error) {
      toast.error(getFedexErrorToast(error, 'Failed to remove credentials'));
    } finally {
      setRemoving(false);
    }
  };

  const configured = Boolean(connection?.configured);
  const isActive = connection?.isActive !== false;
  const shipper = connection?.shipper;

  if (loading) {
    return <Loader />;
  }

  if (!hasShippingAccess) {
    return (
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2 }}>
        <Heading Heading="FedEx" Fontsize={22} Fontweight={700} mt={0} mb={12} />
        <Alert severity="info">
          FedEx is available when this tenant has Inventory or Invoices enabled. Ask a super admin
          to enable those features for this merchant.
        </Alert>
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2 }}>
        <Heading Heading="FedEx" Fontsize={22} Fontweight={700} mt={0} mb={12} />
        <Alert severity="info">
          Only a tenant Admin can view or update FedEx API credentials.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2, maxWidth: 860 }}>
      <Heading Heading="FedEx" Fontsize={22} Fontweight={700} mt={0} mb={6} />
      <Typography
        variant="body2"
        sx={{ color: 'var(--dashboard-text-secondary)', mb: 2, maxWidth: 720 }}
      >
        Each tenant uses its own FedEx Developer Portal credentials for rates, labels, tracking, and
        address validation. Credentials are stored encrypted on the server — secrets are never
        returned after save.
      </Typography>

      <SectionCard
        title="Connection status"
        description="Masked status only. Re-enter Client ID, Client Secret, and Account Number below to update."
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {configured
            ? statusChip('Configured', 'success')
            : statusChip('Not configured', 'warning')}
          {configured && !isActive ? statusChip('Inactive', 'warning') : null}
          {configured && connection?.environment
            ? statusChip(
                connection.environment === 'production' ? 'Production' : 'Sandbox',
                connection.environment === 'production' ? 'error' : 'default'
              )
            : null}
          {configured && connection?.hasClientSecret
            ? statusChip('Client secret set', 'success')
            : configured
              ? statusChip('No client secret', 'warning')
              : null}
          {configured && connection?.hasAccountNumber
            ? statusChip('Account number set', 'success')
            : configured
              ? statusChip('No account number', 'warning')
              : null}
          {connection?.clientIdMasked ? (
            <Typography variant="body2" sx={{ color: 'var(--dashboard-text-secondary)' }}>
              Client ID: {connection.clientIdMasked}
            </Typography>
          ) : null}
        </Stack>

        {configured && shipper ? (
          <Typography
            variant="body2"
            sx={{ color: 'var(--dashboard-text-secondary)', mb: 2 }}
          >
            Default shipper:{' '}
            {[shipper.name, shipper.address1, shipper.city, shipper.state, shipper.zip]
              .filter(Boolean)
              .join(', ') || '—'}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" onClick={refreshConnection}>
            Refresh status
          </Button>
          {configured ? (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setRemoveOpen(true)}
              disabled={removing}
            >
              Remove credentials
            </Button>
          ) : null}
        </Stack>

        {configured && connection?.updatedAt ? (
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 1.5, color: 'var(--dashboard-text-secondary)' }}
          >
            Last updated: {new Date(connection.updatedAt).toLocaleString()}
          </Typography>
        ) : null}
      </SectionCard>

      <SectionCard
        title={configured ? 'Update credentials' : 'Save credentials'}
        description="From FedEx Developer Portal → My Projects → API credentials. Account Number is the shipping account used for rates and labels."
      >
        {!configured ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Shipping rates, labels, tracking, and address validation will fail until credentials
            are saved.
          </Alert>
        ) : null}

        <Stack spacing={2}>
          <TextField
            size="small"
            fullWidth
            required
            label="Client ID"
            value={form.clientId}
            onChange={handleChange('clientId')}
            placeholder={
              configured && connection?.clientIdMasked
                ? `Current: ${connection.clientIdMasked}`
                : 'e.g. l7abcdef1234567890'
            }
            autoComplete="off"
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            size="small"
            fullWidth
            required
            label="Client Secret"
            type="password"
            value={form.clientSecret}
            onChange={handleChange('clientSecret')}
            placeholder="FedEx API Client Secret"
            autoComplete="new-password"
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            size="small"
            fullWidth
            required
            label="Account Number"
            value={form.accountNumber}
            onChange={handleChange('accountNumber')}
            placeholder={
              configured && connection?.hasAccountNumber
                ? 'Re-enter account number to update'
                : 'e.g. 740561073'
            }
            autoComplete="off"
            inputProps={{ maxLength: 255 }}
          />
          <FormControl size="small" fullWidth sx={{ maxWidth: 280 }}>
            <InputLabel id="fedex-env-label">Environment</InputLabel>
            <Select
              labelId="fedex-env-label"
              label="Environment"
              value={form.environment}
              onChange={handleChange('environment')}
            >
              <MenuItem value="sandbox">Sandbox</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </SectionCard>

      <SectionCard
        title="Default shipper (optional)"
        description="Used when a shipping draft omits shipper contact or address (invoice rates and labels). Leave blank to keep the existing warehouse identity on update."
      >
        <Stack spacing={2}>
          <TextField
            size="small"
            fullWidth
            label="Sender name"
            value={form.senderName}
            onChange={handleChange('senderName')}
            placeholder="e.g. Acme Warehouse"
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            size="small"
            fullWidth
            label="Sender phone"
            value={form.senderPhone}
            onChange={handleChange('senderPhone')}
            placeholder="e.g. 5551234567"
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            size="small"
            fullWidth
            label="Address line 1"
            value={form.senderAddress1}
            onChange={handleChange('senderAddress1')}
            placeholder="e.g. 123 Main St"
            inputProps={{ maxLength: 255 }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              fullWidth
              label="City"
              value={form.senderCity}
              onChange={handleChange('senderCity')}
              inputProps={{ maxLength: 255 }}
            />
            <TextField
              size="small"
              fullWidth
              label="State"
              value={form.senderState}
              onChange={handleChange('senderState')}
              placeholder="e.g. TX"
              inputProps={{ maxLength: 255 }}
              sx={{ maxWidth: { sm: 140 } }}
            />
            <TextField
              size="small"
              fullWidth
              label="ZIP"
              value={form.senderZip}
              onChange={handleChange('senderZip')}
              placeholder="e.g. 75201"
              inputProps={{ maxLength: 255 }}
              sx={{ maxWidth: { sm: 160 } }}
            />
          </Stack>
        </Stack>
      </SectionCard>

      <Box sx={{ mb: 2.5 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? 'Saving…' : configured ? 'Update credentials' : 'Save credentials'}
        </Button>
      </Box>

      <Dialog open={removeOpen} onClose={() => !removing && setRemoveOpen(false)}>
        <DialogTitle>Remove FedEx credentials?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Rates, labels, tracking, and address validation will fail until credentials are
            configured again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveOpen(false)} disabled={removing}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleRemove}
            disabled={removing}
            startIcon={removing ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FedexSettings;
