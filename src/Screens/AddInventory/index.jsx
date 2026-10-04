import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import GoBack from "../../Components/GoBack";
import { getRequestWithOutBody, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import DropdownMenu from "../../Components/dropdownMenu";
import { Button, Container, Card, CardContent, Box, Typography, Select, MenuItem, TextField, Chip, Paper, InputAdornment } from "@mui/material";
import { Store } from "@mui/icons-material";
import { CheckCircleIcon } from "lucide-react";
import {
    buildReceiveInventoryMetadata,
    formatPoDropdownLabel,
    sortPurchaseOrdersBySerialDesc,
    getTodayDateString,
    getReceivedByName,
} from "../../Utils/purchaseOrderHelpers";

const AddInventory = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const navigate = useNavigate();
    const [selectedPO, setSelectedPO] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    // const [loading, setLoading] = useState(false);
    
    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}purchase-order`, accessToken
        )
            .then(result => {
                // Filter out purchase orders with status "received"
                const filteredPOs = result?.data?.filter(po => po.status !== "received") || [];
                setPurchaseOrders(sortPurchaseOrdersBySerialDesc(filteredPOs))
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    const fetchItemsByPO = (poNo) => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}purchase-order/items-by-po-no?poNo=${poNo}`, accessToken
        )
            .then(result => {
                // Handle the correct API response structure
                if (result?.data?.items) {
                    const formattedItems = result.data.items.map(item => {
                        const orderedQty = parseFloat(item.quantity) || 0;
                        const alreadyReceivedQty = parseFloat(item.receivedQty) || 0;
                        const remainingQty = Math.max(0, orderedQty - alreadyReceivedQty);
                        return {
                        id: item.id,
                        name: item.item_service?.name || 'Unknown Item',
                        orderedQty,
                        alreadyReceivedQty,
                        expectedQty: remainingQty,
                        unitCost: parseFloat(item.unitPrice) || 0,
                        receivedQty: 0,
                        status: remainingQty === 0 ? 'Fully Received' : alreadyReceivedQty > 0 ? 'Partially Received' : 'Not Received',
                        barcode: item.item_service?.barcode || '',
                        existingSerials: Array.isArray(item.serials)
                          ? item.serials.map((s) => s.serialNumber).filter(Boolean)
                          : [],
                        serialNumbers: Array(remainingQty).fill(''),
                        serialCount: remainingQty,
                        purchaseOrderId: item.purchaseOrderId,
                        itemServiceId: item.itemServiceId,
                        amount: parseFloat(item.amount) || 0,
                        taxAmount: parseFloat(item.taxAmount) || 0
                    };
                    });
                    setItems(formattedItems);
                } else {
                    setItems([]);
                }
                setLoading(false);
            })
            .catch(error => {
                setLoading(false);
                setItems([]) // Clear items on error
            })
    }

    useEffect(() => {
        fetchData()
    }, [])
  const [items, setItems] = useState([]);

  const handleReceivedQtyChange = (id, value) => {
    const rawReceivedQty = parseFloat(value) || 0;
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const maxAllowed = parseFloat(item?.expectedQty) || 0;
          const newReceivedQty = maxAllowed > 0 ? Math.min(rawReceivedQty, maxAllowed) : rawReceivedQty;
          if (rawReceivedQty > newReceivedQty) {
            toast.error(`Received Qty can't be more than ${maxAllowed}`);
          }

          // Adjust serial numbers array based on new received quantity
          const currentSerialCount = item.serialNumbers.length;
          const newSerialCount = Math.max(0, parseInt(item.expectedQty, 10) || 0); // Keep fields based on remaining/expected qty
          
          let newSerialNumbers = [...item.serialNumbers];
          
          if (newSerialCount > currentSerialCount) {
            // Add more empty serial number fields
            const additionalFields = newSerialCount - currentSerialCount;
            newSerialNumbers = [...newSerialNumbers, ...Array(additionalFields).fill('')];
          } else if (newSerialCount < currentSerialCount) {
            // Remove excess serial number fields
            newSerialNumbers = newSerialNumbers.slice(0, newSerialCount);
          }
          
          return { 
            ...item, 
            receivedQty: newReceivedQty,
            serialNumbers: newSerialNumbers,
            serialCount: newSerialCount,
            status: newReceivedQty > 0 && newReceivedQty < item.expectedQty ? 'Partially Received' : 
                   newReceivedQty >= item.expectedQty ? 'Fully Received' : 
                   (item.alreadyReceivedQty > 0 ? 'Partially Received' : 'Not Received'),
          };
        }
        return item;
      })
    );
  };

  const handleViewDetail = (poNo) => {
        if (poNo) {
            setSelectedPO(poNo);
            fetchItemsByPO(poNo);
            setViewMode('detail');
        }
    };

  const handleBackToList = () => {
    setViewMode('list');
  };

  const handleBarcodeChange = (id, value) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, barcode: value } : item
      )
    );
  };

  const handleSerialNumberChange = (id, index, value) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const newSerialNumbers = [...item.serialNumbers];
          newSerialNumbers[index] = value;
          return { ...item, serialNumbers: newSerialNumbers };
        }
        return item;
      })
    );
  };

  const handleCreatePO = () => {
    navigate('/home/addPurchase');
  };

  const handleSaveInventory = async () => {
    const itemsToReceive = items
      .filter((i) => (parseInt(i?.receivedQty, 10) || 0) > 0)
      .map((i) => {
        const qty = Math.max(0, parseInt(i?.receivedQty, 10) || 0);
        const serials = Array.isArray(i?.serialNumbers) ? i.serialNumbers : [];
        return {
          id: i.id,
          receivedQty: qty,
          serialNumbers: serials.slice(0, qty).map((s) => String(s || '').trim()),
        };
      });

    if (itemsToReceive.length === 0) {
      toast.error('Enter Received Qty for at least one item before saving');
      return;
    }

    for (const item of items) {
      const requiredCount = Math.max(0, parseInt(item?.receivedQty, 10) || 0);
      if (requiredCount <= 0) continue;

      const serials = Array.isArray(item?.serialNumbers) ? item.serialNumbers : [];
      for (let i = 0; i < requiredCount; i += 1) {
        const serial = String(serials?.[i] ?? '').trim();
        if (!serial) {
          toast.error(`Serial No is required for ${item?.name || 'this item'} (Qty: ${requiredCount})`);
          return;
        }
      }
    }

    try {
      setLoading(true);
      const apiData = {
        poNo: selectedPO,
        items: itemsToReceive,
        ...buildReceiveInventoryMetadata(userData),
      };

      const result = await putRequestWithBodyAndToken(
        `${baseURl}purchase-order/receive-inventory`,
        accessToken,
        apiData,
      );
      toast.success(result?.message || 'Inventory received successfully');
            navigate(-1);
      // if (selectedPO) fetchItemsByPO(selectedPO);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

    const [enabled, setEnabled] = useState(true)
    const [itemName, setItemName] = useState("")
    const [itemSellingPrice, setItemSellingPrice] = useState(0)
    const [sku, setSku] = useState(0)
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false);
    const receivedByName = getReceivedByName(userData);
    const receivedDateDisplay = getTodayDateString();
    const [categoryList, setCategoryList] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(""); // Step 1: Define state
    const [uploadedFile, setUploadedFiles] = useState([]); // Step 1: Add state for the uploaded file


    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <Button
                    onClick={() => navigate(-1)}
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
                        marginTop: 4
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Add Inventory'}
                    Fontsize={30}
                />
            </div>

            <div className="w-[80%]" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    <div className="flex justify-between gap-3 flex-wrap">
                        <GoBack />
                        <div className="flex items-center gap-4">
                            {enabled ?
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'Active'}
                                    Fontsize={16}
                                /> :
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'In-Active'}
                                    Fontsize={16}
                                />
                            }
                            <Switch
                                checked={enabled}
                                onChange={setEnabled}
                                className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                            >
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                                />
                            </Switch>
                        </div>
                    </div>

                    <Container maxWidth="lg" sx={{ py: 4 }}>
      {viewMode === 'list' ? (
        <>
          {/* Purchase Order Selection Section */}
          <Card sx={{ mb: 3, boxShadow: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: { xs: 1, md: 3 },
                  flexDirection: { xs: 'column', md: 'row' },
                }}
              >
                <Box sx={{ flex: 1, width: { xs: '100%', md: 'auto' } }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Purchase Order
                  </Typography>
                  <DropdownMenu
                    menuItems={purchaseOrders.map(po => ({
                        name: formatPoDropdownLabel(po),
                        value: po.poNo,
                        id: po.id
                    }))}
                    onSelect={(selectedValue) => handleViewDetail(selectedValue)}
                    defaultText="--Select Purchase Order--"
                    selectedValue={selectedPO}
                    customWidth={true}
                    searchable={true}
                  />
                </Box>
                <Button
                  variant="contained"
                  onClick={handleCreatePO}
                  sx={{
                    background: '#1976d2',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: { xs: '14px', md: '16px' },
                    padding: { xs: '8px 16px', md: '10px 24px' },
                    borderRadius: '8px',
                    width: { xs: '100%', md: 'auto' },
                    '&:hover': {
                      background: '#1565c0',
                    },
                  }}
                >
                  Create Purchase Order
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Items Section */}
          {selectedPO && (
          <Paper sx={{ p: 3, backgroundColor: '#f5f5f5', mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Items from {selectedPO || 'Select PO'}
            </Typography>

            {/* Items List */}
            {items.map((item) => (
              <Card key={item.id} sx={{ mb: 3, boxShadow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(selectedPO)}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', mb: 1.5 }}>
                        Unit Cost: ${item.unitCost.toFixed(2)}
                      </Typography>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip
                          size="small"
                          label={`Ordered: ${item.orderedQty}`}
                          sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }}
                        />
                        <Chip
                          size="small"
                          label={`Already Received: ${item.alreadyReceivedQty}`}
                          sx={{ backgroundColor: '#fff3e0', color: '#e65100', fontWeight: 700 }}
                        />
                        <Chip
                          size="small"
                          label={`Remaining: ${item.expectedQty}`}
                          sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}
                        />
                      </Box>

                      {item.existingSerials?.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Received Serials:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {item.existingSerials.map((sn, idx) => (
                              <Chip
                                key={`${item.id}-sn-${idx}`}
                                size="small"
                                label={sn}
                                variant="outlined"
                                sx={{ borderColor: '#ff9800', color: '#e65100', fontWeight: 500 }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Receive Qty:
                        </Typography>
                        <TextField
                          type="number"
                          value={item.receivedQty}
                          onChange={(e) =>
                            handleReceivedQtyChange(item.id, e.target.value)
                          }
                          size="small"
                          sx={{
                            width: '80px',
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '6px',
                            },
                          }}
                        />
                      </Box>
                    </Box>

                    <Chip
                      label={item.status}
                      icon={<Store />}
                      color="primary"
                      variant="outlined"
                      sx={{
                        borderColor: '#1976d2',
                        color: '#1976d2',
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Paper>
          )}

          {selectedPO && (
          <Card sx={{ mb: 3, boxShadow: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Receipt Information
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ minWidth: 220 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Received By
                  </Typography>
                  <TextField
                    value={receivedByName}
                    size="small"
                    fullWidth
                    InputProps={{ readOnly: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', backgroundColor: '#F8FAFC' } }}
                  />
                </Box>
                <Box sx={{ minWidth: 220 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Received Date
                  </Typography>
                  <TextField
                    value={receivedDateDisplay}
                    size="small"
                    fullWidth
                    InputProps={{ readOnly: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', backgroundColor: '#F8FAFC' } }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
          )}

          {/* Save Inventory Button */}
          {selectedPO && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSaveInventory}
              startIcon={<Store />}
              sx={{
                background: '#1976d2',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '16px',
                padding: '10px 24px',
                borderRadius: '8px',
                '&:hover': {
                  background: '#1565c0',
                },
              }}
            >
              Save Inventory
            </Button>
          </Box>
          )}
        </>
      ) : (
        <>
          {/* Back Button */}
          <Box sx={{ mb: 3 }}>
            <Button
              startIcon={<IoIosArrowBack />}
              onClick={handleBackToList}
              sx={{
                color: '#1976d2',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Back to Orders
            </Button>
          </Box>

          {/* Detail Items Section */}
          <Paper sx={{ p: 3, backgroundColor: '#f5f5f5', mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Items from {selectedPO}
            </Typography>

            {/* Item Details */}
            {items.map((item) => (
              <Card key={item.id} sx={{ mb: 4, boxShadow: 1 }}>
                <CardContent sx={{ p: 3 }}>
                  {/* Item Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 3,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', mb: 1.5 }}>
                        Unit Cost: ${item.unitCost.toFixed(2)}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          size="small"
                          label={`Ordered: ${item.orderedQty}`}
                          sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }}
                        />
                        <Chip
                          size="small"
                          label={`Already Received: ${item.alreadyReceivedQty}`}
                          sx={{ backgroundColor: '#fff3e0', color: '#e65100', fontWeight: 700 }}
                        />
                        <Chip
                          size="small"
                          label={`Remaining: ${item.expectedQty}`}
                          sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}
                        />
                      </Box>
                    </Box>
                    <Chip
                      label={item.status}
                      icon={<CheckCircleIcon />}
                      color={item.status.includes('Fully') ? 'success' : 'primary'}
                      variant="outlined"
                      sx={{
                        borderColor: item.status.includes('Fully') ? '#ff9800' : '#1976d2',
                        color: item.status.includes('Fully') ? '#ff9800' : '#1976d2',
                        fontWeight: 500,
                      }}
                    />
                  </Box>

                  {item.existingSerials?.length > 0 && (
                    <Box
                      sx={{
                        mb: 3,
                        p: 2,
                        borderRadius: '8px',
                        backgroundColor: '#fff8e1',
                        border: '1px solid #ffe082',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e65100', mb: 1 }}>
                        Already Received Serial Numbers ({item.existingSerials.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {item.existingSerials.map((sn, idx) => (
                          <Chip
                            key={`${item.id}-existing-sn-${idx}`}
                            label={sn}
                            size="small"
                            sx={{
                              backgroundColor: '#fff',
                              border: '1px solid #ff9800',
                              color: '#e65100',
                              fontWeight: 600,
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Receive Qty */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      mb: 3,
                      pb: 2,
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Receive Qty:
                      </Typography>
                      <TextField
                        type="number"
                        value={item.receivedQty}
                        onChange={(e) =>
                          handleReceivedQtyChange(item.id, e.target.value)
                        }
                        size="small"
                        sx={{
                          width: '80px',
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '6px',
                          },
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Product Barcode */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Product Barcode
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Scan or enter product barcode"
                      value={item.barcode}
                      onChange={(e) => handleBarcodeChange(item.id, e.target.value)}
                      size="small"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography sx={{ color: '#999', fontSize: '20px' }}>
                              ||||
                            </Typography>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '6px',
                        },
                      }}
                    />
                  </Box>

                  {/* Assign Serial Numbers */}
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Assign Serial Numbers
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#999' }}>
                        {item.serialNumbers.filter((sn) => sn).length} of{' '}
                        {item.serialCount} entered
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: 2,
                      }}
                    >
                      {Array.from({ length: item.serialCount }).map((_, index) => (
                        <TextField
                          key={index}
                          label={`Item #${index + 1}:`}
                          value={item.serialNumbers[index] || ''}
                          onChange={(e) =>
                            handleSerialNumberChange(item.id, index, e.target.value)
                          }
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '6px',
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Paper>

          <Card sx={{ mb: 3, boxShadow: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Receipt Information
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ minWidth: 220 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Received By
                  </Typography>
                  <TextField
                    value={receivedByName}
                    size="small"
                    fullWidth
                    InputProps={{ readOnly: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', backgroundColor: '#F8FAFC' } }}
                  />
                </Box>
                <Box sx={{ minWidth: 220 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Received Date
                  </Typography>
                  <TextField
                    value={receivedDateDisplay}
                    size="small"
                    fullWidth
                    InputProps={{ readOnly: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', backgroundColor: '#F8FAFC' } }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Save Inventory Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSaveInventory}
              startIcon={<Store />}
              sx={{
                background: '#1976d2',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '16px',
                padding: '10px 24px',
                borderRadius: '8px',
                '&:hover': {
                  background: '#1565c0',
                },
              }}
            >
              Save Inventory
            </Button>
          </Box>
        </>
      )}
    </Container>

                   
                </div>
            </div>
        </div>
    );
};

export default AddInventory;
