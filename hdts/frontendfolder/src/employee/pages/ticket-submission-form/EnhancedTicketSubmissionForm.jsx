import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { IoClose } from 'react-icons/io5';
import { 
  FaLaptop, 
  FaBox, 
  FaBoxOpen, 
  FaFileInvoiceDollar, 
  FaPlus, 
  FaTools, 
  FaExclamationTriangle,
  FaTrashAlt,
  FaDesktop,
  FaMoneyBillWave,
  FaUser
} from 'react-icons/fa';
import styles from './EnhancedTicketForm.module.css';
import formStyles from './EmployeeTicketSubmissionForm.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import { useAuth } from '../../../context/AuthContext';
import { TICKET_CATEGORIES } from '../../../shared/constants/ticketCategories';
import ITSupportForm from './ITSupportForm';
import AssetCheckInForm from './AssetCheckInForm';
import AssetCheckOutForm from './AssetCheckOutForm';
import BudgetProposalForm from './BudgetProposalForm';
import AssetRequestForm from './AssetRequestForm';
import AssetRegistrationForm from './AssetRegistrationForm';
import AssetRepairForm from './AssetRepairForm';
import AssetIncidentForm from './AssetIncidentForm';
import AssetDisposalForm from './AssetDisposalForm';

const ALLOWED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];

// Category configurations with icons and descriptions
const CATEGORY_CONFIG = {
  'IT Support': {
    icon: FaDesktop,
    description: 'Technical support, troubleshooting, and IT assistance',
    color: '#2563eb',
    hasSubCategories: true
  },
  'Asset Check In': {
    icon: FaBoxOpen,
    description: 'Return or check-in company assets',
    color: '#059669',
    hasSubCategories: true
  },
  'Asset Check Out': {
    icon: FaBox,
    description: 'Request to check-out company assets',
    color: '#dc2626',
    hasSubCategories: true
  },
  'Asset Request': {
    icon: FaPlus,
    description: 'Request new assets for budget approval',
    color: '#7c3aed',
    hasSubCategories: true
  },
  'Asset Registration': {
    icon: FaLaptop,
    description: 'Register newly acquired assets',
    color: '#0891b2',
    hasSubCategories: false
  },
  'Asset Repair': {
    icon: FaTools,
    description: 'Report asset repairs and maintenance',
    color: '#ea580c',
    hasSubCategories: true
  },
  'Asset Incident': {
    icon: FaExclamationTriangle,
    description: 'Report stolen, damaged, or lost assets',
    color: '#dc2626',
    hasSubCategories: true
  },
  'Asset Disposal': {
    icon: FaTrashAlt,
    description: 'Request asset disposal and lifecycle review',
    color: '#6b7280',
    hasSubCategories: false
  },
  'New Budget Proposal': {
    icon: FaMoneyBillWave,
    description: 'Submit budget proposals and financial requests',
    color: '#16a34a',
    hasSubCategories: true
  },
  'Others': {
    icon: FaUser,
    description: 'General requests and other inquiries',
    color: '#6b7280',
    hasSubCategories: false
  }
};

// Sub-category configurations
const SUBCATEGORY_CONFIG = {
  'IT Support': [
    { value: 'Technical Support & Troubleshooting', description: 'Hardware and software issues' },
    { value: 'Software & Applications Deployment', description: 'Software installation and updates' },
    { value: 'System Maintenance', description: 'System updates and maintenance' },
    { value: 'Network & Security Administration', description: 'Network and security support' }
  ],
  'Asset Check In': [
    { value: 'Laptop', description: 'Return laptop devices' },
    { value: 'Printer', description: 'Return printer equipment' },
    { value: 'Projector', description: 'Return projector devices' },
    { value: 'Mouse', description: 'Return computer mice' },
    { value: 'Keyboard', description: 'Return keyboards' }
  ],
  'Asset Check Out': [
    { value: 'Laptop', description: 'Request laptop devices' },
    { value: 'Printer', description: 'Request printer equipment' },
    { value: 'Projector', description: 'Request projector devices' },
    { value: 'Mouse', description: 'Request computer mice' },
    { value: 'Keyboard', description: 'Request keyboards' }
  ],
  'Asset Request': [
    { value: 'New Asset', description: 'Request completely new assets' },
    { value: 'Asset Renewal', description: 'Renew or replace existing assets' }
  ],
  'Asset Repair': [
    { value: 'Corrective Repair', description: 'Fix broken functionality' },
    { value: 'Preventive Maintenance', description: 'Regular maintenance' },
    { value: 'Upgrade', description: 'Hardware or software upgrades' },
    { value: 'Part Replacement', description: 'Replace specific components' },
    { value: 'OS Re-imaging', description: 'Software-level fixes' },
    { value: 'Warranty Service', description: 'Vendor warranty service' }
  ],
  'Asset Incident': [
    { value: 'Stolen', description: 'Report stolen assets' },
    { value: 'Damage', description: 'Report damaged assets' },
    { value: 'Employee Resign', description: 'Employee resignation or death' }
  ],
  'New Budget Proposal': [
    { value: 'Capital Expenses (CapEx)', description: 'Long-term investments' },
    { value: 'Operational Expenses (OpEx)', description: 'Day-to-day operations' },
    { value: 'Reimbursement Claim (Liabilities)', description: 'Reimbursements and claims' },
    { value: 'Charging Department (Cost Center)', description: 'Departmental cost allocation' }
  ]
};

const STEPS = {
  CATEGORY_SELECTION: 1,
  SUBCATEGORY_SELECTION: 2,
  FORM_DETAILS: 3,
  REVIEW_SUBMIT: 4
};

// FormField component - defined outside to prevent re-creation on each render
const FormField = ({ id, label, required = false, error, render }) => (
  <fieldset className={formStyles.fieldset}>
    <label htmlFor={id}>
      {label}
      {required && <span className={formStyles.required}>*</span>}
    </label>
    {render()}
    {error && <span className={formStyles.errorMessage}>{error}</span>}
  </fieldset>
);

export default function EnhancedTicketSubmissionForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(STEPS.CATEGORY_SELECTION);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    subCategory: '',
    description: '',
    assetName: '',
    serialNumber: '',
    location: '',
    expectedReturnDate: '',
    issueType: '',
    otherIssue: '',
    schedule: '',
    deviceType: '',
    customDeviceType: '',
    softwareAffected: '',
    performanceStartDate: '',
    performanceEndDate: '',
    preparedBy: '',
    // Asset Request fields
    assetCategory: '',
    productName: '',
    modelNumber: '',
    manufacturer: '',
    supplier: '',
    specs: {},
    unitCost: '',
    quantity: 1,
    eolDate: '',
    depreciationMonths: '',
    justification: '',
    // Asset Registration fields
    requestReference: '',
    orderNumber: '',
    purchaseCost: '',
    purchaseDate: '',
    warrantyExpiry: '',
    department: '',
    // Asset Repair fields
    assetId: '',
    repairName: '',
    startDate: '',
    endDate: '',
    serviceCost: '',
    componentId: '',
    componentName: '',
    componentCategory: '',
    componentQuantity: 1,
    componentCost: '',
    newComponentName: '',
    newComponentCategory: '',
    newComponentSupplier: '',
    newComponentManufacturer: '',
    newComponentLocation: '',
    newComponentModelNumber: '',
    newComponentPurchaseDate: '',
    newComponentQuantity: 1,
    newComponentCost: '',
    repairNotes: '',
    // Asset Incident fields
    assignedTo: '',
    incidentDate: '',
    damageDescription: '',
    policeReportNumber: '',
    lastKnownLocation: '',
    employeeName: '',
    lastWorkingDay: '',
    // Asset Disposal fields
    assetAge: '',
    eolStatus: '',
    utilizationAvg: '',
    repairCount: '',
    totalRepairCost: '',
    lastAuditResult: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [budgetItems, setBudgetItems] = useState([{ cost_element: '', estimated_cost: '', description: '', account: 2 }]);

  // Progress calculation
  const getProgress = () => {
    switch (currentStep) {
      case STEPS.CATEGORY_SELECTION: return 25;
      case STEPS.SUBCATEGORY_SELECTION: return 50;
      case STEPS.FORM_DETAILS: return 75;
      case STEPS.REVIEW_SUBMIT: return 100;
      default: return 0;
    }
  };

  // Step titles
  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.CATEGORY_SELECTION: return 'Select Category';
      case STEPS.SUBCATEGORY_SELECTION: return 'Choose Sub-Category';
      case STEPS.FORM_DETAILS: return 'Ticket Details';
      case STEPS.REVIEW_SUBMIT: return 'Review & Submit';
      default: return '';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case STEPS.CATEGORY_SELECTION: return 'What type of assistance do you need?';
      case STEPS.SUBCATEGORY_SELECTION: return 'Please specify the type of request';
      case STEPS.FORM_DETAILS: return 'Provide the necessary details for your request';
      case STEPS.REVIEW_SUBMIT: return 'Review your information before submitting';
      default: return '';
    }
  };

  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category }));
    
    const config = CATEGORY_CONFIG[category];
    if (config?.hasSubCategories) {
      setCurrentStep(STEPS.SUBCATEGORY_SELECTION);
    } else {
      setSelectedSubCategory('');
      setFormData(prev => ({ ...prev, subCategory: '' }));
      setCurrentStep(STEPS.FORM_DETAILS);
    }
  };

  // Handle subcategory selection
  const handleSubCategorySelect = (subCategory) => {
    setSelectedSubCategory(subCategory);
    setFormData(prev => ({ ...prev, subCategory }));
    setCurrentStep(STEPS.FORM_DETAILS);
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentStep === STEPS.SUBCATEGORY_SELECTION) {
      setCurrentStep(STEPS.CATEGORY_SELECTION);
      setSelectedCategory('');
      setSelectedSubCategory('');
      setFormData(prev => ({ ...prev, category: '', subCategory: '' }));
    } else if (currentStep === STEPS.FORM_DETAILS) {
      const config = CATEGORY_CONFIG[selectedCategory];
      if (config?.hasSubCategories) {
        setCurrentStep(STEPS.SUBCATEGORY_SELECTION);
      } else {
        setCurrentStep(STEPS.CATEGORY_SELECTION);
      }
    } else if (currentStep === STEPS.REVIEW_SUBMIT) {
      setCurrentStep(STEPS.FORM_DETAILS);
    }
  };

  const handleNext = () => {
    if (currentStep === STEPS.FORM_DETAILS) {
      setCurrentStep(STEPS.REVIEW_SUBMIT);
    }
  };

  // Validation
  const validateCurrentStep = () => {
    if (currentStep === STEPS.FORM_DETAILS) {
      return formData.subject.trim().length >= 5 && formData.description.trim().length >= 10;
    }
    return true;
  };

  // Form input handlers
  const handleInputChange = (field) => (e) => {
    let value = e.target.value;

    if (field === 'subject') {
      value = value.slice(0, 70);
    }
    if (field === 'description') {
      value = value.slice(0, 150);
    }

    setFormData(prev => ({ ...prev, [field]: value }));

    if (touched[field]) {
      // Clear error if field becomes valid
      if (field === 'subject' && value.trim().length >= 5) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
      if (field === 'description' && value.trim().length >= 10) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    let error = '';
    if (field === 'subject' && formData.subject.trim().length < 5) {
      error = 'Subject must be at least 5 characters long';
    }
    if (field === 'description' && formData.description.trim().length < 10) {
      error = 'Description must be at least 10 characters long';
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // File handling
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const invalidFiles = files.filter(file => !ALLOWED_FILE_TYPES.includes(file.type));

    if (invalidFiles.length > 0) {
      setFileError('Some files have invalid types. Please upload only PNG, JPG, PDF, Word, Excel, or CSV files.');
      return;
    }

    setFileError('');
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit handler
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const finalCategory = formData.category === 'Others' ? 'General Request' : formData.category;
      const formDataToSend = new FormData();
      
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('category', finalCategory);
      formDataToSend.append('sub_category', formData.subCategory || '');
      formDataToSend.append('description', formData.description || '');
      
      selectedFiles.forEach((file) => {
        formDataToSend.append('files[]', file);
      });

      // Add category-specific dynamic data
      const dynamicData = {};
      // Add all the dynamic data logic here similar to original form...
      
      if (Object.keys(dynamicData).length > 0) {
        formDataToSend.append('dynamic_data', JSON.stringify(dynamicData));
      }

      const newTicket = await backendTicketService.createTicket(formDataToSend);
      
      toast.success('Ticket submitted successfully!');
      
      const ticketNumber = newTicket.ticket_number || newTicket.ticketNumber || newTicket.id;
      setTimeout(() => navigate(`/employee/ticket-tracker/${ticketNumber}`, { state: { from: 'Home' } }), 1500);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error(error.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent form submission on Enter key in input fields
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      // Only prevent if it's not a textarea or if it's a textarea with Ctrl+Enter for submit
      if (e.target.tagName === 'INPUT' || (e.target.tagName === 'TEXTAREA' && !e.ctrlKey)) {
        e.preventDefault();
      }
    }
  };

  // Render category selection
  const renderCategorySelection = () => (
    <>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>{getStepTitle()}</h1>
        <p className={styles.stepSubtitle}>{getStepSubtitle()}</p>
      </div>
      
      <div className={styles.categoryGrid}>
        {TICKET_CATEGORIES.map(category => {
          const config = CATEGORY_CONFIG[category];
          const Icon = config?.icon || FaUser;
          
          return (
            <div
              key={category}
              className={`${styles.categoryCard} ${selectedCategory === category ? styles.selected : ''}`}
              onClick={() => handleCategorySelect(category)}
            >
              <div className={styles.categoryIcon}>
                <Icon />
              </div>
              <h3 className={styles.categoryTitle}>{category}</h3>
              <p className={styles.categoryDescription}>
                {config?.description || 'General assistance and support'}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );

  // Render subcategory selection
  const renderSubCategorySelection = () => {
    const subCategories = SUBCATEGORY_CONFIG[selectedCategory] || [];
    
    return (
      <>
        <div className={styles.stepHeader}>
          <h1 className={styles.stepTitle}>{getStepTitle()}</h1>
          <p className={styles.stepSubtitle}>{getStepSubtitle()}</p>
        </div>

        <div className={styles.selectedCategoryInfo}>
          <div className={styles.selectedCategoryIcon}>
            {CATEGORY_CONFIG[selectedCategory]?.icon && 
              React.createElement(CATEGORY_CONFIG[selectedCategory].icon)
            }
          </div>
          <div className={styles.selectedCategoryText}>
            <div className={styles.selectedCategoryTitle}>{selectedCategory}</div>
          </div>
          <button type="button" className={styles.changeButton} onClick={handleBack}>
            Change
          </button>
        </div>
        
        <div className={styles.subCategoryGrid}>
          {subCategories.map(sub => (
            <div
              key={sub.value}
              className={`${styles.subCategoryCard} ${selectedSubCategory === sub.value ? styles.selected : ''}`}
              onClick={() => handleSubCategorySelect(sub.value)}
            >
              <h4 className={styles.subCategoryTitle}>{sub.value}</h4>
              <p className={styles.subCategoryDesc}>{sub.description}</p>
            </div>
          ))}
        </div>
      </>
    );
  };

  // Render form details
  const renderFormDetails = () => {
    const isITSupport = selectedCategory === 'IT Support';
    const isAssetCheckIn = selectedCategory === 'Asset Check In';
    const isAssetCheckOut = selectedCategory === 'Asset Check Out';
    const isAssetRequest = selectedCategory === 'Asset Request';
    const isAssetRegistration = selectedCategory === 'Asset Registration';
    const isAssetRepair = selectedCategory === 'Asset Repair';
    const isAssetIncident = selectedCategory === 'Asset Incident';
    const isAssetDisposal = selectedCategory === 'Asset Disposal';
    const isBudgetProposal = selectedCategory === 'New Budget Proposal';

    return (
      <>
        <div className={styles.stepHeader}>
          <h1 className={styles.stepTitle}>{getStepTitle()}</h1>
          <p className={styles.stepSubtitle}>{getStepSubtitle()}</p>
        </div>

        <div className={styles.selectedCategoryInfo}>
          <div className={styles.selectedCategoryIcon}>
            {CATEGORY_CONFIG[selectedCategory]?.icon && 
              React.createElement(CATEGORY_CONFIG[selectedCategory].icon)
            }
          </div>
          <div className={styles.selectedCategoryText}>
            <div className={styles.selectedCategoryTitle}>{selectedCategory}</div>
            {selectedSubCategory && (
              <div className={styles.selectedCategorySub}>{selectedSubCategory}</div>
            )}
          </div>
          <button type="button" className={styles.changeButton} onClick={handleBack}>
            Change
          </button>
        </div>

        <div className={styles.formSection}>
          {/* Basic Fields */}
          <FormField
            id="subject"
            label="Subject"
            required
            error={errors.subject}
            render={() => (
              <div className={formStyles.inputWithCounter}>
                <input
                  type="text"
                  placeholder="Enter ticket subject"
                  value={formData.subject}
                  maxLength={70}
                  onChange={handleInputChange('subject')}
                  onBlur={handleBlur('subject')}
                />
                <span className={formStyles.charCounter}>
                  {String(formData.subject?.length || 0)}/70
                </span>
              </div>
            )}
          />

          {/* Category-specific forms */}
          {isITSupport && (
            <ITSupportForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
            />
          )}

          {isAssetCheckIn && (
            <AssetCheckInForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
            />
          )}

          {isAssetCheckOut && (
            <AssetCheckOutForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
            />
          )}

          {isAssetRequest && (
            <AssetRequestForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
              setFormData={setFormData}
            />
          )}

          {isAssetRegistration && (
            <AssetRegistrationForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
              setFormData={setFormData}
            />
          )}

          {isAssetRepair && (
            <AssetRepairForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
              setFormData={setFormData}
            />
          )}

          {isAssetIncident && (
            <AssetIncidentForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
              setFormData={setFormData}
            />
          )}

          {isAssetDisposal && (
            <AssetDisposalForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
              setFormData={setFormData}
            />
          )}

          {isBudgetProposal && (
            <BudgetProposalForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
              budgetItems={budgetItems}
              setBudgetItems={setBudgetItems}
            />
          )}

          {/* Description */}
          <FormField
            id="description"
            label="Description"
            required
            error={errors.description}
            render={() => (
              <div className={formStyles.inputWithCounter}>
                <textarea
                  rows={5}
                  placeholder="Provide a detailed description..."
                  value={formData.description}
                  maxLength={150}
                  onChange={handleInputChange('description')}
                  onBlur={handleBlur('description')}
                />
                <span className={formStyles.charCounter}>
                  {String(formData.description?.length || 0)}/150
                </span>
              </div>
            )}
          />

          {/* File Upload */}
          <FormField
            id="fileUpload"
            label="File Upload (PNG, JPG, PDF, Word, Excel, & CSV)"
            render={() => (
              <div className={formStyles.fileUploadWrapper}>
                <input
                  type="file"
                  id="fileUpload"
                  multiple
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  onChange={handleFileChange}
                  hidden
                />
                <button
                  type="button"
                  className={formStyles.uploadFileBtn}
                  onClick={() => document.getElementById('fileUpload').click()}
                >
                  {selectedFiles.length > 0 ? 'Add More Files' : 'Choose Files'}
                </button>
                {fileError && <span className={formStyles.errorMessage}>{fileError}</span>}

                {selectedFiles.length > 0 && (
                  <div className={formStyles.filePreviewList}>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className={formStyles.filePreview}>
                        <p className={formStyles.fileName}>{file.name}</p>
                        <button
                          type="button"
                          className={formStyles.removeFileBtn}
                          onClick={() => removeFile(index)}
                        >
                          <IoClose />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </>
    );
  };

  // Render review step
  const renderReviewSubmit = () => (
    <>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>{getStepTitle()}</h1>
        <p className={styles.stepSubtitle}>{getStepSubtitle()}</p>
      </div>

      <div className={styles.selectedCategoryInfo}>
        <div className={styles.selectedCategoryIcon}>
          {CATEGORY_CONFIG[selectedCategory]?.icon && 
            React.createElement(CATEGORY_CONFIG[selectedCategory].icon)
          }
        </div>
        <div className={styles.selectedCategoryText}>
          <div className={styles.selectedCategoryTitle}>{selectedCategory}</div>
          {selectedSubCategory && (
            <div className={styles.selectedCategorySub}>{selectedSubCategory}</div>
          )}
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={formStyles.reviewSection}>
          <h3>Subject: {formData.subject}</h3>
          <p><strong>Description:</strong> {formData.description}</p>
          {selectedFiles.length > 0 && (
            <p><strong>Attachments:</strong> {selectedFiles.length} file(s)</p>
          )}
        </div>
      </div>
    </>
  );

  // Main render
  return (
    <div className={styles.ticketSubmissionContainer} onKeyDown={handleKeyDown}>
      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${getProgress()}%` }}
        />
      </div>

      {/* Step Indicator */}
      <div className={styles.stepIndicator}>
        <div className={styles.stepItem}>
          <div className={`${styles.stepNumber} ${currentStep >= 1 ? (currentStep === 1 ? styles.active : styles.completed) : styles.inactive}`}>
            1
          </div>
          <span className={styles.stepLabel}>Category</span>
        </div>
        <div className={styles.stepItem}>
          <div className={`${styles.stepNumber} ${currentStep >= 2 ? (currentStep === 2 ? styles.active : styles.completed) : styles.inactive}`}>
            2
          </div>
          <span className={styles.stepLabel}>Sub-Category</span>
        </div>
        <div className={styles.stepItem}>
          <div className={`${styles.stepNumber} ${currentStep >= 3 ? (currentStep === 3 ? styles.active : styles.completed) : styles.inactive}`}>
            3
          </div>
          <span className={styles.stepLabel}>Details</span>
        </div>
        <div className={styles.stepItem}>
          <div className={`${styles.stepNumber} ${currentStep >= 4 ? (currentStep === 4 ? styles.active : styles.completed) : styles.inactive}`}>
            4
          </div>
          <span className={styles.stepLabel}>Submit</span>
        </div>
      </div>

      {/* Step Content */}
      <div className={styles.stepContent}>
        {currentStep === STEPS.CATEGORY_SELECTION && renderCategorySelection()}
        {currentStep === STEPS.SUBCATEGORY_SELECTION && renderSubCategorySelection()}
        {currentStep === STEPS.FORM_DETAILS && renderFormDetails()}
        {currentStep === STEPS.REVIEW_SUBMIT && renderReviewSubmit()}

        {/* Navigation Buttons */}
        <div className={styles.navigationButtons}>
          <div>
            {currentStep > STEPS.CATEGORY_SELECTION && (
              <button 
                type="button"
                className={styles.backButton} 
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Back
              </button>
            )}
          </div>
          
          <div>
            {currentStep < STEPS.REVIEW_SUBMIT && (
              <button 
                type="button"
                className={styles.nextButton}
                onClick={handleNext}
                disabled={!validateCurrentStep()}
              >
                Next
              </button>
            )}
            
            {currentStep === STEPS.REVIEW_SUBMIT && (
              <button 
                type="button"
                className={styles.submitButton}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting && <div className={styles.loadingSpinner} />}
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}