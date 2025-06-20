// styles
import styles from "./admin-archive.module.css";

// components
import AdminNav from "../../../components/navigation/AdminNav";

// table
import ArchiveTable from "../../../tables/admin/ArchiveTable";

export default function AdminArchive() {
  return (
    <>
      <AdminNav />
      <main className={styles.archivePage}>
        {/* <section className={styles.apHeader}>
          <h1>Archive</h1>
        </section> */}
        <section className={styles.apBody}>
          <div className={styles.apTable}>
            <ArchiveTable />
          </div>
        </section>
      </main>
    </>
  );
}
