import { useForm } from "react-hook-form";
import { useState, useEffect, useMemo } from "react";
import { ToastContainer, toast } from "react-toastify";
import ModalWrapper from "../../../shared/modals/ModalWrapper";
import priorityLevelOptions from "../../../utilities/options/priorityLevelOptions";
import departmentOptions from "../../../utilities/options/departmentOptions";
import { backendTicketService } from "../../../services/backend/ticketService";
import styles from "./CoordinatorOpenTicketModal.module.css";
import 'react-toastify/dist/ReactToastify.css';

const CoordinatorAdminOpenTicketModal = ({ ticket, onClose, onSuccess }) => {
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetType, setAssetType] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(null);

  useEffect(() => {
    reset({
      priorityLevel: ticket.priorityLevel || ticket.priority || ticket.priority_level || "",
      department: ticket.department || ticket.assignedDepartment || ticket.employeeDepartment || "",
      comment: "",
    });
    // clear asset selections when modal opens or ticket changes
    setAssetType("");
    setSelectedAsset(null);
    setValue('assetType', "");
    setValue('selectedAssetId', null);
  }, [ticket, reset]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const ticketId = ticket.id || ticket.ticket_id || ticket.ticketId || null;
      if (!ticketId) throw new Error('Ticket id missing');

      // Map frontend priority values to backend expected values
      const priorityMap = {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical'
      };
      const selectedPriority = (data.priorityLevel || ticket.priority || ticket.priority_level || '').toString();
      const mappedPriority = priorityMap[selectedPriority.toLowerCase()] || (ticket.priority || ticket.priority_level || 'Low');

      // Use the backend approve endpoint to set status -> Open and persist priority/department
      await backendTicketService.approveTicket(ticketId, {
        priority: mappedPriority,
        department: data.department || ticket.department || ticket.assignedDepartment,
        approval_notes: data.comment || ''
      });

      toast.success(`Ticket #${ticket.ticketNumber} opened successfully.`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      onSuccess?.(ticket.ticketNumber, "Open"); // ✅ update parent state
      // Navigate directly to the ticket tracker page for this ticket so the
      // UI reloads from the backend. We do this without explicitly closing the modal
      // to avoid flashes — the browser will navigate away immediately.
      try {
        const tn = encodeURIComponent(ticket.ticketNumber || ticket.ticket_number || ticket.id || '');
        if (tn) window.location.href = `/admin/ticket-tracker/${tn}`;
        else window.location.reload();
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('OpenTicket error:', err);
      toast.error("Failed to approve ticket. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Asset types limited to the AMS preset
  const assetTypeOptions = useMemo(() => [
    'Laptop',
    'Printer',
    'Projector',
    'Mouse',
    'Keyboard'
  ], []);

  // Sample asset inventory (local within modal). This can be replaced with real data later.
  const assets = useMemo(() => ([
    { id: 'AST-001', name: 'Dell Latitude 5420', productType: 'Laptop', quantity: 15, location: 'Warehouse A', status: 'Available' },
    { id: 'AST-002', name: 'HP EliteBook 840', productType: 'Laptop', quantity: 0, location: 'Warehouse A', status: 'Out of Stock' },
    { id: 'AST-003', name: 'Epson PowerLite 1795F', productType: 'Projector', quantity: 3, location: 'Main Office - Room 301', status: 'Available' },
    { id: 'AST-004', name: 'Canon LBP Printer', productType: 'Printer', quantity: 6, location: 'Warehouse B', status: 'Available' },
    { id: 'AST-005', name: 'Logitech M510', productType: 'Mouse', quantity: 25, location: 'Warehouse B', status: 'Available' },
    { id: 'AST-006', name: 'Dell KB216', productType: 'Keyboard', quantity: 20, location: 'Warehouse B', status: 'Available' }
  ]), []);

  const filteredAssets = useMemo(() => {
    if (!assetType) return [];
    return assets.filter(a => String(a.productType).toLowerCase() === String(assetType).toLowerCase());
  }, [assetType, assets]);

  return (
    <ModalWrapper onClose={onClose}>
      <ToastContainer />
      <h2 className={styles.heading}>
        {(() => {
          const resolveOwnerName = (t) => {
            if (!t) return '';
            // employee object common shapes
            if (t.employee) {
              const e = t.employee;
              const first = e.first_name || e.firstName || e.first;
              const last = e.last_name || e.lastName || e.last;
              if (first || last) return `${first || ''} ${last || ''}`.trim();
              if (e.name) return e.name;
              if (e.user) {
                const uf = e.user.first_name || e.user.firstName || e.user.name;
                const ul = e.user.last_name || e.user.lastName;
                if (uf && ul) return `${uf} ${ul}`.trim();
                if (uf) return uf;
              }
            }

            // requester / requested_by / user / owner shapes
            const person = t.requester || t.requested_by || t.requestedBy || t.user || t.owner || t.requester_user;
            if (person) {
              const first = person.first_name || person.firstName || person.name;
              const last = person.last_name || person.lastName;
              if (first && last) return `${first} ${last}`.trim();
              if (first) return first;
              if (person.name) return person.name;
              if (person.user) {
                const uf = person.user.first_name || person.user.firstName || person.user.name;
                const ul = person.user.last_name || person.user.lastName;
                if (uf && ul) return `${uf} ${ul}`.trim();
                if (uf) return uf;
              }
            }

            // flat name fields
            return t.employee_name || t.employeeName || t.requester_name || t.requesterName || t.createdBy?.name || t.created_by?.name || t.requested_by_name || t.requestedByName || '';
          };

          const resolveTicketNumber = (t) => t?.ticketNumber || t?.ticket_number || t?.ticket_no || t?.number || t?.id || '';

          const ownerName = resolveOwnerName(ticket);
          const ticketNum = resolveTicketNumber(ticket);
          return ownerName ? `Approve Ticket ${ticketNum} for ${ownerName}` : `Approve Ticket ${ticketNum}`;
        })()}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <label>
            Priority Level <span className={styles.required}>*</span>
          </label>
          <select {...register("priorityLevel", { required: "Priority Level is required" })} className={styles.input}>
            <option value="">Select Priority Level</option>
            {priorityLevelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.priorityLevel && <p className={styles.error}>{errors.priorityLevel.message}</p>}
        </div>

        <div className={styles.field}>
          <label>
            Department <span className={styles.required}>*</span>
          </label>
          <select {...register("department", { required: "Department is required" })} className={styles.input}>
            <option value="">Select Department</option>
            {departmentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.department && <p className={styles.error}>{errors.department.message}</p>}
        </div>

        {/* Asset type selector only for Asset Check In/Out categories */}
        {(ticket.category === 'Asset Check In' || ticket.category === 'Asset Check Out') && (
          <>
            <div className={styles.field}>
              <label>Asset Type</label>
              <select
                {...register('assetType')}
                className={styles.input}
                value={assetType}
                onChange={(e) => {
                  const v = e.target.value;
                  setAssetType(v);
                  setValue('assetType', v);
                  // clear previously selected asset
                  setSelectedAsset(null);
                  setValue('selectedAssetId', null);
                }}
              >
                <option value="">Select Asset Type</option>
                {assetTypeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Asset list table shown after selecting an asset type */}
            {assetType && (
              <div className={styles.assetTableWrap}>
                <div className={styles.assetTableHeader}>Available {assetType}s</div>
                <table className={styles.assetTable}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '12px' }}>No assets found for this type.</td></tr>
                    )}
                    {filteredAssets.map((a) => (
                      <tr key={a.id} className={selectedAsset && selectedAsset.id === a.id ? styles.selectedRow : ''}>
                        <td>{a.id}</td>
                        <td>{a.name}</td>
                        <td>{a.location}</td>
                        <td>{a.quantity}</td>
                        <td>{a.status}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.selectAssetBtn}
                            onClick={() => {
                              setSelectedAsset(a);
                              setValue('selectedAssetId', a.id);
                            }}
                          >
                            {selectedAsset && selectedAsset.id === a.id ? 'Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedAsset && (
                  <div className={styles.selectedAssetSummary}>Selected: {selectedAsset.name} ({selectedAsset.id})</div>
                )}
              </div>
            )}
          </>
        )}

        <div className={styles.field}>
          <label>Comment (Optional)</label>
          <textarea {...register("comment")} rows={3} className={styles.textarea} placeholder="Add a note..." />
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onClose} disabled={isSubmitting} className={styles.cancel}>Cancel</button>
          <button type="submit" disabled={isSubmitting} className={styles.submit}>
            {isSubmitting ? "Approving..." : "Open Ticket"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export default CoordinatorAdminOpenTicketModal;
