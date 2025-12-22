import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/Modal.css";

const AddEntryModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  title, 
  fields, 
  type 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isValid }, 
    reset,
    setValue
  } = useForm({
    mode: "all"
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await onSave(data);
      reset();
      onClose();
    } catch (error) {
      console.error(`Error creating ${type}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
  if (isOpen) {
    // initialize fields with defaultValue if provided
    fields.forEach(field => {
      if (field.defaultValue) {
        setValue(field.name, field.defaultValue);
      }
    });
  }
}, [isOpen, fields, setValue]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{title}</h2>
          <button 
            type="button" 
            className="modal-close-btn"
            onClick={handleClose}
          >
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
          <div className="modal-body">
            {fields.map((field) => (
              field.type === 'hidden' ? (
                <input
                  key={field.name}
                  type="hidden"
                  {...register(field.name)}
                  defaultValue={field.defaultValue}
                />
              ) : (
              <fieldset key={field.name}>
                <label htmlFor={field.name}>
                  {field.label} {field.required && <span style={{color: 'red'}}>*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    id={field.name}
                    {...register(field.name, field.validation)}
                    className={errors[field.name] ? 'input-error' : ''}
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    {...register(field.name, field.validation)}
                    className={errors[field.name] ? 'input-error' : ''}
                  />
                ) : field.prefix || field.suffix ? (
                  <div className="input-with-affix">
                    {field.prefix && <span className="input-prefix">{field.prefix}</span>}
                    <input
                      type={field.type || 'text'}
                      id={field.name}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      step={field.step}
                      {...register(field.name, field.validation)}
                      className={errors[field.name] ? 'input-error' : ''}
                    />
                    {field.suffix && <span className="input-suffix">{field.suffix}</span>}
                  </div>
                ) : (
                  <input
                    type={field.type || 'text'}
                    id={field.name}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    step={field.step}
                    {...register(field.name, field.validation)}
                    className={errors[field.name] ? 'input-error' : ''}
                  />
                )}

                {errors[field.name] && (
                  <span className="error-message">
                    {errors[field.name].message}
                  </span>
                )}
              </fieldset>
              )
            ))}


          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="modal-cancel-btn"
              onClick={handleClose}
              disabled={isLoading}
            >
              Close
            </button>
            <button 
              type="submit" 
              className="modal-save-btn"
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal;
