import { useNavigate } from "react-router-dom";
import "../styles/TopSecFormPage.css";
import MediumButtons from "./buttons/MediumButtons";

export default function TopSecFormPage({
  root,
  currentPage,
  rootNavigatePage,
  title,
  buttonType,
  buttonNavigation,
  deleteModalOpen,
  borderBottom = true,
  image = null,
  rightComponent = null,
}) {
  const navigate = useNavigate();

  return (
    <>
      <section
        className={
          borderBottom
            ? `top-section-form-page`
            : `top-section-form-page no-border`
        }
      >
        <section className="breadcrumb-navigation">
          <ul>
            <li>
              <a onClick={() => navigate(rootNavigatePage)}>{root}</a>
            </li>
            <li>{currentPage}</li>
          </ul>
        </section>
        <section className="title">
          <h1>{title}</h1>
          <div className="title-right">
            {buttonType && (
              <MediumButtons
                type={buttonType}
                navigatePage={buttonNavigation}
                deleteModalOpen={deleteModalOpen}
              />
            )}
            {rightComponent}
          </div>
        </section>
      </section>
    </>
  );
}
