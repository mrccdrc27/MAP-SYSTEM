import React, { useState } from "react";
import styles from "./add-workflow.module.css";

const AddWorkflow = ({ closeAddWorkflow }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    sub_category: "",
    department: "",
    status: "draft",
    is_published: false,
    low_sla: { days: "", hours: "", minutes: "" },
    medium_sla: { days: "", hours: "", minutes: "" },
    high_sla: { days: "", hours: "", minutes: "" },
    urgent_sla: { days: "", hours: "", minutes: "" },
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    { id: 1, title: "Basic Information", description: "Enter workflow details" },
    { id: 2, title: "Category", description: "Select category and sub-category" },
    { id: 3, title: "SLA Configuration", description: "Set response time targets" },
    { id: 4, title: "Review & Submit", description: "Review your input before saving" },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    console.log("Form submitted with data:", formData);
    setIsSubmitting(false);
    alert("Workflow created successfully! (Design mode)");
    closeAddWorkflow();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <div>
              <label className={styles.label}>Department *</label>
              <input
                type="text"
                className={`${styles.input} ${
                  errors.department ? styles.inputError : ""
                }`}
                value={formData.department}
                onChange={(e) =>
                  handleInputChange("department", e.target.value)
                }
                placeholder="Enter department name"
              />
              {errors.department && (
                <p className={styles.errorMessage}>
                  <span className={styles.alertIcon}>⚠️</span>
                  {errors.department}
                </p>
              )}
            </div>
            <div>
              <label className={styles.label}>Workflow Name *</label>
              <input
                type="text"
                className={`${styles.input} ${
                  errors.name ? styles.inputError : ""
                }`}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter workflow name"
              />
              {errors.name && (
                <p className={styles.errorMessage}>
                  <span className={styles.alertIcon}>⚠️</span>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className={styles.label}>Description *</label>
              <textarea
                rows="4"
                className={`${styles.textarea} ${
                  errors.description ? styles.inputError : ""
                }`}
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Describe the workflow purpose and process"
              />
              {errors.description && (
                <p className={styles.errorMessage}>
                  <span className={styles.alertIcon}>⚠️</span>
                  {errors.description}
                </p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContent}>
            <div>
              <label className={styles.label}>Category *</label>
              <select
                className={`${styles.select} ${
                  errors.category ? styles.inputError : ""
                }`}
                value={formData.category}
                onChange={(e) => {
                  handleInputChange("category", e.target.value);
                  handleInputChange("sub_category", ""); // Reset sub-category
                }}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className={styles.errorMessage}>
                  <span className={styles.alertIcon}>⚠️</span>
                  {errors.category}
                </p>
              )}
            </div>

            <div>
              <label className={styles.label}>Sub-category *</label>
              <select
                className={`${styles.select} ${
                  errors.sub_category ? styles.inputError : ""
                }`}
                value={formData.sub_category}
                onChange={(e) =>
                  handleInputChange("sub_category", e.target.value)
                }
                disabled={!formData.category}
              >
                <option value="">Select a sub-category</option>
                {formData.category &&
                  subCategories[formData.category]?.map((subCat) => (
                    <option key={subCat} value={subCat}>
                      {subCat}
                    </option>
                  ))}
              </select>
              {errors.sub_category && (
                <p className={styles.errorMessage}>
                  <span className={styles.alertIcon}>⚠️</span>
                  {errors.sub_category}
                </p>
              )}
            </div>

            {formData.category && formData.sub_category && (
              <div className={styles.categoryInfo}>
                <h4 className={styles.categoryInfoTitle}>Selected Category</h4>
                <p className={styles.categoryInfoText}>
                  <span className={styles.categoryName}>
                    {formData.category}
                  </span>{" "}
                  → {formData.sub_category}
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className={styles.stepContent}>
            <div>
              <p className={styles.slaDescription}>
                Set response time targets for different priority levels. SLAs
                must be in ascending order: Urgent &lt; High &lt; Medium &lt;
                Low
              </p>

              {/* SLA Template Buttons */}
              <div className={styles.templateContainer}>
                <h3 className={styles.templateTitle}>
                  <span className={styles.zapIcon}>⚡</span>
                  Apply SLA Template
                </h3>
                <div className={styles.templateGrid}>
                  {Object.entries(slaTemplates).map(([key, template]) => (
                    <button
                      key={key}
                      type="button"
                      className={styles.templateButton}
                      onClick={() => applySlaTemplate(key)}
                      title={template.description}
                    >
                      <span className={styles.templateIcon}>⚡</span>
                      {template.name}
                    </button>
                  ))}
                </div>
                <p className={styles.templateHint}>
                  💡 Click any template to auto-fill SLA values based on
                  industry standards
                </p>
              </div>

              {errors.sla && (
                <div className={styles.slaError}>
                  <p className={styles.slaErrorText}>
                    <span className={styles.alertIcon}>⚠️</span>
                    {errors.sla}
                  </p>
                </div>
              )}

              <div className={styles.slaInputGrid}>
                <SlaInput
                  label="Urgent Priority SLA"
                  slaType="urgent_sla"
                  priority="urgent"
                />
                <SlaInput
                  label="High Priority SLA"
                  slaType="high_sla"
                  priority="high"
                />
                <SlaInput
                  label="Medium Priority SLA"
                  slaType="medium_sla"
                  priority="medium"
                />
                <SlaInput
                  label="Low Priority SLA"
                  slaType="low_sla"
                  priority="low"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.reviewTitle}>Review Workflow Details</h3>
            <div className={styles.reviewGrid}>
              <div>
                <strong>Department:</strong> {formData.department}
              </div>
              <div>
                <strong>Name:</strong> {formData.name}
              </div>
              <div>
                <strong>Description:</strong> {formData.description}
              </div>
              <div>
                <strong>Category:</strong> {formData.category}
              </div>
              <div>
                <strong>Sub-category:</strong> {formData.sub_category}
              </div>
              <div>
                <strong>Urgent SLA:</strong> {formData.urgent_sla.days}d{" "}
                {formData.urgent_sla.hours}h {formData.urgent_sla.minutes}m
              </div>
              <div>
                <strong>High SLA:</strong> {formData.high_sla.days}d{" "}
                {formData.high_sla.hours}h {formData.high_sla.minutes}m
              </div>
              <div>
                <strong>Medium SLA:</strong> {formData.medium_sla.days}d{" "}
                {formData.medium_sla.hours}h {formData.medium_sla.minutes}m
              </div>
              <div>
                <strong>Low SLA:</strong> {formData.low_sla.days}d{" "}
                {formData.low_sla.hours}h {formData.low_sla.minutes}m
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.awOverlayWrapper}>
      <div className={styles.modalContainer}>
        <div className={styles.awExit} onClick={closeAddWorkflow}>
          <i className="fa-solid fa-xmark"></i>
        </div>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Create Workflow</h1>
            <p className={styles.subtitle}>
              Follow the steps to create your new workflow
            </p>
          </div>

          {/* Step Indicator */}
          <div className={styles.stepIndicator}>
            <div className={styles.stepIndicatorInner}>
              {steps.map((step, index) => (
                <div key={step.id} className={styles.stepItem}>
                  <div
                    className={`${styles.stepNumber} ${
                      currentStep === step.id
                        ? styles.stepActive
                        : currentStep > step.id
                        ? styles.stepCompleted
                        : styles.stepInactive
                    }`}
                  >
                    {currentStep > step.id ? (
                      <span className={styles.checkIcon}>✓</span>
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                  <div className={styles.stepInfo}>
                    <p
                      className={`${styles.stepTitle} ${
                        currentStep === step.id
                          ? styles.stepTitleActive
                          : currentStep > step.id
                          ? styles.stepTitleCompleted
                          : styles.stepTitleInactive
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className={styles.stepDescription}>
                      {step.description}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <span className={styles.stepSeparator}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className={styles.stepContentContainer}>
            <h2 className={styles.stepContentTitle}>
              {steps.find((step) => step.id === currentStep)?.title}
            </h2>
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <div className={styles.navigation}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary} ${
                currentStep === 1 ? styles.buttonDisabled : ""
              }`}
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <span className={styles.chevronLeft}>←</span>
              Previous
            </button>

            <div className={styles.navigationRight}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => {
                  setFormData({
                    user_id: "",
                    name: "",
                    description: "",
                    category: "",
                    sub_category: "",
                    department: "",
                    status: "draft",
                    is_published: false,
                    low_sla: { days: "", hours: "", minutes: "" },
                    medium_sla: { days: "", hours: "", minutes: "" },
                    high_sla: { days: "", hours: "", minutes: "" },
                    urgent_sla: { days: "", hours: "", minutes: "" },
                  });
                  setErrors({});
                  setCurrentStep(1);
                }}
              >
                Reset
              </button>
              {currentStep < 4 ? (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={nextStep}
                >
                  Next
                  <span className={styles.chevronRight}>→</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  className={`${styles.button} ${styles.buttonPrimary} ${
                    isSubmitting ? styles.buttonDisabled : ""
                  }`}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <span className={styles.spinner}></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className={styles.checkIcon}>✓</span>
                      Submit Workflow
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddWorkflow;
