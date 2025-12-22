import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/custom-colors.css";
import "../styles/NavBar.css";
import Logo from "../assets/img/Logo.png";
import SampleProfile from "../assets/img/do.png";
import { IoIosArrowDown } from "react-icons/io";
import { FaBars, FaChevronLeft } from "react-icons/fa";
import NotificationOverlay from "./NotificationOverlay";
import SystemLogo from "../assets/icons/Map-LogoNew.svg";
import { useAuth } from "../context/AuthContext";
import DefaultProfile from "../assets/img/default-profile.svg";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: authLogout, user, isAdmin } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAssetsMenu, setShowAssetsMenu] = useState(false);
  const [showReportsMenu, setShowReportsMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(4);
  const [mobileOpen, setMobileOpen] = useState(false);

  // State for selected items in each dropdown
  const [selectedAsset, setSelectedAsset] = useState("Assets");
  const [selectedReport, setSelectedReport] = useState("Reports");
  const [selectedMore, setSelectedMore] = useState("More");

  // State to track which menu item is active
  const [activeMenu, setActiveMenu] = useState("");

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest(".dropdown-container") &&
        !event.target.closest(".nav-links") &&
        !event.target.closest(".mobile-menu-btn") &&
        !event.target.closest(".nav-brand") &&
        !event.target.closest(".profile-container") &&
        !event.target.closest(".notification-container") &&
        !event.target.closest(".notification-icon-container")
      ) {
        setShowAssetsMenu(false);
        setShowReportsMenu(false);
        setShowMoreMenu(false);
        setShowProfileMenu(false);
        setShowNotifications(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Close mobile sidebar when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Function to toggle a dropdown and close others
  const toggleDropdown = (dropdown) => {
    if (dropdown === "assets") {
      const newState = !showAssetsMenu;
      setShowAssetsMenu(newState);
      setShowReportsMenu(false);
      setShowMoreMenu(false);

      // Always set active menu when clicked, regardless of dropdown state
      setActiveMenu("assets");
    } else if (dropdown === "reports") {
      const newState = !showReportsMenu;
      setShowReportsMenu(newState);
      setShowAssetsMenu(false);
      setShowMoreMenu(false);

      // Always set active menu when clicked, regardless of dropdown state
      setActiveMenu("reports");
    } else if (dropdown === "more") {
      const newState = !showMoreMenu;
      setShowMoreMenu(newState);
      setShowAssetsMenu(false);
      setShowReportsMenu(false);

      // Always set active menu when clicked, regardless of dropdown state
      setActiveMenu("more");
    }
  };

  // Function to check if we're in the Assets section (kept for future reference)
  /* const isInAssetsSection = () => {
    return location.pathname.startsWith("/products") ||
           location.pathname.startsWith("/assets") ||
           location.pathname.startsWith("/accessories") ||
           location.pathname.startsWith("/consumables") ||
           location.pathname.startsWith("/components");
  }; */

  // Initialize selected items based on current location
  useEffect(() => {
    // Set active menu based on path
    if (location.pathname === "/dashboard") {
      setActiveMenu("dashboard");
    } else if (
      location.pathname.startsWith("/products") ||
      location.pathname.startsWith("/assets") ||
      location.pathname.startsWith("/accessories") ||
      location.pathname.startsWith("/consumables") ||
      location.pathname.startsWith("/components")
    ) {
      setActiveMenu("assets");
    } else if (location.pathname.startsWith("/repair")) {
      setActiveMenu("repairs");
    } else if (location.pathname.startsWith("/audits")) {
      setActiveMenu("audits");
    } else if (location.pathname.startsWith("/approved-tickets")) {
      setActiveMenu("tickets");
    } else if (location.pathname.startsWith("/reports")) {
      setActiveMenu("reports");
    } else {
      setActiveMenu("");
    }

    // Set selected asset based on path
    if (location.pathname.startsWith("/products")) {
      setSelectedAsset("Asset Models");
    } else if (location.pathname.startsWith("/assets")) {
      setSelectedAsset("Assets");
    } else if (location.pathname.startsWith("/accessories")) {
      setSelectedAsset("Accessories");
    } else if (location.pathname.startsWith("/consumables")) {
      setSelectedAsset("Consumable");
    } else if (location.pathname.startsWith("/components")) {
      setSelectedAsset("Components");
    }

    // Set selected report based on path
    if (location.pathname.startsWith("/reports/asset")) {
      setSelectedReport("Asset Reports");
    } else if (location.pathname.startsWith("/reports/depreciation")) {
      setSelectedReport("Depreciation Reports");
    } else if (location.pathname.startsWith("/reports/due-back")) {
      setSelectedReport("Due Back Reports");
    } else if (location.pathname.startsWith("/reports/eol-warranty")) {
      setSelectedReport("EoL & Warranty Reports");
    } else if (location.pathname.startsWith("/reports/activity")) {
      setSelectedReport("Activity Reports");
    }

    // Set selected more option based on path
    if (location.pathname.startsWith("/More/ViewCategories")) {
      setSelectedMore("Categories");
      setActiveMenu("more");
    } else if (location.pathname.startsWith("/More/ViewManufacturer")) {
      setSelectedMore("Manufacturers");
      setActiveMenu("more");
    } else if (location.pathname.startsWith("/More/ViewSupplier")) {
      setSelectedMore("Suppliers");
      setActiveMenu("more");
    } else if (location.pathname.startsWith("/More/ViewStatus")) {
      setSelectedMore("Statuses");
      setActiveMenu("more");
    } else if (location.pathname.startsWith("/More/Depreciations")) {
      setSelectedMore("Depreciations");
      setActiveMenu("more");
    } else if (location.pathname.startsWith("/More/RecycleBin")) {
      setSelectedMore("Recycle Bin");
      setActiveMenu("more");
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await authLogout();
  };

  return (
    <nav className="main-nav-bar">
      <div
        className="nav-brand"
        onClick={() => {
          navigate("/dashboard");
          setActiveMenu("dashboard");
          setMobileOpen(false);
        }}
      >
        <img src={SystemLogo} alt="Logo" />
        <h1>MapAMS</h1>
      </div>

      {!mobileOpen && (
        <button
          className="mobile-menu-btn"
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-controls="main-nav-links"
          onClick={() => setMobileOpen(true)}
        >
          <FaBars />
        </button>
      )}

      {mobileOpen && (
        <div
          className="nav-overlay"
          role="presentation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <section className="nav-menu">
        <ul
          id="main-nav-links"
          className={`nav-links ${mobileOpen ? "open" : ""}`}
        >
          {/* Sidebar Header */}
          <li className="sidebar-header">
            <div className="sidebar-brand">
              <img src={SystemLogo} alt="Logo" />
              <span>MapAMS</span>
            </div>
            <button
              className="sidebar-close-btn"
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <FaChevronLeft />
            </button>
          </li>
          <li>
            <a
              onClick={() => {
                navigate("/dashboard");
                setActiveMenu("dashboard");
                setMobileOpen(false);
              }}
              className={activeMenu === "dashboard" ? "active" : ""}
            >
              Dashboard
            </a>
          </li>
          <li
            className={`dropdown-container assets-dropdown-container ${
              showAssetsMenu ? "open" : ""
            }`}
          >
            <div
              className={`dropdown-trigger ${
                activeMenu === "assets" ? "active" : ""
              }`}
              onClick={() => toggleDropdown("assets")}
            >
              <span className="dropdown-text">{selectedAsset}</span>{" "}
              <IoIosArrowDown />
            </div>
            {showAssetsMenu && (
              <div className="custom-dropdown assets-dropdown">
                <div className="dropdown-menu">
                  <button
                    onClick={() => {
                      navigate("/products");
                      setSelectedAsset("Asset Models");
                      setShowAssetsMenu(false);
                      setMobileOpen(false);
                    }}
                  >
                    Asset Models
                  </button>
                  <button
                    onClick={() => {
                      navigate("/assets");
                      setSelectedAsset("Assets");
                      setShowAssetsMenu(false);
                      setMobileOpen(false);
                    }}
                  >
                    Assets
                  </button>

                  {/* <button
                    onClick={() => {
                      navigate("/accessories");
                      setSelectedAsset("Accessories");
                      setShowAssetsMenu(false);
                    }}
                  >
                    Accessories
                  </button>
                  <button
                    onClick={() => {
                      navigate("/consumables");
                      setSelectedAsset("Consumable");
                      setShowAssetsMenu(false);
                    }}
                  >
                    Consumable
                  </button> */}

                  <button
                    onClick={() => {
                      navigate("/components");
                      setSelectedAsset("Components");
                      setShowAssetsMenu(false);
                      setMobileOpen(false);
                    }}
                  >
                    Components
                  </button>
                </div>
              </div>
            )}
          </li>
          <li>
            <a
              onClick={() => {
                navigate("/repairs");
                setActiveMenu("repairs");
                setMobileOpen(false);
              }}
              className={activeMenu === "repairs" ? "active" : ""}
            >
              Repairs
            </a>
          </li>
          <li>
            <a
              className={activeMenu === "audits" ? "active" : ""}
              onClick={() => {
                navigate("/audits");
                setActiveMenu("audits");
                setMobileOpen(false);
              }}
            >
              Audit
            </a>
          </li>
          <li>
            <a
              className={activeMenu === "tickets" ? "active" : ""}
              onClick={() => {
                navigate("/approved-tickets");
                setActiveMenu("tickets");
                setMobileOpen(false);
              }}
            >
              Tickets
            </a>
          </li>

          {isAdmin() && (
            <>
              <li
                className={`dropdown-container reports-dropdown-container ${
                  showReportsMenu ? "open" : ""
                }`}
              >
                <div
                  className={`dropdown-trigger ${
                    activeMenu === "reports" ? "active" : ""
                  }`}
                  onClick={() => toggleDropdown("reports")}
                >
                  <span className="dropdown-text">{selectedReport}</span>{" "}
                  <IoIosArrowDown />
                </div>
                {showReportsMenu && (
                  <div className="custom-dropdown reports-dropdown">
                    <div className="dropdown-menu">
                      <button
                        onClick={() => {
                          navigate("/reports/asset");
                          setSelectedReport("Asset Reports");
                          setShowReportsMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Asset Reports
                      </button>
                      <button
                        onClick={() => {
                          navigate("/reports/depreciation");
                          setSelectedReport("Depreciation Reports");
                          setShowReportsMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Depreciation Reports
                      </button>
                      <button
                        onClick={() => {
                          navigate("/reports/due-back");
                          setSelectedReport("Due Back Reports");
                          setShowReportsMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Due Back Reports
                      </button>
                      <button
                        onClick={() => {
                          navigate("/reports/eol-warranty");
                          setSelectedReport("EoL & Warranty Reports");
                          setShowReportsMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        EoL & Warranty Reports
                      </button>
                      <button
                        onClick={() => {
                          navigate("/reports/activity");
                          setSelectedReport("Activity Reports");
                          setShowReportsMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Activity Reports
                      </button>
                    </div>
                  </div>
                )}
              </li>
              <li
                className={`dropdown-container more-dropdown-container ${
                  showMoreMenu ? "open" : ""
                }`}
              >
                <div
                  className={`dropdown-trigger ${
                    activeMenu === "more" ? "active" : ""
                  }`}
                  onClick={() => toggleDropdown("more")}
                >
                  <span className="dropdown-text">{selectedMore}</span>{" "}
                  <IoIosArrowDown />
                </div>
                {showMoreMenu && (
                  <div className="custom-dropdown more-dropdown">
                    <div className="dropdown-menu">
                      <button
                        onClick={() => {
                          navigate("/More/ViewCategories");
                          setSelectedMore("Categories");
                          setShowMoreMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Categories
                      </button>
                      <button
                        onClick={() => {
                          navigate("/More/ViewManufacturer");
                          setSelectedMore("Manufacturers");
                          setShowMoreMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Manufacturers
                      </button>
                      <button
                        onClick={() => {
                          navigate("/More/ViewSupplier");
                          setSelectedMore("Suppliers");
                          setShowMoreMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Suppliers
                      </button>
                      <button
                        onClick={() => {
                          navigate("/More/ViewStatus");
                          setSelectedMore("Statuses");
                          setShowMoreMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Statuses
                      </button>
                      <button
                        onClick={() => {
                          navigate("/More/Depreciations");
                          setSelectedMore("Depreciations");
                          setShowMoreMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Depreciations
                      </button>
                      <button
                        onClick={() => {
                          navigate("/More/RecycleBin");
                          setSelectedMore("Recycle Bin");
                          setShowMoreMenu(false);
                          setMobileOpen(false);
                        }}
                      >
                        Recycle Bin
                      </button>
                    </div>
                  </div>
                )}
              </li>
            </>
          )}
        </ul>
      </section>

      <section className="nav-actions">
        <div className="notification-icon-container">
          <div
            className="notification-icon-wrapper"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="notif-icon"
            >
              <path
                fillRule="evenodd"
                d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"
                clipRule="evenodd"
              />
            </svg>
            {notificationCount > 0 && (
              <span className="notification-badge">{notificationCount}</span>
            )}
          </div>
          {showNotifications && (
            <NotificationOverlay
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>
        <div className="profile-container">
          <img
            src={user?.profile_picture || user?.image || DefaultProfile}
            alt="sample-profile"
            className="sample-profile"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
          />
          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="profile-header">
                <img
                  src={user?.profile_picture || user?.image || DefaultProfile}
                  alt="profile"
                />
                <div className="profile-info">
                  <h3>
                    {user?.first_name || user?.full_name?.split(' ')[0] || ''}{" "}
                    {user?.last_name || user?.full_name?.split(' ').slice(1).join(' ') || ''}
                  </h3>
                  <span className="admin-badge">
                    {isAdmin() ? 'Admin' : 'Operator'}
                  </span>
                </div>
              </div>
              <div className="profile-menu">
                <button onClick={() => navigate("/manage-profile")}>
                  Manage Profile
                </button>
                {isAdmin() && (
                  <button onClick={() => navigate("/user-management")}>
                    User Management
                  </button>
                )}
                <button onClick={handleLogout} className="logout-btn">
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </nav>
  );
}
