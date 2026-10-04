import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { Alert, Box, Typography } from '@mui/material';
import { Check, Copy } from 'lucide-react';
import { IoIosArrowBack } from 'react-icons/io';
import Heading from '../../../../Components/Heading';
import Loader from '../../../../Components/Loader';
import { usePageTitle } from '../../../../Hooks/usePageTitle';
import ToggleSwitch from '../../../chat/shared/components/ToggleSwitch';
import { frontendBaseUrl } from '../../../../Config/systemConfig';
import {
  getPublicApplicationLinkStatus,
  setPublicApplicationLinkEnabled,
} from '../../api/applicationPublicApi';

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

const ApplicationLinkSettings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);

  usePageTitle('Public Application Link', location);

  const handleGoBack = () => navigate('/home/adminApplication');

  const isAdmin = String(userData?.roleTitle || '')
    .trim()
    .toLowerCase() === 'admin';

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!accessToken || !isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await getPublicApplicationLinkStatus(accessToken);
        if (!cancelled) setStatus(result?.data || null);
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.message || 'Failed to load public application link status');
          setStatus(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAdmin]);

  const handleToggle = async () => {
    if (!accessToken || toggling || !status) return;
    const nextEnabled = !status.enabled;
    setToggling(true);
    setStatus((prev) => (prev ? { ...prev, enabled: nextEnabled } : prev));
    try {
      const result = await setPublicApplicationLinkEnabled(accessToken, nextEnabled);
      if (result?.data) setStatus(result.data);
      toast.success(
        result?.message ||
          (nextEnabled ? 'Public application link enabled' : 'Public application link revoked')
      );
    } catch (error) {
      setStatus((prev) => (prev ? { ...prev, enabled: !nextEnabled } : prev));
      toast.error(error?.message || 'Failed to update public application link');
    } finally {
      setToggling(false);
    }
  };

  const link = status?.path ? `${frontendBaseUrl}${status.path}` : null;

  const handleCopyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2 }}>
        <Box
          onClick={handleGoBack}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, cursor: 'pointer', width: 'fit-content' }}
        >
          <IoIosArrowBack size={20} color="var(--sidebar-text-primary)" />
          <Heading Heading="Public Application Link" Fontsize={22} Fontweight={700} mt={0} mb={0} />
        </Box>
        <Alert severity="info">
          Only a tenant Admin can view or update the public application link.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 2, maxWidth: 860 }}>
      <Box
        onClick={handleGoBack}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 6, cursor: 'pointer', width: 'fit-content' }}
      >
        <IoIosArrowBack size={20} color="var(--sidebar-text-primary)" />
        <Heading Heading="Public Application Link" Fontsize={22} Fontweight={700} mt={0} mb={0} />
      </Box>
      <Typography
        variant="body2"
        sx={{ color: 'var(--dashboard-text-secondary)', mb: 2, maxWidth: 720 }}
      >
        Share a public link so users can fill out the merchant application without logging in.
        Submitted applications appear in your application list.
      </Typography>

      <SectionCard
        title="Public application link"
        description="Turn this on to let anyone with the link start a merchant application for your company. Turn it off to revoke access immediately."
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: status?.enabled && link ? 2 : 0 }}>
          <ToggleSwitch
            checked={Boolean(status?.enabled)}
            onChange={handleToggle}
            disabled={toggling}
            ariaLabel="Enable public application link"
          />
          <Typography
            variant="body2"
            sx={{ color: 'var(--dashboard-text-primary)', fontWeight: 600 }}
          >
            {status?.enabled ? 'Enabled' : 'Disabled'}
          </Typography>
        </Box>

        {status?.enabled && link ? (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              backgroundColor: 'var(--dashboard-tab-box)',
              border: '1px solid var(--dashboard-box-border)',
            }}
          >
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-0 truncate text-sm"
              style={{ color: '#0C79F7' }}
            >
              {link}
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: 'var(--sidebar-text-primary)' }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : null}
      </SectionCard>
    </Box>
  );
};

export default ApplicationLinkSettings;
