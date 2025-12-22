import Logo from "../assets/img/Map-LogoNew.png";
import "../styles/Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <img src={Logo} alt="logo" />
      <p>MAP Asset Management System | © 2025 MAP AMS. All rights reserved.</p>
      <p>
        <span>Version</span> 1.0.0
      </p>
    </footer>
  );
}
