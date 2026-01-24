import { useState, useEffect } from 'react';
import styles from './EmployeeTicketSubmissionForm.module.css';

// API URL for fetching locations from HDTS backend
const HDTS_API_URL = import.meta.env.VITE_HDTS_BACKEND_URL || 'http://165.22.247.50:5001';

// AMS API URL for fetching asset checkouts
const AMS_ASSETS_URL = 'https://ams-assets.up.railway.app';

export default function AssetCheckInForm({ formData, onChange, onBlur, errors, FormField, employeeId, onAssetCheckoutSelect }) {
  // Locations state - fetched from API
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Asset checkouts state - fetched from AMS API based on employee ID
  const [assetCheckouts, setAssetCheckouts] = useState([]);
  const [loadingAssetCheckouts, setLoadingAssetCheckouts] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Selected checkout date for min date calculation
  const [selectedCheckoutDate, setSelectedCheckoutDate] = useState(null);

  // Fetch asset checkouts from AMS API when employeeId is available
  // Then enrich each checkout with full details (checkout_date, ticket_id)
  useEffect(() => {
    const fetchAssetCheckouts = async () => {
      if (!employeeId) {
        setAssetCheckouts([]);
        return;
      }
      
      setLoadingAssetCheckouts(true);
      try {
        const response = await fetch(`${AMS_ASSETS_URL}/asset-checkout/by-employee/${employeeId}/`);
        const data = await response.json();
        if (Array.isArray(data)) {
          // The by-employee endpoint now includes checkout_date and ticket_id
          // Use those fields directly and only fetch ticket details from HDTS for ticket_number
          const enrichedCheckouts = data.map((checkout) => {
            // The by-employee payload already includes checkout_date and ticket_number
            return {
              ...checkout,
              checkout_date: checkout.checkout_date || null,
              ticket_id: checkout.ticket_id || null,
              // prefer `ticket_number` if provided by AMS; fall back to null
              ticket_number: checkout.ticket_number || checkout.ticketNumber || null,
              return_date: checkout.return_date || null
            };
          });
          setAssetCheckouts(enrichedCheckouts);
        } else {
          console.error('Invalid asset checkouts response:', data);
          setAssetCheckouts([]);
        }
      } catch (error) {
        console.error('Error fetching asset checkouts:', error);
        setAssetCheckouts([]);
      } finally {
        setLoadingAssetCheckouts(false);
      }
    };

    fetchAssetCheckouts();
  }, [employeeId]);

  // Fetch locations from HDTS API on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      try {
        const response = await fetch(`${HDTS_API_URL}/api/locations/`);
        const data = await response.json();
        if (data.success && Array.isArray(data.locations)) {
          setLocations(data.locations);
        } else {
          console.error('Invalid locations response:', data);
          setLocations([]);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  // Handle asset checkout selection from table
  const handleSelectAssetCheckout = (checkout) => {
    // Update the form data with selected checkout
    onChange('assetCheckout')({ target: { value: checkout.id } });
    
    // Store the checkout date for min date calculation
    setSelectedCheckoutDate(checkout.checkout_date || null);
    
    // Clear the check in date when a new asset is selected (since min date changes)
    onChange('checkInDate')({ target: { value: '' } });
    
    // Also populate asset-related fields from the checkout
    if (onAssetCheckoutSelect) {
      onAssetCheckoutSelect({
        checkoutId: checkout.id,
        assetId: checkout.asset_details?.id || checkout.asset,
        assetName: checkout.asset_details?.name || '',
        serialNumber: checkout.asset_details?.serial_number || '',
        assetDisplayId: checkout.asset_details?.asset_id || '',
        checkoutDate: checkout.checkout_date || '',
        ticketNumber: checkout.ticket_number || ''
      });
    }
  };

  // Get minimum check in date: checkout_date + 1 day, or today if no checkout selected
  const getMinCheckInDate = () => {
    if (selectedCheckoutDate) {
      const checkoutDate = new Date(selectedCheckoutDate);
      checkoutDate.setDate(checkoutDate.getDate() + 1);
      const yyyy = checkoutDate.getFullYear();
      const mm = String(checkoutDate.getMonth() + 1).padStart(2, '0');
      const dd = String(checkoutDate.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    // Default to today if no checkout selected
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Filter checkouts based on search term
  const filteredCheckouts = assetCheckouts.filter(checkout => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    const assetName = (checkout.asset_details?.name || '').toLowerCase();
    const serialNumber = (checkout.asset_details?.serial_number || '').toLowerCase();
    const ticketNumber = (checkout.ticket_number || checkout.ticket_id || '').toString().toLowerCase();
    return assetName.includes(searchLower) || serialNumber.includes(searchLower) || ticketNumber.includes(searchLower);
  });

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <>
      {/* Asset to Checkout - Table view of employee's checked out assets */}
      <FormField
        id="assetCheckout"
        label="Asset to Check In"
        required
        error={errors.assetCheckout}
        render={() => (
          <div className={styles.assetCheckoutTableWrapper}>
            {/* Search Bar */}
            <div className={styles.assetCheckoutSearchBar}>
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.assetCheckoutSearchInput}
              />
              <button
                type="button"
                onClick={handleClearSearch}
                className={styles.assetCheckoutClearBtn}
              >
                Clear
              </button>
            </div>

            {loadingAssetCheckouts ? (
              <div className={styles.assetCheckoutLoading}>Loading your checked out assets...</div>
            ) : filteredCheckouts.length === 0 ? (
              <div className={styles.assetCheckoutEmpty}>
                {assetCheckouts.length === 0 
                  ? 'No assets currently checked out to you.'
                  : 'No assets match your search.'}
              </div>
            ) : (
              <div className={styles.assetCheckoutTableScroll}>
                <table className={styles.assetCheckoutTable}>
                  <thead>
                    <tr>
                      <th>Ticket No.</th>
                      <th>Asset Name</th>
                      <th>Serial No.</th>
                      <th>Date of Check Out</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCheckouts.map(checkout => {
                      const isSelected = String(formData.assetCheckout) === String(checkout.id);
                      return (
                        <tr 
                          key={checkout.id} 
                          className={isSelected ? styles.assetCheckoutRowSelected : ''}
                        >
                          <td>{checkout.ticket_number || checkout.ticket_id || 'N/A'}</td>
                          <td>{checkout.asset_details?.name || 'N/A'}</td>
                          <td>{checkout.asset_details?.serial_number || 'N/A'}</td>
                          <td>{formatDate(checkout.checkout_date)}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleSelectAssetCheckout(checkout)}
                              className={`${styles.assetCheckoutSelectBtn} ${isSelected ? styles.assetCheckoutSelectBtnSelected : ''}`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      />

      {/* Check In Date */}
      <FormField
        id="checkInDate"
        label="Check In Date"
        required
        error={errors.checkInDate}
        render={() => (
          <input
            type="date"
            value={formData.checkInDate || ''}
            onChange={onChange('checkInDate')}
            onBlur={onBlur('checkInDate')}
            min={getMinCheckInDate()}
            disabled={!formData.assetCheckout}
            title={!formData.assetCheckout ? 'Please select an asset from the table first' : ''}
          />
        )}
      />

      {/* Location */}
      <FormField
        id="location"
        label="Location"
        required
        error={errors.location}
        render={() => (
          <select
            value={formData.location?.id || formData.location || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              const selectedLocation = locations.find(loc => String(loc.id) === String(selectedId));
              // Store location object with id and city (as name)
              if (selectedLocation) {
                onChange('location')({ target: { value: { id: selectedLocation.id, name: selectedLocation.city } } });
              } else {
                onChange('location')({ target: { value: '' } });
              }
            }}
            onBlur={onBlur('location')}
            disabled={loadingLocations}
          >
            <option value="">
              {loadingLocations ? 'Loading locations...' : 'Select Location'}
            </option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.city}
              </option>
            ))}
          </select>
        )}
      />

      {/* Specify Issue - Free text input with 150 char limit */}
      <FormField
        id="issueType"
        label="Specify Issue"
        required
        error={errors.issueType}
        render={() => (
          <div className={styles.inputWithCounter}>
            <textarea
              rows={3}
              placeholder="Describe the issue with the asset..."
              value={formData.issueType || ''}
              maxLength={150}
              onChange={onChange('issueType')}
              onBlur={onBlur('issueType')}
            />
            <span className={styles.charCounter}>{String(formData.issueType?.length || 0)}/150</span>
          </div>
        )}
      />
    </>
  );
}
