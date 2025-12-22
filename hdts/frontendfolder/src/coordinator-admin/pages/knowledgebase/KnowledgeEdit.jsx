import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import FormCard from '../../../shared/components/FormCard';
import FormActions from '../../../shared/components/FormActions';
// Editor fields will be inlined below (previously ArticleEditor)
import InputField from '../../../shared/components/InputField';
import SelectField from '../../../shared/components/SelectField';
import { FiX } from 'react-icons/fi';
import createEditStyles from './KnowledgeCreateEdit.module.css';
import kbService from '../../../services/kbService';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';


const KnowledgeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [editorData, setEditorData] = useState({ title: '', content: '', category_id: null, visibility: 'employee', status: 'active', tags: [] });
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [cats, article] = await Promise.all([kbService.listCategories(), kbService.getArticle(id)]);
        if (!mounted) return;
        setCategories(cats || []);

        const normalizeTags = (raw) => {
          if (!raw) return [];
          let list = [];
          if (Array.isArray(raw)) list = raw.slice();
          else if (typeof raw === 'string') {
            if (raw.includes(',')) list = raw.split(',');
            else list = raw.split('\n').join(' ').split(' ').filter(Boolean);
          } else {
            try { list = Array.from(raw); } catch (e) { list = []; }
          }
          const titleCase = (s) => String(s).trim().split(' ').map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : '').join(' ');
          return list.map(t => t ? titleCase(t) : '').filter(Boolean);
        };

        const visibilityKey = (v) => {
          if (!v) return 'employee';
          const s = String(v).toLowerCase();
          if (s.includes('ticket')) return 'ticket_coordinator';
          if (s.includes('system') || s.includes('admin')) return 'system_admin';
          return 'employee';
        };

        if (article) {
          setEditorData({
            title: article.title || '',
            content: article.content || '',
            category_id: article.category_id || null,
            visibility: visibilityKey(article.visibility || article.access || article.visibility),
            status: article.archived ? 'archived' : (article.status || 'active'),
            tags: normalizeTags(article.tags)
          });
          setLoading(false);
        } else {
          console.warn(`No article data returned for id=${id}; keeping skeleton visible.`);
        }
      } catch (err) {
        console.error('Failed to load edit data:', err);
        setLoading(false);
      }
    };

    load();

    return () => { mounted = false; };
  }, [id]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const updated = await kbService.updateArticle(id, {
        title: data.title,
        content: data.content,
        category_id: data.category_id || null,
        visibility: data.visibility || 'employee',
        archived: data.status === 'archived',
        tags: data.tags || []
      });
      window.dispatchEvent(new CustomEvent('kb:articleUpdated', { detail: updated }));
      navigate('/admin/knowledge/articles');
    } catch (err) {
      console.error('Failed to save article:', err);
      alert('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={createEditStyles.container}>
        <Breadcrumb root="Knowledge Base" currentPage="Edit Article" rootNavigatePage="/admin/knowledge/articles" title="Edit Knowledge Article" />
        <section>
          <FormCard>
            <form>
              <div className={createEditStyles.formFieldLg}>
                <label className={createEditStyles.formLabel}>Title</label>
                <Skeleton width="60%" height={34} />
              </div>

              <div className={createEditStyles.formFieldLg}>
                <label className={createEditStyles.formLabel}>Category</label>
                <Skeleton width="40%" height={34} />
              </div>

              <div className={createEditStyles.formFieldLg}>
                <label className={createEditStyles.formLabel}>Visibility</label>
                <Skeleton width="30%" height={34} />
              </div>

              <div className={createEditStyles.formFieldLg}>
                <label className={createEditStyles.formLabel}>Tags</label>
                <Skeleton width="100%" height={36} />
                <div style={{ marginTop: 8 }}>
                  <Skeleton width="100%" height={34} />
                </div>
              </div>

              <div className={createEditStyles.formFieldLg}>
                <label className={createEditStyles.formLabel}>Article Content</label>
                <Skeleton width="100%" height={200} />
              </div>

              <div className={createEditStyles.formFieldLg}>
                <label className={createEditStyles.formLabel}>Status</label>
                <Skeleton width="20%" height={34} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <Skeleton width={120} height={36} />
                <Skeleton width={140} height={36} />
              </div>
            </form>
          </FormCard>
        </section>
      </div>
    );
  }

  return (
    <div className={createEditStyles.container}>
      <Breadcrumb root="Knowledge Base" currentPage="Edit Article" rootNavigatePage="/admin/knowledge/articles" title="Edit Knowledge Article" />
      <section>
        <FormCard>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(editorData); }}>
            <EditorFields
              data={editorData}
              setData={setEditorData}
              categories={categories}
              disabled={saving}
              externalErrors={validationErrors}
              showStatus={true}
            />

            <FormActions
              onCancel={() => navigate('/admin/knowledge/articles')}
              cancelLabel="Cancel"
              submitLabel={saving ? 'Saving…' : 'Save Changes'}
              submitDisabled={saving}
              submitVariant="primary"
              // Form submit is handled by the parent form's onSubmit
            />
          </form>
        </FormCard>
      </section>
    </div>
  );
};

export default KnowledgeEdit;

// Local editor fields (same structure as used in KnowledgeCreate)
function EditorFields({ data, setData, categories = [], disabled = false, externalErrors = {}, showStatus = false }) {
  const [tagInput, setTagInput] = useState('');

  const titleCase = (s) => {
    if (!s) return s;
    return String(s)
      .split(' ')
      .map(word => word ? (word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) : '')
      .join(' ');
  };

  const setField = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const addTag = (t) => {
    const raw = (t || tagInput || '').trim();
    if (!raw) return;
    const tag = titleCase(raw);
    const exists = (data.tags || []).some(x => String(x).toLowerCase() === tag.toLowerCase());
    if (exists) {
      setTagInput('');
      return;
    }
    setData(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
    setTagInput('');
  };

  const removeTag = (idx) => setData(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== idx) }));

  const onTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && (tagInput || '') === '') {
      const tags = data.tags || [];
      if (tags.length > 0) removeTag(tags.length - 1);
    }
  };

  return (
    <>
      <InputField
        label="Title"
        placeholder="Enter article title"
        value={data.title}
        onChange={(e) => setField('title', e.target.value)}
        error={externalErrors.title}
        disabled={disabled}
      />

      <div className={createEditStyles.formFieldLg}>
        <SelectField
          label="Category"
          value={data.category_id ?? ''}
          onChange={(e) => setField('category_id', e.target.value ? (isNaN(e.target.value) ? e.target.value : Number(e.target.value)) : null)}
          disabled={disabled}
          error={externalErrors.category}
          options={categories.map(c => ({ value: c.id, label: c.title || c.name || c.id }))}
          placeholder="-- Select category --"
        />
      </div>

      <div className={createEditStyles.formFieldLg}>
        <SelectField
          label="Visibility"
          value={data.visibility}
          onChange={(e) => setField('visibility', e.target.value)}
          disabled={disabled}
          error={externalErrors.visibility}
          options={[
            { value: 'employee', label: 'Employee' },
            { value: 'ticket_coordinator', label: 'Ticket Coordinator' },
            { value: 'system_admin', label: 'System Admin' }
          ]}
          placeholder="Select visibility"
        />
      </div>

      

      <div className={createEditStyles.formFieldLg}>
        <label className={createEditStyles.formLabel}>Tags</label>
        <div className={createEditStyles.tagList}>
          {(data.tags || []).map((t, i) => (
            <div key={i} className={createEditStyles.tagPill}>
              <span>{t}</span>
              <button
                type="button"
                onClick={() => removeTag(i)}
                disabled={disabled}
                className={createEditStyles.tagRemove}
                aria-label={`Remove tag ${t}`}
              >
                    <FiX size={22} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <InputField
          placeholder="Type tag then press Enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={onTagKeyDown}
          disabled={disabled}
          inputClassName={createEditStyles.fullWidthInput}
        />
        {externalErrors.tags && <div className={createEditStyles.errorText}>{externalErrors.tags}</div>}
      </div>

      <div className={createEditStyles.formFieldLg}>
        <label className={createEditStyles.formLabel}>Article Content</label>
        <textarea value={data.content} onChange={(e) => setField('content', e.target.value)} disabled={disabled} rows={12} className={createEditStyles.textarea} />
        {externalErrors.content && <div className={createEditStyles.errorText}>{externalErrors.content}</div>}
      </div>

      {showStatus && (
            <div className={createEditStyles.formFieldLg}>
          <SelectField
            label="Status"
            value={data.status}
            onChange={(e) => setField('status', e.target.value)}
            disabled={disabled}
            options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]}
          />
            </div>
      )}
    </>
  );
}
