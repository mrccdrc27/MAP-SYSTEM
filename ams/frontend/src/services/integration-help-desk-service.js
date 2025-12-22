import helpDeskAxios from "../api/integrationHelpDesk";

/* ===============================
          LOCATIONS CRUD
================================= */
// GET all locations
export async function fetchAllLocations() {
  const res = await helpDeskAxios.get("locations/");
  return res.data;
}

// GET location by ID
export async function fetchLocationById(id) {
  const res = await helpDeskAxios.get(`locations/${id}/`);
  return res.data;
}

// create location
export async function createLocation(data) {
  const res = await helpDeskAxios.post("locations/", data);
  return res.data;
}