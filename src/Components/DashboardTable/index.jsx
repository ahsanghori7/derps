import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import Heading from "../Heading";
import { useNavigate } from "react-router-dom";

const DashboardTable = ({
  title,
  columns,
  rows,
  filters,
  secondFilter,
  ticketlist,
  projectTracker,
  thirdFilters,
}) => {
  const navigate = useNavigate();

  const [filter, setFilter] = useState(filters?.[0] || "");
  const [secondFilterValue, setSecondFilterValue] = useState("");
  const [thirdFilterValue, setThirdFilterValue] = useState("");

  // build options for second filter if provided
  const secondFilterOptions = secondFilter?.length
    ? ["All Category", ...secondFilter]
    : [];

  // build options for third filter if provided
  const thirdFilterOptions = thirdFilters?.length
    ? ["All Priority", ...thirdFilters]
    : [];

  useEffect(() => {
    if (secondFilterOptions.length) {
      setSecondFilterValue(secondFilterOptions[0]);
    }
  }, [secondFilterOptions]);

  useEffect(() => {
    if (thirdFilterOptions.length) {
      setThirdFilterValue(thirdFilterOptions[0]);
    }
  }, [thirdFilterOptions]);

  const handleChange = (event) => {
    const newValue = event.target.value;
    setFilter(newValue);
    if (onFilterChange) {
      onFilterChange(newValue); // ✅ trigger parent fetch
    }
  };

  const handleSecondFilterChange = (event) => {
    setSecondFilterValue(event.target.value);
  };

  const handleThirdFilterChange = (event) => {
    setThirdFilterValue(event.target.value);
  };

  return (
    <Box>
      {/* Header with title + dropdown */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        backgroundColor={'var(--dashboard-card-bg)'}
        className="h-14 px-4 rounded-t-lg"
        // mb={2}
      >
        <Heading
          Fontweight={700}
          color={'var(--dashboard-text-primary)'}
          Heading={title}
          Fontsize={18}
        />
        <Box display="flex" gap={2}>
          {thirdFilterOptions.length > 0 && (
            <Select
              value={thirdFilterValue}
              onChange={handleThirdFilterChange}
              size="small"
              sx={{
                minWidth: 140,
                backgroundColor: "#2B4BF20F",
                borderRadius: "5px",
                border: "1px solid #6499FF",
                fontSize: "14px",
                fontWeight: "500",
                "& fieldset": { border: "none" },
              }}
            >
              {thirdFilterOptions.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </Select>
          )}
          {secondFilterOptions.length > 0 && (
            <Select
              value={secondFilterValue}
              onChange={handleSecondFilterChange}
              size="small"
              sx={{
                minWidth: 140,
                backgroundColor: "#2B4BF20F",
                borderRadius: "5px",
                border: "1px solid #6499FF",
                fontSize: "14px",
                fontWeight: "500",
                "& fieldset": { border: "none" },
              }}
            >
              {secondFilterOptions.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </Select>
          )}

          {filters && (
            <Select
              value={filter}
              onChange={handleChange}
              size="small"
              sx={{
                minWidth: 120,
                backgroundColor: "#2B4BF20F",
                borderRadius: "5px",
                border: "1px solid #6499FF",
                fontSize: "14px",
                fontWeight: "500",
                "& fieldset": { border: "none" },
              }}
            >
              {filters.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </Select>
          )}
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: '#0C79F7',
              }}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || "left"}
                  sx={{
                    color: 'white',
                    fontWeight: "500",
                    fontSize: "12px",
                    padding: "5px",
                    textAlign: "center",
                    whiteSpace: "nowrap", // 👈 prevent breaking into multiple lines
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={i}
                sx={{
                  backgroundColor: 'var(--dashboard-card-bg)',
                }}
              >
                {columns.map((col) =>
                  col?.id === "details" ? (
                    <TableCell
                      key={col.id}
                      align={col.align || "left"}
                      sx={{
                        fontSize: "12px",
                        fontWeight: "400",
                        color: 'var(--dashboard-text-primary)',
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      {ticketlist ? (
                        <div
                          // variant="contained"
                          // color="primary"
                          // size="small"
                          cursor="pointer"
                          onClick={() =>
                            navigate("/home/singleTicket", {
                              state: { rowData: row },
                            })
                          }
                        >
                          <Heading
                            Fontweight={600}
                            color="#0C79F7"
                            Heading="View Details"
                            Fontsize={12}
                            className="cursor-pointer"
                          />
                        </div>
                      ) : (
                        <Heading
                          Fontweight={600}
                          color="#0C79F7"
                          Heading="View Details"
                          Fontsize={12}
                        />
                      )}
                    </TableCell>
                  ) : col?.id === "status" ? (
                    <TableCell
                      key={col.id}
                      align={col.align || "left"}
                      sx={{
                        fontSize: "12px",
                        fontWeight: "400",
                        color: 'var(--dashboard-text-primary)',
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0px 10px",
                          borderRadius: "2px",
                          fontWeight: 600,
                          fontSize: "12px",
                          backgroundColor:
                            row[col.id] === "Submitted"
                              ? "rgba(23, 162, 184, 0.2)"
                              : row[col.id] === "Complete"
                                ? "rgba(74, 196, 17, 0.2)"
                                : row[col.id] === "Approved"
                                  ? "rgba(74, 196, 17, 0.2)"
                                  : row[col.id] === "Signed"
                                    ? "rgba(126, 87, 194, 0.2)"
                                    : row[col.id] === "In-progress"
                                      ? "rgba(126, 87, 194, 0.2)"
                                      : row[col.id] === "Pending"
                                        ? "rgba(208, 126, 11, 0.2)"
                                        : row[col.id] === "UW"
                                          ? "rgba(255, 179, 0, 0.2)"
                                          : "rgba(240, 240, 240, 0.2)",
                          color:
                            row[col.id] === "Submitted"
                              ? "#17A2B8"
                              : row[col.id] === "Complete"
                                ? "#4AC411"
                                : row[col.id] === "Approved"
                                  ? "#4CAF50"
                                  : row[col.id] === "Signed"
                                    ? "#7E57C2"
                                    : row[col.id] === "In-progress"
                                      ? "#7E57C2"
                                      : row[col.id] === "Pending"
                                        ? "#D07E0B"
                                        : row[col.id] === "UW"
                                          ? "#FFB300"
                                          : "#202224",
                        }}
                      >
                        {row[col.id]}
                      </span>
                    </TableCell>
                  ) : col?.id === "title" ? (
                    <TableCell
                      key={col.id}
                      align={col.align || "left"}
                      sx={{
                        fontSize: "12px",
                        fontWeight: "400",
                        color: 'var(--dashboard-text-primary)',
                        padding: "10px",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "200px", // 👈 ensure truncation works
                      }}
                    >
                      {row[col.id]?.length > 30
                        ? row[col.id].substring(0, 30) + "..."
                        : row[col.id]}
                    </TableCell>
                  ) : col?.id === "assignee" ||
                    col?.id === "category" ||
                    col?.id === "agent" ? (
                    <TableCell
                      key={col.id}
                      align={col.align || "left"}
                      sx={{
                        fontSize: "12px",
                        fontWeight: "400",
                        color: 'var(--dashboard-text-primary)',
                        padding: "10px",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "200px", // 👈 ensure truncation works
                      }}
                    >
                      {row[col.id]?.length > 10
                        ? row[col.id].substring(0, 10) + "..."
                        : row[col.id]}
                    </TableCell>
                  ) : (
                    <TableCell
                      key={col.id}
                      align={col.align || "left"}
                      sx={{
                        fontSize: "12px",
                        fontWeight: "400",
                        color: 'var(--dashboard-text-primary)',
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      {row[col.id]}
                    </TableCell>
                  ),
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DashboardTable;
