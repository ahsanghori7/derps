import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { GOTO_SALES_FEATURE_CODES } from '../../Utils/tenantFeatures';
import {
  disconnectGotoConnection,
  ensureGotoCallEvents,
  getGotoConnection,
  getGotoLines,
  getMyGotoLine,
  parseGotoErrorMessage,
  reconcileGotoCallEvents,
  setGotoAccountKey,
  setMyGotoLine,
  startGotoOAuth,
} from '../../Api/gotoApi';

const RECONCILE_LOOKBACK_HOURS = 12;
const OAUTH_POLL_MS = 2000;
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

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

const GotoSettings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  const tenantFeatures = useSelector((state) => state.auth.tenantFeatures) || [];

  usePageTitle('GoTo Connect', location);

  const isAdmin = String(userData?.roleTitle || '')
    .trim()
    .toLowerCase() === 'admin';

  const hasSalesAccess = useMemo(() => {
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
    return GOTO_SALES_FEATURE_CODES.some((code) => enabled.has(code));
  }, [tenantFeatures]);

  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState(null);
  const [accountKeyInput, setAccountKeyInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingAccountKey, setSavingAccountKey] = useState(false);
  const [ensuringEvents, setEnsuringEvents] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const [myLine, setMyLine] = useState(null);
  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState('');
  const [savingLine, setSavingLine] = useState(false);
  const oauthPollRef = useRef(null);
  const oauthPopupRef = useRef(null);

  const clearOauthWatch = useCallback(() => {
    if (oauthPollRef.current) {
      clearInterval(oauthPollRef.current);
      oauthPollRef.current = null;
    }
    const popup = oauthPopupRef.current;
    oauthPopupRef.current = null;
    if (popup && !popup.closed) {
      try {
        popup.close();
      } catch {
        // ignore cross-origin close errors
      }
    }
  }, []);

  useEffect(() => () => clearOauthWatch(), [clearOauthWatch]);

  const refreshConnection = useCallback(async () => {
    if (!accessToken) return null;
    const data = await getGotoConnection(accessToken);
    setConnection(data || { connected: false });
    if (data?.accountKey) {
      setAccountKeyInput(String(data.accountKey));
    }
    return data;
  }, [accessToken]);

  const refreshMyLine = useCallback(async () => {
    if (!accessToken) return;
    try {
      const line = await getMyGotoLine(accessToken);
      setMyLine(line);
      if (line?.lineId) setSelectedLineId(line.lineId);
    } catch {
      setMyLine(null);
    }
  }, [accessToken]);

  const loadLines = useCallback(async () => {
    if (!accessToken) return;
    setLinesLoading(true);
    try {
      const list = await getGotoLines(accessToken);
      const safeList = Array.isArray(list) ? list : [];
      setLines(safeList);
      setSelectedLineId((prev) => {
        if (prev && safeList.some((l) => l.lineId === prev)) return prev;
        return safeList[0]?.lineId || '';
      });
    } catch (error) {
      const message = parseGotoErrorMessage(error);
      toast.error(message || 'Failed to load GoTo lines');
      setLines([]);
    } finally {
      setLinesLoading(false);
    }
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
        const data = await refreshConnection();
        await refreshMyLine();
        if (!cancelled && data?.connected) {
          await loadLines();
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(parseGotoErrorMessage(error) || 'Failed to load GoTo settings');
          setConnection({ connected: false });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshConnection, refreshMyLine, loadLines]);

  // After OAuth redirect back to this page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthDone =
      params.has('goto') ||
      params.has('connected') ||
      params.get('gotoConnected') === '1' ||
      params.get('oauth') === 'success';

    if (!oauthDone || !accessToken) return;

    (async () => {
      try {
        const data = await refreshConnection();
        if (data?.connected) await loadLines();
        toast.success('GoTo connection updated');
      } catch (error) {
        toast.error(parseGotoErrorMessage(error) || 'Failed to refresh GoTo connection');
      } finally {
        navigate('/home/gotoSettings', { replace: true });
      }
    })();
  }, [accessToken, location.search, navigate, refreshConnection, loadLines]);

  useEffect(() => {
    if (myLine?.lineId) {
      setSelectedLineId(myLine.lineId);
    }
  }, [myLine?.lineId]);

  const handleConnect = async () => {
    if (!accessToken || connecting) return;
    setConnecting(true);
    clearOauthWatch();

    try {
      const data = await startGotoOAuth(accessToken);
      const authorizeUrl = data?.authorizeUrl;
      if (!authorizeUrl) {
        toast.error('GoTo authorize URL missing from server response');
        setConnecting(false);
        return;
      }

      // Backend callback returns JSON (not a FE redirect), so keep this app tab open
      // and complete OAuth in a popup while we poll connection status.
      const width = 640;
      const height = 720;
      const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
      const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
      const popup = window.open(
        authorizeUrl,
        'goto-oauth',
        `popup=yes,width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast.error('Popup blocked. Allow popups for this site, then try Connect again.');
        setConnecting(false);
        return;
      }

      oauthPopupRef.current = popup;
      toast.info('Complete GoTo login in the popup window…');

      const startedAt = Date.now();
      let finished = false;
      let pollInFlight = false;

      const finishSuccess = async (conn) => {
        if (finished) return;
        finished = true;
        clearOauthWatch();
        setConnection(conn || { connected: true });
        if (conn?.accountKey) setAccountKeyInput(String(conn.accountKey));
        if (conn?.connected) {
          try {
            await loadLines();
          } catch {
            // lines may load after account key is set
          }
        }
        setConnecting(false);
        toast.success('GoTo connected successfully');
      };

      const finishWithoutConnect = (message) => {
        if (finished) return;
        finished = true;
        clearOauthWatch();
        setConnecting(false);
        toast.info(message);
      };

      oauthPollRef.current = setInterval(async () => {
        if (finished || pollInFlight) return;
        pollInFlight = true;

        try {
          if (Date.now() - startedAt > OAUTH_TIMEOUT_MS) {
            finishWithoutConnect('GoTo connect timed out. Try again.');
            return;
          }

          const popupClosed = Boolean(popup.closed);

          try {
            const conn = await getGotoConnection(accessToken);
            if (conn?.connected) {
              await finishSuccess(conn);
              return;
            }
          } catch {
            // transient — keep waiting
          }

          if (popupClosed) {
            try {
              const conn = await getGotoConnection(accessToken);
              if (conn?.connected) {
                await finishSuccess(conn);
                return;
              }
            } catch {
              // ignore
            }
            finishWithoutConnect(
              'Popup closed before GoTo finished connecting. If you already approved access, click Refresh status.'
            );
          }
        } finally {
          pollInFlight = false;
        }
      }, OAUTH_POLL_MS);
    } catch (error) {
      clearOauthWatch();
      toast.error(parseGotoErrorMessage(error) || 'Failed to start GoTo connect');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!accessToken || disconnecting) return;
    setDisconnecting(true);
    try {
      await disconnectGotoConnection(accessToken);
      setConnection({ connected: false, tenantId: connection?.tenantId });
      setAccountKeyInput('');
      setMyLine(null);
      setLines([]);
      setSelectedLineId('');
      setDisconnectOpen(false);
      toast.success('GoTo disconnected');
    } catch (error) {
      toast.error(parseGotoErrorMessage(error) || 'Failed to disconnect GoTo');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveAccountKey = async () => {
    if (!accessToken || savingAccountKey) return;
    const key = String(accountKeyInput || '').trim();
    if (!key) {
      toast.error('Enter the GoTo account key');
      return;
    }
    setSavingAccountKey(true);
    try {
      await setGotoAccountKey(accessToken, key);
      let next = await refreshConnection();
      if (next?.connected && next?.accountKey && !next?.callEventsSubscribed) {
        try {
          await ensureGotoCallEvents(accessToken);
          next = await refreshConnection();
        } catch {
          // Ensure button remains available if this soft-fail happens
        }
      }
      toast.success(
        next?.callEventsSubscribed
          ? 'Account key saved — call events ready'
          : 'Account key saved'
      );
    } catch (error) {
      toast.error(parseGotoErrorMessage(error) || 'Failed to save account key');
    } finally {
      setSavingAccountKey(false);
    }
  };

  const handleEnsureCallEvents = async () => {
    if (!accessToken || ensuringEvents) return;
    setEnsuringEvents(true);
    try {
      await ensureGotoCallEvents(accessToken);
      await refreshConnection();
      toast.success('Call events subscription ensured');
    } catch (error) {
      toast.error(parseGotoErrorMessage(error) || 'Failed to ensure call events');
    } finally {
      setEnsuringEvents(false);
    }
  };

  const handleReconcile = async () => {
    if (!accessToken || reconciling) return;
    setReconciling(true);
    try {
      await reconcileGotoCallEvents(accessToken, {
        lookbackHours: RECONCILE_LOOKBACK_HOURS,
      });
      toast.success(`Reconciled GoTo call events (last ${RECONCILE_LOOKBACK_HOURS} hours)`);
    } catch (error) {
      toast.error(parseGotoErrorMessage(error) || 'Failed to reconcile call events');
    } finally {
      setReconciling(false);
    }
  };

  const handleSaveLine = async () => {
    if (!accessToken || savingLine) return;
    const selected = lines.find((line) => line.lineId === selectedLineId);
    if (!selected?.lineId) {
      toast.error('Select your GoTo line first');
      return;
    }
    setSavingLine(true);
    try {
      await setMyGotoLine(accessToken, {
        lineId: selected.lineId,
        extensionNumber: selected.extensionNumber,
      });
      setMyLine(selected);
      toast.success(
        selected.extensionNumber
          ? `GoTo line set to ext ${selected.extensionNumber}`
          : 'GoTo line saved'
      );
    } catch (error) {
      toast.error(parseGotoErrorMessage(error) || 'Failed to save GoTo line');
    } finally {
      setSavingLine(false);
    }
  };

  const connected = Boolean(connection?.connected);
  const accountKeyMissing = connected && !connection?.accountKey;
  const callEventsReady = Boolean(connection?.callEventsSubscribed);

  if (loading) {
    return <Loader />;
  }

  if (!hasSalesAccess) {
    return (
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2 }}>
        <Heading Heading="GoTo Connect" Fontsize={22} Fontweight={700} mt={0} mb={12} />
        <Alert severity="info">
          GoTo Connect is available when this tenant has Leads, Sales Activity, or Sales
          Opportunity access. Ask a super admin to enable sales features for this merchant.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2, maxWidth: 860 }}>
      <Heading Heading="GoTo Connect" Fontsize={22} Fontweight={700} mt={0} mb={6} />
      <Typography
        variant="body2"
        sx={{ color: 'var(--dashboard-text-secondary)', mb: 2, maxWidth: 720 }}
      >
        Click-to-call uses the agent&apos;s GoTo app or desk phone — not an in-browser softphone.
        Connect GoTo once for the tenant, then each agent picks their own line.
      </Typography>

      {isAdmin ? (
        <SectionCard
          title="Tenant connection"
          description="One GoTo OAuth connection and account key for the whole company. Required before agents can dial."
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {connected
              ? statusChip('Connected', 'success')
              : statusChip('Not connected', 'warning')}
            {connected && accountKeyMissing
              ? statusChip('Account key required', 'warning')
              : null}
            {connected && !accountKeyMissing
              ? callEventsReady
                ? statusChip('Call events ready', 'success')
                : statusChip('Call events not subscribed', 'warning')
              : null}
            {connection?.principal ? (
              <Typography variant="body2" sx={{ color: 'var(--dashboard-text-secondary)' }}>
                Principal: {connection.principal}
              </Typography>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {!connected ? (
              <Button
                variant="contained"
                onClick={handleConnect}
                disabled={connecting}
                startIcon={connecting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {connecting ? 'Waiting for GoTo…' : 'Connect GoTo'}
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDisconnectOpen(true)}
                  disabled={disconnecting}
                >
                  Disconnect
                </Button>
                <Button variant="outlined" onClick={refreshConnection}>
                  Refresh status
                </Button>
              </>
            )}
          </Stack>

          {connected ? (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 1, color: 'var(--dashboard-text-primary)' }}
              >
                Account key
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'var(--dashboard-text-secondary)', mb: 1.5 }}
              >
                Required for call duration tracking. Get it from GoTo Admin, or from a line&apos;s
                accountKey after listing lines.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Account key"
                  value={accountKeyInput}
                  onChange={(e) => setAccountKeyInput(e.target.value)}
                  placeholder="e.g. 3033809180587400336"
                />
                <Button
                  variant="contained"
                  onClick={handleSaveAccountKey}
                  disabled={savingAccountKey}
                  sx={{ whiteSpace: 'nowrap', minWidth: 120 }}
                  startIcon={savingAccountKey ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  Save key
                </Button>
              </Stack>

              {!callEventsReady && connection?.accountKey ? (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Call events are not subscribed yet. Duration and outcome will not update after
                  calls until this is fixed.
                  <Box sx={{ mt: 1.5 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleEnsureCallEvents}
                      disabled={ensuringEvents}
                      startIcon={
                        ensuringEvents ? <CircularProgress size={14} color="inherit" /> : null
                      }
                    >
                      Ensure call events
                    </Button>
                  </Box>
                </Alert>
              ) : null}

              {connected && connection?.accountKey ? (
                <Box sx={{ mt: 2.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 0.5, color: 'var(--dashboard-text-primary)' }}
                  >
                    Support: reconcile missed events
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'var(--dashboard-text-secondary)', mb: 1.5 }}
                  >
                    If a call&apos;s duration never appears, pull the last {RECONCILE_LOOKBACK_HOURS}{' '}
                    hours of GoTo call reports into CRM activities.
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={handleReconcile}
                    disabled={reconciling}
                    startIcon={reconciling ? <CircularProgress size={16} /> : null}
                  >
                    Reconcile last {RECONCILE_LOOKBACK_HOURS} hours
                  </Button>
                </Box>
              ) : null}
            </Box>
          ) : null}
        </SectionCard>
      ) : (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          Only a tenant Admin can connect or disconnect GoTo for the company. You can still set your
          personal GoTo line below once GoTo is connected.
        </Alert>
      )}

      <SectionCard
        title="My GoTo line"
        description="Each agent must select their own extension. Sharing one line across agents will collide and confuse call tracking."
      >
        {!connected ? (
          <Alert severity="warning">
            GoTo is not connected yet. Ask an admin to connect GoTo above before setting your line.
          </Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              {myLine?.extensionNumber ? (
                statusChip(`Your line: ext ${myLine.extensionNumber}`, 'success')
              ) : (
                statusChip('No line set', 'warning')
              )}
              {myLine?.name ? (
                <Typography variant="body2" sx={{ color: 'var(--dashboard-text-secondary)' }}>
                  {myLine.name}
                </Typography>
              ) : null}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <FormControl size="small" fullWidth sx={{ maxWidth: 420 }}>
                <InputLabel id="goto-line-label">GoTo line</InputLabel>
                <Select
                  labelId="goto-line-label"
                  label="GoTo line"
                  value={selectedLineId}
                  onChange={(e) => setSelectedLineId(e.target.value)}
                  disabled={linesLoading || !lines.length}
                >
                  {lines.map((line) => (
                    <MenuItem key={line.lineId} value={line.lineId}>
                      {line.extensionNumber
                        ? `Ext ${line.extensionNumber}${line.name ? ` — ${line.name}` : ''}`
                        : line.name || line.lineId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                onClick={loadLines}
                disabled={linesLoading}
                startIcon={linesLoading ? <CircularProgress size={16} /> : null}
              >
                Reload
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveLine}
                disabled={savingLine || !selectedLineId}
                startIcon={savingLine ? <CircularProgress size={16} color="inherit" /> : null}
              >
                Save line
              </Button>
            </Stack>
          </>
        )}
      </SectionCard>

      <Dialog open={disconnectOpen} onClose={() => !disconnecting && setDisconnectOpen(false)}>
        <DialogTitle>Disconnect GoTo?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Agents will not be able to place click-to-call until GoTo is connected again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectOpen(false)} disabled={disconnecting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDisconnect}
            disabled={disconnecting}
            startIcon={disconnecting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GotoSettings;
