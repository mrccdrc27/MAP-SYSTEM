const API_URL = "https://ticket-tracking-system-production.up.railway.app/api/ams/";

class DtsService {
  // fetch asset checkout and checkin tickets
  async fetchAssetCheckouts() {
    try {
      const response = await fetch(API_URL + "checkout-tickets");

      if (!response.ok) {
        console.warn("Failed to fetch asset checkouts, status:", response.status);
        return null;
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.log("An error occurred while fetching asset checkouts!", error);
    }
  }

  async resolveCheckoutTicket(ticket_id) {
    try {
      const response = await fetch(`${API_URL}checkout-resolve/${ticket_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_resolved: true,
        }),
      });

      if (!response.ok) {
        console.warn("Failed to resolve ticket, status:", response.status);
        throw new Error("Ticket resolution failed.");
      }

      return await response.json(); // or just return if your server responds with 204
    } catch (error) {
      console.error("An error occurred while resolving the ticket:", error);
      throw error;
    }
  }
}

const dtsService = new DtsService();

export default dtsService;