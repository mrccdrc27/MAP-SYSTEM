import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { FaThumbsUp, FaThumbsDown, FaHeart, FaComment } from 'react-icons/fa';
import styles from './EmployeeFAQs.module.css';
import InputField from '../../../shared/components/InputField';
import Button from '../../../shared/components/Button';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import { backendArticleService } from '../../../services/backend/articleService';
import kbService from '../../../services/kbService';

const EmployeeFAQs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [reactions, setReactions] = useState({});
  const [feedbackText, setFeedbackText] = useState({});
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const toggleAnswer = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        let all = [];
        try {
          all = await backendArticleService.getAllArticles();
        } catch (backendErr) {
          console.warn('backendArticleService failed, falling back to kbService.listArticles:', backendErr);
          try {
            all = await kbService.listArticles({});
          } catch (kbErr) {
            console.error('kbService fallback also failed:', kbErr);
            all = [];
          }
        }

        if (!isMounted) return;

        // Filter out archived articles and only show employee-visible ones
        const visible = (all || []).filter(a => {
          const isArchived = a.is_archived || a.archived || false;
          const visibility = (a.visibility || '').toLowerCase();
          return !isArchived && visibility === 'employee';
        });

        // Normalize shape to provide question, answer, tags fields
        const mapped = visible.map(a => ({
          id: a.id,
          question: a.subject ?? a.title ?? a.name ?? '',
          answer: a.description ?? a.content ?? a.body ?? '',
          tags: a.tags || [],
          category: a.category || 'General',
          updatedAt: a.updated_at || a.updatedAt || a.created_at || new Date().toISOString(),
        }));

        setArticles(mapped);
      } catch (err) {
        console.error('Error loading KB articles for FAQs:', err);
        setArticles([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, []);

  // Extract unique tags from all articles for category chips
  const categories = ['All', ...Array.from(new Set(articles.flatMap(a => a.tags || [])))];

  // Filter articles by search term and selected tag
  const visibleFaqs = articles.filter((faq) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      (faq.question || '').toLowerCase().includes(query) || 
      (typeof faq.answer === 'string' ? (faq.answer || '').toLowerCase() : '');
    const matchesCategory = 
      selectedCategory === 'All' || 
      (faq.tags || []).includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Render answers that may contain simple markdown-like patterns
  // Supported: **bold:** labels, lines starting with '-' as lists, inline **bold** text
  const renderAnswer = (ans) => {
    if (!ans && ans !== 0) return null;
    if (typeof ans !== 'string') return ans;

    const lines = ans.split(/\r?\n/);
    const elements = [];
    let currentList = null;

    const pushListIfAny = () => {
      if (currentList) {
        elements.push(
          <ul key={`ul-${elements.length}`}>
            {currentList.map((li, i) => <li key={`li-${i}`}>{li}</li>)}
          </ul>
        );
        currentList = null;
      }
    };

    const inlineParts = (text) => {
      const parts = [];
      let lastIndex = 0;
      const re = /\*\*(.+?)\*\*/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        const before = text.slice(lastIndex, m.index);
        if (before) parts.push(before);
        parts.push(<strong key={`b-${parts.length}`}>{m[1]}</strong>);
        lastIndex = m.index + m[0].length;
      }
      const rest = text.slice(lastIndex);
      if (rest) parts.push(rest);
      return parts;
    };

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (line === '') {
        pushListIfAny();
        return;
      }

      // list item
      if (/^[\-\*]\s+/.test(line)) {
        const item = line.replace(/^[\-\*]\s+/, '');
        if (!currentList) currentList = [];
        currentList.push(inlineParts(item));
        return;
      }

      pushListIfAny();

      // bold label pattern: **Label:** rest
      const labelMatch = line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
      if (labelMatch) {
        const label = labelMatch[1];
        const rest = labelMatch[2] || '';
        elements.push(
          <p key={`p-${elements.length}`}>
            <strong>{label}:</strong>{rest ? ' ' : ''}{...inlineParts(rest)}
          </p>
        );
        return;
      }

      // plain paragraph
      elements.push(<p key={`p-${elements.length}`}>{inlineParts(line)}</p>);
    });

    pushListIfAny();
    return <div>{elements}</div>;
  };

  const handleLike = (id) => {
    setReactions((prev) => {
      const cur = prev[id] || { likes: 0, dislikes: 0, vote: null };
      const next = { ...cur };
      if (cur.vote === 'like') {
        next.likes = Math.max(0, cur.likes - 1);
        next.vote = null;
      } else if (cur.vote === 'dislike') {
        next.dislikes = Math.max(0, cur.dislikes - 1);
        next.likes = cur.likes + 1;
        next.vote = 'like';
      } else {
        next.likes = cur.likes + 1;
        next.vote = 'like';
      }
      return { ...prev, [id]: next };
    });
  };

  const handleDislike = (id) => {
    setReactions((prev) => {
      const cur = prev[id] || { likes: 0, dislikes: 0, vote: null };
      const next = { ...cur };
      if (cur.vote === 'dislike') {
        next.dislikes = Math.max(0, cur.dislikes - 1);
        next.vote = null;
      } else if (cur.vote === 'like') {
        next.likes = Math.max(0, cur.likes - 1);
        next.dislikes = cur.dislikes + 1;
        next.vote = 'dislike';
      } else {
        next.dislikes = cur.dislikes + 1;
        next.vote = 'dislike';
      }
      return { ...prev, [id]: next };
    });
  };

  const handleSubmitFeedback = (id) => {
    // keep simple logging behavior as in KB
    console.log(`Feedback for ${id}: ${feedbackText[id] || ''}`);
    setReactions((prev) => ({
      ...prev,
      [id]: { ...prev[id], feedbackSubmitted: true },
    }));
  };

  const handleCancelFeedback = (id) => {
    setFeedbackText((prev) => ({ ...prev, [id]: '' }));
    setReactions((prev) => ({
      ...prev,
      [id]: { ...prev[id], vote: null },
    }));
  };

  return (
    <>
      <div className={styles.faqContainer}>
        <div className={styles.faqHeader}>
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to the most common questions about our services and processes.</p>
        </div>
        <div className={styles.searchWrapper}>
          <InputField
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setExpandedIndex(null);
            }}
            aria-label="Search FAQs"
          />
        </div>
        <div className={styles.categoryChips}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.chip} ${selectedCategory === cat ? styles.activeChip : ''}`}
              onClick={() => { setSelectedCategory(cat); setExpandedIndex(null); }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className={styles.cardGrid}>
          {loading ? (
            // Skeleton loading state
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <div className={styles.cardHeader}>
                  <Skeleton width="70%" height="18px" />
                  <Skeleton width="20px" height="20px" />
                </div>
                <div className={styles.articleMeta}>
                  <Skeleton width="150px" height="12px" />
                </div>
              </div>
            ))
          ) : visibleFaqs.length > 0 ? (
            visibleFaqs.map((faq, index) => {
              const idKey = faq.id || `idx-${index}`;
              const reaction = reactions[idKey] || { likes: 0, dislikes: 0, vote: null };
              return (
                <div key={idKey} className={`${styles.card} ${expandedIndex === index ? styles.expanded : ''}`} data-faq-id={faq.id}>
                  <div className={styles.cardHeader} onClick={() => toggleAnswer(index)}>
                    <span className={styles.cardTitle}>{faq.question}</span>
                    {expandedIndex === index ? (
                      <FiChevronDown className={styles.faqArrow} />
                    ) : (
                      <FiChevronRight className={styles.faqArrow} />
                    )}
                  </div>

                  <div className={styles.articleMeta}>
                    <span className={styles.metaItem}>
                      Updated {new Date(faq.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className={styles.metaSeparator}>•</span>
                    <span className={styles.metaItem}>
                      {reaction.likes || 0} {reaction.likes === 1 ? 'person' : 'people'} found this helpful
                    </span>
                  </div>

                  {expandedIndex === index && (
                    <>
                      <div className={styles.cardBody}>
                        {renderAnswer(faq.answer)}
                      </div>

                      <div className={styles.feedbackContainer}>
                        <div className={styles.reactionPrompt}>Was this article helpful?</div>
                        <div className={styles.reactionBtns}>
                          <button
                            type="button"
                            className={`${styles.reactionBtn} ${reaction.vote === 'like' ? styles.activeYes : ''}`}
                            onClick={() => handleLike(idKey)}
                            aria-pressed={reaction.vote === 'like'}
                          >
                            <FaThumbsUp className={styles.iconThumbsUp} />
                            <span className={styles.reactionLabel}>Yes</span>
                          </button>

                          <button
                            type="button"
                            className={`${styles.reactionBtn} ${reaction.vote === 'dislike' ? styles.activeNo : ''}`}
                            onClick={() => handleDislike(idKey)}
                            aria-pressed={reaction.vote === 'dislike'}
                          >
                            <FaThumbsDown className={styles.iconThumbsDown} />
                            <span className={styles.reactionLabel}>No</span>
                          </button>
                        </div>

                        {reaction.vote === 'like' && !reaction.feedbackSubmitted && (
                          <div className={styles.successMessage}>
                            <FaHeart className={styles.successIconGreen} /> Thank you for your feedback! We're glad this article was helpful.
                          </div>
                        )}

                        {reaction.vote === 'dislike' && !reaction.feedbackSubmitted && (
                          <div className={styles.feedbackSection}>
                            <div className={styles.feedbackPrompt}>What could we improve?</div>
                            <InputField
                              type="textarea"
                              placeholder="Tell us what was unclear or missing..."
                              value={feedbackText[idKey] || ''}
                              onChange={(e) => setFeedbackText((prev) => ({ ...prev, [idKey]: e.target.value }))}
                              inputStyle={{ minHeight: '80px', backgroundColor: '#ffffff' }}
                            />
                            <div className={styles.feedbackActions}>
                              <Button
                                variant="primary"
                                size="default"
                                onClick={() => handleSubmitFeedback(idKey)}
                              >
                                Submit Feedback
                              </Button>
                              <Button
                                variant="outline"
                                size="default"
                                onClick={() => handleCancelFeedback(idKey)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {reaction.feedbackSubmitted && (
                          <div className={reaction.vote === 'dislike' ? styles.successMessageBlue : styles.successMessage}>
                            {reaction.vote === 'dislike' ? (
                              <FaComment className={styles.successIconBlue} />
                            ) : (
                              <FaHeart className={styles.successIconGreen} />
                            )} Thank you for your sharing! Your feedback has been recorded and will help us to make our content better.
                          </div>
                        )}
                      </div>

                      {faq.tags && faq.tags.length > 0 && (
                        <div className={styles.relatedArticles}>
                          <h3 className={styles.relatedTitle}>Related Articles</h3>
                          <div className={styles.relatedList}>
                            {visibleFaqs
                              .filter((a) => a.id !== faq.id && a.tags?.some(t => faq.tags.includes(t)))
                              .slice(0, 2)
                              .map((relatedFaq) => (
                                <button
                                  key={relatedFaq.id}
                                  className={styles.relatedLink}
                                  onClick={() => {
                                    const relatedIndex = visibleFaqs.findIndex((a) => a.id === relatedFaq.id);
                                    setExpandedIndex(relatedIndex);
                                    setTimeout(() => {
                                      document.querySelector(`[data-faq-id="${relatedFaq.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 100);
                                  }}
                                >
                                  {relatedFaq.question}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className={styles.noResults}>
              No results found for "{searchTerm}"
            </div>
          )}
        </div>
        </div>
    </>
  );
};

export default EmployeeFAQs;
