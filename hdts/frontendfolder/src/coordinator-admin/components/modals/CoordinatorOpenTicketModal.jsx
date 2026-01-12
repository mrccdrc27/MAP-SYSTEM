import { useForm } from "react-hook-form";
import { useState, useEffect, useMemo } from "react";
import { ToastContainer, toast } from "react-toastify";
import ModalWrapper from "../../../shared/modals/ModalWrapper";
import priorityLevelOptions from "../../../utilities/options/priorityLevelOptions";
import departmentOptions from "../../../utilities/options/departmentOptions";
import { backendTicketService } from "../../../services/backend/ticketService";
import styles from "./CoordinatorOpenTicketModal.module.css";
import 'react-toastify/dist/ReactToastify.css';

// AMS registration endpoint (same as submission form)
const AMS_REGISTRATION_URL = 'https://ams-contexts.up.railway.app/categories/hd/registration/';

const CoordinatorAdminOpenTicketModal = ({ ticket, onClose, onSuccess }) => {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Watch department field to conditionally show asset panel
  const selectedDepartment = watch('department', '');

  // AMS registration data for asset details panel
  const [amsCategories, setAmsCategories] = useState([]);
  const [amsLoading, setAmsLoading] = useState(true);

  useEffect(() => {
    reset({
      priorityLevel: ticket.priorityLevel || ticket.priority || ticket.priority_level || "",
      department: ticket.department || ticket.assignedDepartment || ticket.employeeDepartment || "",
      comment: "",
    });
  }, [ticket, reset]);

  // Fetch AMS registration data on mount
  useEffect(() => {
    const fetchAms = async () => {
      try {
        const res = await fetch(AMS_REGISTRATION_URL);
        if (res.ok) {
          const data = await res.json();
          setAmsCategories(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Error fetching AMS registration:', e);
      } finally {
        setAmsLoading(false);
      }
    };
    fetchAms();
  }, []);

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

  // Derive ticket sub-category name for asset lookup
  const ticketSubCategory = ticket.sub_category || ticket.subCategory || ticket.subcategory || '';

  // Get all assets in the same sub-category from AMS registration data
  const categoryAssets = useMemo(() => {
    if (!ticketSubCategory || amsCategories.length === 0) return [];
    const cat = amsCategories.find(c => (c.name === ticketSubCategory || c.title === ticketSubCategory || String(c.id) === String(ticketSubCategory)));
    if (!cat) return [];
    const items = cat.assets || cat.items || cat.children || cat.assets_list || cat.asset_list || cat.assetNames || cat.assetsNames || [];
    return Array.isArray(items) ? items : [];
  }, [ticketSubCategory, amsCategories]);

  // Exclude the chosen asset (by asset_id or name) from the list shown below
  const filteredCategoryAssets = useMemo(() => {
    if (!categoryAssets || categoryAssets.length === 0) return [];
    const chosenIds = new Set([
      ticket.asset_id || ticket.assetId || ticket.assetId || '',
      String(ticket.id || ''),
    ].filter(Boolean));
    const chosenNames = new Set([
      (ticket.asset_name || ticket.assetName || '').toString(),
    ].filter(Boolean));

    return categoryAssets.filter(a => {
      const aid = a.asset_id || a.assetId || a.id || '';
      const name = (a.name || a.asset_name || a.title || '').toString();
      if (chosenIds.has(String(aid))) return false;
      if (chosenNames.has(name)) return false;
      return true;
    });
  }, [categoryAssets, ticket]);

  // Helper to normalize asset field names
  const getAssetField = (a, ...keys) => {
    for (const k of keys) if (a[k] !== undefined && a[k] !== null && a[k] !== '') return a[k];
    return '';
  };

  return (
    <ModalWrapper onClose={onClose} hideCloseButton={true}>
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

      {/* Two-column layout: form left, asset panel right (when Asset Department selected) */}
      <div className={styles.modalColumns}>
        {/* Left column: form */}
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

        {/* Right column: Asset Details Panel (only when Asset Department selected AND Asset Check In/Out) */}
        {(ticket.category === 'Asset Check In' || ticket.category === 'Asset Check Out') && selectedDepartment === 'Asset Department' && (
          <div className={styles.assetPanel}>
              {amsLoading ? (
                <p style={{ padding: 8 }}>Loading...</p>
              ) : (
                <>
                  <div className={styles.assetNameChosenLabel}>ASSET NAME CHOSEN</div>
                  <div className={styles.assetNameValue}>{ticket.asset_name || ticket.assetName || 'N/A'}</div>

                  {ticketSubCategory && filteredCategoryAssets.length > 0 && (
                    <>
                      <div className={styles.assetListHeader}>List of all {ticketSubCategory}</div>
                      <div className={styles.assetListScroll}>
                        <table className={styles.assetListTable}>
                          <tbody>
                            {filteredCategoryAssets.map((a, idx) => {
                            const name = getAssetField(a, 'name', 'asset_name', 'title', 'label');
                            const serial = getAssetField(a, 'serial_number', 'serialNumber', 'serial');
                            // Extract status type from status_details object
                            const statusDetails = a.status_details || {};
                            const statusType = statusDetails.type || getAssetField(a, 'status_type', 'statusType', 'type') || '';
                            return (
                              <tr key={a.id || a.asset_id || idx}>
                                <td style={{ fontWeight: 500 }}>{name}</td>
                                <td style={{ color: '#6b7280' }}>#{serial || 'N/A'}</td>
                                <td>
                                  <span className={`${styles.statusBadge} ${styles[`status_${statusType.toLowerCase().replace(/\s+/g,'_')}`]}`}>
                                    {statusType || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};

export default CoordinatorAdminOpenTicketModal;
