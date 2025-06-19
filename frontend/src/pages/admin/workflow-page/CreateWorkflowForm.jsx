import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCreateWorkflow from '../../../api/useCreateWorkflow';

const CreateWorkflowForm = () => {
  const [formData, setFormData] = useState({
    user_id: 10,
    name: '',
    description: '',
    category: '',
    sub_category: '',
    is_published: false,
  });

  const { createWorkflow, loading, error, workflow } = useCreateWorkflow();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const created = await createWorkflow(formData);
    console.log('Created Workflow:', created.workflow_id);
  
    if (created && created.workflow_id) {
      // Wait for 500ms before navigating
      setTimeout(() => {
        navigate(`/admin/workflow/${created.workflow_id}`);
      }, 500);
    }
  };
  

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
      <input
        type="text"
        name="name"
        placeholder="Workflow Name"
        value={formData.name}
        onChange={handleChange}
        required
      />

      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        rows={3}
      />

      <input
        type="text"
        name="category"
        placeholder="Category"
        value={formData.category}
        onChange={handleChange}
      />

      <input
        type="text"
        name="sub_category"
        placeholder="Sub-category"
        value={formData.sub_category}
        onChange={handleChange}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Workflow'}
      </button>

      {error && <div style={{ color: 'red' }}>Error: {JSON.stringify(error)}</div>}
    </form>
  );
};

export default CreateWorkflowForm;
