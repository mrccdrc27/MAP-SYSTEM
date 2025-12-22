import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import StatusCardPopup from './StatusCardPopup';
import '../../styles/dashboard/StatusCard.css';

function StatusCard({ number, title, isRed, isLarge, index }) {
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    if (title === 'Upcoming End of Life') {
      navigate('/upcoming-end-of-life');
    } else if (title === 'Overdue Audits') {
      navigate('/audits/overdue');
    } else if (title === 'Upcoming Audits') {
      navigate('/audits');
    } else if (title === 'Expiring Warranties') {
      navigate('/warranties');
    } else if (title === 'Reached End of Life') {
      navigate('/reached-end-of-life');
    } else if (title === 'Expired Warranties') {
      navigate('/expired-warranties');
    } else if (title === 'Due for Return' || title === 'Low Stock' || title === 'Overdue for Return') {
      setShowPopup(true);
    }
  };

  const dueReturnItems = [
    {
      assetId: '100010',
      assetName: 'Macbook Pro 16"',
      checkedOutTo: 'Dan Rick Otso',
      expectedReturnDate: 'April 2, 2025'
    },
    {
      assetId: '100011',
      assetName: 'iPad Pro"',
      location: 'Makati',
      expectedReturnDate: 'April 3, 2025'
    }
  ];

  const overdueReturnItems = [
    {
      assetId: '100110',
      assetName: 'Macbook Pro 16"',
      checkedOutTo: 'Alan Rick Otso',
      expectedReturnDate: 'April 1, 2025'
    },
    {
      assetId: '103011',
      assetName: 'iPad Pro"',
      location: 'Makati',
      expectedReturnDate: 'April 1, 2025'
    }
  ];

  const upcomingAuditsItems = [
    {
      assetId: '100010',
      assetName: 'Macbook Pro 16"',
      checkedOutTo: 'Alan Rick Otso',
      expectedReturnDate: 'April 1, 2025'
    },
    {
      assetId: '100011',
      assetName: 'iPad Pro"',
      location: 'Makati',
      expectedReturnDate: 'April 1, 2025'
    }
  ];

  const lowStockItems = [
    {
      category: 'Magic Keyboard',
      minimumQuantity: 10,
      available: 5
    },
    {
      category: 'Laptops',
      minimumQuantity: 15,
      available: 6
    }
  ];

  const getItems = () => {
    switch (title) {
      case 'Due for Return':
        return dueReturnItems;
      case 'Upcoming Audits':
        return upcomingAuditsItems;
      case 'Low Stock':
        return lowStockItems;
      case 'Overdue for Return':
        return overdueReturnItems;
      default:
        return [];
    }
  };

  return (
    <div className={`card-position-${index}`}>
      <div
        className={`status-card ${isLarge ? 'large' : ''} ${title === 'Low Stock' ? 'low-stock-card' : ''} ${showPopup ? 'active' : ''}`}
        onClick={handleClick}
      >
        <div className="content-wrapper">
          <div className={`status-number ${isRed ? 'red' : 'blue'}`}>{number}</div>
          <div className="status-title">{title}</div>
        </div>
      </div>

      {showPopup && title !== 'Upcoming Audits' && (
        <StatusCardPopup
          title={title}
          dueDate={title === 'Low Stock' ? null : 14}
          items={getItems()}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}

StatusCard.propTypes = {
  number: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  isRed: PropTypes.bool,
  isLarge: PropTypes.bool,
  index: PropTypes.number.isRequired
};

StatusCard.defaultProps = {
  isRed: false,
  isLarge: false
};

export default StatusCard;