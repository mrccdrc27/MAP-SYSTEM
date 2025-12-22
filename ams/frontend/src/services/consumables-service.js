// For production
// const API_URL = "https://consumables-service-production.up.railway.app/";

// For local development
const API_URL = "http://localhost:8005/";

export const getConsumables = async () => {
  try {
    const response = await fetch(`${API_URL}consumables/`);
    if (!response.ok) {
      throw new Error("Failed to fetch consumables");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching consumables:", error);
    throw error;
  }
};

export const getConsumableById = async (id) => {
  try {
    const response = await fetch(`${API_URL}consumables/${id}/`);
    if (!response.ok) {
      throw new Error("Failed to fetch consumable");
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching consumable with ID ${id}:`, error);
    throw error;
  }
};
