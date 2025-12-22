import React from 'react';
import PropTypes from 'prop-types';
import { BsKeyboard } from 'react-icons/bs';
import { LuDroplet } from 'react-icons/lu';
import { HiOutlineTag } from 'react-icons/hi';
import { RxPerson } from 'react-icons/rx';
import Status from '../Status';
import '../../styles/dashboard/ActivityLog.css';

const ActivityTable = () => {
  // Sample data matching the image exactly
  const activities = [
    {
      date: "Apr 2, 2023",
      user: "Chippy McDonald",
      type: "Accessory",
      event: "Checkout",
      item: "Magsafe Charger",
      toFrom: "Xiaomie Ocho"
    },
    {
      date: "Apr 2, 2023",
      user: "Renan Piotas",
      type: "Consumable",
      event: "Checkin",
      item: "Magic Keyboard",
      toFrom: "Xiaomie Ocho"
    },
    {
      date: "Apr 2, 2023",
      user: "Xiaomie Ocho",
      type: "Asset",
      event: "Update",
      item: "100003 - XPS13",
      toFrom: "Xiaomie Ocho"
    },
    {
      date: "Apr 2, 2023",
      user: "Reymundo Jane Nova",
      type: "Asset",
      event: "Update",
      item: "100007 - Yoga 7",
      toFrom: "Xiaomie Ocho"
    },
    {
      date: "Apr 2, 2023",
      user: "May Pomona",
      type: "Asset",
      event: "Checkout",
      item: '100003 - MacBook Pro 16"',
      toFrom: "Xiaomie Ocho"
    },
    {
      date: "Apr 2, 2023",
      user: "Chippy McDonald",
      type: "Accessory",
      event: "Checkout",
      item: "Magsafe Charger",
      toFrom: "Xiaomie Ocho"
    },
    {
      date: "Apr 2, 2023",
      user: "Renan Piotas",
      type: "Consumable",
      event: "Checkin",
      item: "Magic Keyboard",
      toFrom: "Xiaomie Ocho"
    },
    {
      date: "Apr 2, 2023",
      user: "Xiaomie Ocho",
      type: "Asset",
      event: "Update",
      item: "100003 - XPS13",
      toFrom: "Xiaomie Ocho"
    },
    {
      date: "Apr 2, 2023",
      user: "Reymundo Jane Nova",
      type: "Asset",
      event: "Update",
      item: "100007 - Yoga 7",
      toFrom: "Xiaomie Ocho"
    },
    {
      date: "Apr 2, 2023",
      user: "May Pomona",
      type: "Asset",
      event: "Checkout",
      item: '100003 - MacBook Pro 16"',
      toFrom: "Xiaomie Ocho"
    }
  ];

  const getIcon = (type) => {
    switch (type) {
      case 'Asset':
        return <HiOutlineTag className="activity-icon" />;
      case 'Accessory':
        return <BsKeyboard className="activity-icon" />;
      case 'Consumable':
        return <LuDroplet className="activity-icon" />;
      default:
        return <HiOutlineTag className="activity-icon" />;
    }
  };

  const getEventType = (event) => {
    switch (event.toLowerCase()) {
      case 'checkout':
        return 'undeployable';
      case 'checkin':
        return 'deployable';
      case 'update':
        return 'pending';
      default:
        return 'pending';
    }
  };

  return (
    <div className="activity-log-container">
      <h2 className="activity-title">Activity Log</h2>
      <div className="activity-table-wrapper">
        <table className="activity-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>USER</th>
              <th>TYPE</th>
              <th>EVENT</th>
              <th>ITEM</th>
              <th>TO/FROM</th>
              <th>NOTES</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity, index) => (
              <tr key={index}>
                <td>{activity.date}</td>
                <td>{activity.user}</td>
                <td>
                  <div className="type-cell">
                    {getIcon(activity.type)}
                    <span>{activity.type}</span>
                  </div>
                </td>
                <td>
                  <Status
                    type={getEventType(activity.event)}
                    name={activity.event}
                  />
                </td>
                <td className="item-cell">{activity.item}</td>
                <td>
                  <div className="user-cell">
                    <RxPerson className="user-icon" style={{ color: '#0D6EFD' }} />
                    <span className="user-link">{activity.toFrom}</span>
                  </div>
                </td>
                <td>-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="browse-all-button">Browse All</button>
    </div>
  );
};

export default ActivityTable; 