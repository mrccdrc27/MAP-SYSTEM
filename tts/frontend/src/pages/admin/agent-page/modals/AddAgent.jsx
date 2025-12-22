// style
import styles from "./add-agent.module.css";

// react
import { useEffect, useState } from "react";

// api
import getRoles from "../../../../api/getRoles";
import { useInviteManager } from "../../../../api/useInviteManager";

export default function AddAgent({ closeAddAgent }) {
  const [email, setEmail] = useState("");
  const [inputRole, setInputRole] = useState("");
  const [roleOptions, setRoleOptions] = useState([]);

  // roles from custom hook
  const { role } = getRoles();

  // invite API logic
  const { inviteUser, loading, error, success } = useInviteManager();

  // populate dropdown
  useEffect(() => {
    if (Array.isArray(role)) {
      setRoleOptions(role);
    }
  }, [role]);

  // submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !inputRole) {
      alert("Please fill in all fields.");
      return;
    }

    const confirmed = window.confirm(`Send invite to ${email} as ${inputRole}?`);
    if (!confirmed) return;

    const res = await inviteUser({ email, role: inputRole });
    if (res) {
      alert(`✅ Invite sent to ${email} as ${inputRole}`);
      setEmail("");
      setInputRole("");
      closeAddAgent();
    }
  };

  return (
    <div className={styles.aaOverlayWrapper} onClick={closeAddAgent}>
      <div
        className={styles.addAgentModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.aaExit} onClick={closeAddAgent}>
          <i className="fa-solid fa-xmark"></i>
        </div>

        <div className={styles.aaHeader}>
          <h2>Invite an Agent</h2>
        </div>

        <div className={styles.aaBody}>
          <form onSubmit={handleSubmit} className={styles.aaWrapper}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter agent's email"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="role">Role</label>
              <select
                className={styles.roleDropdown}
                id="role"
                value={inputRole}
                onChange={(e) => setInputRole(e.target.value)}
                required
              >
                <option value="">Select a role</option>
                {roleOptions.map((r) => (
                  <option key={r.role_id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </button>

            {error && <p className={styles.error}>❌ {error}</p>}
            {success && <p className={styles.success}>✅ Invite sent!</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
