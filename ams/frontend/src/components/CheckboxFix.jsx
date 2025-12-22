import React from 'react';

// This component adds a style tag to fix the three dots issue with checkboxes
export default function CheckboxFix() {
  return (
    <style jsx="true">{`
      input[type="checkbox"] {
        appearance: auto !important;
        -webkit-appearance: checkbox !important;
        -moz-appearance: checkbox !important;
        content: none !important;
      }
      
      input[type="checkbox"]::before,
      input[type="checkbox"]::after {
        display: none !important;
        content: none !important;
      }
      
      td:first-child {
        font-size: 0 !important;
      }
      
      td:first-child input[type="checkbox"] {
        font-size: initial !important;
      }
    `}</style>
  );
}
