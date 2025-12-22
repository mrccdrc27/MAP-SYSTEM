class MockupData {
  async fetchExternalEmployee() {
    try {
      const response = await fetch("/ExternalEmployee.json");

      if (!response.ok) {
        return null;
      }

      // Read the data as json.
      const data = await response.json();

      // Sort the data by firstname then lastname
      const sortedData = data.sort((a, b) => {
        const nameA = `${a.firstname} ${a.lastname}`.toLowerCase();
        const nameB = `${b.firstname} ${b.lastname}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      return sortedData;
    } catch (error) {
      console.log("Error fetching external employee data!", error);
    }
  }
}

const mockupData = new MockupData(); // Create object for Mockup Data.

export default mockupData;
