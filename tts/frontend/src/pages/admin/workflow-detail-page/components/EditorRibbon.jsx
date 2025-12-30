import React, { memo } from 'react';
import { WorkflowToolbar } from '../../../../components/workflow/shared';

/**
 * Top ribbon/header for the workflow editor
 * Wraps the shared WorkflowToolbar with edit-mode specific props
 */
const EditorRibbon = memo(function EditorRibbon({
  workflowData,
  hasUnsavedChanges,
  isSaving,
  canUndo,
  canRedo,
  isEditingGraph,
  onSave,
  onUndo,
  onRedo,
  onToggleEditing,
  onOpenSLAModal,
  stepCount,
  transitionCount,
}) {
  // Build subtitle from category info
  const subtitle = [
    workflowData?.workflow?.category,
    workflowData?.workflow?.sub_category
  ].filter(Boolean).join(' • ');

  return (
    <WorkflowToolbar
      title={workflowData?.workflow?.name}
      subtitle={subtitle}
      mode="edit"
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      canUndo={canUndo}
      canRedo={canRedo}
      isEditingGraph={isEditingGraph}
      stepCount={stepCount}
      transitionCount={transitionCount}
      onSave={onSave}
      onUndo={onUndo}
      onRedo={onRedo}
      onToggleEditing={onToggleEditing}
      onOpenSLAModal={onOpenSLAModal}
    />
  );
});

export default EditorRibbon;
