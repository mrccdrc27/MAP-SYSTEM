import "../../styles/View.css";
import CloseIcon from "../../assets/icons/close.svg";
import DefaultImage from "../../assets/img/default-image.jpg";

export default function View({ 
  title, 
  data, 
  closeModal, 
  imageSrc = null,
  actionButtons = null 
}) {
  return (
    <main className="view-modal">
      <div className="overlay" onClick={closeModal}></div>
      <div className="content">
        <button onClick={closeModal} className="close-button">
          <img src={CloseIcon} alt="Close" />
        </button>

        <fieldset className="header-fieldset">
          {imageSrc && (
            <img 
              src={imageSrc} 
              alt="Item" 
              onError={(e) => { e.target.src = DefaultImage; }}
            />
          )}
          <h2>{title}</h2>
        </fieldset>

        <div className="details-container">
          <div className="left-content">
            {data.slice(0, Math.ceil(data.length / 2)).map((item, index) => (
              <div key={index} className="detail-item">
                <label>{item.label}</label>
                <p>{item.value || "-"}</p>
              </div>
            ))}
          </div>
          
          <div className="right-content">
            {data.slice(Math.ceil(data.length / 2)).map((item, index) => (
              <div key={index} className="detail-item">
                <label>{item.label}</label>
                <p>{item.value || "-"}</p>
              </div>
            ))}
          </div>
        </div>

        {actionButtons && (
          <div className="action-buttons">
            {actionButtons}
          </div>
        )}
      </div>
    </main>
  );
}

