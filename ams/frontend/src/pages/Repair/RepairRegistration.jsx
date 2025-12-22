import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import "../../styles/Registration.css";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useForm } from "react-hook-form";
import CloseIcon from "../../assets/icons/close.svg";
import PlusIcon from "../../assets/icons/plus.svg";
import Alert from "../../components/Alert";
import * as XLSX from "xlsx";
import MockupData from "../../data/mockData/repairs/asset-repair-mockup-data.json";

const RepairRegistration = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const editState = location.state?.repair || null;
  const isEdit = !!editState;

  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Extract unique values from mock data
  const assets = Array.from(new Set(MockupData.map((item) => item.asset)));
  const suppliers = Array.from(new Set(MockupData.map((item) => item.supplier)));
  const repairTypes = Array.from(new Set(MockupData.map((item) => item.type)));

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm({
    mode: "all",
    defaultValues: {
      asset: editState?.asset || "",
      supplier: editState?.supplier || "",
      repairType: editState?.type || "",
      repairName: editState?.name || "",
      startDate: editState?.start_date || "",
      endDate: editState?.end_date || "",
      cost: editState?.cost || "",
      notes: editState?.notes || "",
    },
  });

  useEffect(() => {
    if (editState) {
      setValue("asset", editState.asset || "");
      setValue("supplier", editState.supplier || "");
      setValue("repairType", editState.type || "");
      setValue("repairName", editState.name || "");
      setValue("startDate", editState.start_date || "");
      setValue("endDate", editState.end_date || "");
      setValue("cost", editState.cost || "");
      setValue("notes", editState.notes || "");
      // setAttachmentFiles(editState.attachments || []);
    }
  }, [editState, setValue]);

  const EXPECTED_IMPORT_COLUMNS = [
    "Asset",
    "Supplier",
    "Repair Type",
    "Repair Name",
    "Start Date",
    "End Date",
    "Cost",
    "Notes",
  ];

  const normalizeExcelDate = (cell) => {
    if (cell === null || cell === undefined || cell === "") {
      return "";
    }

    if (typeof cell === "number") {
      try {
        return XLSX.SSF.format("yyyy-mm-dd", cell);
      } catch {
        return null;
      }
    }

    const value = String(cell).trim();

    if (!value) {
      return "";
    }

    const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!match) {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed.toISOString().slice(0, 10);
    }

    const [, year, month, day] = match;
    const mm = month.padStart(2, "0");
    const dd = day.padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (
      file.type !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      setErrorMessage("Please select a valid .xlsx file.");
      setTimeout(() => setErrorMessage(""), 5000);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (!rows || rows.length < 2) {
          setErrorMessage(
            "Import file must contain a header row and at least one data row."
          );
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }

        const headerRow = rows[0].map((cell) => String(cell || "").trim());
        const missingColumns = EXPECTED_IMPORT_COLUMNS.filter(
          (col) => !headerRow.includes(col)
        );

        if (missingColumns.length > 0) {
          setErrorMessage(
            `Invalid template. Missing column(s): ${missingColumns.join(", ")}.`
          );
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }

        const dataRows = rows
          .slice(1)
          .filter((row) =>
            row.some(
              (cell) =>
                cell !== null &&
                cell !== undefined &&
                String(cell).trim() !== ""
            )
          );

        if (dataRows.length === 0) {
          setErrorMessage("No data rows found in the import file.");
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }

        if (dataRows.length > 1) {
          setErrorMessage(
            "Import file must contain exactly one data row for registration."
          );
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }

        const row = dataRows[0];
        const columnIndex = {};
        EXPECTED_IMPORT_COLUMNS.forEach((col) => {
          columnIndex[col] = headerRow.indexOf(col);
        });

        const getCell = (col) => row[columnIndex[col]];

        const assetCell = getCell("Asset");
        const supplierCell = getCell("Supplier");
        const repairTypeCell = getCell("Repair Type");
        const repairNameCell = getCell("Repair Name");
        const startDateCell = getCell("Start Date");
        const endDateCell = getCell("End Date");
        const costCell = getCell("Cost");
        const notesCell = getCell("Notes");

        const requiredErrors = [];
        if (!assetCell || String(assetCell).trim() === "") {
          requiredErrors.push("Asset is required.");
        }
        if (!repairTypeCell || String(repairTypeCell).trim() === "") {
          requiredErrors.push("Repair Type is required.");
        }
        if (!repairNameCell || String(repairNameCell).trim() === "") {
          requiredErrors.push("Repair Name is required.");
        }
        if (!startDateCell || String(startDateCell).trim() === "") {
          requiredErrors.push("Start Date is required.");
        }

        if (requiredErrors.length > 0) {
          setErrorMessage(requiredErrors.join(" "));
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }

        const startDateNormalized = normalizeExcelDate(startDateCell);
        if (!startDateNormalized) {
          setErrorMessage("Start Date in the import file is not a valid date.");
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }

        const endDateNormalized = normalizeExcelDate(endDateCell);
        if (endDateCell && !endDateNormalized) {
          setErrorMessage("End Date in the import file is not a valid date.");
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }

        if (
          endDateNormalized &&
          endDateNormalized !== "" &&
          endDateNormalized < startDateNormalized
        ) {
          setErrorMessage(
            "End Date in the import file cannot be earlier than Start Date."
          );
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }

        let costValue = "";
        if (
          costCell !== null &&
          costCell !== undefined &&
          String(costCell).trim() !== ""
        ) {
          const numericCost = Number(costCell);
          if (Number.isNaN(numericCost) || numericCost < 0) {
            setErrorMessage(
              "Cost in the import file must be a non-negative number."
            );
            setTimeout(() => setErrorMessage(""), 5000);
            return;
          }
          costValue = numericCost;
        }

        const notesValue =
          notesCell !== null && notesCell !== undefined
            ? String(notesCell).trim()
            : "";

        if (notesValue.length > 500) {
          setErrorMessage(
            "Notes in the import file must be at most 500 characters."
          );
          setTimeout(() => setErrorMessage(""), 5000);
          return;
        }

        setValue("asset", String(assetCell).trim());
        setValue("supplier", supplierCell ? String(supplierCell).trim() : "");
        setValue("repairType", String(repairTypeCell).trim());
        setValue("repairName", String(repairNameCell).trim());
        setValue("startDate", startDateNormalized);
        setValue("endDate", endDateNormalized || "");
        setValue("cost", costValue === "" ? "" : costValue);
        setValue("notes", notesValue);

        setImportFile(file);
        setErrorMessage("");
        e.target.value = "";
      } catch (error) {
        console.error("Error processing import file:", error);
        setErrorMessage("Unable to read the import file. Please check the format.");
        setTimeout(() => setErrorMessage(""), 5000);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 300 * 1024 * 1024; // 300MB

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        alert(`${file.name} is larger than 300MB and was not added.`);
        return false;
      }
      return true;
    });

    setAttachmentFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data) => {
    if (!data.asset || !data.repairType || !data.repairName || !data.startDate) {
      setErrorMessage("Please fill in all required fields before saving.");
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }

    const normalizedAsset = data.asset.trim().toLowerCase();
    const normalizedType = data.repairType.trim().toLowerCase();
    const normalizedName = data.repairName.trim().toLowerCase();
    const normalizedStart = data.startDate;

    const duplicate = MockupData.some((repair) => {
      if (isEdit && repair.id === editState.id) {
        return false;
      }
      return (
        (repair.asset || "").trim().toLowerCase() === normalizedAsset &&
        (repair.type || "").trim().toLowerCase() === normalizedType &&
        (repair.name || "").trim().toLowerCase() === normalizedName &&
        (repair.start_date || "") === normalizedStart
      );
    });

    if (duplicate) {
      setErrorMessage(
        "Asset Repair already exists for this Asset, Repair Type, Repair Name, and Start Date."
      );
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }

    console.log("Form submitted:", data, attachmentFiles);

    const successMessage = isEdit
      ? "Asset Repair updated successfully."
      : "Asset Repair successfully registered.";

    navigate("/repairs", { state: { successMessage } });
  };

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}

      <nav>
        <NavBar />
      </nav>
      <main className="registration">
        <section className="top">
          <TopSecFormPage
            root="Repairs"
            currentPage={isEdit ? "Update Repair" : "New Repair"}
            rootNavigatePage="/repairs"
            title={isEdit ? editState?.name || "Repair" : "New Repair"}
            rightComponent={
              <div className="import-section">
                <label htmlFor="repairs-import-file" className="import-btn">
                  <img src={PlusIcon} alt="Import" />
                  Import
                  <input
                    type="file"
                    id="repairs-import-file"
                    accept=".xlsx"
                    onChange={handleImportFile}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            }
          />
        </section>
        <section className="registration-form">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Asset */}
            <fieldset>
              <label htmlFor="asset">
                Asset<span className="required-asterisk">*</span>
              </label>
              <select
                className={errors.asset ? "input-error" : ""}
                {...register("asset", {
                  required: "Asset is required",
                })}
              >
                <option value="">Select Asset</option>
                {assets.map((asset) => (
                  <option key={asset} value={asset}>{asset}</option>
                ))}
              </select>
              {errors.asset && (
                <span className="error-message">
                  {errors.asset.message}
                </span>
              )}
            </fieldset>

            {/* Supplier */}
            <fieldset>
              <label htmlFor="supplier">Supplier</label>
              <select
                className={errors.supplier ? "input-error" : ""}
                {...register("supplier")}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </fieldset>

            {/* Repair Type */}
            <fieldset>
              <label htmlFor="repairType">
                Repair Type<span className="required-asterisk">*</span>
              </label>
              <select
                className={errors.repairType ? "input-error" : ""}
                {...register("repairType", {
                  required: "Repair type is required",
                })}
              >
                <option value="">Select Repair Type</option>
                {repairTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.repairType && (
                <span className="error-message">
                  {errors.repairType.message}
                </span>
              )}
            </fieldset>

            {/* Repair Name */}
            <fieldset>
              <label htmlFor="repairName">
                Repair Name<span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter repair name"
                maxLength="100"
                className={errors.repairName ? "input-error" : ""}
                {...register("repairName", {
                  required: "Repair name is required",
                })}
              />
              {errors.repairName && (
                <span className="error-message">
                  {errors.repairName.message}
                </span>
              )}
            </fieldset>

            {/* Start Date */}
            <fieldset>
              <label htmlFor="startDate">
                Start Date<span className="required-asterisk">*</span>
              </label>
              <input
                type="date"
                className={errors.startDate ? "input-error" : ""}
                {...register("startDate", {
                  required: "Start date is required",
                })}
              />
              {errors.startDate && (
                <span className="error-message">{errors.startDate.message}</span>
              )}
            </fieldset>

            {/* End Date (Optional) */}
            <fieldset>
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                {...register("endDate", {
                  validate: (value, formValues) => {
                    if (value && formValues.startDate && value < formValues.startDate) {
                      return "End date cannot be earlier than start date";
                    }
                    return true;
                  },
                })}
                min={watch("startDate") || ""}
              />
              {errors.endDate && (
                <span className="error-message">{errors.endDate.message}</span>
              )}
            </fieldset>

            {/* Cost */}
            <fieldset className="cost-field">
            <label htmlFor="cost">Cost</label>
            <div className="cost-input-group">
              <span className="cost-addon">PHP</span>
              <input
                type="number"
                id="cost"
                name="cost"
                placeholder="0.00"
                min="0"
                step="0.01"
                {...register("cost", { valueAsNumber: true })}
              />
            </div>
          </fieldset>

            {/* Notes */}
            <fieldset>
              <label htmlFor="notes">Notes</label>
              <textarea
                placeholder="Enter notes"
                rows="3"
                maxLength="500"
                {...register("notes", {
                  maxLength: {
                    value: 500,
                    message: "Notes must be at most 500 characters",
                  },
                })}
              ></textarea>
              {errors.notes && (
                <span className="error-message">{errors.notes.message}</span>
              )}
            </fieldset>

            {/* Attachments */}
            <fieldset>
              <label htmlFor="attachments">Upload File</label>

              <div className="attachments-wrapper">
                {/* Left column: Upload button & info */}
                <div className="upload-left">
                  <label htmlFor="attachments" className="upload-image-btn">
                    Choose File
                    <input
                      type="file"
                      id="attachments"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileSelection}
                      style={{ display: "none" }}
                      multiple
                    />
                  </label>
                  <small className="file-size-info">
                    Maximum file size must be 300MB
                  </small>
                </div>

                {/* Right column: Uploaded files */}
                <div className="upload-right">
                  {attachmentFiles.map((file, index) => (
                    <div className="file-uploaded" key={index}>
                      <span title={file.name}>{file.name}</span>
                      <button type="button" onClick={() => removeFile(index)}>
                        <img src={CloseIcon} alt="Remove" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </fieldset>

            {/* Submit */}
            <button type="submit" className="primary-button" disabled={!isValid}>
              {isEdit ? "Update Repair" : "Save"}
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default RepairRegistration;
