import React from "react";

const Popup = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-96 p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-4">Details</h2>

        <div className="space-y-4">
          {Object.entries(data).map(([key, value]) =>
            key === "id" ? null : (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
                <div className="w-full border rounded-md px-3 py-2 bg-gray-50 text-gray-800">
                  {value ? value.toString() : "-"}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;
