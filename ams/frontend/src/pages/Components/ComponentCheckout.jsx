import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import "../../styles/Registration.css";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useForm, Controller } from "react-hook-form";
import MockupData from "../../data/mockData/repairs/asset-repair-mockup-data.json";

const ComponentCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
      asset: "",
      quantity: "",
      checkoutDate: new Date().toISOString().split("T")[0],
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
            currentPage="Checkout Component"
            rootNavigatePage="/components"
            title={item.name}
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

            {/* Quantity */}
            <fieldset>
              <label htmlFor="quantity">Quantity<span className="required-asterisk">*</span> (Remaining: {item.available_quantity})</label>
              <input
                className={errors.quantity ? "input-error" : ""}
                type="number"
                id="quantity"
                placeholder="Enter quantity"
                min="0"
                step="1"
                max={item.available_quantity}
                {...register("quantity", {
                  valueAsNumber: true,
                  required: "Quantity is required",
                  validate: (value) =>
                    value <= item.available_quantity ||
                    `Cannot exceed available quantity (${item.available_quantity})`,
                })}
              />
              {errors.quantity && (
                <span className="error-message">{errors.quantity.message}</span>
              )}
            </fieldset>

            {/* Checkout Date */}
            <fieldset>
              <label htmlFor="checkoutDate">Checkout Date<span className="required-asterisk">*</span></label>
              <input
                type="date"
                className={errors.checkoutDate ? "input-error" : ""}
                defaultValue={new Date().toISOString().split("T")[0]}
                {...register("checkoutDate", {
                  required: "Checkout date is required",
                })}
              />
              {errors.checkoutDate && (
                <span className="error-message">{errors.checkoutDate.message}</span>
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

export default ComponentCheckout;
