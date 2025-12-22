import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import "../../styles/Registration.css";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useForm, Controller } from "react-hook-form";
import MockupData from "../../data/mockData/repairs/asset-repair-mockup-data.json";

const ComponentCheckin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  console.log("Location state:", location.state);
  const item = location.state?.item || {};

  // Extract unique values from mock data
  const assets = Array.from(new Set(MockupData.map(item => item.asset)));

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid },
  } = useForm({
    mode: "all",
    defaultValues: {
      checkinDate: new Date().toISOString().split("T")[0],
      quantity: "",
      notes: "",
    },
  });

  const onSubmit = (data) => {
    console.log("Form submitted:", data);
    navigate("/components");
  };

  return (
    <>
      <nav>
        <NavBar />
      </nav>
      <main className="registration">
        <section className="top">
          <TopSecFormPage
            root="Components"
            currentPage="Checkin Component"
            rootNavigatePage="/components"
            title={location.state?.componentName}
          />
        </section>
        <section className="registration-form">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Checkin Date */}
            <fieldset>
              <label htmlFor="checkinDate">Checkin Date<span className="required-asterisk">*</span></label>
              <input
                type="date"
                className={errors.checkinDate ? "input-error" : ""}
                defaultValue={new Date().toISOString().split("T")[0]}
                {...register("checkinDate", {
                  required: "Checkin date is required",
                })}
              />
              {errors.checkinDate && (
                <span className="error-message">{errors.checkinDate.message}</span>
              )}
            </fieldset>

            {/* Quantity */}
            <fieldset>
              <label htmlFor="quantity">Quantity<span className="required-asterisk">*</span> (Remaining: {item.remaining_quantity})</label>
              <input
                className={errors.quantity ? "input-error" : ""}
                type="number"
                id="quantity"
                placeholder="Enter quantity"
                min="0"
                step="1"
                max={item.remaining_quantity}
                {...register("quantity", {
                  valueAsNumber: true,
                  required: "Quantity is required",
                  validate: (value) =>
                    value <= item.remaining_quantity ||
                    `Cannot exceed available quantity (${item.available_quantity})`,
                })}
              />
              {errors.quantity && (
                <span className="error-message">{errors.quantity.message}</span>
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

export default ComponentCheckin;
