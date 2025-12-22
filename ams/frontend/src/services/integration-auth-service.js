import authAxios from "../api/integrationAuth";

/* ===============================
            EMPLOYEES
================================= */
// GET all employees
export async function fetchAllEmployees() {
  const res = await authAxios.get("employees/");
  return res.data;
}

// GET employee by ID
export async function fetchEmployeeById(id) {
  const res = await authAxios.get(`employees/${id}/`);
  return res.data;
}