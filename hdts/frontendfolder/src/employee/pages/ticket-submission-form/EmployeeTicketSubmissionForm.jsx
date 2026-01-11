import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { IoClose } from 'react-icons/io5';
import { FaFileAlt, FaFilePdf, FaFileWord, FaFileExcel, FaFileImage, FaEye, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Button from '../../../shared/components/Button';
import InputField from '../../../shared/components/InputField';
import EmployeeTicketSubmissionFormModal from "../../components/modals/ticket-submission-form/EmployeeTicketSubmissionFormModal.jsx";
import ProgressBar from '../../../shared/components/ProgressBar';
import styles from './EmployeeTicketSubmissionForm.module.css';
import FormActions from '../../../shared/components/FormActions';
import FormCard from '../../../shared/components/FormCard';
import { backendTicketService } from '../../../services/backend/ticketService';
import authService from '../../../utilities/service/authService';
import { useAuth } from '../../../context/AuthContext';
import ITSupportForm from './ITSupportForm';
import AssetCheckInForm, { mockAssets } from './AssetCheckInForm';
import AssetCheckOutForm from './AssetCheckOutForm';
import BudgetProposalForm from './BudgetProposalForm';
import { TICKET_CATEGORIES } from '../../../shared/constants/ticketCategories';

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
    assetId: '',
    serialNumber: '',
    location: '',
    checkOutDate: '',
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

  // Track if we loaded from chatbot prefill (to show notification)
  const [loadedFromChatbot, setLoadedFromChatbot] = useState(false);

  // IndexedDB helper functions for loading files
  const loadFilesFromDB = async () => {
    const DB_NAME = 'chatbot_files_db';
    const STORE_NAME = 'attachments';
    const DB_VERSION = 1;
    
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
      });
      
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      const files = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      // Convert stored data back to File objects
      return files.map(f => new File([f.data], f.name, { type: f.type }));
    } catch (e) {
      console.error('Error loading files from IndexedDB:', e);
      return [];
    }
  };

  const clearFilesFromDB = async () => {
    const DB_NAME = 'chatbot_files_db';
    const STORE_NAME = 'attachments';
    const DB_VERSION = 1;
    
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      await new Promise((resolve) => { tx.oncomplete = resolve; });
      db.close();
    } catch (e) {
      console.error('Error clearing files from IndexedDB:', e);
    }
  };

  // If navigated with prefill state OR localStorage has chatbot prefill, populate fields
  useEffect(() => {
    // First check localStorage for chatbot prefilled data
    const chatbotPrefill = localStorage.getItem('chatbot_prefilled_ticket');
    if (chatbotPrefill) {
      try {
        const pre = JSON.parse(chatbotPrefill);
        console.log('Loading prefilled ticket from chatbot:', pre);
        
        // Determine if we need to show custom device type
        const isCustomDevice = pre.customDeviceType && pre.customDeviceType !== '';
        if (isCustomDevice) {
          setShowCustomDeviceType(true);
        }
        
        setFormData((prev) => ({
          ...prev,
          subject: pre.subject || prev.subject,
          description: pre.description || prev.description,
          category: pre.category || prev.category,
          subCategory: pre.subCategory || prev.subCategory,
          deviceType: pre.deviceType || prev.deviceType,
          customDeviceType: pre.customDeviceType || prev.customDeviceType,
          softwareAffected: pre.softwareAffected || prev.softwareAffected,
          assetName: pre.assetName || prev.assetName,
          serialNumber: pre.serialNumber || prev.serialNumber,
          location: pre.location || prev.location,
          expectedReturnDate: pre.expectedReturnDate || prev.expectedReturnDate,
          issueType: pre.issueType || prev.issueType,
          otherIssue: pre.otherIssue || prev.otherIssue,
          schedule: pre.schedule || prev.schedule,
        }));
        
        setLoadedFromChatbot(true);
        
        // Clear the localStorage after loading (one-time use)
        localStorage.removeItem('chatbot_prefilled_ticket');
        
        // Load files from IndexedDB if there were attachments
        if (pre.hasAttachments && pre.attachmentCount > 0) {
          loadFilesFromDB().then((files) => {
            if (files && files.length > 0) {
              setSelectedFiles(files);
              // Clear the IndexedDB after loading
              clearFilesFromDB();
            }
          });
        }
        
        return; // Don't process location state if we loaded from localStorage
      } catch (e) {
        console.error('Error parsing chatbot prefill data:', e);
        localStorage.removeItem('chatbot_prefilled_ticket');
      }
    }
    
    // Fall back to location state prefill
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
  const [budgetItems, setBudgetItems] = useState([{ costElement: '', estimatedCost: '', description: '', account: 2 }]);
  const [showCustomDeviceType, setShowCustomDeviceType] = useState(false);

  // Local date string in YYYY-MM-DD to use for date input min (avoid UTC offset issues)
  const localToday = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

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

      case 'checkOutDate':
        if (isAssetCheckOut && !value) {
          error = 'Check Out Date is required';
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
        } else if (isBudgetProposal && formData.performanceStartDate) {
          // Ensure end is >= start (no upper limit)
          if (value < formData.performanceStartDate) {
            error = 'End Date must be after or equal to Start Date';
          }
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
        checkOutDate: '',
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
      setBudgetItems([{ costElement: '', estimatedCost: '', description: '', account: 2 }]);
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

    // Reset expected return date when check out date changes
    if (field === 'checkOutDate') {
      setFormData(prev => ({
        ...prev,
        checkOutDate: value,
        expectedReturnDate: ''
      }));
    }

    // Auto-populate serial number when asset name is selected (for Asset Check In with mockAssets)
    if (field === 'assetName' && formData.subCategory && formData.category === 'Asset Check In') {
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

  // Calculate total budget for Budget Proposal — sum numeric `estimatedCost` values
  const calculateTotalBudget = () => {
    return budgetItems.reduce((total, item) => {
      if (!item.estimatedCost) return total;
      const cleaned = String(item.estimatedCost).replace(/[₱, ]+/g, '').replace(/[^0-9.-]/g, '');
      const val = parseFloat(cleaned) || 0;
      return total + val;
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
      fieldsToValidate.push('checkOutDate', 'expectedReturnDate');
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
        dynamicData.assetId = formData.assetId;
        dynamicData.serialNumber = formData.serialNumber;
        dynamicData.location = formData.location;
      }

      if (isAssetCheckOut) {
        dynamicData.checkOutDate = formData.checkOutDate;
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
      assetId: '',
      serialNumber: '',
      location: '',
      checkOutDate: '',
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
    setBudgetItems([{ costElement: '', estimatedCost: '', description: '', account: 2 }]);
    setShowCustomDeviceType(false);
  };

  return (
    <main className={styles.registration}>
      <section>
  <FormCard>
          {/* Chatbot Prefill Banner */}
          {loadedFromChatbot && (
            <div className={styles.prefillBanner}>
              <span className={styles.prefillBannerIcon}>🤖</span>
              <div className={styles.prefillBannerContent}>
                <strong>Prefilled from PAXI Chatbot</strong>
                <p>Please review the information below and make any changes before submitting.</p>
              </div>
              <button 
                type="button" 
                className={styles.prefillBannerClose}
                onClick={() => setLoadedFromChatbot(false)}
                aria-label="Dismiss banner"
              >
                ×
              </button>
            </div>
          )}
          
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
              onAssetSelect={(asset) => {
                // Update serial number, assetId, and assetName when asset is selected from AMS API
                // Clear fields when asset is null (category changed)
                setFormData(prev => ({
                  ...prev,
                  assetName: asset ? prev.assetName : '',
                  assetId: asset ? (asset.asset_id || '') : '',
                  serialNumber: asset ? (asset.serial_number || '') : ''
                }));
              }}
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
                min={localToday}
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