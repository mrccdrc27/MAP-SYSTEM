import { useState } from 'react';
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
    'Capital Expenses (CapEx)',
    'Operational Expenses (OpEx)',
    'Reimbursement Claim (Liabilities)',
    'Charging Department (Cost Center)'
  ]
};

const budgetSubCategories = BudgetProposalMetadata.subCategories;

// Cost elements based on sub-category
const costElements = {
  'Capital Expenses (CapEx)': [
    'Equipment',
    'Software (long-term value like MS Office, Adobe Suite, Antivirus)',
    'Furniture'
  ],
  'Operational Expenses (OpEx)': [
    'Utilities',
    'Supplies',
    'IT Services',
    'Software Subscriptions'
  ],
  'Reimbursement Claim (Liabilities)': [
    'Payable',
    'Loans (if applicable)'
  ],
  'Charging Department (Cost Center)': [
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
    setBudgetItems([...budgetItems, { costElement: '', description: '', estimatedCost: '' }]);
  };

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
        options={budgetSubCategories.map(sub => ({ value: sub, label: sub }))}
      />

      {/* Budget Items */}
      <fieldset className={styles.budgetItemsFieldset}>
        <legend className={styles.budgetItemsLegend}>Budget Items</legend>
        
        {budgetItems.map((item, index) => (
          <div key={index} className={styles.budgetItem}>
            {/* Cost Element */}
            <SelectField
              label="Cost Element"
              placeholder={formData.subCategory ? 'Select Cost Element' : 'Select Sub-Category first'}
              value={item.costElement}
              onChange={(e) => updateBudgetItem(index, 'costElement', e.target.value)}
              disabled={!formData.subCategory}
              options={formData.subCategory ? (costElements[formData.subCategory]?.map(element => ({ value: element, label: element })) || []) : []}
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

      {/* Prepared By */}
      <InputField
        type="text"
        label="Prepared By"
        placeholder="Enter name of preparer"
        value={formData.preparedBy || ''}
        onChange={onChange('preparedBy')}
        onBlur={onBlur('preparedBy')}
        required
        error={errors.preparedBy}
      />
    </>
  );
}

export { BudgetProposalMetadata };
