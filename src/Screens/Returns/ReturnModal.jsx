import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { useSelector } from "react-redux";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import DropdownMenu from "../../Components/dropdownMenu";

const ITEM_CONDITION_OPTIONS = [
  { name: "New", value: "new" },
  { name: "Like New", value: "like-new" },
  { name: "Good", value: "good" },
  { name: "Fair", value: "fair" },
  { name: "Poor", value: "poor" },
];

const RETURN_REASON_OPTIONS = [
  { name: "Defective", value: "defective" },
  { name: "Not as Described", value: "not-as-described" },
  { name: "Damaged", value: "damaged" },
  { name: "Changed Mind", value: "changed-mind" },
  { name: "Other", value: "other" },
];

const ReturnItemModal = ({ isOpen, onClose, onSubmit }) => {
  const accessToken = useSelector((state) => state.auth.accessToken) || localStorage.getItem("accessToken");
  const [formData, setFormData] = useState({
    item: "",
    serialNo: "",
    itemServiceId: "",
    itemSerialId: "",
    merchantDbId: "",
    merchantName: "",
    merchantId: "",
    itemCondition: "",
    returnReason: "",
  });
  const [itemServicesList, setItemServicesList] = useState([]);
  const [merchantList, setMerchantList] = useState([]);
  const [serialNumbersList, setSerialNumbersList] = useState([]);
  const [merchantIdOptions, setMerchantIdOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchItemServices = useCallback(() => {
    return getRequestWithOutBody(`${baseURl}item-services`, accessToken)
      .then(result => {
        setItemServicesList(result?.data || []);
      })
      .catch(() => {
        setItemServicesList([]);
      });
  }, [accessToken]);

  const fetchMerchants = useCallback(() => {
    return getRequestWithOutBody(`${baseURl}customer`, accessToken)
      .then(result => {
        setMerchantList(Array.isArray(result?.data?.data) ? result.data.data : []);
      })
      .catch(() => {
        setMerchantList([]);
      });
  }, [accessToken]);

  const fetchSerialNumbers = useCallback((itemServiceId, merchantId) => {
    if (!itemServiceId || !merchantId) {
      setSerialNumbersList([]);
      return;
    }

    getRequestWithOutBody(`${baseURl}inventory/return-item/serials?itemServiceId=${itemServiceId}&merchantId=${merchantId}`, accessToken)
      .then(result => {
        const list = Array.isArray(result?.data?.data)
          ? result.data.data
          : (Array.isArray(result?.data) ? result.data : []);
        setSerialNumbersList(list);
      })
      .catch(() => {
        setSerialNumbersList([]);
      });
  }, [accessToken]);

  useEffect(() => {
    if (isOpen && accessToken) {
      setLoading(true);
      Promise.all([fetchItemServices(), fetchMerchants()])
        .finally(() => setLoading(false));
    }
  }, [isOpen, accessToken, fetchItemServices, fetchMerchants]);

  useEffect(() => {
    if (formData.itemServiceId && formData.merchantDbId) {
      fetchSerialNumbers(formData.itemServiceId, formData.merchantDbId);
    } else {
      setSerialNumbersList([]);
    }
  }, [formData.itemServiceId, formData.merchantDbId, fetchSerialNumbers]);

  const itemMenuItems = useMemo(
    () =>
      itemServicesList.map((item, index) => ({
        id: item.id || index,
        name: item.name || item.itemName || item.title || `Item ${index + 1}`,
        value: item.id || index,
      })),
    [itemServicesList],
  );

  const merchantMenuItems = useMemo(
    () =>
      merchantList.map((merchant, index) => ({
        ...merchant,
        id: merchant.id || index,
        name: `${merchant.dbaName || ""}`.trim() || `Merchant ${index + 1}`,
        value: merchant.id?.toString() || index,
      })),
    [merchantList],
  );

  const merchantIdMenuItems = useMemo(
    () =>
      merchantIdOptions.map((mid) => ({
        name: String(mid),
        value: String(mid),
      })),
    [merchantIdOptions],
  );

  const serialMenuItems = useMemo(
    () =>
      serialNumbersList.map((serial, index) => {
        const serialValue =
          serial.serialNumber || serial.serialNo || serial.serial || serial;
        return {
          ...serial,
          name: String(serialValue),
          value: String(serialValue),
          id: serial.itemSerialId || serial.id || index,
        };
      }),
    [serialNumbersList],
  );

  const selectedItemName = useMemo(() => {
    if (!formData.itemServiceId) return "";
    const item = itemMenuItems.find(
      (entry) => String(entry.id) === String(formData.itemServiceId),
    );
    return item?.name || "";
  }, [formData.itemServiceId, itemMenuItems]);

  const selectedConditionName = useMemo(() => {
    if (!formData.itemCondition) return "";
    return (
      ITEM_CONDITION_OPTIONS.find((opt) => opt.value === formData.itemCondition)
        ?.name || ""
    );
  }, [formData.itemCondition]);

  const selectedReasonName = useMemo(() => {
    if (!formData.returnReason) return "";
    return (
      RETURN_REASON_OPTIONS.find((opt) => opt.value === formData.returnReason)
        ?.name || ""
    );
  }, [formData.returnReason]);

  const handleSubmit = () => {
    const missing = [];
    if (!formData.itemServiceId) missing.push("Item");
    if (!formData.merchantDbId) missing.push("Merchant");
    if (!formData.serialNo) missing.push("Serial Number");
    if (!formData.itemSerialId) missing.push("Serial ID");
    if (!formData.itemCondition) missing.push("Item Condition");
    if (!formData.returnReason) missing.push("Return Reason");

    if (missing.length > 0) {
      toast.error(`Please fill: ${missing.join(", ")}`);
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    }

    setFormData({
      item: "",
      serialNo: "",
      itemSerialId: "",
      itemServiceId: "",
      merchantDbId: "",
      merchantName: "",
      merchantId: "",
      itemCondition: "",
      returnReason: "",
    });
    setMerchantIdOptions([]);

    onClose();
  };

  const renderField = (label, children) => (
    <Box>
      <Typography
        variant="body2"
        sx={{ mb: 1, color: "var(--dashboard-text-primary)", fontWeight: 500 }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Return Item</DialogTitle>

      <DialogContent>
        <Grid container spacing={3} mt={1}>
          <Grid item xs={12} md={6}>
            {renderField(
              "Item",
              <DropdownMenu
                menuItems={itemMenuItems}
                defaultText="Select item"
                selectedValue={selectedItemName}
                onSelect={(id) => {
                  setFormData((prev) => ({
                    ...prev,
                    itemServiceId: id,
                    item: id,
                    serialNo: "",
                    itemSerialId: "",
                  }));
                }}
                idSet={true}
                fullWidth={true}
                addAgent={true}
                searchable={true}
                disabled={loading}
              />,
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {renderField(
              "Merchant Name",
              <DropdownMenu
                menuItems={merchantMenuItems}
                defaultText="Select merchant"
                selectedValue={formData.merchantName}
                projectFilter={true}
                onSelect={(selectedMerchant) => {
                  const ids = Array.isArray(selectedMerchant?.merchantIds)
                    ? selectedMerchant.merchantIds
                        .map((x) => x?.merchantId)
                        .filter((v) => String(v || "").trim() !== "")
                    : [];

                  setMerchantIdOptions(ids);
                  setFormData((prev) => ({
                    ...prev,
                    merchantDbId: selectedMerchant?.id
                      ? String(selectedMerchant.id)
                      : "",
                    merchantName:
                      selectedMerchant?.dbaName ||
                      selectedMerchant?.legalBusinessName ||
                      "",
                    merchantId: ids?.[0] ? String(ids[0]) : "",
                    serialNo: "",
                    itemSerialId: "",
                  }));
                }}
                fullWidth={true}
                addAgent={true}
                searchable={true}
                disabled={loading}
              />,
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {renderField(
              "Merchant ID",
              <DropdownMenu
                menuItems={merchantIdMenuItems}
                defaultText={
                  formData.merchantDbId
                    ? "Select merchant id"
                    : "Select merchant first"
                }
                selectedValue={formData.merchantId}
                onSelect={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    merchantId: String(value),
                  }));
                }}
                fullWidth={true}
                addAgent={true}
                searchable={true}
                disabled={loading || !formData.merchantDbId}
              />,
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {renderField(
              "Item Serial No",
              <DropdownMenu
                menuItems={serialMenuItems}
                defaultText={
                  formData.itemServiceId && formData.merchantDbId
                    ? "Select serial number"
                    : "Select item and merchant first"
                }
                selectedValue={formData.serialNo}
                projectFilter={true}
                onSelect={(selectedSerial) => {
                  const serialNumberValue =
                    selectedSerial?.serialNumber ||
                    selectedSerial?.serialNo ||
                    selectedSerial?.serial ||
                    selectedSerial?.name ||
                    "";
                  setFormData((prev) => ({
                    ...prev,
                    serialNo: String(serialNumberValue),
                    itemSerialId: selectedSerial?.itemSerialId
                      ? String(selectedSerial.itemSerialId)
                      : "",
                  }));
                }}
                fullWidth={true}
                addAgent={true}
                searchable={true}
                disabled={
                  !formData.itemServiceId || !formData.merchantDbId || loading
                }
              />,
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {renderField(
              "Item Condition",
              <DropdownMenu
                menuItems={ITEM_CONDITION_OPTIONS}
                defaultText="Select condition"
                selectedValue={selectedConditionName}
                onSelect={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    itemCondition: value,
                  }));
                }}
                fullWidth={true}
                addAgent={true}
                searchable={true}
              />,
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {renderField(
              "Return Reason",
              <DropdownMenu
                menuItems={RETURN_REASON_OPTIONS}
                defaultText="Select return reason"
                selectedValue={selectedReasonName}
                onSelect={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    returnReason: value,
                  }));
                }}
                fullWidth={true}
                addAgent={true}
                searchable={true}
              />,
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ padding: "16px 24px" }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
        >
          Submit Return Request
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReturnItemModal;
