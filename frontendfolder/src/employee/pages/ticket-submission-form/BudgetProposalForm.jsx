import { useState } from 'react';
import Button from '../../../shared/components/Button';
import styles from './BudgetProposalForm.module.css';

const budgetSubCategories = [
  'Capital Expenses (CapEx)',
  'Operational Expenses (OpEx)',
  'Reimbursement Claim (Liabilities)',
  'Charging Department (Cost Center)'
];

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

const costRanges = [
  '₱0 - ₱10,000',
  '₱10,001 - ₱50,000',
  '₱50,001 - ₱100,000',
  '₱100,001 - ₱500,000',
  '₱500,001 - ₱1,000,000',
  '₱1,000,001 and above'
];

export default function BudgetProposalForm({ 
  formData, 
  onChange, 
  onBlur, 
  errors, 
  FormField,
  budgetItems,
  setBudgetItems 
}) {
  const addBudgetItem = () => {
    setBudgetItems([...budgetItems, { cost_element: '', estimated_cost: '', description: '', account: 2 }]);
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

  // Calculate total budget
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
      <FormField
        id="subCategory"
        label="Sub-Category"
        required
        error={errors.subCategory}
        render={() => (
          <select
            value={formData.subCategory}
            onChange={onChange('subCategory')}
            onBlur={onBlur('subCategory')}
          >
            <option value="">Select Budget Category</option>
            {budgetSubCategories.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        )}
      />

      {/* Budget Items */}
      <fieldset className={styles.budgetItemsFieldset}>
        <legend className={styles.budgetItemsLegend}>Budget Items</legend>
        
        {budgetItems.map((item, index) => (
          <div key={index} className={styles.budgetItem}>
            {/* Cost Element */}
            <FormField
              id={`cost_element-${index}`}
              label="Cost Element"
              render={() => (
                <select
                  disabled={!formData.subCategory}
                  value={item.cost_element}
                  onChange={(e) => updateBudgetItem(index, 'cost_element', e.target.value)}
                >
                  <option value="">
                    {formData.subCategory ? 'Select Cost Element' : 'Select Sub-Category first'}
                  </option>
                  {formData.subCategory && costElements[formData.subCategory]?.map(element => (
                    <option key={element} value={element}>{element}</option>
                  ))}
                </select>
              )}
            />

            {/* Estimated Cost */}
            <FormField
              id={`estimated_cost-${index}`}
              label="Estimated Cost"
              render={() => (
                <select
                  value={item.estimated_cost}
                  onChange={(e) => updateBudgetItem(index, 'estimated_cost', e.target.value)}
                >
                  <option value="">Select Cost Range</option>
                  {costRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              )}
            />

            {/* Description */}
            <FormField
              id={`description-${index}`}
              label="Description"
              render={() => (
                <textarea
                  value={item.description || ''}
                  onChange={(e) => updateBudgetItem(index, 'description', e.target.value)}
                  placeholder="Enter description (optional)"
                  rows={2}
                />
              )}
            />

            {/* Account - Hidden field with default value 2 */}
            <input type="hidden" value={item.account || 2} />

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
          variant="primary"
          onClick={addBudgetItem}
          className={styles.addButton}
        >
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
      <FormField
        id="performanceStartDate"
        label="Performance Start Date"
        required
        error={errors.performanceStartDate}
        render={() => (
          <input
            type="date"
            value={formData.performanceStartDate || ''}
            onChange={onChange('performanceStartDate')}
            onBlur={onBlur('performanceStartDate')}
          />
        )}
      />

      {/* Performance End Date */}
      <FormField
        id="performanceEndDate"
        label="Performance End Date"
        required
        error={errors.performanceEndDate}
        render={() => (
          <input
            type="date"
            value={formData.performanceEndDate || ''}
            onChange={onChange('performanceEndDate')}
            onBlur={onBlur('performanceEndDate')}
            min={formData.performanceStartDate || ''}
          />
        )}
      />

      {/* Prepared By */}
      <FormField
        id="preparedBy"
        label="Prepared By"
        required
        error={errors.preparedBy}
        render={() => (
          <input
            type="text"
            placeholder="Enter name of preparer"
            value={formData.preparedBy || ''}
            onChange={onChange('preparedBy')}
            onBlur={onBlur('preparedBy')}
          />
        )}
      />
    </>
  );
}
