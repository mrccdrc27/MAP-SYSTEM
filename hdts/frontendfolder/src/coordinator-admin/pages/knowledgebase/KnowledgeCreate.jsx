import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import FormCard from '../../../shared/components/FormCard';
import FormActions from '../../../shared/components/FormActions';
// Editor inlined below (previously ArticleEditor)
import InputField from '../../../shared/components/InputField';
import SelectField from '../../../shared/components/SelectField';
import styles from './knowledge.module.css';
import createEditStyles from './KnowledgeCreateEdit.module.css';
import kbService from '../../../services/kbService';

const KnowledgeCreate = () => {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    kbService.listCategories().then(setCategories).catch(()=>{});
  }, []);

  // categories loader

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const newArticle = await kbService.submitArticle({
        title: data.title,
        content: data.content,
        category_id: data.category_id || null,
        visibility: data.visibility || 'employee',
        archived: data.status === 'archived',
        tags: data.tags || [],
        author: 'Current Admin',
        date_modified: new Date().toISOString().slice(0,10)
      });
      window.dispatchEvent(new CustomEvent('kb:articleCreated', { detail: newArticle }));

      navigate('/admin/knowledge/articles');
    } catch (err) {
      console.error('Failed to save article', err);
      alert('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const [editorData, setEditorData] = useState({ title: '', content: '', category_id: null, visibility: 'employee', status: 'active', tags: [] });
  const [validationErrors, setValidationErrors] = useState({});

  const onCancel = () => navigate('/admin/knowledge/articles');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // validate required fields in order: Title, Category, Visibility, Tags, Article Content
    const errs = {};
    if (!editorData.title || editorData.title.trim().length === 0) errs.title = 'Title is required';
    if (!editorData.category_id) errs.category = 'Category is required';
    if (!editorData.visibility) errs.visibility = 'Visibility is required';
    if (!editorData.tags || editorData.tags.length === 0) errs.tags = 'At least one tag is required';
    if (!editorData.content || editorData.content.trim().length < 20) errs.content = 'Article Content must be at least 20 characters';

    setValidationErrors(errs);
    if (Object.keys(errs).length > 0) {
      // focus first error field could be added here
      return;
    }

    // delegate to handleSave with validated editor data
    await handleSave(editorData);
  };

  return (
    <div className={styles.container}>
      <Breadcrumb root="Knowledge Base" currentPage={'Create Article'} rootNavigatePage="/admin/knowledge/articles" title={'Create Knowledge Article'} />

      <section>
        <FormCard>
          <form onSubmit={handleSubmit}>
            {/* Inlined editor fields (Subject, Category, Visibility, Status, Tags, Content) */}
            <EditorFields
              data={editorData}
              setData={setEditorData}
              categories={categories}
              disabled={saving}
              externalErrors={validationErrors}
              showStatus={false}
            />

            <FormActions
              onCancel={onCancel}
              cancelLabel="Cancel"
              submitLabel={saving ? 'Saving…' : 'Save Article'}
              submitDisabled={saving}
              submitVariant="primary"
            />
          </form>
        </FormCard>
      </section>
    </div>
  );
};

export default KnowledgeCreate;

// Local editor fields component (keeps tag input local but updates parent via setData)
function EditorFields({ data, setData, categories = [], disabled = false, externalErrors = {}, showStatus = false }) {
  const [tagInput, setTagInput] = useState('');

  const setField = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const addTag = (t) => {
    const raw = (t || tagInput || '').trim();
    if (!raw) return;
    const titleCase = (s) => String(s).split(' ').map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : '').join(' ');
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
        required
        error={externalErrors.title}
        inputClassName={createEditStyles.fullWidthInput}
        disabled={disabled}
      />

      <div className={createEditStyles.formField}>
        <SelectField
          label="Category"
          value={data.category_id ?? ''}
          onChange={(e) => setField('category_id', e.target.value ? (isNaN(e.target.value) ? e.target.value : Number(e.target.value)) : null)}
          disabled={disabled}
          required
          error={externalErrors.category}
          options={categories.map(c => ({ value: c.id, label: c.title || c.name || c.id }))}
          placeholder="-- Select category --"
        />
      </div>

      <div className={createEditStyles.formField}>
        <SelectField
          label="Visibility"
          value={data.visibility}
          onChange={(e) => setField('visibility', e.target.value)}
          disabled={disabled}
          required
          error={externalErrors.visibility}
          options={[
            { value: 'employee', label: 'Employee' },
            { value: 'ticket_coordinator', label: 'Ticket Coordinator' },
            { value: 'system_admin', label: 'System Admin' }
          ]}
          placeholder="Select visibility"
        />
      </div>

      <div className={createEditStyles.formField}>
        <label className={createEditStyles.formLabel}>Tags <span className={createEditStyles.required}>*</span></label>
        <div className={createEditStyles.tagList}>
          {(data.tags || []).map((t, i) => (
            <div key={i} className={createEditStyles.tagPill}>
              <span>{t}</span>
              <button type="button" onClick={() => removeTag(i)} disabled={disabled} className={createEditStyles.tagRemove}>×</button>
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

      <div className={createEditStyles.formField}>
        <label className={createEditStyles.formLabel}>Article Content <span className="required">*</span></label>
        <textarea required value={data.content} onChange={(e) => setField('content', e.target.value)} disabled={disabled} rows={12} className={createEditStyles.textarea} />
        {externalErrors.content && <div className={createEditStyles.errorText}>{externalErrors.content}</div>}
      </div>
    </>
  );
}
