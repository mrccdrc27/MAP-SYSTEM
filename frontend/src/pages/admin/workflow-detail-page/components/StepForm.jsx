import React from 'react';
import styles from '../WorkflowEditor.module.css';

export default function StepForm({ StepformData, setStepFormData, handleCreateStep, role }) {
  return (
    <div className={styles.addStepForm}>
      <h3 className={styles.formTitle}>Add New Step</h3>
      <div className={styles.formFields}>
        <input
          type="text"
          placeholder="Step name"
          value={StepformData.name}
          onChange={(e) => setStepFormData({...StepformData, name: e.target.value})}
          className={styles.input}
        />
        <select
          value={StepformData.role_id}
          onChange={(e) => setStepFormData({...StepformData, role_id: e.target.value})}
          className={styles.select}
        >
          <option value="">Select Role</option>
          {role.map(r => <option key={r.role_id} value={r.role_id}>{r.name}</option>)}
        </select>
        <button onClick={handleCreateStep} className={styles.addButton}>Add Step</button>
      </div>
    </div>
  );
}
