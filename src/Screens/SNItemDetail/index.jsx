import { useState, useEffect } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Inventory as InventoryIcon,
  BuildCircle as BuildCircleIcon,
  CorporateFare as CorporateFareIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { getRequestWithOutBody, patchComment, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { formatUsDate, formatUsDateTime } from "../../Utils/dateFormat";
import {
  TextField,
  Button,
  Avatar,
} from '@mui/material';
import { Send as SendIcon, Person as PersonIcon } from '@mui/icons-material';

const SNItemDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { serialId } = location.state || {};
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [serialDetails, setSerialDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Fetch serial details data
  const fetchSerialDetails = () => {
    if (!serialId) {
      toast.error("Serial ID not found");
      return;
    }

    setLoading(true);
    getRequestWithOutBody(
      `${baseURl}invoice/serials/assigned/serial/${serialId}`, accessToken
    )
      .then(result => {
        setSerialDetails(result || null);
        setLoading(false);
      })
      .catch(error => {
        toast.error(error?.message || "Failed to fetch serial details");
        setSerialDetails(null);
        setLoading(false);
      });
  };

  // Handle comment submission
  const handleCommentSubmit = () => {
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!serialId) {
      toast.error('Serial ID not found');
      return;
    }

    setSubmittingComment(true);
    
    const commentData = {
      message: comment.trim()
    };

    postRequestWithBodyAndToken(
      `${baseURl}invoice/serials/assigned/serial/${serialId}`,
      accessToken,
      commentData
    )
      .then(result => {
        toast.success('Comment added successfully');
        setComment('');
        // Refresh serial details to get updated comments
        fetchSerialDetails();
      })
      .catch(error => {
        toast.error(error?.message || 'Failed to add comment');
      })
      .finally(() => {
        setSubmittingComment(false);
      });
  };

  useEffect(() => {
    fetchSerialDetails();
  }, [serialId]);

  // Get the first item from the data array and comments
  const itemData = serialDetails?.data && serialDetails.data.length > 0 ? serialDetails.data[0] : null;
  
  // Comments should be stored separately since they come from the API response root
  const [comments, setComments] = useState([]);
  
  // Update comments when serialDetails changes
  useEffect(() => {
    // Extract comments from the API response (they should be at the root level)
    if (serialDetails && serialDetails.comments) {
      setComments(serialDetails.comments);
    } else {
      setComments([]);
    }
  }, [serialDetails]);

  const applicationId =
    itemData?.applicationId ||
    itemData?.application_id ||
    itemData?.application?.id ||
    itemData?.application?.applicationId ||
    null;

  const existingComments =
    itemData?.comments ||
    itemData?.applicationComments ||
    itemData?.application_comments ||
    [];

  const handleSubmitComment = async () => {
    if (!applicationId) {
      toast.error('Application ID not found');
      return;
    }
    if (!commentMessage.trim()) {
      toast.error('Comment message is required');
      return;
    }

    setCommentSubmitting(true);
    try {
      await patchComment(
        `${baseURl}application/${applicationId}/comment`,
        accessToken,
        commentMessage.trim(),
      );

      toast.success('Comment added successfully');
      setCommentMessage('');
      fetchSerialDetails();
    } catch (error) {
      toast.error(error?.message || 'Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Generate timeline events from API data
  const toDateValue = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatDateTime = (value) => formatUsDateTime(value, { empty: '-' });

  const formatDateOnly = (value) => formatUsDate(value, { empty: '-' });

  const timelineEvents = [];

  const merchantName = itemData?.merchantFirstName || itemData?.merchantLastName
    ? `${itemData?.merchantFirstName || ''} ${itemData?.merchantLastName || ''}`.trim()
    : (itemData?.merchantDbaName || '-');

  if (itemData?.inStockDate) {
    timelineEvents.push({
      title: 'In Stock',
      description: 'Device received into main inventory.',
      date: formatDateTime(itemData.inStockDate),
      eventDate: toDateValue(itemData.inStockDate),
      icon: InventoryIcon,
    });
  }

  if (itemData?.documentDate) {
    timelineEvents.push({
      title: 'Document Date',
      description: 'Document date recorded for this hardware item.',
      date: formatDateTime(itemData.documentDate),
      eventDate: toDateValue(itemData.documentDate),
      icon: DescriptionIcon,
    });
  }

  if (itemData?.applicationDate) {
    timelineEvents.push({
      title: 'Application Created',
      description: `Merchant application created${itemData?.applicationStatus ? ` (${String(itemData.applicationStatus).toLowerCase()})` : ''}.`,
      date: formatDateTime(itemData.applicationDate),
      eventDate: toDateValue(itemData.applicationDate),
      icon: BuildCircleIcon,
    });
  }

  if (Array.isArray(itemData?.applicationStatusHistory)) {
    itemData.applicationStatusHistory
      .filter((h) => h?.changedAt)
      .forEach((h) => {
        timelineEvents.push({
          title: 'Application Status',
          description: `${h?.status ? `Status changed to ${String(h.status).toLowerCase()}` : 'Application status updated'}${h?.pricePlan ? ` (Price plan: ${h.pricePlan})` : ''}.`,
          date: formatDateTime(h.changedAt),
          eventDate: toDateValue(h.changedAt),
          icon: BuildCircleIcon,
        });
      });
  }

  if (itemData?.invoiceCreatedAt) {
    timelineEvents.push({
      title: 'Invoice Created',
      description: `Invoice created${itemData?.invoiceStatus ? ` (${String(itemData.invoiceStatus).toLowerCase()})` : ''}.`,
      date: formatDateTime(itemData.invoiceCreatedAt),
      eventDate: toDateValue(itemData.invoiceCreatedAt),
      icon: DescriptionIcon,
    });
  }

  if (itemData?.invoiceUpdatedAt) {
    timelineEvents.push({
      title: 'Invoice Updated',
      description: `Invoice updated${itemData?.invoiceStatus ? ` (${String(itemData.invoiceStatus).toLowerCase()})` : ''}.`,
      date: formatDateTime(itemData.invoiceUpdatedAt),
      eventDate: toDateValue(itemData.invoiceUpdatedAt),
      icon: DescriptionIcon,
    });
  }

  if (itemData?.invoiceDate) {
    timelineEvents.push({
      title: 'Invoice Date',
      description: `Invoice date recorded${itemData?.invoiceStatus ? ` (${String(itemData.invoiceStatus).toLowerCase()})` : ''}.`,
      date: formatDateTime(itemData.invoiceDate),
      eventDate: toDateValue(itemData.invoiceDate),
      icon: DescriptionIcon,
    });
  }

  if (itemData?.assignedDate) {
    timelineEvents.push({
      title: 'Assigned',
      description: `Hardware serial ${itemData?.serialNo || '-'} assigned to ${merchantName}.`,
      date: formatDateTime(itemData.assignedDate),
      eventDate: toDateValue(itemData.assignedDate),
      icon: AssignmentIcon,
    });
  }

  timelineEvents.sort((a, b) => {
    const at = a?.eventDate?.getTime?.();
    const bt = b?.eventDate?.getTime?.();
    if (typeof at !== 'number' && typeof bt !== 'number') return 0;
    if (typeof at !== 'number') return 1;
    if (typeof bt !== 'number') return -1;
    return at - bt;
  });

  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <button
          onClick={() => {
            navigate(-1);
          }}
          style={{
            minWidth: 40,
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'var(--dashboard-card-bg)',
            border: '1px solid var(--dashboard-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginTop: 4,
            cursor: 'pointer',
            zIndex: 9999,
            position: 'relative'
          }}
        >
          <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
        </button>
        <Heading
          Fontweight={700}
          color={'var(--sidebar-text-primary)'}
          Heading={'S.N Item Detail'}
          Fontsize={30}
        />
      </div>

      <div style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }} className="overflow-x-hidden">
        <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh',  }}>
          <Grid container spacing={1} maxWidth="1200px" margin="0 auto" className="mb-2">
            {/* Left Sidebar */}
            <Grid item xs={12} md={3}>
              {/* Device Card */}
              <Card
                sx={{
                  marginBottom: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <CardContent>
                  {/* <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}> */}
                  {/* <Box
                  sx={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box component="span" sx={{ fontSize: '28px' }}>📦</Box>
                </Box> */}
                  {/* <Chip label="Deployed" color="primary" variant="outlined" size="small" /> */}
                  {/* </Box> */}

                  <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {itemData?.itemName || '-'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#999', marginBottom: '16px' }}>
                    {itemData?.serialNo || '-'}
                  </Typography>

                  {/* Assigned Merchant */}
                  <Box sx={{ marginBottom: '20px' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: '#999',
                        fontWeight: 600,
                        marginBottom: '8px',
                        fontSize: '12px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      ASSIGNED MERCHANT
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CorporateFareIcon sx={{ fontSize: '20px', color: '#666' }} />
                      <Typography sx={{ fontWeight: 500 }}>
                        {itemData?.merchantDbaName || '-'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Rate */}
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: '#999',
                        fontWeight: 600,
                        marginBottom: '8px',
                        fontSize: '12px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      RATE
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <DescriptionIcon sx={{ fontSize: '20px', color: '#666' }} />
                      <Typography sx={{ fontWeight: 500 }}>{itemData?.rate || '-'}</Typography>
                    </Box>

                    <Box sx={{ marginTop: '12px' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: '#999',
                          fontWeight: 600,
                          marginBottom: '8px',
                          fontSize: '12px',
                          letterSpacing: '0.5px',
                        }}
                      >
                        INVOICE STATUS
                      </Typography>
                      <Chip
                        label={itemData?.invoiceStatus ? String(itemData.invoiceStatus).toUpperCase() : '-'}
                        color={String(itemData?.invoiceStatus || '').toLowerCase() === 'paid' ? 'success' : 'warning'}
                        variant="filled"
                        sx={{ fontWeight: 700, letterSpacing: '0.6px' }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Key Dates Card */}
              <Card
                sx={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <InventoryIcon sx={{ fontSize: '24px' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Key Dates
                    </Typography>
                  </Box>

                  <Box sx={{ marginBottom: '16px' }}>
                    <Typography variant="body2" sx={{ color: '#999', marginBottom: '4px' }}>
                      In Stock Date
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatDateOnly(itemData?.inStockDate)}
                    </Typography>
                  </Box>

                  <Box sx={{ marginBottom: '16px' }}>
                    <Typography variant="body2" sx={{ color: '#999', marginBottom: '4px' }}>
                      Assigned Date
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatDateOnly(itemData?.assignedDate)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ color: '#999', marginBottom: '4px' }}>
                      Application Date
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatDateOnly(itemData?.applicationDate)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

            </Grid>

            {/* Right Timeline */}
            <Grid item xs={12} md={8.5}  className="">
              <Card
                sx={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <Box component="span" sx={{ fontSize: '24px' }}>📈</Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      Hardware Timeline
                    </Typography>
                  </Box>

                  {/* Custom Timeline Implementation */}
                  <Box>
                    {timelineEvents.map((event, index) => {
                      const IconComponent = event.icon;
                      return (
                        <Box key={index}>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            {/* Icon and Connector */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                              <Box
                                sx={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  backgroundColor: '#6366f1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mb: 1
                                }}
                              >
                                <IconComponent sx={{ fontSize: '20px', color: 'white' }} />
                              </Box>
                              {index !== timelineEvents.length - 1 && (
                                <Box
                                  sx={{
                                    width: '2px',
                                    height: '60px',
                                    backgroundColor: '#e0e0e0',
                                    flexGrow: 1
                                  }}
                                />
                              )}
                            </Box>

                            {/* Content */}
                            <Box sx={{ flex: 1, pb: 3 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                  {event.title}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#999', whiteSpace: 'nowrap' }}>
                                  🕐 {event.date}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: '#666' }}>
                                {event.description}
                              </Typography>
                            </Box>
                          </Box>
                          {index !== timelineEvents.length - 1 && (
                            <Divider sx={{ mb: 2 }} />
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>

              <Card
                sx={{
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  marginTop: '14px',
                  marginBottom: '14px',
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', marginBottom: '16px' }}>
                    Comments {comments.length > 0 && `(${comments.length})`}
                  </Typography>
                  
                  {/* Comments Display */}
                  {comments.length > 0 && (
                    <Box sx={{ 
                      maxHeight: '300px', 
                      overflowY: 'auto',
                      marginBottom: '10px',
                      paddingRight: '8px',
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '3px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#c1c1c1',
                        borderRadius: '3px',
                      },
                    }}>
                      {comments.map((comment, index) => (
                        <Box key={comment.id || index}>
                          <Box sx={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                backgroundColor: '#6366f1',
                                fontSize: '14px',
                                flexShrink: 0,
                              }}
                            >
                              {comment.user?.name ? comment.user.name.charAt(0).toUpperCase() : <PersonIcon sx={{ fontSize: 16 }} />}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {comment.user?.name || 'Unknown User'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#999', whiteSpace: 'nowrap' }}>
                                  {formatUsDateTime(comment.createdAt, { empty: '' })}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                {comment.message}
                              </Typography>
                            </Box>
                          </Box>
                          {index < comments.length - 1 && <Divider sx={{ marginBottom: '12px' }} />}
                        </Box>
                      ))}
                    </Box>
                  )}
                  
                  {/* Add Comment Input */}
                  <Box sx={{ 
                    borderTop: comments.length > 0 ? '1px solid #e0e0e0' : 'none',
                    paddingTop: comments.length > 0 ? '20px' : '0',
                  }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                      Add a comment
                    </Typography>
                    <Box sx={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        placeholder="Enter your comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={submittingComment}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCommentSubmit}
                        disabled={submittingComment || !comment.trim()}
                        sx={{
                          minWidth: '20px',
                          height: '36px',
                          borderRadius: '8px',
                          textTransform: 'none',
                          flexShrink: 0,
                        }}
                        startIcon={<SendIcon />}
                      >
                        {submittingComment ? 'Sending...' : 'Send'}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </div>
    </div>
  );
};

export default SNItemDetail;
