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
import { backendTicketService } from '../../../services/backend/ticketService';
import authService from '../../../utilities/service/authService';
import { useAuth } from '../../../context/AuthContext';
import { useAms } from '../../../context/AmsContext';
import ITSupportForm from './ITSupportForm';
import AssetCheckInForm from './AssetCheckInForm';
import AssetCheckOutForm from './AssetCheckOutForm';
import BudgetProposalForm, { departmentOptions, fiscalYearOptions, accountOptions } from './BudgetProposalForm';
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

// Category metadata for icons and descriptions
const categoryMetadata = {
  'IT Support': {
    icon: FaFileAlt,
    description: 'Technical support for hardware and software issues',
    subCategories: ['Technical Support', 'Software Deployment', 'Maintenance', 'Network Support']
  },
  'Asset Check In': {
    icon: FaFileAlt,
    description: 'Return or check in company assets',
    subCategories: [] // No sub-categories, will show asset table directly
  },
  'Asset Check Out': {
    icon: FaFileAlt,
    description: 'Request to borrow company assets',
    subCategories: ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Other Equipment']
  },
  'New Budget Proposal': {
    icon: FaFileAlt,
    description: 'Submit budget proposals for approval',
    subCategories: ['CAPEX', 'OPEX']
  },
  'Others': {
    icon: FaFileAlt,
    description: 'General requests and inquiries',
    subCategories: []
  }
};

// Mock data for assets that can be checked in (assets currently checked out by the employee)
// Generate 50 mock checked out assets
const generateMockAssets = () => {
  const assetTypes = [
    { type: 'Laptop', names: ['Dell Latitude 5520', 'Dell Latitude 7420', 'HP EliteBook 840', 'Lenovo ThinkPad X1 Carbon', 'MacBook Pro 14"', 'MacBook Air M2', 'ASUS ZenBook 14', 'Acer Swift 3'] },
    { type: 'Monitor', names: ['Dell 27" P2722H', 'Dell 24" P2422H', 'LG 27" UltraFine', 'Samsung 32" Curved', 'BenQ 24" GW2480', 'ASUS ProArt 27"', 'HP Z27 4K'] },
    { type: 'Keyboard', names: ['Logitech MX Keys', 'Microsoft Sculpt', 'Keychron K2', 'Apple Magic Keyboard', 'Razer BlackWidow', 'Corsair K70'] },
    { type: 'Mouse', names: ['Logitech MX Master 3', 'Logitech G502', 'Apple Magic Mouse', 'Microsoft Arc', 'Razer DeathAdder', 'SteelSeries Rival'] },
    { type: 'Headset', names: ['Jabra Evolve2 75', 'Poly Voyager Focus 2', 'Sony WH-1000XM5', 'Bose 700', 'Logitech Zone Wireless', 'HyperX Cloud II'] },
    { type: 'Webcam', names: ['Logitech C920', 'Logitech Brio 4K', 'Razer Kiyo Pro', 'Elgato Facecam', 'Microsoft LifeCam HD'] },
    { type: 'Docking Station', names: ['Dell WD19TBS', 'Lenovo ThinkPad USB-C Dock', 'HP USB-C Dock G5', 'CalDigit TS4', 'Anker 575'] },
    { type: 'Tablet', names: ['iPad Pro 12.9"', 'iPad Air', 'Samsung Galaxy Tab S8', 'Microsoft Surface Pro 9', 'Lenovo Tab P11'] }
  ];
  const locations = ['Makati Office', 'Caloocan Office', 'Quezon City Office', 'Taguig Office', 'Pasig Office', 'Mandaluyong Office'];
  
  const assets = [];
  let baseDate = new Date('2026-01-27');
  
  for (let i = 1; i <= 50; i++) {
    const typeInfo = assetTypes[Math.floor(Math.random() * assetTypes.length)];
    const assetName = typeInfo.names[Math.floor(Math.random() * typeInfo.names.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    // Generate check out date starting from Jan 27, 2026, adding 0-30 days randomly
    const checkOutDate = new Date(baseDate);
    checkOutDate.setDate(checkOutDate.getDate() + Math.floor(Math.random() * 31));
    
    // Format ticket number: TXYYYYMMDDXXXXXX
    const ticketDate = new Date(checkOutDate);
    const year = ticketDate.getFullYear();
    const month = String(ticketDate.getMonth() + 1).padStart(2, '0');
    const day = String(ticketDate.getDate()).padStart(2, '0');
    const seq = String(i).padStart(6, '0');
    const ticketNo = `TX${year}${month}${day}${seq}`;
    
    assets.push({
      id: i,
      ticket_no: ticketNo,
      name: `${assetName} ${typeInfo.type === 'Laptop' || typeInfo.type === 'Monitor' ? '' : ''}`.trim(),
      type_of_product: typeInfo.type,
      serial_number: `SN-${typeInfo.type.substring(0, 3).toUpperCase()}-${String(i).padStart(4, '0')}`,
      check_out_date: checkOutDate.toISOString().split('T')[0],
      location: location
    });
  }
  
  // Sort by check out date
  return assets.sort((a, b) => new Date(a.check_out_date) - new Date(b.check_out_date));
};

const MOCK_CHECKED_OUT_ASSETS = generateMockAssets();

export default function EmployeeTicketSubmissionForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  
  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState(null);
  
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    subCategory: '',
    description: '',
    projectDescription: '',
    assetName: '',
    assetId: '',
    amsAssetId: '',
    serialNumber: '',
    location: '',
    checkOutDate: '',
    expectedReturnDate: '',
    checkInDate: '',
    issueType: '',
    otherIssue: '',
    schedule: '',
    deviceType: '',
    customDeviceType: '',
    softwareAffected: '',
    performanceStartDate: '',
    performanceEndDate: '',
    preparedBy: '',
    department_input: '',
    fiscalYear: '',
    projectSummary: '',
    assetCheckout: ''
  });

  // Asset Check In table search and filter state
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetFilters, setAssetFilters] = useState({
    type_of_product: '',
    location: ''
  });
  const [selectedAssetCheckOutDate, setSelectedAssetCheckOutDate] = useState(null);

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
        
        // If category is set, move to appropriate step
        if (pre.category) {
          if (pre.category === 'Others') {
            setCurrentStep(3);
          } else if (pre.subCategory) {
            setCurrentStep(3);
          } else {
            setCurrentStep(2);
          }
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
  const [budgetItems, setBudgetItems] = useState([{ costElement: '', estimatedCost: '', description: '' }]);
  const [showCustomDeviceType, setShowCustomDeviceType] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const DESCRIPTION_MAX_LENGTH = 240;
  const showDescriptionToggle = (formData.description || '').length >= DESCRIPTION_MAX_LENGTH;

  // Consume AMS categories from context (prefetched on EmployeeHome)
  const { categories: amsCategories, loading: amsLoading, prefetch: prefetchAms } = useAms();

  // If user lands directly on this page, ensure categories are loaded
  useEffect(() => {
    prefetchAms();
  }, [prefetchAms]);

  // Local date string in YYYY-MM-DD to use for date input min
  const localToday = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  // Minimum allowed schedule: start of today (local)
  const getTodayMinLocal = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const scheduleMin = getTodayMinLocal();

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
          error = 'Subject is required.';
        } else if (value.trim().length < 5) {
          error = 'Subject must be at least 5 characters long.';
        }
        break;
      
      case 'category':
        if (!value) {
          error = 'Category is required.';
        }
        break;
      
      case 'subCategory':
        if ((isITSupport || isAssetCheckOut || isBudgetProposal) && !value) {
          error = 'Sub-Category is required.';
        }
        break;
      
      case 'description':
        if (!value || !value.toString().trim()) {
          error = 'Description is required.';
        } else if (value.toString().trim().length < 10) {
          error = 'Description must be at least 10 characters long.';
        }
        break;

      case 'projectDescription':
        if (isBudgetProposal && value && value.toString().trim().length > 0 && value.toString().trim().length < 10) {
          error = 'Project Description must be at least 10 characters long.';
        }
        break;
      
      case 'assetName':
        if (isAssetCheckOut && !value) {
          error = 'Available Assets is required.';
        }
        break;
      
      case 'assetCheckout':
        if (isAssetCheckIn && !value) {
          error = 'Asset to Checkout is required.';
        }
        break;
      
      case 'location':
        if (isAnyAssetCategory) {
          const hasLocation = value && (typeof value === 'object' ? value.id : value);
          if (!hasLocation) {
            error = 'Location is required.';
          }
        }
        break;
      
      case 'issueType':
        if (isAssetCheckIn && !value) {
          error = 'Specify Issue is required.';
        }
        break;

      case 'checkInDate':
        if (isAssetCheckIn && !value) {
          error = 'Check In Date is required.';
        }
        break;

      case 'checkOutDate':
        if (isAssetCheckOut && !value) {
          error = 'Check Out Date is required.';
        }
        break;

      case 'expectedReturnDate':
        if (isAssetCheckOut && !value) {
          error = 'Expected Return Date is required.';
        }
        break;
      
      case 'deviceType':
        if (isITSupport && !value && !formData.customDeviceType) {
          error = 'Device Type is required.';
        }
        break;
      
      case 'customDeviceType':
        if (isITSupport && showCustomDeviceType && !value.trim()) {
          error = 'Custom Device Type is required.';
        }
        break;
      
      case 'softwareAffected':
        break;
      
      case 'performanceStartDate':
        if (isBudgetProposal && !value) {
          error = 'Performance Start Date is required.';
        }
        break;
      
      case 'performanceEndDate':
        if (isBudgetProposal && !value) {
          error = 'Performance End Date is required.';
        } else if (isBudgetProposal && formData.performanceStartDate) {
            if (value <= formData.performanceStartDate) {
              error = 'End Date must be after Start Date.';
            }
        }
        break;
      
      case 'department_input':
        if (isBudgetProposal && !value) {
          error = 'Department is required.';
        }
        break;
      case 'fiscalYear':
        if (isBudgetProposal && !value) {
          error = 'Fiscal Year is required.';
        }
        break;
      case 'projectSummary':
        if (isBudgetProposal && value && value.toString().trim().length > 0 && value.toString().trim().length < 10) {
          error = 'Project Summary must be at least 10 characters long.';
        }
        break;
      
      default:
        break;
    }
    
    return error;
  };

  const handleInputChange = (field) => (e) => {
    let value = e.target.value;

    // Enforce max lengths for subject and description
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
        preparedBy: '',
        department_input: '',
        fiscalYear: '',
        projectSummary: '',
        assetCheckout: ''
      }));
      setBudgetItems([{ costElement: '', estimatedCost: '', description: '' }]);
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
      if (!item.estimatedCost) return total;
      const cleaned = String(item.estimatedCost).replace(/[₱, ]+/g, '').replace(/[^0-9.-]/g, '');
      const val = parseFloat(cleaned) || 0;
      return total + val;
    }, 0);
  };

  const validateAllFields = () => {
    const newErrors = {};
    const newTouched = {};
    
    const fieldsToValidate = ['subject', 'category'];
    if (!isBudgetProposal) fieldsToValidate.push('description');
    
    // Add category-specific required fields
    if (isITSupport || isAssetCheckOut || isBudgetProposal) {
      fieldsToValidate.push('subCategory');
    }

    if (isITSupport) {
      fieldsToValidate.push('deviceType');
      if (showCustomDeviceType) {
        fieldsToValidate.push('customDeviceType');
      }
    }
    
    if (isAssetCheckOut) {
      fieldsToValidate.push('assetName', 'location', 'checkOutDate', 'expectedReturnDate');
    }

    if (isAssetCheckIn) {
      fieldsToValidate.push('assetCheckout', 'checkInDate', 'location', 'issueType');
    }

    if (isBudgetProposal) {
      fieldsToValidate.push('performanceStartDate', 'performanceEndDate', 'department_input', 'fiscalYear');
    }

    fieldsToValidate.forEach(field => {
      newTouched[field] = true;
      newErrors[field] = validateField(field, formData[field]);
    });

    // Additional validation for Budget Proposal first budget item
    if (isBudgetProposal) {
      const first = (budgetItems && budgetItems.length > 0) ? budgetItems[0] : { costElement: '', description: '', estimatedCost: '' };
      const ce = (first.costElement || first.cost_element || '').toString().trim();
      const desc = (first.description || '').toString().trim();
      const cost = (first.estimatedCost || '').toString().replace(/[^0-9]/g, '').trim();

      newTouched['budgetItems_0_costElement'] = true;
      newTouched['budgetItems_0_description'] = true;
      newTouched['budgetItems_0_estimatedCost'] = true;

      if (!ce) newErrors['budgetItems_0_costElement'] = 'Cost Element is required.';
      if (!desc) newErrors['budgetItems_0_description'] = 'Description is required.';
      if (!cost) newErrors['budgetItems_0_estimatedCost'] = 'Estimated Cost is required.';
    }
    
    setTouched(newTouched);
    setErrors(newErrors);
    
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
      
      // Add employee contact info
      if (currentUser) {
        formDataToSend.append('employee_email', currentUser.email || '');
        formDataToSend.append('employee_phone', currentUser.phone || currentUser.phone_number || '');
      }
      
      // Add file attachments
      selectedFiles.forEach((file) => {
        formDataToSend.append('files[]', file);
      });

      // Add dynamic data as JSON string for category-specific fields
      const dynamicData = {};

      if (currentUser) {
        dynamicData.employeeEmail = currentUser.email || '';
        dynamicData.employeePhone = currentUser.phone || currentUser.phone_number || '';
      }

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

      if (formData.schedule && !dynamicData.scheduleRequest) {
        dynamicData.scheduleRequest = { date: formData.schedule, time: '', notes: '' };
      }

      // Add Asset Check Out specific data
      if (isAssetCheckOut) {
        dynamicData.assetName = formData.assetName;
        dynamicData.assetId = formData.assetId;
        dynamicData.amsAssetId = formData.amsAssetId;
        dynamicData.serialNumber = formData.serialNumber;
        dynamicData.checkOutDate = formData.checkOutDate;
        dynamicData.expectedReturnDate = formData.expectedReturnDate;
        if (formData.location && typeof formData.location === 'object') {
          dynamicData.location_details = {
            id: formData.location.id,
            name: formData.location.name
          };
        } else if (formData.location) {
          dynamicData.location = formData.location;
        }
      }

      // Add Asset Check In specific data
      if (isAssetCheckIn) {
        dynamicData.assetCheckout = formData.assetCheckout;
        dynamicData.assetName = formData.assetName;
        dynamicData.assetId = formData.assetId;
        dynamicData.serialNumber = formData.serialNumber;
        dynamicData.checkInDate = formData.checkInDate;
        dynamicData.issueType = formData.issueType;
        if (formData.location && typeof formData.location === 'object') {
          dynamicData.location_details = {
            id: formData.location.id,
            name: formData.location.name
          };
        } else if (formData.location) {
          dynamicData.location = formData.location;
        }
      }

      // Add Budget Proposal specific data
      if (isBudgetProposal) {
        const generateCategoryCode = (subCat, dept, costEl) => {
          try {
            const subMap = { 'CAPEX': 'CAP', 'OPEX': 'OPE' };
            const sub = subMap[subCat] || String((subCat || '').toUpperCase()).slice(0,3);
            const deptPart = (dept || '').toString().toUpperCase();
            const cleanCost = (costEl || '').toString().replace(/[^A-Za-z\s]/g, '').trim();
            let costAbbrev = '';
            if (!cleanCost) costAbbrev = 'XX';
            else {
              const words = cleanCost.split(/\s+/).filter(Boolean);
              if (words.length === 1) {
                costAbbrev = words[0].slice(0,2).toUpperCase();
              } else {
                costAbbrev = (words[0][0] || '') + (words[1][0] || '');
                costAbbrev = costAbbrev.toUpperCase();
              }
            }
            return `${sub}-${deptPart}-${costAbbrev}`;
          } catch (e) {
            return '';
          }
        };

        const cleanedItems = (budgetItems || []).map(it => {
          const cleanedCost = String(it.estimatedCost || '').replace(/[^0-9]/g, '');
          const amountNumber = cleanedCost ? Number(cleanedCost) : 0;
          const category_code = it.category_code || generateCategoryCode(formData.subCategory, formData.department_input, it.costElement || it.cost_element || '');
          const account_id = it.account ? Number(it.account) : (currentUser?.id || 1);
          return {
            cost_element: it.costElement || it.cost_element || '',
            description: it.description || '',
            estimated_cost: Number(amountNumber),
            account: account_id,
            category_code: category_code
          };
        });

        dynamicData.items = cleanedItems;
        dynamicData.totalBudget = calculateTotalBudget();
        dynamicData.performance_start_date = formData.performanceStartDate;
        dynamicData.performance_end_date = formData.performanceEndDate;
        dynamicData.submitted_by_name = formData.preparedBy || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim();
        dynamicData.department_input = formData.department_input || '';
        dynamicData.fiscal_year = formData.fiscalYear ? Number(formData.fiscalYear) : 1;
        dynamicData.project_summary = formData.projectSummary || '';
        dynamicData.project_description = formData.projectDescription || '';
        dynamicData.title = formData.subject || '';
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
      
      // Save ticket number for reference
      const ticketNumber = newTicket.ticket_number || newTicket.ticketNumber || newTicket.id;
      setSubmittedTicketNumber(ticketNumber);
      setIsSubmitted(true);
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
      amsAssetId: '',
      serialNumber: '',
      location: '',
      checkOutDate: '',
      expectedReturnDate: '',
      checkInDate: '',
      issueType: '',
      otherIssue: '',
      schedule: '',
      deviceType: '',
      customDeviceType: '',
      softwareAffected: '',
      performanceStartDate: '',
      performanceEndDate: '',
      preparedBy: '',
      department_input: '',
      fiscalYear: '',
      projectSummary: '',
      projectDescription: '',
      assetCheckout: ''
    });
    setErrors({});
    setTouched({});
    setSelectedFiles([]);
    setFileError('');
    setBudgetItems([{ costElement: '', estimatedCost: '', description: '' }]);
    setShowCustomDeviceType(false);
    setCurrentStep(1);
    setIsSubmitted(false);
    setSubmittedTicketNumber(null);
  };

  // Check if Step 3 form is complete
  const isStep3Complete = () => {
    const fieldsToCheck = ['subject', 'description'];
    
    // subCategory is already selected in Step 2, so we don't check it again for Asset Check Out/In
    if (isITSupport || isBudgetProposal) {
      fieldsToCheck.push('subCategory');
    }

    if (isITSupport) {
      fieldsToCheck.push('deviceType');
      if (showCustomDeviceType) {
        fieldsToCheck.push('customDeviceType');
      }
    }
    
    if (isAssetCheckOut) {
      fieldsToCheck.push('assetName', 'checkOutDate', 'expectedReturnDate');
    }

    if (isAssetCheckIn) {
      // assetCheckout is selected in Step 2, so we only check the remaining fields here
      fieldsToCheck.push('checkInDate', 'issueType');
    }

    if (isBudgetProposal) {
      fieldsToCheck.push('performanceStartDate', 'performanceEndDate', 'department_input', 'fiscalYear');
    }

    // Check all fields - only check if value exists
    const allFieldsValid = fieldsToCheck.every(field => {
      const value = formData[field];
      const hasValue = value && String(value).trim() !== '';
      return hasValue;
    });

    // Additional check for location (which can be an object)
    if (isAssetCheckOut || isAssetCheckIn) {
      const locationValue = formData.location;
      const hasLocation = locationValue && (typeof locationValue === 'object' ? locationValue.id : locationValue);
      if (!hasLocation) return false;
    }

    return allFieldsValid;
  };

  // Step navigation handlers
  const handleNextStep = () => {
    if (currentStep === 1 && !formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (currentStep === 2 && !formData.subCategory) {
      toast.error('Please select a sub-category');
      return;
    }
    if (currentStep === 3) {
      if (!isStep3Complete()) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    if (currentStep === 3 && formData.category === 'Others') {
      setCurrentStep(1);
      return;
    }
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCategorySelect = (category) => {
    setFormData(prev => ({
      ...prev,
      category,
      subCategory: '',
    }));
    if (category === 'Others') {
      setCurrentStep(3);
    } else {
      setCurrentStep(2);
    }
  };

  const handleSubCategorySelect = (subCategory) => {
    setFormData(prev => ({
      ...prev,
      subCategory
    }));
    setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!validateAllFields()) {
      toast.error('Please fix all errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await handleSubmit({ preventDefault: () => {} });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Progress Bar
  const renderProgressBar = () => {
    const steps = [
      { number: 1, label: 'Category' },
      { number: 2, label: 'Sub-Category' },
      { number: 3, label: 'Details' },
      { number: 4, label: 'Submit' }
    ];
    return <ProgressBar currentStep={currentStep} steps={steps} />;
  };

  // Render Step 1: Category Selection
  const renderCategorySelection = () => {
    return (
      <>
        <h2 className={styles.stepTitle}>Select Category</h2>
        <p className={styles.stepSubtitle}>What type of assistance do you need?</p>
        
        <div className={styles.categoryGrid}>
          {TICKET_CATEGORIES.map(category => {
            const metadata = categoryMetadata[category] || categoryMetadata['Others'];
            const IconComponent = metadata.icon;
            
            return (
              <div
                key={category}
                className={`${styles.categoryCard} ${formData.category === category ? styles.selected : ''}`}
                onClick={() => handleCategorySelect(category)}
              >
                <div className={styles.categoryIcon}>
                  <IconComponent size={32} />
                </div>
                <h3 className={styles.categoryTitle}>{category}</h3>
                <p className={styles.categoryDescription}>{metadata.description}</p>
              </div>
            );
          })}
        </div>

        <div className={styles.stepActions}>
          <Button variant="outline" size="small" onClick={() => navigate('/employee/home')}>
            Cancel
          </Button>
        </div>
      </>
    );
  };

  // Render Step 2: Sub-Category Selection
  const renderSubCategorySelection = () => {
    const metadata = categoryMetadata[formData.category] || categoryMetadata['Others'];
    const IconComponent = metadata.icon;
    
    // For Asset Check In, show asset table instead of sub-category cards
    if (isAssetCheckIn) {
      // Get unique values for filter dropdowns
      const uniqueTypes = [...new Set(MOCK_CHECKED_OUT_ASSETS.map(a => a.type_of_product))].sort();
      const uniqueLocations = [...new Set(MOCK_CHECKED_OUT_ASSETS.map(a => a.location))].sort();
      
      // Filter assets based on search query and filters
      const filteredAssets = MOCK_CHECKED_OUT_ASSETS.filter(asset => {
        const matchesSearch = assetSearchQuery === '' || 
          asset.ticket_no.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
          asset.name.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
          asset.type_of_product.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
          asset.serial_number.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
          asset.location.toLowerCase().includes(assetSearchQuery.toLowerCase());
        
        const matchesType = assetFilters.type_of_product === '' || asset.type_of_product === assetFilters.type_of_product;
        const matchesLocation = assetFilters.location === '' || asset.location === assetFilters.location;
        
        return matchesSearch && matchesType && matchesLocation;
      });
      
      return (
        <>
          <h2 className={styles.stepTitle}>Asset to Check In</h2>
          <p className={styles.stepSubtitle}>Select the asset you want to check in</p>
          
          <div className={styles.selectedCategoryBanner}>
            <IconComponent size={20} style={{ color: '#007BFF' }} />
            <span>{formData.category}</span>
          </div>

          {/* Search and Filter Bar */}
          <div className={styles.assetSearchFilterBar}>
            <div className={styles.assetSearchBox}>
              <input
                type="text"
                placeholder="Search by ticket no, name, type, serial number, or location..."
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                className={styles.assetSearchInput}
              />
            </div>
            <div className={styles.assetFilters}>
              <select
                value={assetFilters.type_of_product}
                onChange={(e) => setAssetFilters(prev => ({ ...prev, type_of_product: e.target.value }))}
                className={styles.assetFilterSelect}
              >
                <option value="">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={assetFilters.location}
                onChange={(e) => setAssetFilters(prev => ({ ...prev, location: e.target.value }))}
                className={styles.assetFilterSelect}
              >
                <option value="">All Locations</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.assetTableContainer}>
            <div className={styles.assetTableScrollWrapper}>
              <table className={styles.assetTable}>
                <thead>
                  <tr>
                    <th>Ticket No.</th>
                    <th>Asset Name</th>
                    <th>Type of Product</th>
                    <th>Serial Number</th>
                    <th>Check Out Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(asset => (
                    <tr key={asset.id}>
                      <td>{asset.ticket_no}</td>
                      <td>{asset.name}</td>
                      <td>{asset.type_of_product}</td>
                      <td>{asset.serial_number}</td>
                      <td>{new Date(asset.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => {
                            // Set selected asset data and go to Step 3
                            setFormData(prev => ({
                              ...prev,
                              subCategory: asset.name,
                              assetName: asset.name,
                              assetId: asset.id,
                              amsAssetId: asset.ticket_no,
                              serialNumber: asset.serial_number,
                              location: asset.location,
                              assetCheckout: asset.id
                            }));
                            // Store the check out date for minimum check in date validation
                            setSelectedAssetCheckOutDate(asset.check_out_date);
                            setCurrentStep(3);
                          }}
                        >
                          Select
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredAssets.length === 0 && (
              <div className={styles.noAssetsMessage}>
                {MOCK_CHECKED_OUT_ASSETS.length === 0 
                  ? 'No assets currently checked out. Please check out an asset first.'
                  : 'No assets match your search criteria.'}
              </div>
            )}
          </div>

          <div className={styles.stepActions}>
            <Button variant="outline" size="small" onClick={handlePrevStep}>
              Back
            </Button>
          </div>
        </>
      );
    }
    
    // For Asset Check Out, use AMS categories instead of hardcoded ones
    let subCategories = [];
    let isLoadingSubCategories = false;
    
    if (isAssetCheckOut) {
      // Use AMS categories for Asset Check Out
      subCategories = amsCategories.map(cat => cat.name);
      isLoadingSubCategories = amsLoading;
    } else {
      subCategories = Array.isArray(metadata.subCategories) ? metadata.subCategories : [];
    }
    
    // Dynamic title for Asset Check Out
    const stepTitle = isAssetCheckOut ? 'Choose Sub-Category (Type of Product)' : 'Choose Sub-Category';
    
    return (
      <>
        <h2 className={styles.stepTitle}>{stepTitle}</h2>
        <p className={styles.stepSubtitle}>Please specify the type of request</p>
        
        <div className={styles.selectedCategoryBanner}>
          <IconComponent size={20} style={{ color: '#007BFF' }} />
          <span>{formData.category}</span>
        </div>

        {isLoadingSubCategories ? (
          <div className={styles.loadingMessage}>Loading categories...</div>
        ) : (
          <div className={styles.subCategoryGrid}>
            {subCategories.map(subCat => (
              <div
                key={subCat}
                className={`${styles.subCategoryCard} ${formData.subCategory === subCat ? styles.selected : ''}`}
                onClick={() => handleSubCategorySelect(subCat)}
              >
                <h3 className={styles.subCategoryTitle}>{subCat}</h3>
                <p className={styles.subCategoryDescription}>
                  {isAssetCheckOut ? 'Select to view available assets' :
                   subCat.includes('Support') ? 'Hardware and software issues' :
                   subCat.includes('Deployment') ? 'Software installation and updates' :
                   subCat.includes('Maintenance') ? 'System updates and maintenance' :
                   subCat.includes('Network') ? 'Network and security support' :
                   'Select this option'}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className={styles.stepActions}>
          <Button variant="outline" size="small" onClick={handlePrevStep}>
            Back
          </Button>
        </div>
      </>
    );
  };

  // Render Step 3: Details Form
  const renderDetailsForm = () => {
    const metadata = categoryMetadata[formData.category] || categoryMetadata['Others'];
    const IconComponent = metadata.icon;

    return (
      <>
        <h2 className={styles.stepTitle}>Ticket Details</h2>
        <p className={styles.stepSubtitle}>Provide the necessary details for your request</p>
        
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
        
        <div className={styles.selectedCategoryBanner}>
          <IconComponent size={20} style={{ color: '#007BFF' }} />
          <span>{formData.category}</span>
          {formData.subCategory && (
            <>
              <span className={styles.separator}>•</span>
              <span>{formData.subCategory}</span>
            </>
          )}
        </div>

        <form className={styles.detailsForm}>
          {/* Subject Field */}
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

          {/* IT Support Form */}
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
              employeeId={currentUser?.id}
              hideAssetTable={true}
              minCheckInDate={selectedAssetCheckOutDate}
              onAssetCheckoutSelect={(checkoutData) => {
                if (checkoutData) {
                  setFormData(prev => ({
                    ...prev,
                    assetCheckout: checkoutData.checkoutId,
                    assetId: checkoutData.assetId || '',
                    assetName: checkoutData.assetName || '',
                    serialNumber: checkoutData.serialNumber || ''
                  }));
                }
              }}
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
              prefetchedCategories={amsCategories}
              prefetchLoading={amsLoading}
              hideSubCategory={true}
              onAssetSelect={(asset) => {
                  setFormData(prev => ({
                    ...prev,
                    assetName: asset ? (asset.name || asset.asset_name || '') : '',
                    assetId: asset ? (asset.id || '') : '',
                    amsAssetId: asset ? (asset.asset_id || asset.assetId || '') : '',
                    serialNumber: asset ? (asset.serial_number || asset.serialNumber || asset.serial || '') : ''
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

          {/* Project Description (optional for Budget Proposal) */}
          {isBudgetProposal && (
            <FormField
              id="projectDescription"
              label="Project Description"
              error={errors.projectDescription}
              render={() => (
                <div className={styles.inputWithCounter}>
                  <textarea
                    rows={5}
                    placeholder="Provide a detailed project description"
                    value={formData.projectDescription}
                    maxLength={150}
                    onChange={handleInputChange('projectDescription')}
                    onBlur={handleBlur('projectDescription')}
                  />
                  <span className={styles.charCounter}>{String(formData.projectDescription?.length || 0)}/150</span>
                </div>
              )}
            />
          )}

          {/* Description */}
          <FormField
            id="description"
            label="Description"
            required={!isBudgetProposal}
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

          {/* Scheduled Request */}
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

          {/* File Upload */}
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
              />
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => document.getElementById('fileUpload').click()}
              >
                <FaFileAlt/>
                Choose Files
              </Button>
            </div>
            {fileError && <p className={styles.errorMessage}>{fileError}</p>}
            
            {selectedFiles.length > 0 && (
              <div className={styles.filePreviewList}>
                {selectedFiles.map((file, index) => (
                  <div key={index} className={styles.filePreview}>
                    <span className={styles.fileName}>{file.name}</span>
                    <button
                      type="button"
                      className={styles.removeFileBtn}
                      onClick={() => removeFile(index)}
                    >
                      <IoClose size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        </form>

        <FormActions
          onCancel={handlePrevStep}
          cancelLabel="Back"
          onSubmit={handleNextStep}
          submitLabel="Next"
          submitVariant="primary"
          submitDisabled={!isStep3Complete()}
          cancelSize="small"
          submitSize="small"
        />
      </>
    );
  };

  // Render Step 4: Review & Submit
  const renderReviewSubmit = () => {
    const metadata = categoryMetadata[formData.category] || categoryMetadata['Others'];
    const IconComponent = metadata.icon;

    const formatCurrencyLocal = (val) => {
      if (val === null || val === undefined || val === '') return <em>—</em>;
      const cleaned = String(val).toString().replace(/,/g, '').replace(/[^0-9.\-]/g, '');
      const num = Number(cleaned);
      if (Number.isNaN(num)) return <em>—</em>;
      return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(num);
    };

    const formatDateLocal = (d) => {
      if (!d) return <em>—</em>;
      try {
        const parsed = new Date(d);
        if (isNaN(parsed)) return <em>—</em>;
        return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } catch (err) {
        return <em>—</em>;
      }
    };

    const formatBytes = (bytes) => {
      if (bytes == null || bytes === 0) return '0 B';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      const value = bytes / Math.pow(1024, i);
      return `${value.toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
    };

    const getFileTypeIcon = (fileName) => {
      const ext = fileName.split('.').pop().toLowerCase();
      const mimeIcons = {
        'pdf': <FaFilePdf style={{ color: '#dc2626', marginRight: 6 }} size={16} />,
        'doc': <FaFileWord style={{ color: '#2563eb', marginRight: 6 }} size={16} />,
        'docx': <FaFileWord style={{ color: '#2563eb', marginRight: 6 }} size={16} />,
        'xls': <FaFileExcel style={{ color: '#16a34a', marginRight: 6 }} size={16} />,
        'xlsx': <FaFileExcel style={{ color: '#16a34a', marginRight: 6 }} size={16} />,
        'csv': <FaFileExcel style={{ color: '#16a34a', marginRight: 6 }} size={16} />,
        'jpg': <FaFileImage style={{ color: '#9333ea', marginRight: 6 }} size={16} />,
        'jpeg': <FaFileImage style={{ color: '#9333ea', marginRight: 6 }} size={16} />,
        'png': <FaFileImage style={{ color: '#9333ea', marginRight: 6 }} size={16} />,
        'gif': <FaFileImage style={{ color: '#9333ea', marginRight: 6 }} size={16} />,
      };
      return mimeIcons[ext] || <FaFileAlt style={{ color: '#6b7280', marginRight: 6 }} size={16} />;
    };

    const getAttachmentClass = (fileName) => {
      const ext = fileName.split('.').pop().toLowerCase();
      if (['pdf'].includes(ext)) return 'pdf';
      if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
      if (['doc', 'docx'].includes(ext)) return 'word';
      if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return 'image';
      return 'defaultFile';
    };

    const previewFile = (file) => {
      try {
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000 * 10);
      } catch (err) {
        console.error('Preview failed', err);
      }
    };

    return (
      <>
        <h2 className={styles.stepTitle}>Review & Submit</h2>
        <p className={styles.stepSubtitle}>Review your information before submitting</p>

        <div className={styles.reviewSection}>
          <div className={styles.selectedCategoryBanner}>
            <IconComponent size={20} style={{ color: '#007BFF' }} />
            <span>{formData.category}</span>
            {formData.subCategory && (
              <>
                <span className={styles.separator}>•</span>
                <span>{formData.subCategory}</span>
              </>
            )}
          </div>

          {/* Common fields */}
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Subject</span>
            <span className={styles.reviewValue}>{formData.subject || <em>—</em>}</span>
          </div>

          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Description</span>
            <div className={styles.descriptionValue}>
              <div className={`${styles.descriptionContent} ${descriptionExpanded ? styles.descriptionContentExpanded : ''}`}>
                {formData.description ? formData.description.split('\n').map((line, i) => (<div key={i}>{line}</div>)) : <em>—</em>}
              </div>
              {showDescriptionToggle && (
                <button
                  type="button"
                  className={styles.descriptionToggle}
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  aria-expanded={descriptionExpanded}
                >
                  <span>{descriptionExpanded ? 'Show less' : 'Show more'}</span>
                  {descriptionExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                </button>
              )}
            </div>
          </div>

          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Scheduled Request</span>
            <span className={styles.reviewValue}>{formData.schedule ? new Date(formData.schedule).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : <em>—</em>}</span>
          </div>

          {/* IT Support fields */}
          {isITSupport && (
            <>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Device Type</span>
                <span className={styles.reviewValue}>{showCustomDeviceType ? formData.customDeviceType : (formData.deviceType || <em>—</em>)}</span>
              </div>
              {formData.softwareAffected && (
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Software Affected</span>
                  <span className={styles.reviewValue}>{formData.softwareAffected}</span>
                </div>
              )}
            </>
          )}

          {/* Asset categories */}
          {isAssetCheckOut && (
            <>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Asset to Check Out</span>
                <span className={styles.reviewValue}>{formData.assetName || <em>—</em>}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Serial Number</span>
                <span className={styles.reviewValue}>{formData.serialNumber || <em>—</em>}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Location</span>
                <span className={styles.reviewValue}>
                  {formData.location ? (typeof formData.location === 'object' ? formData.location.name : formData.location) : <em>—</em>}
                </span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Check Out Date</span>
                <span className={styles.reviewValue}>{formatDateLocal(formData.checkOutDate)}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Expected Return Date</span>
                <span className={styles.reviewValue}>{formatDateLocal(formData.expectedReturnDate)}</span>
              </div>
            </>
          )}

          {isAssetCheckIn && (
            <>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Asset to Check In</span>
                <span className={styles.reviewValue}>{formData.assetName || <em>—</em>}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Serial Number</span>
                <span className={styles.reviewValue}>{formData.serialNumber || <em>—</em>}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Location</span>
                <span className={styles.reviewValue}>
                  {formData.location ? (typeof formData.location === 'object' ? formData.location.name : formData.location) : <em>—</em>}
                </span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Check In Date</span>
                <span className={styles.reviewValue}>{formatDateLocal(formData.checkInDate)}</span>
              </div>
              {formData.issueType && (
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Issue Type</span>
                  <span className={styles.reviewValue}>{formData.issueType}</span>
                </div>
              )}
            </>
          )}

          {/* Budget Proposal fields */}
          {isBudgetProposal && (
            <>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Department</span>
                <span className={styles.reviewValue}>
                  {formData.department_input 
                    ? (departmentOptions.find(opt => opt.value === formData.department_input)?.label || formData.department_input)
                    : <em>—</em>}
                </span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Fiscal Year</span>
                <span className={styles.reviewValue}>
                  {formData.fiscalYear 
                    ? (fiscalYearOptions.find(opt => opt.value === Number(formData.fiscalYear) || opt.value === formData.fiscalYear)?.label || formData.fiscalYear)
                    : <em>—</em>}
                </span>
              </div>
              {budgetItems && budgetItems.length > 0 && (
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Budget Items</span>
                  <div className={styles.reviewValue}>
                    {budgetItems.map((it, idx) => {
                      const accountLabel = it.account 
                        ? (accountOptions.find(opt => opt.value === Number(it.account) || opt.value === it.account)?.label || 'N/A')
                        : 'N/A';
                      return (
                        <div key={idx} style={{ marginBottom: idx < budgetItems.length - 1 ? '4px' : 0 }}>
                          {it.costElement || `Item ${idx + 1}`} - {it.estimatedCost ? formatCurrencyLocal(it.estimatedCost) : '₱0.00'} - {accountLabel}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Total Budget</span>
                <span className={styles.reviewValue}>{formatCurrencyLocal(calculateTotalBudget())}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Performance Period</span>
                <span className={styles.reviewValue}>{formatDateLocal(formData.performanceStartDate)} to {formatDateLocal(formData.performanceEndDate)}</span>
              </div>
            </>
          )}

          <div className={`${styles.reviewItem} ${styles.attachmentsRow}`}>
            <span className={styles.reviewLabel}>Attachments <span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af' }}>({selectedFiles.length})</span></span>
          </div>
          {selectedFiles.length > 0 && (
            <div className={styles.attachmentsFullWidth}>
              {!attachmentsExpanded ? (
                <div className={styles.attachmentsList}>
                  {selectedFiles.slice(0, 3).map((file, i) => {
                    const cls = getAttachmentClass(file.name);
                    return (
                      <div key={i} className={`${styles.attachmentItem} ${styles[cls]}`} onClick={() => previewFile(file)}>
                        <div className={styles.attachmentContentWrapper}>
                          <div className={styles.attachmentIconWrapper}>
                            {getFileTypeIcon(file.name)}
                          </div>
                          <div className={styles.fileInfo}>
                            <span className={styles.attachmentName} title={file.name}>{file.name}</span>
                            {file.size != null && <span className={styles.attachmentSize}>{formatBytes(file.size)}</span>}
                          </div>
                        </div>
                        <button type="button" className={styles.attachmentViewBtn} onClick={(e) => { e.stopPropagation(); previewFile(file); }} title="View">
                          <FaEye />
                        </button>
                      </div>
                    );
                  })}
                  {selectedFiles.length > 3 && (
                    <button type="button" className={styles.showMoreLessBtn} onClick={() => setAttachmentsExpanded(true)}>
                      <span>Show more ({selectedFiles.length - 3})</span>
                      <FaChevronDown size={12} />
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.attachmentsList}>
                  {selectedFiles.map((file, index) => {
                    const cls = getAttachmentClass(file.name);
                    return (
                      <div key={index} className={`${styles.attachmentItem} ${styles[cls]}`} onClick={() => previewFile(file)}>
                        <div className={styles.attachmentContentWrapper}>
                          <div className={styles.attachmentIconWrapper}>
                            {getFileTypeIcon(file.name)}
                          </div>
                          <div className={styles.fileInfo}>
                            <span className={styles.attachmentName} title={file.name}>{file.name}</span>
                            {file.size != null && <span className={styles.attachmentSize}>{formatBytes(file.size)}</span>}
                          </div>
                        </div>
                        <button type="button" className={styles.attachmentViewBtn} onClick={(e) => { e.stopPropagation(); previewFile(file); }} title="View">
                          <FaEye />
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" className={styles.showMoreLessBtn} onClick={() => setAttachmentsExpanded(false)}>
                    <span>Show less</span>
                    <FaChevronUp size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <FormActions
          onCancel={handlePrevStep}
          cancelLabel="Back"
          cancelVariant="outline"
          onSubmit={handleFinalSubmit}
          submitLabel="Submit Ticket"
          submitVariant="primary"
          submitDisabled={isSubmitting}
          cancelSize="small"
          submitSize="small"
        />
      </>
    );
  };

  return (
    <main className={styles.registration}>
      <section className={styles.centerSection}>
        {renderProgressBar()}

        <div className={`${styles.stepContainer} ${(currentStep === 3 || currentStep === 4) ? styles.stepContainerCard : ''}`}>
          {currentStep === 1 ? renderCategorySelection() :
           currentStep === 2 ? renderSubCategorySelection() :
           currentStep === 3 ? renderDetailsForm() :
           currentStep === 4 ? renderReviewSubmit() : null}
        </div>

        {isSubmitted && (
          <EmployeeTicketSubmissionFormModal
            submittedTicketNumber={submittedTicketNumber}
            onCreateNew={() => resetForm()}
            onView={() => {
              if (submittedTicketNumber) {
                navigate(`/employee/ticket-tracker/${submittedTicketNumber}`, { state: { from: 'Home' } });
              } else {
                navigate('/employee/ticket-tracker');
              }
            }}
          />
        )}
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
