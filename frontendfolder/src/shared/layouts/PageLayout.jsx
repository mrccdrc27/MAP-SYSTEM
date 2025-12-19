import './PageLayout.css';

const PageLayout = ({ Navbar, children }) => {
  return (
    <div className="layoutRoot">
      {Navbar && (
        <header className="navbarWrapper">
          <Navbar />
        </header>
      )}

      <div className="scrollContainer">
        <main className="mainContent">{children}</main>
      </div>
    </div>
  );
};

export default PageLayout;
