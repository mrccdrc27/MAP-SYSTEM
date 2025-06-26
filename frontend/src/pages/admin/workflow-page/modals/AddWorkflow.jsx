import React, { useState } from 'react';
import styles from './add-workflow.module.css';
import { useAuth } from '../../../../api/AuthContext';
import useCreateWorkflow from '../../../../api/useCreateWorkflow';

const AddWorkflow = ({closeAddWorkflow }) => {
  const { user } = useAuth();
  const { createWorkflow, loading: createLoading, error: createError } = useCreateWorkflow();

  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    description: '',
    category: '',
    sub_category: '',
    status: 'draft',
    is_published: false,
    low_sla: { days: '', hours: '', minutes: '' },
    medium_sla: { days: '', hours: '', minutes: '' },
    high_sla: { days: '', hours: '', minutes: '' },
    urgent_sla: { days: '', hours: '', minutes: '' }
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'IT Support', 'HR', 'Finance', 'Operations', 'Marketing', 'Sales', 'Legal', 'Other'
  ];

  const subCategories = {
    'IT Support': ['Hardware', 'Software', 'Network', 'Security', 'Access Management'],
    'HR': ['Recruitment', 'Onboarding', 'Performance', 'Training', 'Benefits'],
    'Finance': ['Invoicing', 'Expenses', 'Budget', 'Procurement', 'Audit'],
    'Operations': ['Facilities', 'Inventory', 'Quality', 'Process', 'Maintenance'],
    'Marketing': ['Campaigns', 'Content', 'Events', 'Analytics', 'Design'],
    'Sales': ['Leads', 'Opportunities', 'Contracts', 'Support', 'Training'],
    'Legal': ['Contracts', 'Compliance', 'Intellectual Property', 'Litigation', 'Advisory'],
    'Other': ['General', 'Custom']
  };

  // SLA Templates
  const slaTemplates = {
    'IT Support': {
      name: 'IT Support Standard',
      description: 'Standard IT support response times',
      urgent_sla: { days: '0', hours: '1', minutes: '0' },
      high_sla: { days: '0', hours: '4', minutes: '0' },
      medium_sla: { days: '1', hours: '0', minutes: '0' },
      low_sla: { days: '3', hours: '0', minutes: '0' }
    },
    'Finance': {
      name: 'Finance Standard',
      description: 'Financial processes standard response times',
      urgent_sla: { days: '0', hours: '4', minutes: '0' },
      high_sla: { days: '1', hours: '0', minutes: '0' },
      medium_sla: { days: '3', hours: '0', minutes: '0' },
      low_sla: { days: '7', hours: '0', minutes: '0' }
    },
    'Development': {
      name: 'Development & Engineering',
      description: 'Software development and engineering tasks',
      urgent_sla: { days: '0', hours: '2', minutes: '0' },
      high_sla: { days: '0', hours: '8', minutes: '0' },
      medium_sla: { days: '2', hours: '0', minutes: '0' },
      low_sla: { days: '7', hours: '0', minutes: '0' }
    },
    'Generic': {
      name: 'Generic Template',
      description: 'General purpose response times',
      urgent_sla: { days: '0', hours: '1', minutes: '0' },
      high_sla: { days: '0', hours: '4', minutes: '0' },
      medium_sla: { days: '1', hours: '0', minutes: '0' },
      low_sla: { days: '3', hours: '0', minutes: '0' }
    }
  };

  const steps = [
    { id: 1, title: 'Basic Information', description: 'Enter workflow details' },
    { id: 2, title: 'Category', description: 'Select category and sub-category' },
    { id: 3, title: 'SLA Configuration', description: 'Set response time targets' },
    { id: 4, title: 'Review & Submit', description: 'Review your input before saving' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSlaChange = (slaType, unit, value) => {
    setFormData(prev => ({
      ...prev,
      [slaType]: {
        ...prev[slaType],
        [unit]: value
      }
    }));
  };

  const applySlaTemplate = (templateKey) => {
    const template = slaTemplates[templateKey];
    if (template) {
      setFormData(prev => ({
        ...prev,
        urgent_sla: { ...template.urgent_sla },
        high_sla: { ...template.high_sla },
        medium_sla: { ...template.medium_sla },
        low_sla: { ...template.low_sla }
      }));
      
      // Clear any SLA-related errors
      setErrors(prev => ({ ...prev, sla: '' }));
    }
  };

  const convertSlaToSeconds = (slaData) => {
    const days = parseInt(slaData.days) || 0;
    const hours = parseInt(slaData.hours) || 0;
    const minutes = parseInt(slaData.minutes) || 0;
    
    if (days === 0 && hours === 0 && minutes === 0) return null;
    
    return (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60);
  };

  const validateSlaOrder = () => {
    const urgent = convertSlaToSeconds(formData.urgent_sla);
    const high = convertSlaToSeconds(formData.high_sla);
    const medium = convertSlaToSeconds(formData.medium_sla);
    const low = convertSlaToSeconds(formData.low_sla);

    const slas = [
      { name: 'urgent', value: urgent },
      { name: 'high', value: high },
      { name: 'medium', value: medium },
      { name: 'low', value: low }
    ];

    for (let i = 0; i < slas.length - 1; i++) {
      const current = slas[i];
      const next = slas[i + 1];
      
      if (current.value && next.value && current.value >= next.value) {
        return `${current.name.toUpperCase()} SLA must be less than ${next.name.toUpperCase()} SLA`;
      }
    }
    return null;
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'Workflow name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        break;
      case 2:
        if (!formData.category) newErrors.category = 'Category is required';
        if (!formData.sub_category) newErrors.sub_category = 'Sub-category is required';
        break;
      case 3:
        const slaError = validateSlaOrder();
        if (slaError) newErrors.sla = slaError;
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
  
    if (!user || !user.id) {
      alert('You must be logged in to create a workflow.');
      return;
    }
  
    setIsSubmitting(true);
  
    const payload = {
      user_id: user.id,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      sub_category: formData.sub_category,
      status: formData.status,
      is_published: formData.is_published,
      low_sla: convertSlaToSeconds(formData.low_sla),
      medium_sla: convertSlaToSeconds(formData.medium_sla),
      high_sla: convertSlaToSeconds(formData.high_sla),
      urgent_sla: convertSlaToSeconds(formData.urgent_sla),
    };
  
    const result = await createWorkflow(payload);
    setIsSubmitting(false);
  
    if (result) {
      alert('Workflow created successfully!');
      closeAddWorkflow();
    } else {
      alert('Failed to create workflow.');
    }
  };
  

  const SlaInput = ({ label, slaType, priority }) => {
    return (
      <div className={styles.slaInputContainer}>
        <label className={styles.slaLabel}>
          <span className={styles.clockIcon}>🕒</span>
          {label}
        </label>
        <div className={`${styles.slaGrid} ${styles[`sla${priority.charAt(0).toUpperCase() + priority.slice(1)}`]}`}>
          <div>
            <label className={styles.unitLabel}>Days</label>
            <input
              type="number"
              min="0"
              max="365"
              placeholder="0"
              className={styles.slaInput}
              value={formData[slaType].days}
              onChange={(e) => handleSlaChange(slaType, 'days', e.target.value)}
            />
          </div>
          <div>
            <label className={styles.unitLabel}>Hours</label>
            <input
              type="number"
              min="0"
              max="23"
              placeholder="0"
              className={styles.slaInput}
              value={formData[slaType].hours}
              onChange={(e) => handleSlaChange(slaType, 'hours', e.target.value)}
            />
          </div>
          <div>
            <label className={styles.unitLabel}>Minutes</label>
            <input
              type="number"
              min="0"
              max="59"
              placeholder="0"
              className={styles.slaInput}
              value={formData[slaType].minutes}
              onChange={(e) => handleSlaChange(slaType, 'minutes', e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <div>
              <label className={styles.label}>
                Workflow Name *
              </label>
              <input
                type="text"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
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
              <label className={styles.label}>
                Description *
              </label>
              <textarea
                rows="4"
                className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
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
              <label className={styles.label}>
                Category *
              </label>
              <select
                className={`${styles.select} ${errors.category ? styles.inputError : ''}`}
                value={formData.category}
                onChange={(e) => {
                  handleInputChange('category', e.target.value);
                  handleInputChange('sub_category', ''); // Reset sub-category
                }}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
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
              <label className={styles.label}>
                Sub-category *
              </label>
              <select
                className={`${styles.select} ${errors.sub_category ? styles.inputError : ''}`}
                value={formData.sub_category}
                onChange={(e) => handleInputChange('sub_category', e.target.value)}
                disabled={!formData.category}
              >
                <option value="">Select a sub-category</option>
                {formData.category && subCategories[formData.category]?.map(subCat => (
                  <option key={subCat} value={subCat}>{subCat}</option>
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
                  <span className={styles.categoryName}>{formData.category}</span> → {formData.sub_category}
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
                Set response time targets for different priority levels. SLAs must be in ascending order: Urgent &lt; High &lt; Medium &lt; Low
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
                  💡 Click any template to auto-fill SLA values based on industry standards
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
                <SlaInput label="Urgent Priority SLA" slaType="urgent_sla" priority="urgent" />
                <SlaInput label="High Priority SLA" slaType="high_sla" priority="high" />
                <SlaInput label="Medium Priority SLA" slaType="medium_sla" priority="medium" />
                <SlaInput label="Low Priority SLA" slaType="low_sla" priority="low" />
              </div>
            </div>
          </div>
        );
      
      case 4:
      return (
        <div className={styles.stepContent}>
          <h3 className={styles.reviewTitle}>Review Workflow Details</h3>
          <div className={styles.reviewGrid}>
            <div><strong>Name:</strong> {formData.name}</div>
            <div><strong>Description:</strong> {formData.description}</div>
            <div><strong>Category:</strong> {formData.category}</div>
            <div><strong>Sub-category:</strong> {formData.sub_category}</div>
            <div><strong>Urgent SLA:</strong> {formData.urgent_sla.days}d {formData.urgent_sla.hours}h {formData.urgent_sla.minutes}m</div>
            <div><strong>High SLA:</strong> {formData.high_sla.days}d {formData.high_sla.hours}h {formData.high_sla.minutes}m</div>
            <div><strong>Medium SLA:</strong> {formData.medium_sla.days}d {formData.medium_sla.hours}h {formData.medium_sla.minutes}m</div>
            <div><strong>Low SLA:</strong> {formData.low_sla.days}d {formData.low_sla.hours}h {formData.low_sla.minutes}m</div>
          </div>
        </div>
      );

      default:
        return null;
    }
  };

  return (
    <>
    {createError && (
      <div className={styles.errorBanner}>
        <p>{typeof createError === 'string' ? createError : 'Something went wrong.'}</p>
      </div>
    )}

     <div className={styles.awOverlayWrapper}>
      <div className={styles.modalContainer}>
        <div className={styles.awExit} onClick={closeAddWorkflow}>
            <i className="fa-solid fa-xmark"></i>
        </div>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Create Workflow</h1>
            <p className={styles.subtitle}>Follow the steps to create your new workflow</p>
          </div>

          {/* Step Indicator */}
          <div className={styles.stepIndicator}>
            <div className={styles.stepIndicatorInner}>
              {steps.map((step, index) => (
                <div key={step.id} className={styles.stepItem}>
                  <div className={`${styles.stepNumber} ${
                    currentStep === step.id 
                      ? styles.stepActive 
                      : currentStep > step.id 
                        ? styles.stepCompleted
                        : styles.stepInactive
                  }`}>
                    {currentStep > step.id ? (
                      <span className={styles.checkIcon}>✓</span>
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                  <div className={styles.stepInfo}>
                    <p className={`${styles.stepTitle} ${
                      currentStep === step.id ? styles.stepTitleActive : currentStep > step.id ? styles.stepTitleCompleted : styles.stepTitleInactive
                    }`}>
                      {step.title}
                    </p>
                    <p className={styles.stepDescription}>{step.description}</p>
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
              {steps.find(step => step.id === currentStep)?.title}
            </h2>
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <div className={styles.navigation}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary} ${
                currentStep === 1 ? styles.buttonDisabled : ''
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
                    user_id: '',
                    name: '',
                    description: '',
                    category: '',
                    sub_category: '',
                    status: 'draft',
                    is_published: false,
                    low_sla: { days: '', hours: '', minutes: '' },
                    medium_sla: { days: '', hours: '', minutes: '' },
                    high_sla: { days: '', hours: '', minutes: '' },
                    urgent_sla: { days: '', hours: '', minutes: '' }
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
                className={`${styles.button} ${styles.buttonPrimary} ${isSubmitting ? styles.buttonDisabled : ''}`}
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

    </>
  );
};

export default AddWorkflow;
