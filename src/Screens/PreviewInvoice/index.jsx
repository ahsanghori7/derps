"use client"

import Heading from "../../Components/Heading"
import { IoIosArrowBack } from "react-icons/io";
import logo4k from "../../assets/logo4k.png"
import locationInvoice from "../../assets/locationInvoice.png"
import contactInvoice from "../../assets/contactInvoice.png"
import mailInvoice from "../../assets/mailInvoice.png"
import AgentTicketListTable from "../../Components/AgentsTicketListTable"
import { useLocation } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import {
  isInvoiceImageDataURL,
  resolveInvoiceImageToDataURL,
  waitForImageElements,
} from "../../Utils/invoiceImageResolve"
import { styled } from "@mui/material"
import DownloadButton from "../../Components/DownloadButton"
import website from "../../assets/website.png"
import Compressor from 'compressorjs'
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getTenantPhone, getTenantEmail, getTenantWebsite, getTenantAddress } from "../../Utils/helper";

const HeaderWrapper = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  flexWrap: "wrap",
  gap: 8,
})
const HeaderWrapper2 = styled('div')({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
  flexWrap: 'wrap',
  gap: 10,
  cursor: 'pointer'
});
const ButtonWrapper = styled("div")({
  zIndex: 1,
})

const PreviewInvoice = () => {
  const location = useLocation()
  const navigate = useNavigate();
  const tenantLogo = useSelector((state) => state.auth.tenantLogo);
  const userData = useSelector((state) => state.userData.userDetails);
  const logoSrc = tenantLogo || logo4k;
  const tenantName = userData?.tenant?.name || "Company";
  const tenantPhone = getTenantPhone(userData);
  const tenantEmail = getTenantEmail(userData);
  const tenantWebsite = getTenantWebsite(userData);
  const tenantAddress = getTenantAddress(userData);
  const [logoError, setLogoError] = useState(false);
  const showCompanyName = !tenantLogo || logoError;
  const [displayLogoSrc, setDisplayLogoSrc] = useState(logoSrc);

  useEffect(() => {
    let cancelled = false;
    const next = tenantLogo || logo4k;
    setLogoError(false);
    setDisplayLogoSrc(next);

    if (typeof next !== "string" || next.startsWith("data:")) {
      return () => {
        cancelled = true;
      };
    }

    resolveInvoiceImageToDataURL(next).then((resolved) => {
      if (!cancelled && isInvoiceImageDataURL(resolved)) {
        setDisplayLogoSrc(resolved);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tenantLogo]);

  const invoiceData = location.state?.invoiceData

  const columns = [
    { id: "inventory.name", label: "Item", align: "center" },
    { id: "inventory.barcode", label: "Barcode", align: "center" },
    { id: "serialNo", label: "Serial No", align: "center" },
    { id: "inventory.description", label: "Description", align: "center" },
    { id: "quantity", label: "Quantity", align: "center" },
    { id: "rate", label: "Price", align: "center" },
    { id: "amount", label: "Amount", align: "center" },
  ]

  const invoiceRef = useRef()
  const invoiceRef2 = useRef()

  const sanitizedLineItems =
    invoiceData?.products?.map((item) => ({
      ...item,
      serialNos: Array.isArray(item?.serialNos)
        ? item.serialNos.map((serial) => String(serial || "").trim()).filter(Boolean)
        : item?.serialNo
          ? [String(item.serialNo).trim()]
          : Array.isArray(item?.serialNumbers)
            ? item.serialNumbers.map((serial) => String(serial || "").trim()).filter(Boolean)
            : [],
      serialNo: Array.isArray(item?.serialNos)
        ? item.serialNos.find((serial) => String(serial || "").trim()) || ""
        : item?.serialNo || (Array.isArray(item?.serialNumbers) ? item.serialNumbers[0] || "" : ""),
      inventory: {
        name: item.inventory?.name || "",
        barcode: item.inventory?.barcode || "",
        description: item.inventory?.description || "",
        taxExempt: item.inventory?.taxExempt || false,
      },
      discountType: item?.discountType || undefined,
      discount:
        item?.discount == null || item?.discount === "" ? undefined : Number(item.discount),
    })) || []

  const limitedLineItems = sanitizedLineItems.slice(0, 11)
  const limitedLineItems2 = sanitizedLineItems.slice(11)

  const data = [
    { title: "Net 30", description: "Due 30 days", value: "net-30" },
    { title: "Net 60", description: "Due 60 days", value: "net-60" },
    { title: "Due Upon Receipt", description: "Due Upon Receipt", value: "due-receipt" },
    { title: "COD (Cash On Delivery)", description: "Cash On Delivery", value: "cod" },
    { title: "EOM (End Of Month)", description: "End Of Month", value: "eom" },
    { title: "Payment in Advance", description: "Payment in Advance", value: "advance-payment" },
  ]

  const subtotal = Number.parseFloat(invoiceData?.subtotal) || 0
  const taxes = Number.parseFloat(invoiceData?.taxes) || 0
  const deliveryFee = Number.parseFloat(invoiceData?.deliveryFee) || 0
  const totalAmount = Number.parseFloat(invoiceData?.totalAmount) || 0
  const status = invoiceData?.status || ""
  const paidAmount = Number.parseFloat(invoiceData?.paidAmount) || 0
  const balanceDue = Number.parseFloat(invoiceData?.balanceDue) || 0

  const baseSubtotal = sanitizedLineItems.reduce((sum, p) => {
    const qty = Math.max(1, Number(p?.quantity) || 1)
    const rate = Math.max(0, Number(p?.rate) || 0)
    return sum + qty * rate
  }, 0)
  const calculatedSubtotal = sanitizedLineItems.reduce(
    (sum, p) => sum + (Number(p?.amount) || 0),
    0,
  )
  const itemDiscountAmount = Math.max(0, baseSubtotal - calculatedSubtotal)

  const invoiceDiscountType =
    invoiceData?.discountType || invoiceData?.invoiceDiscountType || null
  const invoiceDiscountRaw =
    invoiceData?.discount != null && invoiceData?.discount !== ""
      ? invoiceData.discount
      : invoiceData?.invoiceDiscount != null && invoiceData?.invoiceDiscount !== ""
        ? invoiceData.invoiceDiscount
        : null
  const invoiceDiscount =
    invoiceDiscountRaw != null && invoiceDiscountRaw !== ""
      ? Number(invoiceDiscountRaw)
      : null
  const rawInvoiceDiscountAmount =
    invoiceDiscountType === "percent"
      ? calculatedSubtotal * (Math.min(100, Math.max(0, Number(invoiceDiscount) || 0)) / 100)
      : invoiceDiscountType === "amount"
        ? Math.max(0, Number(invoiceDiscount) || 0)
        : 0
  const invoiceDiscountAmount = Math.min(calculatedSubtotal, rawInvoiceDiscountAmount)
  const combinedDiscountAmount =
    (Number(itemDiscountAmount) || 0) + (Number(invoiceDiscountAmount) || 0)

  const dataURLToBlob = (dataURL) => {
    const byteString = atob(dataURL.split(',')[1])
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ab], { type: mimeString })
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const compressBlobToDataURL = (blob, quality = 0.8) =>
    new Promise((resolve, reject) => {
      new Compressor(blob, {
        quality,
        success(result) {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(result)
        },
        error: reject,
      })
    })

  const handleDownload = async () => {
    const element = invoiceRef.current
    const hiddenElement = document.getElementById("hiddenSection")
    const hiddenElement2 = document.getElementById("hiddenSection2")

    const needsSecondPage = sanitizedLineItems.length > 7

    const prev1 = hiddenElement?.style.display ?? ""
    const prev2 = hiddenElement2?.style.display ?? ""

    const logoImgs = Array.from(
      document.querySelectorAll('img[data-role="invoice-logo"]')
    )
    const prevLogoSrcs = logoImgs.map((img) => img.getAttribute("src") || "")

    try {
      let resolvedLogo = await resolveInvoiceImageToDataURL(displayLogoSrc)
      if (!isInvoiceImageDataURL(resolvedLogo)) {
        resolvedLogo = await resolveInvoiceImageToDataURL(logo4k)
      }
      if (isInvoiceImageDataURL(resolvedLogo)) {
        logoImgs.forEach((img) => {
          img.setAttribute("src", resolvedLogo)
          img.removeAttribute("crossorigin")
        })
        await waitForImageElements(logoImgs, 15000)
      }

      hiddenElement.style.display = "block"

      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        allowTaint: false,
        backgroundColor: "#ffffff",
        imageTimeout: 15000,
      })

      const imgBlob = dataURLToBlob(canvas.toDataURL("image/jpeg", 1.0))
      const img1 = await compressBlobToDataURL(imgBlob, 0.8)

      const sanitize = (s) => (s || '').toString().replace(/[\\/:*?"<>|]+/g, '').trim();
      const customerNameLine = (invoiceData?.billTo || '').split('\n')[0] || 'Invoice';
      const fileName = `${sanitize(customerNameLine)}-${sanitize(invoiceData?.invoiceNo || 'INV')}.pdf`;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(img1, "JPEG", 0, 0, imgWidth, imgHeight);

      if (needsSecondPage) {
        hiddenElement.style.display = "none";
        hiddenElement2.style.display = "block";

        await sleep(100);

        const canvas2 = await html2canvas(hiddenElement2, {
          scale: 3,
          useCORS: true,
          logging: false,
          allowTaint: false,
          backgroundColor: "#ffffff",
          imageTimeout: 15000,
        });

        const imgBlob2 = dataURLToBlob(canvas2.toDataURL("image/jpeg", 1.0))
        const img2 = await compressBlobToDataURL(imgBlob2, 0.8)

        pdf.addPage();
        pdf.addImage(
          img2,
          "JPEG",
          0,
          0,
          imgWidth,
          (canvas2.height * imgWidth) / canvas2.width
        );
      }

      pdf.save(fileName);
    } catch (error) {
    } finally {
      logoImgs.forEach((img, idx) => {
        img.setAttribute("src", prevLogoSrcs[idx] || "")
      })

      if (hiddenElement2) hiddenElement2.style.display = prev2 || "none"
      if (hiddenElement) hiddenElement.style.display = prev1 || "none"
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

  const selectedPaymentTermDescription =
    data.find((term) => term.value === invoiceData?.selectedPaymentTerm)?.description || ""
  const selectedPaymentTermTitle =
    data.find((term) => term.value === invoiceData?.selectedPaymentTerm)?.title || ""

  const handleGoBack = () => {
    navigate(-1)
  };

  return (
    <div style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10, }}>
      <HeaderWrapper>
        <HeaderWrapper2>
          <div className="flex items-center gap-2" onClick={handleGoBack}>
            <IoIosArrowBack size={20} color="var(--sidebar-text-primary)" />
            <Heading
              Fontweight={700}
              color={'var(--sidebar-text-primary)'}
              Heading={'Preview'}
              Fontsize={30}
            />
            {!!status && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 28,
                  padding: "0 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "capitalize",
                  backgroundColor:
                    status === "paid"
                      ? "rgba(34, 197, 94, 0.15)"
                      : status === "partial"
                        ? "rgba(234, 179, 8, 0.18)"
                        : status === "un-paid"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(107, 114, 128, 0.15)",
                  color:
                    status === "paid"
                      ? "rgba(22, 163, 74, 1)"
                      : status === "partial"
                        ? "rgba(161, 98, 7, 1)"
                        : status === "un-paid"
                          ? "rgba(220, 38, 38, 1)"
                          : "rgba(75, 85, 99, 1)",
                }}
              >
                {status}
              </span>
            )}
          </div>
        </HeaderWrapper2>
        <ButtonWrapper>
          <DownloadButton onClick={handleDownload} />
        </ButtonWrapper>
      </HeaderWrapper>

      <div className="flex justify-center">
        <div className="w-[80%]" style={{ backgroundColor: "var(--dashboard-card-bg)", borderRadius: 14 }}>
          <div style={{ padding: 20, borderRadius: 14 }} className="overflow-auto">
            <div className="">
              <div style={{ borderRadius: 8 }} className="py-3 px-3 mb-5">
                <div className="flex justify-start">
                  {showCompanyName ? (
                    <div
                      style={{
                        color: 'var(--navbar-text)',
                        maxWidth: '160px',
                        lineHeight: '1.2',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '16px', fontWeight: 700 }}>
                        {tenantName.split(' ').slice(0, 2).join(' ')}
                      </span>
                      {tenantName.split(' ').length > 2 && (
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>
                          {tenantName.split(' ').slice(2).join(' ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <img
                      src={displayLogoSrc}
                      alt="Tenant logo"
                      className="max-w-32 max-h-16 w-auto h-auto object-contain object-left"
                      data-role="invoice-logo"
                      onError={() => setLogoError(true)}
                    />
                  )}
                </div>
                <div className="mt-2 w-[520px]">
                  <div className="flex items-start">
                    <div className="w-[100px]">
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={"Address:"}
                        Fontsize={10}
                      />
                    </div>
                    <Heading
                      Fontweight={500}
                      color={"rgba(0, 0, 0, 1)"}
                      Heading={tenantAddress}
                      Fontsize={10}
                    />
                  </div>

                  <div className="flex items-start">
                    <div className="w-[100px]">
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={"Phone Number:"}
                        Fontsize={10}
                      />
                    </div>
                    <Heading
                      Fontweight={500}
                      color={"rgba(0, 0, 0, 1)"}
                      Heading={tenantPhone}
                      Fontsize={10}
                    />
                  </div>

                  <div className="flex items-start">
                    <div className="w-[100px]">
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={"Email:"}
                        Fontsize={10}
                      />
                    </div>
                    <Heading
                      Fontweight={500}
                      color={"rgba(0, 0, 0, 1)"}
                      Heading={tenantEmail}
                      Fontsize={10}
                    />
                  </div>

                  {tenantWebsite ? (
                  <div className="flex items-start">
                    <div className="w-[100px]">
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={"Website:"}
                        Fontsize={10}
                      />
                    </div>
                    <Heading
                      Fontweight={500}
                      color={"rgba(0, 0, 0, 1)"}
                      Heading={tenantWebsite}
                      Fontsize={10}
                    />
                  </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex justify-center pb-4 bg-[#0C79F7] ">
              <Heading
                Fontweight={700}
                color={"white"}
                Heading={"Invoice Details"}
                Fontsize={16}
              />
            </div>

            <div className="">
              <div className="flex flex-wrap justify-between gap-y-3 mt-5">
                <div className="pb-1 px-2">
                  <Heading
                    Fontweight={700}
                    color={"rgba(17, 17, 17, 1)"}
                    Heading={"Date"}
                    Fontsize={10}
                  />
                  <Heading
                    Fontweight={500}
                    color={"rgba(17, 17, 17, 1)"}
                    Heading={
                      invoiceData?.issueDate
                        ? formatDate(invoiceData.issueDate)
                        : new Date().toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                    }
                    Fontsize={10}
                  />
                </div>

                {!!invoiceData?.invoiceDate && (
                  <div className="pb-1 px-2">
                    <Heading
                      Fontweight={700}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={"Invoice Date"}
                      Fontsize={10}
                    />
                    <Heading
                      Fontweight={500}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={invoiceData.invoiceDate}
                      Fontsize={10}
                    />
                  </div>
                )}

                {!!invoiceData?.dueDate && (
                  <div className="pb-1 px-2">
                    <Heading
                      Fontweight={700}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={"Due Date"}
                      Fontsize={10}
                    />
                    <Heading
                      Fontweight={500}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={formatDate(invoiceData.dueDate)}
                      Fontsize={10}
                    />
                  </div>
                )}

                {!!invoiceData?.invoiceNo && (
                  <div className="pb-1 px-2 ">
                    <Heading
                      Fontweight={700}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={"Invoice #"}
                      Fontsize={10}
                    />
                    <Heading
                      Fontweight={500}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={invoiceData.invoiceNo}
                      Fontsize={10}
                    />
                  </div>
                )}

                {!!invoiceData?.poNumber && (
                  <div className="pb-1 px-2">
                    <Heading
                      Fontweight={700}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={"P.O. No."}
                      Fontsize={10}
                    />
                    <Heading
                      Fontweight={500}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={invoiceData.poNumber}
                      Fontsize={10}
                    />
                  </div>
                )}

                {!!selectedPaymentTermTitle && (
                  <div className="pb-1 px-2">
                    <Heading
                      Fontweight={700}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={"Terms"}
                      Fontsize={10}
                    />
                    <Heading
                      Fontweight={500}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={selectedPaymentTermTitle}
                      Fontsize={10}
                    />
                  </div>
                )}

                {!!invoiceData?.accountNumber && (
                  <div className="pb-2 px-2">
                    <Heading
                      Fontweight={700}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={"Account"}
                      Fontsize={10}
                    />
                    <Heading
                      Fontweight={500}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={invoiceData.accountNumber}
                      Fontsize={10}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-end mt-5 ml-3 border-t mb-4 pt-4">
                <div>
                  <Heading
                    Fontweight={700}
                    color={"rgba(0, 0, 0, 1)"}
                    Heading={"Ship To"}
                    Fontsize={10}
                  />
                  <div
                    className={`w-72`}
                    style={{
                      color: "rgba(17, 17, 17, 1)",
                      whiteSpace: "pre-wrap",
                      height: "80px",
                      overflow: "auto",
                      fontSize: 10,
                    }}
                  >
                    {invoiceData?.shipTo}
                  </div>
                </div>
                <div>
                  <Heading
                    Fontweight={700}
                    color={"rgba(0, 0, 0, 1)"}
                    Heading={"Bill to"}
                    Fontsize={10}
                  />
                  <div
                    className={`w-72`}
                    style={{
                      color: "rgba(17, 17, 17, 1)",
                      whiteSpace: "pre-wrap",
                      height: "80px",
                      overflow: "auto",
                      fontSize: 10,
                    }}
                  >
                    {invoiceData?.billTo}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <AgentTicketListTable
                columns={columns}
                data={sanitizedLineItems}
                subtotal={subtotal}
                discountAmount={combinedDiscountAmount}
                taxes={taxes}
                isMerchantTaxExempt={invoiceData?.isMerchantTaxExempt}
                deliveryFee={deliveryFee}
                invoiceData={totalAmount}
                status={status}
                paidAmount={paidAmount}
                balanceDue={balanceDue}
                PreviewInvoice={true}
                notes={invoiceData?.notes}
              />
            </div>
          </div>
        </div>
      </div>

      <div id="hiddenSection" style={{
        display: "none",
        width: "800px",
        minHeight: "100vh",
        overflow: "auto",
      }}>
        <div className="flex justify-center">
          <div
            style={{
              backgroundColor: "var(--dashboard-card-bg)",
              borderRadius: 14,
              width: "800px",
            }}
            ref={invoiceRef}
          >
            <div className="flex justify-center mt-10">
              <Heading
                Fontweight={700}
                color={"rgba(0, 0, 0, 1)"}
                Heading={"Invoice"}
                Fontsize={30}
                mt={2}
              />
            </div>

            <div
              style={{ margin: 20, borderRadius: 14 }}
              className="overflow-auto"
            >
              <div className="">
                <div style={{ borderRadius: 8 }} className="py-3 px-3 mb-5">
                  <div className="flex justify-start">
                    {showCompanyName ? (
                      <div
                        style={{
                          color: 'var(--navbar-text)',
                          maxWidth: '160px',
                          lineHeight: '1.2',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '16px', fontWeight: 700 }}>
                          {tenantName.split(' ').slice(0, 2).join(' ')}
                        </span>
                        {tenantName.split(' ').length > 2 && (
                          <div style={{ fontSize: '12px', fontWeight: 500 }}>
                            {tenantName.split(' ').slice(2).join(' ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <img
                        src={displayLogoSrc}
                        alt="Tenant logo"
                        className="max-w-32 max-h-16 w-auto h-auto object-contain object-left"
                        data-role="invoice-logo"
                        onError={() => setLogoError(true)}
                      />
                    )}
                  </div>
                  <div className="mt-2 w-[520px]">
                    <div className="flex items-start">
                      <div className="w-[100px]">
                        <Heading
                          Fontweight={500}
                          color={"rgba(0, 0, 0, 1)"}
                          Heading={"Address:"}
                          Fontsize={10}
                        />
                      </div>
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={tenantAddress}
                        Fontsize={10}
                      />
                    </div>

                    <div className="flex items-start">
                      <div className="w-[100px]">
                        <Heading
                          Fontweight={500}
                          color={"rgba(0, 0, 0, 1)"}
                          Heading={"Phone Number:"}
                          Fontsize={10}
                        />
                      </div>
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={tenantPhone}
                        Fontsize={10}
                      />
                    </div>

                    <div className="flex items-start">
                      <div className="w-[100px]">
                        <Heading
                          Fontweight={500}
                          color={"rgba(0, 0, 0, 1)"}
                          Heading={"Email:"}
                          Fontsize={10}
                        />
                      </div>
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={tenantEmail}
                        Fontsize={10}
                      />
                    </div>

                    {tenantWebsite ? (
                    <div className="flex items-start">
                      <div className="w-[100px]">
                        <Heading
                          Fontweight={500}
                          color={"rgba(0, 0, 0, 1)"}
                          Heading={"Website:"}
                          Fontsize={10}
                        />
                      </div>
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={tenantWebsite}
                        Fontsize={10}
                      />
                    </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pb-4 bg-[#0C79F7] ">
                <Heading
                  Fontweight={700}
                  color={"white"}
                  Heading={"Invoice Details"}
                  Fontsize={16}
                />
              </div>

              <div className="">
                <div className="flex flex-wrap justify-between gap-y-3 mt-5">
                  <div className="pb-1 px-2">
                    <Heading
                      Fontweight={700}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={"Date"}
                      Fontsize={10}
                    />
                    <Heading
                      Fontweight={500}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={
                        invoiceData?.issueDate
                          ? formatDate(invoiceData.issueDate)
                          : new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                      }
                      Fontsize={10}
                    />
                  </div>

                  {!!invoiceData?.invoiceDate && (
                    <div className="pb-1 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Invoice Date"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={invoiceData.invoiceDate}
                        Fontsize={10}
                      />
                    </div>
                  )}

                  {!!invoiceData?.dueDate && (
                    <div className="pb-1 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Due Date"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={formatDate(invoiceData.dueDate)}
                        Fontsize={10}
                      />
                    </div>
                  )}

                  {!!invoiceData?.invoiceNo && (
                    <div className="pb-1 px-2 ">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Invoice #"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={invoiceData.invoiceNo}
                        Fontsize={10}
                      />
                    </div>
                  )}

                  {!!invoiceData?.poNumber && (
                    <div className="pb-1 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"P.O. No."}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={invoiceData.poNumber}
                        Fontsize={10}
                      />
                    </div>
                  )}

                  {!!selectedPaymentTermTitle && (
                    <div className="pb-1 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Terms"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={selectedPaymentTermTitle}
                        Fontsize={10}
                      />
                    </div>
                  )}

                  {!!invoiceData?.accountNumber && (
                    <div className="pb-2 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Account"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={invoiceData.accountNumber}
                        Fontsize={10}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-end mt-5 ml-3 border-t mb-4 pt-4">
                  <div>
                    <Heading
                      Fontweight={700}
                      color={"rgba(0, 0, 0, 1)"}
                      Heading={"Ship To"}
                      Fontsize={10}
                    />
                    <div
                      className={`w-72`}
                      style={{
                        color: "rgba(17, 17, 17, 1)",
                        whiteSpace: "pre-wrap",
                        height: "80px",
                        overflow: "auto",
                        fontSize: 10,
                      }}
                    >
                      {invoiceData?.shipTo}
                    </div>
                  </div>
                  <div>
                    <Heading
                      Fontweight={700}
                      color={"rgba(0, 0, 0, 1)"}
                      Heading={"Bill to"}
                      Fontsize={10}
                    />
                    <div
                      className={`w-72`}
                      style={{
                        color: "rgba(17, 17, 17, 1)",
                        whiteSpace: "pre-wrap",
                        height: "80px",
                        overflow: "auto",
                        fontSize: 10,
                      }}
                    >
                      {invoiceData?.billTo}
                    </div>
                  </div>
                </div>
              </div>

              {sanitizedLineItems.length > 7 ? (
                <div className="">
                  <AgentTicketListTable
                    columns={columns}
                    data={limitedLineItems}
                    subtotal={subtotal ? subtotal : null}
                    discountAmount={combinedDiscountAmount}
                    isMerchantTaxExempt={invoiceData?.isMerchantTaxExempt}
                    taxes={taxes ? taxes : null}
                    deliveryFee={deliveryFee ? deliveryFee : null}
                    invoiceData={totalAmount ? totalAmount : null}
                    status={status}
                    paidAmount={paidAmount}
                    balanceDue={balanceDue}
                    invoiceBottomMore={true}
                    PreviewInvoiceQuantity={true}
                    notes={invoiceData?.notes}
                  />
                </div>
              ) : (
                <div className="">
                  <AgentTicketListTable
                    columns={columns}
                    data={sanitizedLineItems}
                    isMerchantTaxExempt={invoiceData?.isMerchantTaxExempt}
                    subtotal={subtotal ? subtotal : null}
                    discountAmount={combinedDiscountAmount}
                    taxes={taxes ? taxes : null}
                    deliveryFee={deliveryFee ? deliveryFee : null}
                    invoiceData={totalAmount ? totalAmount : null}
                    status={status}
                    paidAmount={paidAmount}
                    balanceDue={balanceDue}
                    invoiceBottom={true}
                    PreviewInvoiceQuantity={true}
                    notes={invoiceData?.notes}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="hiddenSection2" style={{ display: "none", width: "800px", overflow: "auto" }}>
        <div className="flex justify-center">
          <div
            className=""
            style={{ backgroundColor: "var(--dashboard-card-bg)", borderRadius: 14, width: "800px" }}
            ref={invoiceRef2}
          >
            <div style={{ margin: 20, borderRadius: 14 }} className="overflow-auto">
              <div className="mt-3">
                <AgentTicketListTable
                  columns={columns}
                  data={limitedLineItems2}
                  subtotal={subtotal ? subtotal : null}
                  discountAmount={combinedDiscountAmount}
                  isMerchantTaxExempt={invoiceData?.isMerchantTaxExempt}
                  taxes={taxes ? taxes : null}
                  deliveryFee={deliveryFee ? deliveryFee : null}
                  invoiceData={totalAmount ? totalAmount : null}
                  status={status}
                  paidAmount={paidAmount}
                  balanceDue={balanceDue}
                  invoiceBottom={true}
                  PreviewInvoiceQuantity={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreviewInvoice