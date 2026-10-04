import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

const UpdateConfirmationModal = ({
  open,
  title,
  subtitle,
  entityName,
  updateMessage,
  warnings = [],
  onCancel,
  onUpdate,
  onUpdateAndSend,
  confirmButtonLabel = 'Confirm',
  sendButtonLabel = 'Update & Send',
  isLoading = false,
  isSending = false,
}) => {
  const busy = isLoading || isSending;

  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', pb: 1 }}
      >
        {title}
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
            <Typography variant="subtitle1" fontWeight="600" mt={1}>
              {entityName}
            </Typography>
          </Box>

          <Alert
            severity="info"
            icon={<CheckCircleIcon />}
            sx={{ alignItems: 'flex-start' }}
          >
            <AlertTitle>Confirm Update</AlertTitle>
            <Typography variant="body2">
              {updateMessage}
            </Typography>
          </Alert>

          {warnings.map((warning, index) => (
            <Alert
              key={`${warning?.title || 'warning'}-${index}`}
              severity={warning?.severity || 'warning'}
              icon={
                warning?.severity === 'info'
                  ? <MailOutlineIcon />
                  : <WarningAmberIcon />
              }
              sx={{ alignItems: 'flex-start' }}
            >
              {warning?.title ? <AlertTitle>{warning.title}</AlertTitle> : null}
              <Typography variant="body2">
                {warning?.message}
              </Typography>
            </Alert>
          ))}

          <Box
            display="flex"
            flexDirection={{ xs: 'column', sm: 'row' }}
            gap={1.5}
            pt={1}
          >
            <Button
              variant="outlined"
              fullWidth
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={onUpdate}
              disabled={busy}
            >
              {isLoading && !isSending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                confirmButtonLabel
              )}
            </Button>

            {typeof onUpdateAndSend === 'function' && (
              <Button
                variant="contained"
                color="warning"
                fullWidth
                onClick={onUpdateAndSend}
                disabled={busy}
              >
                {isSending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  sendButtonLabel
                )}
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateConfirmationModal;
