import "../../styles/SystemLoading.css";
import SystemLogo from "../../assets/icons/system-logo-transparent.svg";

export default function SystemLoading() {
  return (
    <main className="system-loading">
      <img src={SystemLogo} alt="system-logo" />
      <h1>MAP AMS</h1>
      <section className="loading">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </section>
    </main>
  );
}
