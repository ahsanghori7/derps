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
  deleteAuthorizeNetConnection,
  getAuthorizeNetConnection,
  getAuthorizeNetWebhookUrl,
  parseAuthorizeNetErrorMessage,
  saveAuthorizeNetConnection,
} from '../../Api/authorizeNetApi';

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
  apiLoginId: '',
  transactionKey: '',
  signatureKey: '',
  environment: 'sandbox',
});

const AuthorizeNetSettings = () => {
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  const tenantFeatures = useSelector((state) => state.auth.tenantFeatures) || [];

  usePageTitle('Authorize.Net', location);

  const isAdmin = String(userData?.roleTitle || '')
    .trim()
    .toLowerCase() === 'admin';

  const tenantId = resolveTenantId(userData);

  const hasInvoicesAccess = useMemo(() => {
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
    return enabled.has('invoices');
  }, [tenantFeatures]);

  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const webhookUrl = useMemo(() => {
    const id = connection?.tenantId ?? tenantId;
    return getAuthorizeNetWebhookUrl(id);
  }, [connection?.tenantId, tenantId]);

  const refreshConnection = useCallback(async () => {
    if (!accessToken) return null;
    const data = await getAuthorizeNetConnection(accessToken);
    setConnection(data || { configured: false });
    if (data?.environment === 'production' || data?.environment === 'sandbox') {
      setForm((prev) => ({ ...prev, environment: data.environment }));
    }
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
          toast.error(
            parseAuthorizeNetErrorMessage(error) || 'Failed to load Authorize.Net settings'
          );
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

    const apiLoginId = String(form.apiLoginId || '').trim();
    const transactionKey = String(form.transactionKey || '').trim();

    if (!apiLoginId) {
      toast.error('API Login ID is required');
      return;
    }
    if (!transactionKey) {
      toast.error('Transaction Key is required');
      return;
    }

    setSaving(true);
    try {
      const data = await saveAuthorizeNetConnection(accessToken, {
        apiLoginId,
        transactionKey,
        signatureKey: form.signatureKey,
        environment: form.environment,
      });
      setConnection(data || { configured: true });
      setForm((prev) => ({
        ...prev,
        apiLoginId: '',
        transactionKey: '',
        signatureKey: '',
        environment: data?.environment || prev.environment,
      }));
      toast.success('Authorize.Net credentials saved successfully');
      try {
        await refreshConnection();
      } catch {
        // status already updated from save response
      }
    } catch (error) {
      toast.error(parseAuthorizeNetErrorMessage(error) || 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!accessToken || removing) return;
    setRemoving(true);
    try {
      await deleteAuthorizeNetConnection(accessToken);
      setConnection({ configured: false, tenantId: connection?.tenantId ?? tenantId });
      setForm(emptyForm());
      setRemoveOpen(false);
      toast.success('Authorize.Net credentials removed');
    } catch (error) {
      toast.error(parseAuthorizeNetErrorMessage(error) || 'Failed to remove credentials');
    } finally {
      setRemoving(false);
    }
  };

  const configured = Boolean(connection?.configured);
  const isActive = connection?.isActive !== false;

  if (loading) {
    return <Loader />;
  }

  if (!hasInvoicesAccess) {
    return (
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2 }}>
        <Heading Heading="Authorize.Net" Fontsize={22} Fontweight={700} mt={0} mb={12} />
        <Alert severity="info">
          Authorize.Net is available when this tenant has Invoices enabled. Ask a super admin to
          enable Invoices for this merchant.
        </Alert>
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2 }}>
        <Heading Heading="Authorize.Net" Fontsize={22} Fontweight={700} mt={0} mb={12} />
        <Alert severity="info">
          Only a tenant Admin can view or update Authorize.Net merchant credentials.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2, maxWidth: 860 }}>
      <Heading Heading="Authorize.Net" Fontsize={22} Fontweight={700} mt={0} mb={6} />
      <Typography
        variant="body2"
        sx={{ color: 'var(--dashboard-text-secondary)', mb: 2, maxWidth: 720 }}
      >
        Each tenant uses its own Authorize.Net merchant account for invoice hosted payments and
        card charges. Credentials are stored encrypted on the server — secrets are never returned
        after save.
      </Typography>

      <SectionCard
        title="Connection status"
        description="Masked status only. Re-enter credentials below to update."
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
          {configured && connection?.hasSignatureKey
            ? statusChip('Signature key set', 'success')
            : configured
              ? statusChip('No signature key', 'warning')
              : null}
          {connection?.apiLoginIdMasked ? (
            <Typography variant="body2" sx={{ color: 'var(--dashboard-text-secondary)' }}>
              API Login ID: {connection.apiLoginIdMasked}
            </Typography>
          ) : null}
        </Stack>

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
        description="From Authorize.Net → Account → API Credentials & Keys. Signature Key is required for webhook verification."
      >
        {!configured ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Payments will fail with a configuration error until credentials are saved.
          </Alert>
        ) : null}

        <Stack spacing={2}>
          <TextField
            size="small"
            fullWidth
            required
            label="API Login ID"
            value={form.apiLoginId}
            onChange={handleChange('apiLoginId')}
            placeholder={
              configured && connection?.apiLoginIdMasked
                ? `Current: ${connection.apiLoginIdMasked}`
                : 'e.g. 8N3xK9mP2'
            }
            autoComplete="off"
          />
          <TextField
            size="small"
            fullWidth
            required
            label="Transaction Key"
            type="password"
            value={form.transactionKey}
            onChange={handleChange('transactionKey')}
            placeholder="Authorize.Net Transaction Key"
            autoComplete="new-password"
          />
          <TextField
            size="small"
            fullWidth
            label="Signature Key (optional)"
            type="password"
            value={form.signatureKey}
            onChange={handleChange('signatureKey')}
            placeholder={
              connection?.hasSignatureKey
                ? 'Leave blank to keep existing key'
                : 'Required for webhook HMAC verification'
            }
            autoComplete="new-password"
            helperText="Used to verify X-ANET-Signature on payment webhooks"
          />
          <FormControl size="small" fullWidth sx={{ maxWidth: 280 }}>
            <InputLabel id="anet-env-label">Environment</InputLabel>
            <Select
              labelId="anet-env-label"
              label="Environment"
              value={form.environment}
              onChange={handleChange('environment')}
            >
              <MenuItem value="sandbox">Sandbox</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {saving ? 'Saving…' : configured ? 'Update credentials' : 'Save credentials'}
            </Button>
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard
        title="Webhook URL"
        description="Copy this into Authorize.Net → Account → Webhooks. Do not open it in the browser — it only accepts POST from Authorize.Net."
      >
        <Alert severity="info" sx={{ mb: 2 }}>
          Ye URL ek page nahi hai. Browser mein open karne se kuch nahi dikhega / error aayega.
          Authorize.Net payment hone ke baad isi endpoint pe notification bhejta hai (tenant{' '}
          <strong>{(connection?.tenantId ?? tenantId) || '—'}</strong>).
        </Alert>
        {webhookUrl ? (
          <Typography
            variant="body2"
            sx={{
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              color: 'var(--dashboard-text-primary)',
              p: 1.5,
              borderRadius: 1,
              border: '1px solid var(--sidebar-selected-bg, #e5e7eb)',
              backgroundColor: 'var(--dashboard-bg, #f9fafb)',
            }}
          >
            {webhookUrl}
          </Typography>
        ) : (
          <Alert severity="info">Tenant ID is required to build the webhook URL.</Alert>
        )}
      </SectionCard>

      <Dialog open={removeOpen} onClose={() => !removing && setRemoveOpen(false)}>
        <DialogTitle>Remove Authorize.Net credentials?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Invoice hosted payments and card charges will fail until credentials are configured
            again.
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

export default AuthorizeNetSettings;
