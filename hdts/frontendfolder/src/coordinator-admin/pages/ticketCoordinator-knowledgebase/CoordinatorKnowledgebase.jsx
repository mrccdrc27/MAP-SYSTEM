import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { FaThumbsUp, FaThumbsDown, FaHeart, FaComment } from 'react-icons/fa';
import kbService from '../../../services/kbService';
import styles from './CoordinatorKnowledgebase.module.css';
import InputField from '../../../shared/components/InputField';
import Button from '../../../shared/components/Button';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';

const CoordinatorKnowledgebase = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selectedTag, setSelectedTag] = useState('All');
  const [reactions, setReactions] = useState({});
  const [feedbackText, setFeedbackText] = useState({});

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

  // Extract unique tags from all visible articles
  const allTags = Array.from(
    new Set(
      visibleArticles.flatMap((article) => {
        if (Array.isArray(article.tags)) return article.tags;
        if (typeof article.tags === 'string') {
          return article.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
        return [];
      })
    )
  ).sort();

  const tags = ['All', ...allTags];

  // Render content that may contain markdown-like patterns
  // Supported: **bold:** labels, lines starting with '-' as lists, numbered lists, inline **bold** text, checkboxes
  const renderMarkdown = (content) => {
    if (!content && content !== 0) return null;
    if (typeof content !== 'string') return content;

    const lines = content.split(/\r?\n/);
    const elements = [];
    let currentList = null;
    let currentListType = null; // 'ul' or 'ol'

    const pushListIfAny = () => {
      if (currentList) {
        if (currentListType === 'ol') {
          elements.push(
            <ol key={`ol-${elements.length}`} className={styles.markdownList}>
              {currentList.map((li, i) => <li key={`li-${i}`}>{li}</li>)}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`ul-${elements.length}`} className={styles.markdownList}>
              {currentList.map((li, i) => <li key={`li-${i}`}>{li}</li>)}
            </ul>
          );
        }
        currentList = null;
        currentListType = null;
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

      // Checkbox pattern: □ item or - [ ] item
      if (/^[□☐]\s+/.test(line) || /^-\s*\[\s*\]\s+/.test(line)) {
        const item = line.replace(/^[□☐]\s+/, '').replace(/^-\s*\[\s*\]\s+/, '');
        if (!currentList || currentListType !== 'ul') {
          pushListIfAny();
          currentList = [];
          currentListType = 'ul';
        }
        currentList.push(<><span className={styles.checkbox}>☐</span> {inlineParts(item)}</>);
        return;
      }

      // Numbered list item: 1. item or 1) item
      if (/^\d+[\.\)]\s+/.test(line)) {
        const item = line.replace(/^\d+[\.\)]\s+/, '');
        if (!currentList || currentListType !== 'ol') {
          pushListIfAny();
          currentList = [];
          currentListType = 'ol';
        }
        currentList.push(inlineParts(item));
        return;
      }

      // Unordered list item: - item or * item
      if (/^[\-\*]\s+/.test(line)) {
        const item = line.replace(/^[\-\*]\s+/, '');
        if (!currentList || currentListType !== 'ul') {
          pushListIfAny();
          currentList = [];
          currentListType = 'ul';
        }
        currentList.push(inlineParts(item));
        return;
      }

      pushListIfAny();

      // Bold label pattern: **Label:** rest (heading-like)
      const labelMatch = line.match(/^\*\*(.+?)\*\*:\s*$/);
      if (labelMatch) {
        elements.push(
          <h4 key={`h4-${elements.length}`} className={styles.markdownHeading}>
            {labelMatch[1]}:
          </h4>
        );
        return;
      }

      // Bold label with content: **Label:** rest
      const labelContentMatch = line.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
      if (labelContentMatch) {
        elements.push(
          <p key={`p-${elements.length}`} className={styles.markdownPara}>
            <strong>{labelContentMatch[1]}:</strong> {inlineParts(labelContentMatch[2])}
          </p>
        );
        return;
      }

      // Standalone bold heading: **Title**
      const boldHeadingMatch = line.match(/^\*\*(.+?)\*\*$/);
      if (boldHeadingMatch) {
        elements.push(
          <h4 key={`h4-${elements.length}`} className={styles.markdownHeading}>
            {boldHeadingMatch[1]}
          </h4>
        );
        return;
      }

      // Plain paragraph
      elements.push(<p key={`p-${elements.length}`} className={styles.markdownPara}>{inlineParts(line)}</p>);
    });

    pushListIfAny();
    return <div className={styles.markdownContent}>{elements}</div>;
  };

  const filteredArticles = visibleArticles.filter((article) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      article.title.toLowerCase().includes(query) ||
      (article.content || '').toLowerCase().includes(query) ||
      (article.summary || '').toLowerCase().includes(query);
    
    // Match by tag
    let matchesTag = selectedTag === 'All';
    if (!matchesTag) {
      const articleTags = Array.isArray(article.tags) 
        ? article.tags 
        : (typeof article.tags === 'string' ? article.tags.split(',').map(t => t.trim()) : []);
      matchesTag = articleTags.some(t => t.toLowerCase() === selectedTag.toLowerCase());
    }
    
    return matchesSearch && matchesTag;
  });

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
      <Breadcrumb
        root="Admin"
        rootNavigatePage="/admin/dashboard"
        currentPage="Knowledge Base"
      />
      <div className={styles.kbContainer}>
        <div className={styles.kbHeader}>
          <h1>Knowledge Base</h1>
          <p>Find answers and resources to help you manage tickets and coordinate support effectively.</p>
        </div>
        <div className={styles.searchWrapper}>
          <InputField
            placeholder="Search Knowledge Base..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setExpandedIndex(null);
            }}
            aria-label="Search Knowledge Base"
          />
        </div>
        <div className={styles.categoryChips}>
          {tags.map((tag) => (
            <button
              key={tag}
              className={`${styles.chip} ${selectedTag === tag ? styles.activeChip : ''}`}
              onClick={() => { setSelectedTag(tag); setExpandedIndex(null); }}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className={styles.cardGrid}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <Skeleton width="60%" height="18px" />
                <Skeleton width="100%" height="12px" style={{ marginTop: '8px' }} />
              </div>
            ))
          ) : filteredArticles.length > 0 ? (
            filteredArticles.map((article, index) => {
              const idKey = article.id || `idx-${index}`;
              const reaction = reactions[idKey] || { likes: 0, dislikes: 0, vote: null };
              return (
                <div key={idKey} className={`${styles.card} ${expandedIndex === index ? styles.expanded : ''}`} data-article-id={article.id}>
                  <div className={styles.cardHeader} onClick={() => toggleAnswer(index)}>
                    <span className={styles.cardTitle}>{article.title}</span>
                    {expandedIndex === index ? (
                      <FiChevronDown className={styles.kbArrow} />
                    ) : (
                      <FiChevronRight className={styles.kbArrow} />
                    )}
                  </div>

                  <div className={styles.articleMeta}>
                    <span className={styles.metaItem}>
                      Updated {new Date(article.date_modified || article.dateModified || new Date()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className={styles.metaSeparator}>•</span>
                    <span className={styles.metaItem}>
                      {reaction.likes || 0} {reaction.likes === 1 ? 'person' : 'people'} found this helpful
                    </span>
                  </div>

                  {expandedIndex === index && (
                    <>
                      <div className={styles.cardBody}>
                        {renderMarkdown(article.content || article.summary || '')}
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
                            )} Thank you for sharing! Your feedback has been recorded and will help us make our content better.
                          </div>
                        )}
                      </div>

                      {/* Related Articles by same tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className={styles.relatedArticles}>
                          <h3 className={styles.relatedTitle}>Related Articles</h3>
                          <div className={styles.relatedList}>
                            {filteredArticles
                              .filter((a) => {
                                if (a.id === article.id) return false;
                                const currentTags = Array.isArray(article.tags) ? article.tags : [];
                                const aTags = Array.isArray(a.tags) ? a.tags : [];
                                return currentTags.some(t => aTags.includes(t));
                              })
                              .slice(0, 2)
                              .map((relatedArticle) => (
                                <button
                                  key={relatedArticle.id}
                                  className={styles.relatedLink}
                                  onClick={() => {
                                    const relatedIndex = filteredArticles.findIndex((a) => a.id === relatedArticle.id);
                                    setExpandedIndex(relatedIndex);
                                    setTimeout(() => {
                                      document.querySelector(`[data-article-id="${relatedArticle.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 100);
                                  }}
                                >
                                  {relatedArticle.title}
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

export default CoordinatorKnowledgebase;
