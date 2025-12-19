import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { IoClose } from 'react-icons/io5';
import LoadingButton from '../../../shared/buttons/LoadingButton';
import Button from '../../../shared/components/Button';
import styles from './EmployeeTicketSubmissionForm.module.css';
import coordinatorStyles from '../../../coordinator-admin/pages/account-register/CoordinatorAdminAccountRegister.module.css';
import formActions from '../../../shared/styles/formActions.module.css';
import FormActions from '../../../shared/components/FormActions';
import FormCard from '../../../shared/components/FormCard';
import { backendTicketService } from '../../../services/backend/ticketService';
import authService from '../../../utilities/service/authService';
import { useAuth } from '../../../context/AuthContext';
import ITSupportForm from './ITSupportForm';
import AssetCheckInForm, { mockAssets } from './AssetCheckInForm';
import AssetCheckOutForm from './AssetCheckOutForm';
import BudgetProposalForm from './BudgetProposalForm';

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

import { TICKET_CATEGORIES } from '../../../shared/constants/ticketCategories';

export default function EmployeeTicketSubmissionForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  
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
    preparedBy: ''
  });

  // If navigated with prefill state, populate initial fields
  useEffect(() => {
    if (location && location.state && location.state.prefill) {
      const pre = location.state.prefill;
      setFormData((prev) => ({
        ...prev,
        subject: pre.subject || prev.subject,
        description: pre.description || prev.description,
        category: pre.category || prev.category,
      }));
    }
  }, [location]);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [budgetItems, setBudgetItems] = useState([{ cost_element: '', estimated_cost: '', description: '', account: 2 }]);
  const [showCustomDeviceType, setShowCustomDeviceType] = useState(false);

  // Determine actual category (if "Others", it's General Request)
  const getActualCategory = () => {
    if (formData.category === 'Others') {
      return 'General Request';
    }
    return formData.category;
  };

  // Category checks
  const actualCategory = getActualCategory();
  const isGeneralRequest = actualCategory === 'General Request';
  const isITSupport = formData.category === 'IT Support';
  const isAssetCheckIn = formData.category === 'Asset Check In';
  const isAssetCheckOut = formData.category === 'Asset Check Out';
  const isBudgetProposal = formData.category === 'New Budget Proposal';
  const isAnyAssetCategory = isAssetCheckIn || isAssetCheckOut;

  const validateField = (field, value) => {
    let error = '';
    
    switch (field) {
      case 'subject':
        if (!value.trim()) {
          error = 'Subject is required';
        } else if (value.trim().length < 5) {
          error = 'Subject must be at least 5 characters long';
        }
        break;
      
      case 'category':
        if (!value) {
          error = 'Category is required';
        }
        break;
      
      case 'subCategory':
        if ((isITSupport || isAnyAssetCategory || isBudgetProposal) && !value) {
          error = 'Sub-Category is required';
        }
        break;
      
      case 'description':
        if (!value.trim()) {
          error = 'Description is required';
        } else if (value.trim().length < 10) {
          error = 'Description must be at least 10 characters long';
        }
        break;
      
      case 'assetName':
        if (isAnyAssetCategory && !value) {
          error = 'Asset Name is required';
        }
        break;
      
      case 'location':
        if (isAnyAssetCategory && !value) {
          error = 'Location is required';
        }
        break;
      
      case 'issueType':
        if (isAssetCheckIn && !value) {
          error = 'Issue Type is required';
        }
        break;

      case 'expectedReturnDate':
        if (isAssetCheckOut && !value) {
          error = 'Expected Return Date is required';
        }
        break;
      
      case 'deviceType':
        if (isITSupport && !value && !formData.customDeviceType) {
          error = 'Device Type is required';
        }
        break;
      
      case 'customDeviceType':
        if (isITSupport && showCustomDeviceType && !value.trim()) {
          error = 'Custom Device Type is required';
        }
        break;
      
      case 'softwareAffected':
        // Software affected is optional, no validation required
        break;
      
      case 'performanceStartDate':
        if (isBudgetProposal && !value) {
          error = 'Performance Start Date is required';
        }
        break;
      
      case 'performanceEndDate':
        if (isBudgetProposal && !value) {
          error = 'Performance End Date is required';
        } else if (isBudgetProposal && formData.performanceStartDate && value < formData.performanceStartDate) {
          error = 'End Date must be after or equal to Start Date';
        }
        break;
      
      case 'preparedBy':
        if (isBudgetProposal && !value.trim()) {
          error = 'Prepared By is required';
        }
        break;
      
      default:
        break;
    }
    
    return error;
  };

  const handleInputChange = (field) => (e) => {
    let value = e.target.value;

    // Enforce max lengths for subject and description per request.
    if (field === 'subject') {
      value = value.slice(0, 70);
    }
    if (field === 'description') {
      value = value.slice(0, 150);
    }

    setFormData({
      ...formData,
      [field]: value
    });

    // Reset dependent fields when category changes
    if (field === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        subCategory: '',
        assetName: '',
        serialNumber: '',
        location: '',
        expectedReturnDate: '',
        issueType: '',
        otherIssue: '',
        deviceType: '',
        customDeviceType: '',
        softwareAffected: '',
        performanceStartDate: '',
        performanceEndDate: '',
        preparedBy: ''
      }));
      setBudgetItems([{ cost_element: '', estimated_cost: '', description: '', account: 2 }]);
    }

    // Reset asset name and serial number when sub-category changes
    if (field === 'subCategory') {
      setFormData(prev => ({
        ...prev,
        subCategory: value,
        assetName: '',
        serialNumber: ''
      }));
    }

    // Auto-populate serial number when asset name is selected
    if (field === 'assetName' && formData.subCategory) {
      const selectedAsset = mockAssets[formData.subCategory]?.find(
        asset => asset.name === value
      );
      if (selectedAsset) {
        setFormData(prev => ({
          ...prev,
          assetName: value,
          serialNumber: selectedAsset.serialNumber
        }));
      }
    }

    if (touched[field]) {
      const fieldError = validateField(field, value);
      setErrors({ ...errors, [field]: fieldError });
    }
  };

  const handleBlur = (field) => () => {
    setTouched({ ...touched, [field]: true });
    const fieldError = validateField(field, formData[field]);
    setErrors({ ...errors, [field]: fieldError });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const invalidFiles = files.filter(file => !ALLOWED_FILE_TYPES.includes(file.type));

    if (invalidFiles.length > 0) {
      setFileError('Some files have invalid types. Please upload only PNG, JPG, PDF, Word, Excel, or CSV files.');
      return;
    }

    setFileError('');
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  // Calculate total budget for Budget Proposal
  const calculateTotalBudget = () => {
    return budgetItems.reduce((total, item) => {
      if (!item.estimated_cost) return total;
      
      const range = item.estimated_cost;
      let maxValue = 0;

      if (range === '₱1,000,001 and above') {
        maxValue = 1000001;
      } else {
        const numbers = range.match(/\d+/g);
        if (numbers && numbers.length > 1) {
          maxValue = parseInt(numbers[1].replace(/,/g, ''));
        }
      }

      return total + maxValue;
    }, 0);
  };

  const validateAllFields = () => {
    const newErrors = {};
    const newTouched = {};
    
    const fieldsToValidate = ['subject', 'category', 'description'];
    
    // Add category-specific required fields
    if (isITSupport || isAnyAssetCategory || isBudgetProposal) {
      fieldsToValidate.push('subCategory');
    }

    if (isITSupport) {
      // Device type and software affected are required for IT Support
      fieldsToValidate.push('deviceType');
      if (showCustomDeviceType) {
        fieldsToValidate.push('customDeviceType');
      }
    }
    
    if (isAnyAssetCategory) {
      fieldsToValidate.push('assetName', 'location');
    }

    if (isAssetCheckIn) {
      fieldsToValidate.push('issueType');
    }

    if (isAssetCheckOut) {
      fieldsToValidate.push('expectedReturnDate');
    }

    if (isBudgetProposal) {
      fieldsToValidate.push('performanceStartDate', 'performanceEndDate', 'preparedBy');
    }

    fieldsToValidate.forEach(field => {
      newTouched[field] = true;
      newErrors[field] = validateField(field, formData[field]);
    });
    
    setTouched(newTouched);
    setErrors(newErrors);
    
    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAllFields()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalCategory = formData.category === 'Others' ? 'General Request' : formData.category;

      // Create FormData to handle file uploads
      const formDataToSend = new FormData();
      
      // Add basic fields
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('category', finalCategory);
      formDataToSend.append('sub_category', formData.subCategory || '');
      formDataToSend.append('description', formData.description || '');
      // Don't set priority initially - it will be assigned by coordinator/admin
      
      // Add file attachments using the key expected by backend (files[])
      selectedFiles.forEach((file) => {
        formDataToSend.append('files[]', file);
      });

      // Add dynamic data as JSON string for category-specific fields
      const dynamicData = {};

      // Add IT Support specific data
      if (isITSupport) {
        dynamicData.deviceType = showCustomDeviceType ? formData.customDeviceType : formData.deviceType;
        dynamicData.softwareAffected = formData.softwareAffected;
        if (formData.schedule) {
          dynamicData.scheduleRequest = {
            date: formData.schedule,
            time: '',
            notes: ''
          };
        }
      }

      // If a user provided a schedule field in the form for any category, include it so backend can persist it
      if (formData.schedule && !dynamicData.scheduleRequest) {
        dynamicData.scheduleRequest = { date: formData.schedule, time: '', notes: '' };
      }

      // Add Asset category-specific data
      if (isAnyAssetCategory) {
        dynamicData.assetName = formData.assetName;
        dynamicData.serialNumber = formData.serialNumber;
        dynamicData.location = formData.location;
      }

      if (isAssetCheckOut) {
        dynamicData.expectedReturnDate = formData.expectedReturnDate;
      }

      if (isAssetCheckIn) {
        dynamicData.issueType = formData.issueType;
        if (formData.issueType === 'Other') {
          dynamicData.otherIssue = formData.otherIssue;
        }
      }

      // Add Budget Proposal specific data
      if (isBudgetProposal) {
        dynamicData.items = budgetItems;
        dynamicData.totalBudget = calculateTotalBudget();
        dynamicData.performanceStartDate = formData.performanceStartDate;
        dynamicData.performanceEndDate = formData.performanceEndDate;
        dynamicData.preparedBy = formData.preparedBy;
      }

      // Add dynamic data as JSON string
      if (Object.keys(dynamicData).length > 0) {
        formDataToSend.append('dynamic_data', JSON.stringify(dynamicData));
      }

      console.log('Submitting ticket with FormData:', {
        subject: formData.subject,
        category: finalCategory,
        subCategory: formData.subCategory,
        files: selectedFiles.length,
        dynamicData
      });

      // Submit to backend
      const newTicket = await backendTicketService.createTicket(formDataToSend);

      console.log('Ticket created successfully:', newTicket);
      toast.success('Ticket submitted successfully!');
      resetForm();
      
      // Navigate to ticket tracker using the ticket number from response
      const ticketNumber = newTicket.ticket_number || newTicket.ticketNumber || newTicket.id;
      setTimeout(() => navigate(`/employee/ticket-tracker/${ticketNumber}`, { state: { from: 'Home' } }), 1500);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error(error.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
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
      preparedBy: ''
    });
    setErrors({});
    setTouched({});
    setSelectedFiles([]);
    setFileError('');
    setBudgetItems([{ cost_element: '', estimated_cost: '', description: '', account: 2 }]);
    setShowCustomDeviceType(false);
  };

  return (
    <main className={styles.registration}>
      <section>
  <FormCard>
          <form onSubmit={handleSubmit}>
          {/* Main Form Fields */}
          <FormField
            id="subject"
            label="Subject"
            required
            error={errors.subject}
            render={() => (
              <div className={styles.inputWithCounter}>
                <input
                  type="text"
                  placeholder="Enter ticket subject"
                  value={formData.subject}
                  maxLength={70}
                  onChange={handleInputChange('subject')}
                  onBlur={handleBlur('subject')}
                />
                <span className={styles.charCounter}>{String(formData.subject?.length || 0)}/70</span>
              </div>
            )}
          />

          <FormField
            id="category"
            label="Category"
            required
            error={errors.category}
            render={() => (
              <select
                value={formData.category}
                onChange={handleInputChange('category')}
                onBlur={handleBlur('category')}
              >
                <option value="">Select Category</option>
                {TICKET_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          />

          {/* Sub-Category for IT Support */}
          {isITSupport && (
            <ITSupportForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
            />
          )}

          {/* Asset Check In Form */}
          {isAssetCheckIn && (
            <AssetCheckInForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
            />
          )}

          {/* Asset Check Out Form */}
          {isAssetCheckOut && (
            <AssetCheckOutForm
              formData={formData}
              onChange={handleInputChange}
              onBlur={handleBlur}
              errors={errors}
              FormField={FormField}
            />
          )}

          {/* Budget Proposal Form */}
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
              <div className={styles.inputWithCounter}>
                <textarea
                  rows={5}
                  placeholder="Provide a detailed description..."
                  value={formData.description}
                  maxLength={150}
                  onChange={handleInputChange('description')}
                  onBlur={handleBlur('description')}
                />
                <span className={styles.charCounter}>{String(formData.description?.length || 0)}/150</span>
              </div>
            )}
          />

          {/* File Upload - Available for All Categories */}
          <fieldset>
            <label htmlFor="fileUpload">File Upload (PNG, JPG, PDF, Word, Excel, & CSV)</label>
            <div className={styles.fileUploadWrapper}>
              <input
                type="file"
                id="fileUpload"
                multiple
                accept={ALLOWED_FILE_TYPES.join(',')}
                onChange={handleFileChange}
                hidden
                ref={(input) => {
                  if (input) {
                    input.clickHandler = () => input.click();
                  }
                }}
              />
              <Button
                variant="secondary"
                size="small"
                className={styles.uploadFileBtn}
                onClick={() => document.getElementById('fileUpload').click()}
              >
                {selectedFiles.length > 0 ? 'Add More Files' : 'Choose Files'}
              </Button>
              {fileError && <span className={styles.errorMessage}>{fileError}</span>}

              {selectedFiles.length > 0 && (
                <div className={styles.filePreviewList}>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className={styles.filePreview}>
                      <p className={styles.fileName}>{file.name}</p>
                      <button
                        type="button"
                        className={styles.removeFileBtn}
                        onClick={() => removeFile(index)}
                        aria-label="Remove file"
                      >
                        <IoClose />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </fieldset>

          {/* Schedule Request - Available for All Categories */}
          <FormField
            id="schedule"
            label="Scheduled Request"
            render={() => (
              <input
                type="date"
                value={formData.schedule || ''}
                onChange={handleInputChange('schedule')}
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          />

          <FormActions
            onCancel={() => navigate(-1)}
            cancelLabel="Cancel"
            submitLabel={isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            submitDisabled={isSubmitting}
            submitVariant="primary"
          />
          </form>
        </FormCard>
      </section>
    </main>
  );
}

function FormField({ id, label, required = false, error, render }) {
  return (
    <fieldset>
      <label htmlFor={id}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {render()}
      {error && <span className={styles.errorMessage}>{error}</span>}
    </fieldset>
  );
}