
import PropTypes from 'prop-types';
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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const DeleteConfirmationModal = ({
  open,
  title,
  subtitle,
  entityName,
  warningMessage,
  onCancel,
  onDelete,
  isLoading = false,
  confirmLabel = 'Delete',
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', pb: 1 }}
      >
        {title}
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          
          {/* Subtitle + Entity */}
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
            <Typography variant="subtitle1" fontWeight="600" mt={1}>
              {entityName}
            </Typography>
          </Box>

          {/* Warning Alert */}
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{ alignItems: 'flex-start' }}
          >
            <AlertTitle>Warning</AlertTitle>
            <Typography variant="body2">
              {warningMessage}
            </Typography>
          </Alert>

          {/* Action Buttons */}
          <Box display="flex" gap={2} pt={2}>
            <Button
              variant="outlined"
              fullWidth
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              color="error"
              fullWidth
              onClick={onDelete}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                confirmLabel
              )}
            </Button>
          </Box>

        </Box>
      </DialogContent>
    </Dialog>
  );
};

DeleteConfirmationModal.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  entityName: PropTypes.node,
  warningMessage: PropTypes.node,
  onCancel: PropTypes.func,
  onDelete: PropTypes.func,
  isLoading: PropTypes.bool,
  confirmLabel: PropTypes.node,
};

export default DeleteConfirmationModal;