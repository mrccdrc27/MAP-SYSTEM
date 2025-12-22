import React from 'react';
import '../../../src/styles/AccessoriesAvailability.css';

export default function AccessoriesAvailability({ available, total }) {
  return (
    <div className="accessories-availability">
      <span style={{ color: '#34c759' }}>
        {available}/{total} 
        <progress 
          value={available} 
          max={total}
          className="accessories-progress"
        ></progress>
      </span>
    </div>
  );
}
