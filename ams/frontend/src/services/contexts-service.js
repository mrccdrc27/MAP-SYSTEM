import contextsAxios from "../api/contextsAxios";

/* ===============================
          CATEGORY CRUD
================================= */
// GET all categories
export async function fetchAllCategories() {
  const res = await contextsAxios.get("categories/");
  return res.data;
}

// GET category by ID
export async function fetchCategoryById(id) {
  const res = await contextsAxios.get(`categories/${id}/`);
  return res.data;
}

// CREATE category
export async function createCategory(data) {
  const res = await contextsAxios.post("categories/", data);
  return res.data;
}

// UPDATE category
export async function updateCategory(id, data) {
  const res = await contextsAxios.put(`categories/${id}/`, data);
  return res.data;
}

// DELETE category
export async function deleteCategory(id) {
  const res = await contextsAxios.delete(`categories/${id}/`);
  return res.data;
}

/* ===============================
          SUPPLIER CRUD
================================= */
// GET all suppliers
export async function fetchAllSuppliers() {
  const res = await contextsAxios.get("suppliers/");
  return res.data;
}

// GET supplier by ID
export async function fetchSupplierById(id) {
  const res = await contextsAxios.get(`suppliers/${id}/`);
  return res.data;
}

// CREATE supplier
export async function createSupplier(data) {
  const res = await contextsAxios.post("suppliers/", data);
  return res.data;
}

/* ===============================
          MANUFACTURER CRUD
================================= */
// GET all manufacturers
export async function fetchAllManufacturers() {
  const res = await contextsAxios.get("manufacturers/");
  return res.data;
}

// GET manufacturer by ID
export async function fetchManufacturerById(id) {
  const res = await contextsAxios.get(`manufacturers/${id}/`);
  return res.data;
}

// CREATE manufacturer
export async function createManufacturer(data) {
  const res = await contextsAxios.post("manufacturers/", data);
  return res.data;
}

// UPDATE manufacturer
export async function updateManufacturer(id, data) {
  const res = await contextsAxios.put(`manufacturers/${id}/`, data);
  return res.data;
}

// DELETE manufacturer (soft-delete via API)
export async function deleteManufacturer(id) {
  const res = await contextsAxios.delete(`manufacturers/${id}/`);
  return res.data;
}

// BULK DELETE manufacturers
export async function bulkDeleteManufacturers(ids) {
  const res = await contextsAxios.post(`manufacturers/bulk_delete/`, { ids });
  return res.data;
}

// IMPORT manufacturers via XLSX upload
export async function importManufacturers(formData, options = {}) {
  // options: { allowUpdate: boolean, upsertBy: 'natural'|'id', apiKey: string }
  const params = {};
  if (options.allowUpdate) params.allow_update = 'true';
  if (options.upsertBy) params.upsert_by = options.upsertBy;

  const headers = {};
  if (options.apiKey) headers['X-IMPORT-API-KEY'] = options.apiKey;

  const res = await contextsAxios.post(`import/manufacturers/`, formData, { params, headers });
  return res.data;
}

/* ===============================
            STATUS CRUD
================================= */
// GET all statuses
export async function fetchAllStatuses() {
  const res = await contextsAxios.get("statuses/");
  return res.data;
}

// GET status by ID
export async function fetchStatusById(id) {
  const res = await contextsAxios.get(`statuses/${id}/`);
  return res.data;
}

// CREATE status
export async function createStatus(data) {
  const res = await contextsAxios.post("statuses/", data);
  return res.data;
}

/* ===============================
          DEPRECIATION CRUD
================================= */
// GET all depreciations
export async function fetchAllDepreciations() {
  const res = await contextsAxios.get("depreciations/");
  return res.data;
}

// GET depreciation by ID
export async function fetchDepreciationById(id) {
  const res = await contextsAxios.get(`depreciations/${id}/`);
  return res.data;
}

// CREATE depreciation
export async function createDepreciation(data) {
  const res = await contextsAxios.post("depreciations/", data);
  return res.data;
}

/* ===============================
          CONTEXTS DROPDOWNS
================================= */
export async function fetchAllDropdowns(entity, options = {}) {
  let url = `contexts-dropdowns/all/?entity=${entity}`;

  // For status filtering: ?category=asset or repair
  if (options.category) {
    url += `&category=${options.category}`;
  }

  // For status type filtering: ?types=deployable,pending
  if (options.types) {
    url += `&types=${options.types}`;
  }

  // For CATEGORY entity only: ?type=asset or component
  if (entity === "category" && options.type) {
    url += `&type=${options.type}`;
  }

  const res = await contextsAxios.get(url);
  return res.data;
}