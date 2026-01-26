import { useState, useEffect } from 'react';
import { FaDollarSign, FaPlus } from 'react-icons/fa';
import Button from '../../../shared/components/Button';
import InputField from '../../../shared/components/InputField';
import SelectField from '../../../shared/components/SelectField';
import styles from './BudgetProposalForm.module.css';

const BudgetProposalMetadata = {
  categoryName: 'New Budget Proposal',
  icon: FaDollarSign,
  description: 'Submit budget proposals and financial requests',
  subCategories: [
    'CAPEX',
    'OPEX'
  ]
};

const budgetSubCategories = BudgetProposalMetadata.subCategories;

const subCategoryOptions = [
  { value: 'CAPEX', label: 'Capital Expenses' },
  { value: 'OPEX', label: 'Operational Expenses' }
];

const departmentOptions = [
  { value: 'MERCH', label: 'Merchandising' },
  { value: 'SALES', label: 'Sales & Store Operations' },
  { value: 'MKT', label: 'Marketing' },
  { value: 'OPS', label: 'Operations' },
  { value: 'IT', label: 'IT Application & Data' },
  { value: 'LOG', label: 'Logistics' },
  { value: 'HR', label: 'Human Resources' },
  { value: 'FIN', label: 'Finance' }
];

// Temporary hardcoded fiscal year options (will be fetched from BMS later)
const fiscalYearOptions = [
  { value: 4, label: 'FY 2026' },
  { value: 3, label: 'FY 2025' },
  { value: 2, label: 'FY 2024' }
];

// Cost elements based on sub-category
const costElements = {
  'CAPEX': [
    'Equipment',
    'Software (long-term value like MS Office, Adobe Suite, Antivirus)',
    'Furniture'
  ],
  'OPEX': [
    'Utilities',
    'Supplies',
    'IT Services',
    'Software Subscriptions'
  ],
  'MERCH-SUP': [
    'Payable',
    'Loans (if applicable)'
  ],
  'MERCH-SW': [
    'IT Operations (day-to-day support)',
    'System Development (in-house software projects)',
    'Infrastructure & Equipment (hardware, network, servers)',
    'Training and Seminars (employee development)'
  ]
};

// Removed costRanges - using direct peso input via InputField

export default function BudgetProposalForm({ 
  formData, 
  onChange, 
  onBlur, 
  errors, 
  FormField,
  budgetItems,
  setBudgetItems 
}) {
  const [showFinanceFields, setShowFinanceFields] = useState(false);
  // Compute local YYYY-MM-DD (avoid UTC offset from toISOString)
  const getLocalDateString = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const today = getLocalDateString(new Date());

  // Return YYYY-MM-DD for date + days using local calendar (no UTC)
  const addDays = (dateStr, days) => {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    return getLocalDateString(d);
  };

  const tomorrow = addDays(today, 1);
  // Minimum end date depends on selected performanceStartDate (must be after start)
  const getMinPerformanceEnd = () => {
    if (formData.performanceStartDate) return addDays(formData.performanceStartDate, 1);
    return tomorrow;
  };
  const addBudgetItem = () => {
    setBudgetItems([...budgetItems, { costElement: '', description: '', estimatedCost: '', category_code: '', account: '' }]);
  };

  // Auto-select a sensible fiscal year if none chosen yet
  useEffect(() => {
    if ((!formData.fiscalYear || formData.fiscalYear === '') && fiscalYearOptions && fiscalYearOptions.length > 0) {
      // Call parent's onChange handler to set fiscalYear
      const handler = onChange('fiscalYear');
      if (typeof handler === 'function') {
        handler({ target: { value: fiscalYearOptions[0].value } });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeBudgetItem = (index) => {
    if (budgetItems.length > 1) {
      const newItems = budgetItems.filter((_, i) => i !== index);
      setBudgetItems(newItems);
    }
  };

  const updateBudgetItem = (index, field, value) => {
    const newItems = [...budgetItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setBudgetItems(newItems);
  };

  // Calculate total budget from numeric input values
  const calculateTotalBudget = () => {
    return budgetItems.reduce((total, item) => {
      const cleaned = String(item.estimatedCost || '').replace(/[₱, ,\.\s]+/g, '').replace(/[^0-9]/g, '');
      const amount = parseInt(cleaned || '0', 10) || 0;
      return total + amount;
    }, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0));
  };

  return (
    <>
      {/* Sub-Category */}
      <SelectField
        label="Sub-Category"
        placeholder="Select Budget Category"
        value={formData.subCategory}
        onChange={onChange('subCategory')}
        onBlur={onBlur('subCategory')}
        required
        error={errors.subCategory}
        options={subCategoryOptions}
      />

      {/* Department */}
      <SelectField
        label="Department"
        placeholder="Select Department"
        value={formData.department_input || ''}
        onChange={onChange('department_input')}
        onBlur={onBlur('department_input')}
        required
        error={errors.department_input}
        options={departmentOptions}
      />

      {/* Fiscal Year */}
      <SelectField
        label="Fiscal Year"
        placeholder="Select Fiscal Year"
        value={formData.fiscalYear || ''}
        onChange={onChange('fiscalYear')}
        onBlur={onBlur('fiscalYear')}
        required
        error={errors.fiscalYear}
        options={fiscalYearOptions}
      />

      {/* Performance Start Date */}
      <InputField
        type="date"
        label="Performance Start Date"
        value={formData.performanceStartDate || ''}
        onChange={onChange('performanceStartDate')}
        onBlur={onBlur('performanceStartDate')}
        required
        error={errors.performanceStartDate}
        min={today}
      />

      {/* Performance End Date */}
      <InputField
        type="date"
        label="Performance End Date"
        value={formData.performanceEndDate || ''}
        onChange={onChange('performanceEndDate')}
        onBlur={onBlur('performanceEndDate')}
        required
        error={errors.performanceEndDate}
        min={getMinPerformanceEnd()}
      />

      {/* Budget Items */}
      <fieldset className={styles.budgetItemsFieldset}>
        <legend className={styles.budgetItemsLegend}>Budget Items</legend>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: '#374151' }}>
            <input type="checkbox" checked={showFinanceFields} onChange={() => setShowFinanceFields(!showFinanceFields)} style={{ marginRight: 8 }} />
            Show Finance Fields (Category Code & Account)
          </label>
        </div>
        
        {budgetItems.map((item, index) => (
          <div key={index} className={styles.budgetItem}>
                  {/* Cost Element (user input) */}
                  <InputField
                    label="Cost Element"
                    placeholder={'Enter cost element'}
                    value={item.costElement}
                    onChange={(e) => updateBudgetItem(index, 'costElement', e.target.value)}
                    required={index === 0}
                    error={errors ? errors[`budgetItems_0_costElement`] : ''}
                  />

            {/* Description */}
            <InputField
              label="Description"
              placeholder="Enter item description"
              value={item.description || ''}
              onChange={(e) => updateBudgetItem(index, 'description', e.target.value)}
              required={index === 0}
              error={errors ? errors[`budgetItems_0_description`] : ''}
            />

            {/* Estimated Cost - allow digits only with up to two decimal places */}
            <InputField
              variant="currency"
              label="Estimated Cost"
              placeholder="0"
              value={item.estimatedCost}
              onChange={(e) => {
                const raw = String(e.target.value || '');
                // Allow only digits (no decimal point). Remove other characters.
                const digitsOnly = raw.replace(/[^0-9]/g, '');

                // Format integer part with commas for display
                const formatWithCommas = (numStr) => {
                  if (!numStr) return '';
                  const intFormatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  return intFormatted;
                };

                const display = formatWithCommas(digitsOnly);
                updateBudgetItem(index, 'estimatedCost', display);
              }}
              required={index === 0}
              error={errors ? errors[`budgetItems_0_estimatedCost`] : ''}
            />

            {showFinanceFields && (
              <>
                {/* Category Code (hardcoded for now) */}
                <SelectField
                  label="Category Code"
                  placeholder="Select Category Code"
                  value={item.category_code || ''}
                  onChange={(e) => updateBudgetItem(index, 'category_code', e.target.value)}
                  onBlur={() => {}}
                  required
                  options={[
                    { value: '', label: 'Select Category' },
                    // IT-related categories
                    { value: 'CAP-IT-HW', label: 'CAP-IT-HW — Capital: IT Hardware' },
                    { value: 'IT-HW', label: 'IT-HW — Hardware (Desktops/Laptops)' },
                    { value: 'IT-SW', label: 'IT-SW — Software Licenses / Subscriptions' },
                    { value: 'IT-HOST', label: 'IT-HOST — Server Hosting / Cloud Services' },
                    // Operations / Logistics
                    { value: 'OPS-MAINT', label: 'OPS-MAINT — Maintenance & Repairs' },
                    { value: 'OPS-FRE', label: 'OPS-FRE — Freight & Logistics' },
                    // Marketing
                    { value: 'MKT-ADV', label: 'MKT-ADV — Advertising & Promotions' },
                    { value: 'MKT-MAT', label: 'MKT-MAT — Marketing Materials' },
                    // HR / Travel
                    { value: 'HR-TRV', label: 'HR-TRV — Travel & Training' },
                    // Finance / Professional
                    { value: 'FIN-CON', label: 'FIN-CON — Consulting / Professional Fees' },
                    // General / fallback
                    { value: 'GEN', label: 'GEN — General / Miscellaneous' }
                  ]}
                />

                {/* Account (hardcoded for now) */}
                <SelectField
                  label="Account"
                  placeholder="Select GL Account"
                  value={item.account || ''}
                  onChange={(e) => updateBudgetItem(index, 'account', e.target.value)}
                  onBlur={() => {}}
                  required
                  options={[
                    { value: '', label: 'Select Account' },
                    // Values are temporary account IDs (use real Account.id from BMS later)
                    { value: 10, label: '6100 - IT Operations' },
                    { value: 11, label: '6200 - Office Supplies' },
                    { value: 12, label: '6300 - Professional Services' },
                    { value: 13, label: '6400 - Travel & Expenses' },
                    { value: 14, label: '6500 - Hardware Purchases' },
                    { value: 15, label: '6600 - Software Subscriptions' }
                  ]}
                />

                {/* Inline warnings */}
                {(!item.category_code || !item.account) && (
                  <div style={{ color: '#b45309', fontSize: 13, marginTop: 6 }}>
                    Finance fields are required for submission — please select Category Code and Account.
                  </div>
                )}
              </>
            )}

            {/* removed Account and Category Code inputs — generated on submit */}

            {/* Remove Button */}
            {budgetItems.length > 1 && (
              <Button
                variant="outline"
                onClick={() => removeBudgetItem(index)}
                className={styles.removeButton}
              >
                Remove
              </Button>
            )}
          </div>
        ))}

        {/* Add Item Button */}
        <Button
          variant="secondary"
          size="medium"
          onClick={addBudgetItem}
          className={styles.addButton}
        >
          <FaPlus size={14} className={styles.iconLeft} />
          Add Item
        </Button>

        {/* Total Requested Budget */}
        <div className={styles.totalBudgetContainer}>
          <div className={styles.totalBudgetRow}>
            <span>Total Requested Budget:</span>
            <span>{formatCurrency(calculateTotalBudget())}</span>
          </div>
        </div>
      </fieldset>

      {/* Project Summary */}
      <InputField
        label="Project Summary"
        placeholder="Provide a brief project summary"
        value={formData.projectSummary || ''}
        onChange={onChange('projectSummary')}
        onBlur={onBlur('projectSummary')}
        error={errors.projectSummary}
      />

      {/* Project Description removed; use main Description field as optional 'Project Description' when category is New Budget Proposal */}
    </>
  );
}

export { BudgetProposalMetadata };
