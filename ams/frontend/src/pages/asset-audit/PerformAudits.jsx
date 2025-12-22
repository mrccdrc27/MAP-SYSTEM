import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import "../../styles/Registration.css";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useForm, Controller } from "react-hook-form";
import CloseIcon from "../../assets/icons/close.svg";
import overdueAudits from "../../data/mockData/audits/overdue-audit-mockup-data.json";
import dueAudits from "../../data/mockData/audits/due-audit-mockup-data.json";
import scheduledAudits from "../../data/mockData/audits/scheduled-audit-mockup-data.json";
import completedAudits from "../../data/mockData/audits/completed-audit-mockup-data.json";
import Footer from "../../components/Footer";
const PerformAudits = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const item = location.state?.item || null;

  const previousPage = location.state?.previousPage || null;

  const [attachmentFiles, setAttachmentFiles] = useState([]);

  const extractAssets = (auditArray) => auditArray.map(a => a.asset.name);
  const allAssets = [
    ...extractAssets(overdueAudits),
    ...extractAssets(dueAudits),
    ...extractAssets(scheduledAudits),
  ];
  const uniqueAssets = Array.from(new Set(allAssets));
  const locations = Array.from(new Set(completedAudits.map(item => item.location)));
  const users = Array.from(new Set(completedAudits.map(item => item.performed_by)));

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm({
    mode: "all",
    defaultValues: {
      asset: "",
      location: "",
      performBy: "John Doe" || "",
      auditDate: new Date().toISOString().split("T")[0],
      nextAuditDate: "",
      notes: "",
    },
  });

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024;

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`${file.name} is larger than 5MB and was not added.`);
        return false;
      }
      return true;
    });

    setAttachmentFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data) => {
    console.log("Form submitted:", data, attachmentFiles);

    // Redirect to completed audits section if coming from asset view, otherwise go back to previous page
    const redirectPage = previousPage === "/asset-view" ? "/audits/completed" : previousPage;
    navigate(redirectPage);
  };

  const getRootPage = () => {
    switch (previousPage) {
      case "/audits":
        return "Audits";
      case "/audits/overdue":
        return "Overdue for Audits";
      case "/audits/scheduled":
        return "Scheduled Audits";
      case "/audits/completed":
        return "Completed Audits";
      case "/asset-view":
        return "Audits";
      default:
        return "Audits";
    }
  };

  return (
    <>
      <nav>
        <NavBar />
      </nav>
      <main className="registration">
        <section className="top">
          <TopSecFormPage
            root={getRootPage()}
            currentPage="Perform Audit"
            rootNavigatePage={previousPage === "/asset-view" ? "/audits/completed" : previousPage}
            title="Perform Audit"
          />
        </section>
        <section className="registration-form">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Asset */}
            <fieldset>
              <label htmlFor="asset">Select Asset<span className="required-asterisk">*</span></label>
              <select
                className={errors.asset ? "input-error" : ""}
                {...register("asset", {
                  required: "Asset is required",
                })}
              >
                <option value="">Select Asset</option>
                {uniqueAssets.map((asset) => (
                  <option key={asset} value={asset}>{asset}</option>
                ))}
              </select>
              {errors.asset && (
                <span className="error-message">
                  {errors.asset.message}
                </span>
              )}
            </fieldset>

            {/* Location */}
            <fieldset>
              <label htmlFor="location">Location<span className="required-asterisk">*</span></label>
              <select
                className={errors.location ? "input-error" : ""}
                {...register("location", {
                  required: "Location is required",
                })}
              >
                <option value="">Select Location</option>
                {locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
              {errors.location && (
                <span className="error-message">
                  {errors.location.message}
                </span>
              )}
            </fieldset>

            {/* Performed By */}
            <fieldset className="readonly-input">
              <label htmlFor="performBy">Performed By</label>
              <input
                type="text"
                value="John Doe"
                readOnly
              />
            </fieldset>

            {/* Audit Date */}
            <fieldset>
              <label htmlFor="auditDate">Audit Date<span className="required-asterisk">*</span></label>
              <input
                type="date"
                className={errors.checkoutDate ? "input-error" : ""}
                defaultValue={new Date().toISOString().split("T")[0]}
                {...register("auditDate", {
                  required: "Audit date is required",
                })}
              />
              {errors.auditDate && (
                <span className="error-message">{errors.auditDate.message}</span>
              )}
            </fieldset>

            {/* Next Audit Date */}
            <fieldset>
              <label htmlFor="nextAuditDate">Next Audit Date</label>
              <input
                type="date"
                className={errors.nextAuditDate ? "input-error" : ""}
                {...register("nextAuditDate")}
              />
              {errors.nextAuditDate && (
                <span className="error-message">{errors.nextAuditDate.message}</span>
              )}
            </fieldset>

            {/* Notes */}
            <fieldset>
              <label htmlFor="notes">Notes</label>
              <textarea
                placeholder="Enter notes"
                {...register("notes")}
                rows="3"
              ></textarea>
            </fieldset>

            {/* Attachments */}
            <fieldset>
              <label htmlFor="attachments">Attachments</label>

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
                    Maximum file size must be 5MB
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
              Save
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default PerformAudits;
