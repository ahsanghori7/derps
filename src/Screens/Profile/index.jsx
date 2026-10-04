import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { toast } from 'react-toastify';
import { getRequestWithOutBody, postRequestWithFormData, putRequestWithBodyAndToken } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import useAuthUser from '../../Hooks/useAuthUser';
import { usePageTitle } from '../../Hooks/usePageTitle';
import { setUserDetails } from '../../Store/Reducers/userDetailsSlice';
import {
  extractUploadedProfilePicture,
  getProfilePictureUrl,
  getUserDisplayName,
  getUserInitials,
  isProfileImageFile,
  PROFILE_PICTURE_FILE_TYPE,
} from '../../Utils/profile';
import { getActiveCompany } from '../../Utils/tenantGroup';
import ProfilePictureAdjust from '../../Components/ProfilePictureAdjust';

const firstAvailable = (...values) => values.find((value) => value !== null && value !== undefined && value !== '');

const displayValue = (value) => {
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
  return String(value);
};

const readErrorMessage = (error, fallback) => {
  const raw = error?.message || '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.message) return String(parsed.message);
  } catch {
    // Response body is already plain text.
  }
  return raw || fallback;
};

const Profile = () => {
  const { token, currentUser } = useAuthUser();
  const dispatch = useDispatch();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pictureBusy, setPictureBusy] = useState(false);
  const [adjustFile, setAdjustFile] = useState(null);
  const fileInputRef = useRef(null);
  const currentUserRef = useRef(currentUser);

  usePageTitle('My Profile', location);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const fetchProfile = useCallback(async (signal) => {
    if (!token) {
      setError('Your session information is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await getRequestWithOutBody(`${baseURl}auth/me`, token, { signal });
      const data = response?.data ?? response ?? {};
      setProfile(data);

      const apiUser = data?.user ?? (data?.id != null ? data : null);
      if (apiUser) {
        const nextUser = { ...(currentUserRef.current ?? {}), ...apiUser };
        dispatch(setUserDetails(nextUser));
        localStorage.setItem('userDetails', JSON.stringify(nextUser));
      }
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(requestError?.message || 'Unable to load your profile.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [dispatch, token]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProfile(controller.signal);
    return () => controller.abort();
  }, [fetchProfile]);

  const profileUser = profile?.user ?? (profile?.id != null ? profile : currentUser) ?? {};
  const pictureUrl = getProfilePictureUrl(profileUser);

  const persistProfilePicture = async (nextPicture) => {
    const result = await putRequestWithBodyAndToken(`${baseURl}user/profile-picture`, token, {
      profilePicture: nextPicture,
    });
    const updatedUser = result?.data?.user ?? (result?.data?.id != null ? result.data : null);
    const storedPicture = updatedUser?.profilePicture !== undefined ? updatedUser.profilePicture : nextPicture;
    const nextUser = {
      ...(currentUserRef.current ?? {}),
      ...profileUser,
      ...(updatedUser ?? {}),
      profilePicture: storedPicture,
    };

    setProfile((prev) => {
      if (prev?.user) {
        return { ...prev, user: { ...prev.user, ...(updatedUser ?? {}), profilePicture: storedPicture } };
      }
      return { ...(prev ?? {}), ...(updatedUser ?? {}), profilePicture: storedPicture };
    });
    dispatch(setUserDetails(nextUser));
    localStorage.setItem('userDetails', JSON.stringify(nextUser));
    toast.success(result?.message || (nextPicture ? 'Profile picture updated.' : 'Profile picture removed.'));
  };

  const uploadPictureFile = async (file) => {
    if (!token) {
      toast.error('Your session information is unavailable. Please sign in again.');
      return;
    }

    setPictureBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', PROFILE_PICTURE_FILE_TYPE);
      const uploadResult = await postRequestWithFormData(`${baseURl}files`, token, formData);
      const uploadedUrl = extractUploadedProfilePicture(uploadResult);
      if (!uploadedUrl) {
        throw new Error('Failed to upload profile picture.');
      }
      await persistProfilePicture(uploadedUrl);
    } catch (requestError) {
      toast.error(readErrorMessage(requestError, 'Unable to update your profile picture.'));
    } finally {
      setPictureBusy(false);
    }
  };

  const handlePictureSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isProfileImageFile(file)) {
      toast.error('Please choose an image file.');
      return;
    }
    setAdjustFile(file);
  };

  const handleAdjustConfirm = (croppedFile) => {
    setAdjustFile(null);
    uploadPictureFile(croppedFile);
  };

  const handleRemovePicture = async () => {
    if (!token) {
      toast.error('Your session information is unavailable. Please sign in again.');
      return;
    }

    setPictureBusy(true);
    try {
      await persistProfilePicture(null);
    } catch (requestError) {
      toast.error(readErrorMessage(requestError, 'Unable to remove your profile picture.'));
    } finally {
      setPictureBusy(false);
    }
  };

  const displayName = getUserDisplayName(profileUser);
  const subtitle = profileUser?.roleTitle || profileUser?.role?.name || profileUser?.email || profileUser?.username;
  const tenant = profileUser?.tenant ?? profile?.tenant ?? {};
  const group = profile?.group;
  const activeCompany = getActiveCompany(group);
  const homeCompanyName = firstAvailable(tenant?.name, profileUser?.organization?.name, profileUser?.companyName, profile?.tenantName);
  const activeCompanyName = activeCompany?.name || homeCompanyName;
  const isSwitched = Boolean(
    group?.activeTenantId &&
    group?.homeTenantId &&
    String(group.activeTenantId) !== String(group.homeTenantId)
  );
  const address = firstAvailable(
    profileUser?.address,
    [profileUser?.addressLine1, profileUser?.addressLine2, profileUser?.city, profileUser?.state, profileUser?.zipCode]
      .filter(Boolean)
      .join(', '),
  );
  const sections = [
    {
      key: 'personal-information',
      title: 'Personal Information',
      rows: [
        { label: 'Full Name', value: displayName },
        { label: 'Username', value: firstAvailable(profileUser?.username, profileUser?.userName) },
        { label: 'Email Address', value: firstAvailable(profileUser?.email, profileUser?.emailAddress) },
        { label: 'Phone Number', value: firstAvailable(profileUser?.phoneNumber, profileUser?.phone, profileUser?.mobileNumber, profileUser?.mobile, profileUser?.contact, profileUser?.contactNo) },
        { label: 'Address', value: address },
      ].filter((row) => row.value !== null && row.value !== undefined && row.value !== ''),
    },
    {
      key: 'account-information',
      title: 'Account Information',
      rows: [
        { label: 'Role', value: firstAvailable(profileUser?.roleTitle, profileUser?.role?.name, typeof profileUser?.role === 'string' ? profileUser.role : null) },
        { label: 'Status', value: firstAvailable(profileUser?.status, profileUser?.isActive, profileUser?.active) },
        { label: 'Home Company', value: homeCompanyName },
        { label: 'Active Company', value: isSwitched ? activeCompanyName : null },
      ]
        .filter((row) => row.value !== null && row.value !== undefined && row.value !== '')
        .map((row) => ({ ...row, value: displayValue(row.value) })),
    },
  ].filter((section) => section.rows.length > 0);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: 'var(--dashboard-bg)', p: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={800} color="var(--dashboard-text-primary)">
              My Profile
            </Typography>
            <Typography variant="body2" color="var(--dashboard-text-secondary)" mt={0.5}>
              Your account and access information
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => fetchProfile()}
            disabled={loading}
            sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            Refresh
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} action={(
            <Button color="inherit" size="small" onClick={() => fetchProfile()}>
              Retry
            </Button>
          )}>
            {error}
          </Alert>
        )}

        <Card
          elevation={0}
          sx={{
            mb: 3,
            border: '1px solid var(--dashboard-border)',
            bgcolor: 'var(--dashboard-card-bg)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: 8, bgcolor: 'var(--sidebarNew-border)' }} />
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2.5}>
              <Stack alignItems="flex-start" gap={1.25}>
                <Box sx={{ position: 'relative', width: 76, height: 76 }}>
                  <Avatar
                    src={pictureUrl || undefined}
                    sx={{ width: 76, height: 76, bgcolor: 'var(--sidebarNew-border)', fontSize: 26, fontWeight: 800 }}
                  >
                    {getUserInitials(profileUser)}
                  </Avatar>
                  {pictureBusy && (
                    <CircularProgress
                      size={28}
                      sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-14px', ml: '-14px' }}
                    />
                  )}
                </Box>
                <Stack direction="row" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={pictureBusy || loading}
                  >
                    {pictureUrl ? 'Change photo' : 'Upload photo'}
                  </Button>
                  {pictureUrl && (
                    <Button size="small" color="inherit" onClick={handleRemovePicture} disabled={pictureBusy || loading}>
                      Remove
                    </Button>
                  )}
                </Stack>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePictureSelect}
                />
              </Stack>
              <Box>
                <Typography variant="h5" fontWeight={800} color="var(--dashboard-text-primary)">
                  {displayName}
                </Typography>
                {subtitle && (
                  <Typography color="var(--dashboard-text-secondary)" mt={0.5}>
                    {subtitle}
                  </Typography>
                )}
                {firstAvailable(profileUser?.status, profileUser?.isActive, profileUser?.active) !== undefined && (
                  <Chip
                    label={displayValue(firstAvailable(profileUser?.status, profileUser?.isActive, profileUser?.active))}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mt: 1.5 }}
                  />
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {loading && !profile ? (
          <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
            {sections.map((section) => (
              <Card
                key={section.key}
                elevation={0}
                sx={{ border: '1px solid var(--dashboard-border)', bgcolor: 'var(--dashboard-card-bg)' }}
              >
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <Typography variant="h6" fontWeight={750} color="var(--dashboard-text-primary)">
                    {section.title}
                  </Typography>
                  <Divider sx={{ my: 1.5, borderColor: 'var(--dashboard-border)' }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                    {section.rows.map((row, index) => (
                      <Box key={`${row.label}-${index}`} sx={{ minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={700} color="var(--dashboard-text-secondary)" sx={{ display: 'block', mb: 0.35 }}>
                          {row.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="var(--dashboard-text-primary)" sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                          {row.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
      <ProfilePictureAdjust
        file={adjustFile}
        open={Boolean(adjustFile)}
        onCancel={() => setAdjustFile(null)}
        onConfirm={handleAdjustConfirm}
      />
    </Box>
  );
};

export default Profile;
