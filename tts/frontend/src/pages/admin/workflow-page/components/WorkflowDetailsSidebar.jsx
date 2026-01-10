import React, { memo } from "react";
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
  const handleChange = (field, value) => {
    setWorkflowMetadata((prev) => ({ ...prev, [field]: value }));
  };

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
        </div>
        <div className={styles.inputGroup}>
          <label>Description <span className={styles.required}>*</span></label>
          <textarea
            value={workflowMetadata.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Brief description of the workflow"
            rows={2}
          />
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
