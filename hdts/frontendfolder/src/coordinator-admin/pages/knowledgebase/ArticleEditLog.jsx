import React, { useEffect, useState, useRef } from 'react';
import kbService from '../../../services/kbService';
import styles from './knowledge.module.css';

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  } catch (e) {
    return iso;
  }
};

const ArticleEditLog = ({ articleId }) => {
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({}); // track which entries are expanded
  const descRefs = useRef({}); // refs to description DOM nodes
  const [needsToggleMap, setNeedsToggleMap] = useState({});

  useEffect(() => {
    let mounted = true;
    if (!articleId) return;

    setLoading(true);
    // Try to read client-side stored history first
    try {
      const hist = kbService.getHistory(articleId) || [];
      if (hist && hist.length > 0) {
        // ensure entries are sorted newest first
        hist.sort((a,b) => new Date(b.when) - new Date(a.when));
        if (mounted) {
          setEntries(hist);
          setLoading(false);
        }
        // still fetch article in background to keep metadata current
        kbService.getArticle(articleId).then(a => { if (mounted) setArticle(a); }).catch(()=>{});
        return;
      }
    } catch (e) {
      // ignore and fallback to fetching article
    }

    kbService.getArticle(articleId)
      .then(a => {
        if (!mounted) return;
        setArticle(a);
        // build fallback entries using article metadata
        const latestTimestamp = a.date_modified || a.date_created;
        const fallback = [
          { subject: a.title || '(no subject)', description: a.content || '(no description)', when: latestTimestamp }
        ];
        if (a.date_created && a.date_created !== latestTimestamp) {
          fallback.push({ subject: a.title || '(no subject)', description: a.content || '(no description)', when: a.date_created });
        }
        fallback.sort((x,y) => new Date(y.when) - new Date(x.when));
        setEntries(fallback);
      })
      .catch(err => {
        console.error('Failed to load article metadata for edit log', err);
        if (mounted) setError('Failed to load edit logs');
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [articleId]);

  // After render, detect which description elements are actually overflowing
  useEffect(() => {
    if (!entries) return;
    let raf = null;
    const check = () => {
      const map = {};
      (entries || []).forEach((e, idx) => {
        const key = e.id != null ? String(e.id) : String(idx);
        const el = descRefs.current[key];
        const desc = e.description || '';
        if (el) {
          // content clipped if scrollHeight > clientHeight
          map[key] = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
        } else {
          // fallback heuristic
          map[key] = desc.length > 240 || desc.split('\n').length > 3;
        }
      });
      setNeedsToggleMap(map);
    };
    raf = requestAnimationFrame(check);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [entries]);

  const toggleExpanded = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <div className={styles.editLog}><p>Loading edit log…</p></div>;
  if (error) return <div className={styles.editLog}><p>{error}</p></div>;
  if (!entries || entries.length === 0) return <div className={styles.editLog}><p>No edit logs available.</p></div>;

  // Ensure entries are always rendered newest-first (defensive: handle different timestamp keys)
  const sortedEntries = (entries || []).slice().sort((a, b) => {
    const getTs = (x) => new Date(x.when || x.date_modified || x.date_created || x.created_at || 0).getTime();
    return getTs(b) - getTs(a);
  });

  return (
    <div className={styles.editLog}>
      <h3>Edit Logs</h3>

      <div className={styles.logListAlt}>
        {sortedEntries.map((e, idx) => {
          const key = e.id != null ? String(e.id) : String(idx);
          const desc = e.description || '';
          const isExpanded = !!expanded[key];
          const needsToggle = (needsToggleMap[key] !== undefined) ? needsToggleMap[key] : (desc.length > 240 || desc.split('\n').length > 3);
          return (
            <div key={e.id || idx} className={styles.logAltEntry}>
              <div className={styles.entrySubject}><strong>Subject:</strong> {e.subject}</div>
              <div
                ref={(el) => { descRefs.current[key] = el; }}
                className={`${styles.entryDescription} ${!isExpanded ? styles.clamped : ''}`}
              >
                <strong>Description:</strong> {desc}
              </div>
              {needsToggle ? (
                <button type="button" className={styles.readMoreBtn} onClick={() => toggleExpanded(key)}>
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              ) : null}
              <div className={styles.entryWhen}>Updated: {formatDate(e.when || e.date_modified || e.date_created || e.created_at)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArticleEditLog;
