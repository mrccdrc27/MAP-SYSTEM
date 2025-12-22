import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import kbService from '../../../services/kbService';
import styles from './CoordinatorKnowledgebase.module.css';
import ViewCard from '../../../shared/components/ViewCard';
import InputField from '../../../shared/components/InputField';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';

const CoordinatorKnowledgebase = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleAnswer = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const list = await kbService.listArticles();
        if (!mounted) return;
        setArticles(Array.isArray(list) ? list : (list.results || []));
      } catch (e) {
        if (!mounted) return;
        setArticles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Only show articles visible to Ticket Coordinators and not archived
  const visibleArticles = (articles || []).filter((article) => {
    const vis = (article.visibility || '').toLowerCase();
    const archived = !!article.is_archived || !!article.archived;
    return vis === 'ticket coordinator' && !archived;
  });

  const filteredArticles = visibleArticles.filter((article) => {
    const query = searchTerm.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      (article.content || '').toLowerCase().includes(query) ||
      (article.summary || '').toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Breadcrumb
        root="Admin"
        rootNavigatePage="/admin/coordinator-admin"
        currentPage="Knowledge Base"
        title="Knowledge Base"
      />
      <ViewCard>
        <div className={styles.kbContainer}>
          <div className={styles.searchWrapper}>
            <InputField
              placeholder="Search Knowledge Base..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setExpandedIndex(null);
              }}
              inputStyle={{ width: '100%' }}
              aria-label="Search Knowledge Base"
            />
          </div>

          <ul className={styles.kbList}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className={styles.kbItem}>
                  <Skeleton width="60%" height="18px" />
                  <Skeleton width="100%" height="12px" style={{ marginTop: '8px' }} />
                </li>
              ))
            ) : filteredArticles.length > 0 ? (
              filteredArticles.map((article, index) => (
                <li key={article.id || index} className={styles.kbItem}>
                  <div
                    className={styles.kbQuestion}
                    onClick={() => toggleAnswer(index)}
                  >
                    <span>{article.title}</span>
                    {expandedIndex === index ? (
                      <FiChevronDown className={styles.kbArrow} />
                    ) : (
                      <FiChevronRight className={styles.kbArrow} />
                    )}
                  </div>
                  {expandedIndex === index && (
                    <div className={styles.kbAnswer}>
                      <p dangerouslySetInnerHTML={{ __html: article.content || article.summary || '' }} />
                    </div>
                  )}
                </li>
              ))
            ) : (
              <div className={styles.noResults}>
                No results found for "{searchTerm}"
              </div>
            )}
          </ul>
        </div>
      </ViewCard>
    </>
  );
};

export default CoordinatorKnowledgebase;
