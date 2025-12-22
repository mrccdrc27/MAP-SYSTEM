import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import "../../styles/Registration.css";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useForm, Controller } from "react-hook-form";
import overdueAudits from "../../data/mockData/audits/overdue-audit-mockup-data.json";
import dueAudits from "../../data/mockData/audits/due-audit-mockup-data.json";
import scheduledAudits from "../../data/mockData/audits/scheduled-audit-mockup-data.json";
import Footer from "../../components/Footer";

const ScheduleRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const item = location.state?.item || {};
  const previousPage = location.state?.previousPage || null;

  const extractAssets = (auditArray) => auditArray.map(a => a.asset.name);
  const allAssets = [
    ...extractAssets(overdueAudits),
    ...extractAssets(dueAudits),
    ...extractAssets(scheduledAudits),
  ];
  const uniqueAssets = Array.from(new Set(allAssets));

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm({
    mode: "all",
    defaultValues: {
      asset: item.asset?.name || "",
      auditDueDate: item.date || "",
      notes: item.notes || "",
      },
  });

  useEffect(() => {
  if (item) {
    setValue("asset", item.asset?.name || "");
    setValue("auditDueDate", item.date || "");
    setValue("notes", item.notes || "");
  }
}, [item, setValue]);


  const onSubmit = (data) => {
    if (item?.id) {
      console.log("Updating audit:", { id: item.id, ...data });
      // Call your update API or state logic here
    } else {
      console.log("Creating new audit:", data);
      // Call your create API or state logic here
    }

    // Redirect to scheduled audits section if coming from asset view, otherwise go back to previous page
    const redirectPage = previousPage === "/asset-view" ? "/audits/scheduled" : previousPage;
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
            currentPage="Schedule Audit"
            rootNavigatePage={previousPage === "/asset-view" ? "/audits/scheduled" : previousPage}
            title="Schedule Audit"
          />
        </section>
        <section className="registration-form">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Asset */}
            <fieldset>
              <label htmlFor="asset">Check-out To<span className="required-asterisk">*</span></label>
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

            {/* Audit Due Date */}
            <fieldset>
              <label htmlFor="auditDueDate">Audit Due Date<span className="required-asterisk">*</span></label>
              <input
                type="date"
                className={errors.auditDueDate ? "input-error" : ""}
                min={new Date().toISOString().split("T")[0]}
                {...register("auditDueDate", {
                  required: "Audit due date is required",
                })}
              />
              {errors.auditDueDate && (
                <span className="error-message">{errors.auditDueDate.message}</span>
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

export default ScheduleRegistration;
