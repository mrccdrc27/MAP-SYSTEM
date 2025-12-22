import "../styles/Status.css";
import personIcon from "../assets/icons/person.svg";
import locationIcon from "../assets/icons/location.svg";

export default function Status({
  type,
  name,
  personName = null,
  location = null,
}) {
  /* LIST OF TYPES
    - archived
    - deployed
    - undeployable
    - pending
    - deployable
    - lost
    - create
    - update
    - delete
    - checkin
    - checkout
    - schedule
    - passed
    - failed
    - repair
  */

  return (
    <div className={`status-${(type || "").split(" ").join("-")}`}>
      <div className="circle"></div>
      {name}
      {/* Below will be rendered when any of these (i.e personName or location)
      is not equal to null*/}
      {(personName != null || location != null) && (
        <span className="status-details">
          <span className="status-to">to</span>
          <div className="icon">
            <img src={personName != null ? personIcon : locationIcon} alt="" />
          </div>
          <span className="status-target">
            {personName != null ? personName : location}
          </span>
        </span>
      )}
    </div>
  );
}
