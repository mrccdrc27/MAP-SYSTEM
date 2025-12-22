import React from "react";
import { Link } from "react-router-dom";
import Footer from "../Footer";
import "../../styles/ViewPage.css";

export default function ViewPage({
  breadcrumbRoot,
  breadcrumbCurrent,
  breadcrumbRootPath,
  title,
  children,
  sidebarContent,
  actionButtons
}) {
  return (
    <>
      <main className="view-page-layout">
        {/* Breadcrumb Navigation */}
        <section className="view-breadcrumb">
          <ul>
            <li>
              <Link to={breadcrumbRootPath}>{breadcrumbRoot}</Link>
            </li>
            <li>{breadcrumbCurrent}</li>
          </ul>
        </section>

      {/* Page Title */}
      <section className="view-title-section">
        <h1>{title}</h1>
      </section>

      {/* Main Content Area */}
      <section className="view-content-wrapper">
        {/* Left Content - Main Table/List */}
        <section className="view-main-content">
          {children}
        </section>

        {/* Right Sidebar - More Info */}
        {sidebarContent && (
          <aside className="view-sidebar">
            <h3>More Info:</h3>
            {sidebarContent}
            {actionButtons && (
              <div className="view-action-buttons">
                {actionButtons}
              </div>
            )}
          </aside>
        )}
      </section>
      </main>
      <Footer />
    </>
  );
}
