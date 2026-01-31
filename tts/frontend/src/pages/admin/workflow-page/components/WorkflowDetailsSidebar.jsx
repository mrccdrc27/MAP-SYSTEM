import React, { memo, useRef, useEffect } from "react";
import { FileText, ClipboardList } from "lucide-react";
import { WORKFLOW_TEMPLATES } from "../constants/workflowTemplates";
import styles from "../create-workflow.module.css";

/**
 * Left sidebar with workflow details and template selection
 */
const WorkflowDetailsSidebar = memo(function WorkflowDetailsSidebar({
  leftSidebarTab,
  setLeftSidebarTab,
  workflowMetadata,
  setWorkflowMetadata,
  selectedTemplate,
  applyTemplate,
}) {
  return (
    <aside className={styles.leftSidebar}>
      {/* Tab Switcher */}
      <div className={styles.sidebarTabs}>
        <button
          onClick={() => setLeftSidebarTab("details")}
          className={`${styles.sidebarTab} ${
            leftSidebarTab === "details" ? styles.sidebarTabActive : ""
          }`}
        >
          <FileText size={14} /> Details
        </button>
        <button
          onClick={() => setLeftSidebarTab("templates")}
          className={`${styles.sidebarTab} ${
            leftSidebarTab === "templates" ? styles.sidebarTabActive : ""
          }`}
        >
          <ClipboardList size={14} /> Templates
        </button>
      </div>

      {/* Tab Content */}
      {leftSidebarTab === "details" ? (
        <WorkflowDetailsForm
          workflowMetadata={workflowMetadata}
          setWorkflowMetadata={setWorkflowMetadata}
        />
      ) : (
        <TemplateList
          selectedTemplate={selectedTemplate}
          onSelectTemplate={(key) => {
            applyTemplate(key);
            setLeftSidebarTab("details");
          }}
        />
      )}
    </aside>
  );
});

/**
 * Workflow details form inputs
 */
const WorkflowDetailsForm = memo(function WorkflowDetailsForm({
  workflowMetadata,
  setWorkflowMetadata,
}) {
  const textareaRef = useRef(null);

  const handleChange = (field, value) => {
    setWorkflowMetadata((prev) => ({ ...prev, [field]: value }));
  };

  const getCharCounterClass = (current, max) => {
    if (current > max) return 'error';
    if (current > max * 0.9) return 'warning';
    return '';
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [workflowMetadata.description]);

  return (
    <div className={styles.sidebarSection}>
      <div className={styles.compactForm}>
        <div className={styles.inputGroup}>
          <label>
            Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={workflowMetadata.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Workflow name"
          />
          <div className={`${styles.charCounter} ${getCharCounterClass(workflowMetadata.name.length, 64)}`}>
            {workflowMetadata.name.length}/64
          </div>
        </div>
        <div className={styles.inputRow}>
          <div className={styles.inputGroup}>
            <label>
              Category <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={workflowMetadata.category}
              onChange={(e) => handleChange("category", e.target.value)}
              placeholder="IT, HR"
            />
            <div className={`${styles.charCounter} ${getCharCounterClass(workflowMetadata.category.length, 64)}`}>
              {workflowMetadata.category.length}/64
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label>
              Sub-Cat <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={workflowMetadata.sub_category}
              onChange={(e) => handleChange("sub_category", e.target.value)}
              placeholder="Support"
            />
            <div className={`${styles.charCounter} ${getCharCounterClass(workflowMetadata.sub_category.length, 64)}`}>
              {workflowMetadata.sub_category.length}/64
            </div>
          </div>
        </div>
        <div className={styles.inputGroup}>
          <label>
            Department <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={workflowMetadata.department}
            onChange={(e) => handleChange("department", e.target.value)}
            placeholder="IT Support"
          />
          <div className={`${styles.charCounter} ${getCharCounterClass(workflowMetadata.department.length, 64)}`}>
            {workflowMetadata.department.length}/64
          </div>
        </div>
        <div className={styles.inputGroup}>
          <label>Description <span className={styles.required}>*</span></label>
          <textarea
            ref={textareaRef}
            value={workflowMetadata.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Brief description of the workflow"
            style={{ minHeight: '40px' }}
          />
          <div className={`${styles.charCounter} ${getCharCounterClass(workflowMetadata.description.length, 256)}`}>
            {workflowMetadata.description.length}/256
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Template selection list
 */
const TemplateList = memo(function TemplateList({
  selectedTemplate,
  onSelectTemplate,
}) {
  return (
    <div className={styles.sidebarSection}>
      <div className={styles.templateGrid}>
        {Object.entries(WORKFLOW_TEMPLATES).map(([key, template]) => (
          <button
            key={key}
            onClick={() => onSelectTemplate(key)}
            className={`${styles.templateCard} ${
              selectedTemplate === key ? styles.templateCardSelected : ""
            }`}
          >
            <div className={styles.templateCardHeader}>
              {template.icon}
              <span>{template.name}</span>
            </div>
            <div className={styles.templateCardDesc}>
              {template.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

export default WorkflowDetailsSidebar;
