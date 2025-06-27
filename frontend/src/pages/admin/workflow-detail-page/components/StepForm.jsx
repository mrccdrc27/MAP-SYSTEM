import React, { useState } from 'react';
import styles from '../WorkflowEditor.module.css';

export default function StepForm({ StepformData, setStepFormData, handleCreateStep, role }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!StepformData.name.trim()) newErrors.name = "Step name is required.";
    if (!StepformData.role_id) newErrors.role_id = "Please select a role.";
    return newErrors;
  };

  const onSubmit = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    handleCreateStep(); // Only call if valid
  };

  return (
    <div className={styles.addStepForm}>
      <h3 className={styles.formTitle}>Add New Step</h3>
      <div className={styles.formFields}>
        {/* Step name input */}
        {errors.name && <div className={styles.error}>{errors.name}</div>}
        <input
          type="text"
          placeholder="Step name"
          value={StepformData.name}
          onChange={(e) => {
            setStepFormData({ ...StepformData, name: e.target.value });
            setErrors(prev => ({ ...prev, name: null }));
          }}
          className={styles.input}
        />

        {/* Role select input */}
        {errors.role_id && <div className={styles.error}>{errors.role_id}</div>}
        <select
          value={StepformData.role_id}
          onChange={(e) => {
            setStepFormData({ ...StepformData, role_id: e.target.value });
            setErrors(prev => ({ ...prev, role_id: null }));
          }}
          className={styles.select}
        >
          <option value="">Select Role</option>
          {role.map(r => (
            <option key={r.role_id} value={r.role_id}>{r.name}</option>
          ))}
        </select>

        <button onClick={onSubmit} className={styles.addButton}>Add Step</button>
      </div>
    </div>
  );
}
