import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  IconButton,
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ReturnRequestModal = ({
  open,
  onClose,
  data,
  onApprove,
  onReject,
}) => {
  
  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "#FDD835";
      case "Approved":
        return "#4CAF50";
      case "Rejected":
        return "#F44336";
      default:
        return "#FDD835";
    }
  };

  const FieldRow = ({ label, value }) => (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="body2"
        sx={{ color: "#999", mb: 0.5, fontSize: "0.875rem" }}
      >
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600, color: "#000" }}>
        {value}
      </Typography>
    </Box>
  );

  if (!data) return null; // safety

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        zIndex: 9999,
      }}
      PaperProps={{
        sx: {
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          zIndex: 9999,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Return Request Details
          </Typography>
          <Typography variant="body2" sx={{ color: "#999" }}>
            Complete information about this return request
          </Typography>
        </Box>

        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Return Info */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <FieldRow label="Return ID" value={data.returnId} />
          </Grid>
          <Grid item xs={6}>
            <FieldRow label="Return Date" value={data.createdAt ? new Date(data.createdAt).toLocaleString("en-US", {
                month: "short",
                day: "2-digit", 
                year: "numeric"
            }) : data.createdAt} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Item Info */}
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Item Information
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <FieldRow label="Item Name" value={data.itemName} />
          </Grid>
          <Grid item xs={6}>
            <FieldRow label="Serial Number" value={data.serialNumber} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Merchant Info */}
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Merchant Information
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <FieldRow label="Merchant Name" value={data.merchantName} />
          </Grid>
          <Grid item xs={6}>
            <FieldRow label="Merchant ID" value={data.merchantId} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Return Details */}
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Return Details
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <FieldRow label="Item Condition" value={data.itemCondition} />
          </Grid>
          <Grid item xs={6}>
            <FieldRow label="Return Reason" value={data.returnReason} />
          </Grid>
        </Grid>

        {/* Status */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="body2"
            sx={{ color: "#999", mb: 0.5, fontSize: "0.875rem" }}
          >
            Status
          </Typography>
          <Chip
            label={data.status}
            sx={{
              backgroundColor: getStatusColor(data.status),
              color: "#000",
              fontWeight: 600,
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
        <Button
          onClick={onReject}
          variant="outlined"
          sx={{
            flex: 1,
            borderColor: "#F44336",
            color: "#F44336",
            textTransform: "none",
            fontWeight: 600,
            py: 1.2,
          }}
        >
          Reject Return
        </Button>

        <Button
          onClick={onApprove}
          variant="contained"
          sx={{
            flex: 1,
            backgroundColor: "#4CAF50",
            textTransform: "none",
            fontWeight: 600,
            py: 1.2,
            "&:hover": {
              backgroundColor: "#45a049",
            },
          }}
        >
          Approve Return
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReturnRequestModal;