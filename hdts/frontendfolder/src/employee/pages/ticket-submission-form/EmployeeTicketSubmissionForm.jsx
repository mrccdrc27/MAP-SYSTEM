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
  const isAssetRequest = formData.category === 'Asset Request';
  const isAssetRegistration = formData.category === 'Asset Registration';
  const isAssetRepair = formData.category === 'Asset Repair';
  const isAssetIncident = formData.category === 'Asset Incident';
  const isAssetDisposal = formData.category === 'Asset Disposal';
  const isAnyAssetCategory = isAssetCheckIn || isAssetCheckOut;
  const isAnyAssetManagementCategory = isAssetRequest || isAssetRegistration || isAssetRepair || isAssetIncident || isAssetDisposal;

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
        if ((isITSupport || isAnyAssetCategory || isBudgetProposal || isAssetRequest || isAssetRepair || isAssetIncident) && !value) {
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
        if ((isAnyAssetCategory || isAssetRegistration) && !value) {
          error = 'Location is required';
        }
        break;
      
      case 'issueType':
        if (isAssetCheckIn && !value) {
          error = 'Issue Type is required';
        }
        break;

      // Asset Request validations
      case 'assetCategory':
        if ((isAssetRequest || isAssetRegistration) && !value) {
          error = 'Asset Category is required';
        }
        break;
      
      case 'productName':
        if ((isAssetRequest || isAssetRegistration) && !value) {
          error = 'Product Name is required';
        }
        break;
      
      case 'unitCost':
        if (isAssetRequest && !value) {
          error = 'Unit Cost is required';
        }
        break;

      // Asset Registration validations
      case 'serialNumber':
        if (isAssetRegistration && !value) {
          error = 'Serial Number is required';
        }
        break;
      
      case 'purchaseCost':
        if (isAssetRegistration && !value) {
          error = 'Purchase Cost is required';
        }
        break;
      
      case 'purchaseDate':
        if (isAssetRegistration && !value) {
          error = 'Purchase Date is required';
        }
        break;
      
      case 'warrantyExpiry':
        if (isAssetRegistration && !value) {
          error = 'Warranty Expiry is required';
        }
        break;
      
      case 'department':
        if (isAssetRegistration && !value) {
          error = 'Department is required';
        }
        break;

      // Asset Repair validations
      case 'assetId':
        if ((isAssetRepair || isAssetIncident || isAssetDisposal) && !value) {
          error = 'Asset ID is required';
        }
        break;
      
      case 'repairName':
        if (isAssetRepair && !value) {
          error = 'Repair/Service Name is required';
        }
        break;
      
      case 'startDate':
        if (isAssetRepair && !value) {
          error = 'Start Date is required';
        }
        break;

      // Asset Incident validations
      case 'incidentDate':
        if (isAssetIncident && !value) {
          error = 'Incident Date is required';
        }
        break;
      
      case 'justification':
        if ((isAssetIncident || isAssetDisposal) && !value?.trim()) {
          error = 'Justification is required';
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
        expectedReturnDate: '',
        issueType: '',
        otherIssue: '',
        deviceType: '',
        customDeviceType: '',
        softwareAffected: '',
        performanceStartDate: '',
        performanceEndDate: '',
        preparedBy: '',
        // Reset Asset Request fields
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
        // Reset Asset Registration fields
        requestReference: '',
        orderNumber: '',
        purchaseCost: '',
        purchaseDate: '',
        warrantyExpiry: '',
        department: '',
        // Reset Asset Repair fields
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
        // Reset Asset Incident fields
        assignedTo: '',
        incidentDate: '',
        damageDescription: '',
        policeReportNumber: '',
        lastKnownLocation: '',
        employeeName: '',
        lastWorkingDay: '',
        // Reset Asset Disposal fields
        assetAge: '',
        eolStatus: '',
        utilizationAvg: '',
        repairCount: '',
        totalRepairCost: '',
        lastAuditResult: ''
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

  // Prevent form submission on Enter key in input fields
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      // Only prevent if it's not a textarea or if it's a textarea with Ctrl+Enter for submit
      if (e.target.tagName === 'INPUT' || (e.target.tagName === 'TEXTAREA' && !e.ctrlKey)) {
        e.preventDefault();
      }
    }
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

    // Asset Request validations
    if (isAssetRequest) {
      fieldsToValidate.push('assetCategory', 'productName', 'unitCost');
    }

    // Asset Registration validations
    if (isAssetRegistration) {
      fieldsToValidate.push('assetCategory', 'productName', 'serialNumber', 'purchaseCost', 'purchaseDate', 'warrantyExpiry', 'location', 'department');
    }

    // Asset Repair validations
    if (isAssetRepair) {
      fieldsToValidate.push('assetId', 'repairName', 'startDate');
    }

    // Asset Incident validations
    if (isAssetIncident) {
      fieldsToValidate.push('assetId', 'incidentDate', 'justification');
    }

    // Asset Disposal validations
    if (isAssetDisposal) {
      fieldsToValidate.push('assetId', 'justification');
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

      // Add Asset Request specific data
      if (isAssetRequest) {
        dynamicData.assetCategory = formData.assetCategory;
        dynamicData.productName = formData.productName;
        dynamicData.modelNumber = formData.modelNumber;
        dynamicData.manufacturer = formData.manufacturer;
        dynamicData.supplier = formData.supplier;
        dynamicData.specs = formData.specs;
        dynamicData.unitCost = formData.unitCost;
        dynamicData.quantity = formData.quantity || 1;
        dynamicData.totalCost = (formData.unitCost || 0) * (formData.quantity || 1);
        dynamicData.eolDate = formData.eolDate;
        dynamicData.depreciationMonths = formData.depreciationMonths;
        dynamicData.justification = formData.justification;
      }

      // Add Asset Registration specific data
      if (isAssetRegistration) {
        dynamicData.requestReference = formData.requestReference;
        dynamicData.assetCategory = formData.assetCategory;
        dynamicData.productName = formData.productName;
        dynamicData.modelNumber = formData.modelNumber;
        dynamicData.orderNumber = formData.orderNumber;
        dynamicData.serialNumber = formData.serialNumber;
        dynamicData.purchaseCost = formData.purchaseCost;
        dynamicData.purchaseDate = formData.purchaseDate;
        dynamicData.warrantyExpiry = formData.warrantyExpiry;
        dynamicData.location = formData.location;
        dynamicData.department = formData.department;
        dynamicData.justification = formData.justification;
      }

      // Add Asset Repair specific data
      if (isAssetRepair) {
        dynamicData.assetId = formData.assetId;
        dynamicData.assetName = formData.assetName;
        dynamicData.serialNumber = formData.serialNumber;
        dynamicData.repairName = formData.repairName;
        dynamicData.startDate = formData.startDate;
        dynamicData.endDate = formData.endDate;
        dynamicData.serviceCost = formData.serviceCost;
        dynamicData.orderNumber = formData.orderNumber;
        dynamicData.repairNotes = formData.repairNotes;
        // Component data if applicable
        if (formData.componentId) {
          dynamicData.component = {
            id: formData.componentId,
            name: formData.componentName,
            category: formData.componentCategory,
            quantity: formData.componentQuantity,
            cost: formData.componentCost
          };
        }
        if (formData.newComponentName) {
          dynamicData.newComponent = {
            name: formData.newComponentName,
            category: formData.newComponentCategory,
            supplier: formData.newComponentSupplier,
            manufacturer: formData.newComponentManufacturer,
            location: formData.newComponentLocation,
            modelNumber: formData.newComponentModelNumber,
            purchaseDate: formData.newComponentPurchaseDate,
            quantity: formData.newComponentQuantity,
            cost: formData.newComponentCost
          };
        }
      }

      // Add Asset Incident specific data
      if (isAssetIncident) {
        dynamicData.assetId = formData.assetId;
        dynamicData.assetName = formData.assetName;
        dynamicData.serialNumber = formData.serialNumber;
        dynamicData.assignedTo = formData.assignedTo;
        dynamicData.incidentDate = formData.incidentDate;
        dynamicData.justification = formData.justification;
        if (formData.subCategory === 'Stolen') {
          dynamicData.policeReportNumber = formData.policeReportNumber;
          dynamicData.lastKnownLocation = formData.lastKnownLocation;
        }
        if (formData.subCategory === 'Damage') {
          dynamicData.damageDescription = formData.damageDescription;
        }
        if (formData.subCategory === 'Employee Resign') {
          dynamicData.employeeName = formData.employeeName;
          dynamicData.lastWorkingDay = formData.lastWorkingDay;
        }
      }

      // Add Asset Disposal specific data
      if (isAssetDisposal) {
        dynamicData.assetId = formData.assetId;
        dynamicData.assetName = formData.assetName;
        dynamicData.serialNumber = formData.serialNumber;
        dynamicData.assetCategory = formData.assetCategory;
        dynamicData.assetAge = formData.assetAge;
        dynamicData.eolStatus = formData.eolStatus;
        dynamicData.utilizationAvg = formData.utilizationAvg;
        dynamicData.repairCount = formData.repairCount;
        dynamicData.totalRepairCost = formData.totalRepairCost;
        dynamicData.lastAuditResult = formData.lastAuditResult;
        dynamicData.justification = formData.justification;
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
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
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

          {/* Asset Request Form */}
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

          {/* Asset Registration Form */}
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

          {/* Asset Repair Form */}
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

          {/* Asset Incident Form */}
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

          {/* Asset Disposal Form */}
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