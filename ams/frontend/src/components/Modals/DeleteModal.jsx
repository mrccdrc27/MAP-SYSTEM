import { useEffect, useState } from "react";
import LoadingButton from "../LoadingButton";
import "../../styles/DeleteModal.css";
import {
  deleteProduct,
  bulkDeleteProducts,
  deleteAsset,
  bulkDeleteAssets,
} from "../../services/assets-service";

export default function ConfirmationModal({
  closeModal,
  isOpen,
  actionType,      // "delete", "bulk-delete", "activate", etc.
  entityType,      // "product", "asset"
  targetId,        // single ID for delete
  targetIds,       // array of IDs for bulk-delete
  onSuccess,       // callback after successful delete (receives deleted id(s))
  onError,         // callback on error (receives error)
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClose = () => {
    if (closeModal) closeModal();
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      if (actionType === "delete" && targetId) {
        // Single delete
        if (entityType === "product") {
          await deleteProduct(targetId);
        } else if (entityType === "asset") {
          await deleteAsset(targetId);
        }
        if (onSuccess) onSuccess(targetId);
      } else if (actionType === "bulk-delete" && targetIds?.length > 0) {
        // Bulk delete
        if (entityType === "product") {
          await bulkDeleteProducts({ ids: targetIds });
        } else if (entityType === "asset") {
          await bulkDeleteAssets({ ids: targetIds });
        }
        if (onSuccess) onSuccess(targetIds);
      }
    } catch (error) {
      console.error("Action failed:", error);
      if (onError) onError(error);
    } finally {
      setIsProcessing(false);
      handleClose();
    }
  };

  const getActionText = () => {
    switch (actionType) {
      case "delete":
      case "bulk-delete":
        return "Delete";
      case "activate":
        return "Activate";
      case "deactivate":
        return "Deactivate";
      case "recover":
        return "Recover";
      default:
        return "Confirm";
    }
  };

  const getProcessingText = () => {
    switch (actionType) {
      case "delete":
      case "bulk-delete":
        return "Deleting...";
      case "activate":
        return "Activating...";
      case "deactivate":
        return "Deactivating...";
      case "recover":
        return "Recovering...";
      default:
        return "Processing...";
    }
  };

  // Disable scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [isOpen]);

  return (
    <section className="delete-modal">
      <div className="overlay" onClick={handleClose}>
        <div className="content" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">{getActionText()} Confirmation</h2>
          <p className="modal-message">
            Are you sure you want to {getActionText().toLowerCase()}{" "}
            {actionType === "bulk-delete"
              ? `these ${targetIds?.length || 0} ${entityType}(s)`
              : `this ${entityType}`}?
            This action cannot be undone.
          </p>
          <div className="modal-actions">
            <button className="cancel-btn" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </button>
            <button
              className={`confirm-action-btn ${actionType}-btn`}
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? <LoadingButton /> : getActionText()}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}