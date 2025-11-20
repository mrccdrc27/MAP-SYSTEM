import { useState } from "react";
import styles from "./todo-tickets.module.css";
import {
  parseISO,
  isToday,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isWithinInterval,
  format,
  isBefore,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

function bucketLabel(key) {
  if (key === "today") return "Due Today";
  if (key === "thisWeek") return "Due This Week";
  if (key === "nextWeek") return "Due Next Week";
  if (key === "later") return "Later";
  if (key === "overdue") return "Overdue";
  return key;
}

export default function ToDoTickets({ tickets = [] }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overdue");
  const [expandedTabs, setExpandedTabs] = useState({}); // track expanded tabs

  // Prepare buckets
  const buckets = {
    overdue: [],
    today: [],
    thisWeek: [],
    nextWeek: [],
    later: [],
  };
  const now = new Date();
  const weekStartsOn = 1; // Monday
  const thisWeekStart = startOfWeek(now, { weekStartsOn });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn });
  const nextWeekStart = addWeeks(thisWeekStart, 1);
  const nextWeekEnd = addWeeks(thisWeekEnd, 1);

  tickets.forEach((t) => {
    if (!t.target_resolution) return;
    const due =
      typeof t.target_resolution === "string"
        ? parseISO(t.target_resolution)
        : new Date(t.target_resolution);

    if (isBefore(due, now)) buckets.overdue.push(t);
    else if (isToday(due)) buckets.today.push(t);
    else if (isWithinInterval(due, { start: thisWeekStart, end: thisWeekEnd }))
      buckets.thisWeek.push(t);
    else if (isWithinInterval(due, { start: nextWeekStart, end: nextWeekEnd }))
      buckets.nextWeek.push(t);
    else buckets.later.push(t);
  });

  const order = ["overdue", "today", "thisWeek", "nextWeek", "later"];
  const formatDue = (d) => (d ? format(new Date(d), "yyyy-MM-dd HH:mm") : "");

  const handleToggleExpand = (tabKey) => {
    setExpandedTabs((prev) => ({ ...prev, [tabKey]: !prev[tabKey] }));
  };

  return (
    <div className={styles.todoContainer}>
      {/* Tabs */}
      <div className={styles.tabs}>
        {order.map((key) => (
          <button
            key={key}
            className={`${styles.tabButton} ${
              activeTab === key ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab(key)}
          >
            {bucketLabel(key)} ({buckets[key].length})
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className={styles.tabContent}>
        {buckets[activeTab].length === 0 ? (
          <div className={styles.bucketEmpty}>No tasks</div>
        ) : (
          <>
            {(expandedTabs[activeTab]
              ? buckets[activeTab]
              : buckets[activeTab].slice(0, 3)
            ).map((t) => {
              const priorityRaw = (t.ticket_priority || t.priority || "")
                .toString()
                .toLowerCase();
              const allowed = ["critical", "high", "medium", "low"];
              const prio = allowed.includes(priorityRaw) ? priorityRaw : "low";

              return (
                <div
                  key={t.ticket_id || t.ticket_no || t.ticket_number}
                  className={styles.taskRow}
                  style={{ borderLeft: `4px solid var(--${prio}-color)` }}
                  onClick={() => navigate(`/ticket/${t.task_item_id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(
                        `/ticket/${
                          t.ticket_id || t.ticket_no || t.task_item_id || ""
                        }`
                      );
                    }
                  }}
                >
                  <div className={styles.taskLeft}>
                    <div />
                    <div className={styles.taskMeta}>
                      <div className={styles.taskTitle}>
                        {t.ticket_number || t.ticket_no || t.ticket_id} —{" "}
                        {t.ticket_subject || t.subject || t.title}
                      </div>
                      <div className={styles.taskSub}>
                        {t.workflow_name || t.current_step_name || ""}
                      </div>
                    </div>
                  </div>
                  <div className={styles.taskRight}>
                    <Clock size={14} />
                    <div className={styles.dueText}>
                      {formatDue(t.target_resolution)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* View More / View Less Button */}
            {buckets[activeTab].length > 3 && (
              <button
                className={styles.viewAllBtn}
                onClick={() => handleToggleExpand(activeTab)}
                aria-expanded={!!expandedTabs[activeTab]}
              >
                {expandedTabs[activeTab] ? "View less" : "View more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
