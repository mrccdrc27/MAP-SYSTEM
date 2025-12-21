# BudgetPro Backend (Django)

This is the backend for the MAP Active Philippines Budgeting System. It is powered by **Django + PostgreSQL**, and uses **python-dotenv** for environment variable management.

---## 
## 
## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/BudgetProPUP/budget-pro.git
cd budget-pro/backend
```
### 2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```
Make sure (venv) is in your terminal prompt. Use the command below to check if you are in the virtual environment.
```bash
where python  # On Windows
which python  # On Linux/Mac
```
### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create a `.env` file
Create a .env file in the root of the backend directory and add your environment variables following the .env.example template:
```bash
copy .env.example .env
```
Then edit the `.env` file to set your environment variables. Make sure to set the `SECRET_KEY` and `DATABASE_URL` variables.

```bash
SECRET_KEY=your_django_secret_key_here
DEBUG=True
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
```
### 5. Create the database
Make sure you have PostgreSQL installed and running, and created a new PostgreSQL database. Update your .env file with the correct database name, user, and password.

## Run migrations:
```bash
python manage.py migrate
```
### 6. Create a superuser (optional)
```bash
python manage.py createsuperuser
```
### 7. Run the server
```bash
python manage.py runserver
```
### 8. Important Reminders
- Make sure to set the `DEBUG` variable to `False` in production.
- Always activate your virtual environment before running any Django commands.
- After installing new packages, make sure to update the `requirements.txt` file:
```bash
pip freeze > requirements.txt
```
- Use `python manage.py shell` to access the Django shell for testing and debugging.
- Do not commit your `.env` and `venv` folder to the repository. Add them to your `.gitignore` file:
```bash
# .gitignore 
venv/
.env
```
### 9. Github Reminders
- In Github, never push directly to the main branch. Always create a new branch for your changes and create a pull request for review before merging into the main branch.
- In Github, always use descriptive and atomic commit messages (one logical change per commit). 

- Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for commit messages. This helps in generating changelogs and understanding the history of the project.

Example format:
<type>(<scope>): <subject>  # Header (required)
<blank line>
<body>                     # Description (optional)
<blank line>
<footer>                   # Metadata (e.g., issue tracking)

Common Types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- refactor: A code change that neither fixes a bug nor adds a feature
- perf: A code change that improves performance
- chore: Changes to the build process or auxiliary tools and libraries such as documentation generation
- test: Adding missing or correcting existing tests
- build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- ci: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)

Example:
```bash
chore(backend): reorganize config files and update requirements

- Moved .env files to /capstone directory  
- Updated Django dependencies in requirements.txt  
- Revised backend README for clarity

Refs: #123  (GitHub issue)
```

- In Github, always use the following format for pull request titles:
```bash
[feature] - [description]
```

- In Github, always pull before pushing to avoid merge conflicts:
```bash
git pull origin main
```
- In Github, always resolve merge conflicts before pushing your changes.
- In Github, to undo mistakes, use the following commands:
```bash
git reset HEAD~1  # Undo last commit but keep changes in the working directory
git checkout -- <file>  # Undo changes in a file
git reset --hard HEAD~1  # Undo last commit and discard changes in the working directory
git stash  # Temporarily save changes in the working directory
git reset --soft HEAD~1  # Undo last commit and keep changes in the staging area
```
- In Github, never commit secrets. Use environment variables instead. Use the `python-dotenv` package to load environment variables from a `.env` file.




## Frontend API Guide

This guide provides frontend developers with the necessary information to interact with the backend APIs for each page.

### General Notes
- All endpoints that require authentication must include the `Authorization: Bearer <your_access_token>` header.
- The base URL for all API calls is the address of the deployed backend (e.g., `http://127.0.0.1:8000/api`), check the Render URLS to be sure.

---

### Dashboard Page

#### 1. Top Summary Cards (Budget Completion, Total, Remaining)
- **Endpoint:** `GET /api/dashboard/budget-summary/`
- **Purpose:** Fetches the main budget statistics for the entire organization for the current active fiscal year.
- **Used In:** The three summary cards at the top of the Dashboard.
- **Returns:** A JSON object with `total_budget`, `total_spent`, `remaining_budget`, and `percentage_used`.
- **React Implementation:**
  ```javascript
  const fetchSummary = async (token) => {
    const response = await fetch('/api/dashboard/budget-summary/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      // setSummaryData(data);
    }
  };
  ```
- **⚠️ Common Pitfalls:** Ensure you have a loading state, as this calculation aggregates data across the entire system.

#### 2. Money Flow Bar Graph
- **Endpoint:** `GET /api/dashboard/overall-monthly-flow/`
- **Purpose:** Provides a monthly breakdown of total allocated budget versus total actual expenses for the current fiscal year.
- **Used In:** The "Money Flow" bar graph.
- **Returns:** An array of objects, each with `month`, `month_name`, `budget`, and `actual`.
- **React Implementation:**
  ```javascript
  const fetchMoneyFlow = async (token, fiscalYearId = null) => {
    const url = fiscalYearId 
      ? `/api/dashboard/overall-monthly-flow/?fiscal_year_id=${fiscalYearId}`
      : '/api/dashboard/overall-monthly-flow/';
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      // Use this data to populate the bar chart labels and values.
    }
  };
  ```
- **⚠️ Common Pitfalls:** The API calculates a simple even distribution of the annual budget across 12 months. The frontend should use the `month_name` for chart labels.

#### 3. Budget Pie Chart
- **Endpoint:** `GET /api/dashboard/top-category-allocations/`
- **Purpose:** Fetches the total budget allocated to each `ExpenseCategory`.
- **Used In:** The "Budget" pie chart.
- **Returns:** An array of objects, each with `id`, `name` (category name), and `total_allocated`.
- **React Implementation:**
  ```javascript
  const fetchPieChartData = async (token) => {
    const response = await fetch('/api/dashboard/top-category-allocations/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      // To calculate percentages for the pie chart, you must first sum all 'total_allocated' values
      // to get a grand total, then calculate each category's percentage of that total.
    }
  };
  ```
- **⚠️ Common Pitfalls:** The API provides raw allocation amounts, not percentages. The frontend is responsible for calculating the percentage for each slice.

#### 4. Budget per Category Table
- **Endpoint:** `GET /api/dashboard/category-budget-status/`
- **Purpose:** Provides a list of all expense categories with their total allocated budget, total amount spent, and the percentage used.
- **Used In:** The "Budget per Category" table at the bottom of the dashboard.
- **Returns:** An array of objects, each with `category_id`, `category_name`, `budget`, `spent`, and `percentage_used`.
- **React Implementation:**
  ```javascript
  const fetchCategoryStatus = async (token) => {
    const response = await fetch('/api/dashboard/category-budget-status/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      // setCategoryTableData(data);
    }
  };
  ```

---

### Budget Proposal Page

#### 1. Proposal List Table
- **Endpoint:** `GET /api/budget-proposals/`
- **Purpose:** Fetches a paginated list of budget proposals. Supports filtering and searching.
- **Used In:** The main table on the Budget Proposal page.
- **Pagination:** Returns **5 items per page**. The response includes `count`, `next`, `previous`, and `results` keys.
- **Returns:** An array of proposal objects in the `results` key. Each object contains `id`, `reference`, `title`, `category`, `submitted_by`, `amount`, and `status`.
- **React Implementation:**
  ```javascript
  const fetchProposals = async (token, page = 1, searchQuery = '', statusFilter = '') => {
    const params = new URLSearchParams({
      page: page,
      search: searchQuery,
      status: statusFilter,
    });
    const response = await fetch(`/api/budget-proposals/?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      // setProposals(data.results);
      // setPageInfo({ count: data.count, next: data.next, previous: data.previous });
    }
  };
  ```
- **⚠️ Common Pitfalls:** Remember to handle the paginated response structure. State must be updated for `results`, `count`, `next`, and `previous` to render pagination controls correctly. Re-fetch data whenever a filter or search term changes.

#### 2. Review Modal - Budget Overview
- **Endpoint:** `GET /api/budget-proposals/{proposalId}/review-overview/`
- **Purpose:** Fetches financial context for a department when a user opens the review modal for a specific proposal.
- **Used In:** The "Budget Overview" section of the review modal.
- **Returns:** An object with `total_department_budget`, `currently_allocated`, `available_budget`, and `budget_after_proposal`.
- **React Implementation:**
  ```javascript
  const fetchReviewOverview = async (token, proposalId) => {
    const response = await fetch(`/api/budget-proposals/${proposalId}/review-overview/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      // setOverviewData(data);
    }
  };
  ```
- **⚠️ Common Pitfalls:** This should be called only when the review modal is opened, not on the initial page load, to improve performance.

#### 3. Review Modal - Approve/Reject Action
- **Endpoint:** `POST /api/external-budget-proposals/{proposalId}/review/`
- **Purpose:** Submits the final review decision (Approve/Reject) along with a comment.
- **Used In:** The submit button inside the final approval/rejection status modal.
- **Returns:** The full, updated `BudgetProposalDetailSerializer` object on success.
- **React Implementation:**
  ```javascript
  const submitReview = async (token, proposalId, newStatus, commentText) => {
    const response = await fetch(`/api/external-budget-proposals/${proposalId}/review/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: newStatus, // Should be 'APPROVED' or 'REJECTED'
        comment: commentText,
      }),
    });
    if (response.ok) {
      const updatedProposal = await response.json();
      // Close the modal and update the proposal in the main table list.
    } else {
      // Handle errors, e.g., display an error message.
    }
  };
  ```
- **⚠️ Common Pitfalls:** Ensure the `Content-Type` header is set to `application/json`. After a successful submission, update the local state of the proposal in the main table to reflect the new status without needing a full page refresh.

---

### Proposal History Page

- **Endpoint:** `GET /api/budget-proposals/history/`
- **Purpose:** Fetches a paginated list of all proposal history events.
- **Used In:** The table on the Proposal History page.
- **Pagination:** Returns **6 items per page**.
- **Returns:** An array of history objects in the `results` key. Each object contains `id`, `proposal_id`, `proposal` (title), `last_modified`, `last_modified_by`, and `status`.
- **React Implementation:** Similar to the `fetchProposals` function, but with a different endpoint and pagination size.

---

### Ledger View Page

- **Endpoint:** `GET /api/ledger/`
- **Purpose:** Fetches a paginated list of all journal entry lines, which represent the ledger.
- **Used In:** The table on the Ledger View page.
- **Pagination:** Returns **5 items per page**.
- **Returns:** An array of ledger line objects in the `results` key. Each object contains `reference_id`, `date`, `category`, `description`, `account`, and `amount`.
- **React Implementation:** Similar to `fetchProposals`, with filters for `category` and `search`.

#### Ledger Export
- **Endpoint:** `GET /api/ledger/export/`
- **Purpose:** Downloads the current filtered view of the ledger as a CSV file.
- **React Implementation:**
  ```javascript
  const exportLedger = async (token, searchQuery = '', categoryFilter = '') => {
    const params = new URLSearchParams({ search: searchQuery, category: categoryFilter });
    const response = await fetch(`/api/ledger/export/?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ledger_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };
  ```
- **⚠️ Common Pitfalls:** Do not try to parse the response as JSON. The response is a file stream (`blob`). The code above correctly handles creating a downloadable link.

---

### Budget Adjustment Page

- **Table View:**
  - **Endpoint:** `GET /api/journal-entries/`
  - **Purpose:** This page reuses the Journal Entry list view to display a history of all adjustments and other journal entries.
- **"Modify Budget" Modal Action:**
  - **Endpoint:** `POST /api/budget-adjustments/`
  - **Purpose:** Creates a budget adjustment by modifying allocations and creating a corresponding journal entry for audit.
  - **Returns:** The newly created `JournalEntry` object.
  - **React Implementation:**
    ```javascript
    const submitBudgetAdjustment = async (token, data) => {
      // data should be an object like:
      // {
      //   date: 'YYYY-MM-DD',
      //   description: '...',
      //   source_allocation_id: 123,
      //   destination_allocation_id: 456, // or null
      //   amount: '5000.00',
      //   offsetting_account_id: 789
      // }
      const response = await fetch('/api/budget-adjustments/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const newJournalEntry = await response.json();
        // Add newJournalEntry to the top of the table and close the modal.
      } else {
        // Handle validation errors from the API.
      }
    };
    ```
- **⚠️ Common Pitfalls:** The UI must provide a way for the user to select valid IDs for `source_allocation_id`, `destination_allocation_id`, and `offsetting_account_id`. These cannot be free-text fields.

---

### Expense Tracking Page

#### 1. Summary Cards
- **Endpoint:** `GET /api/expenses/tracking/summary/`
- **Purpose:** Fetches the summary cards for the user's department.
- **Returns:** An object with `budget_remaining` and `total_expenses_this_month`.
- **React Implementation:**
  ```javascript
  const fetchExpenseSummary = async (token) => {
    const response = await fetch('/api/expenses/tracking/summary/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      // setSummaryData(data);
    }
  };
  ```
- **⚠️ Common Pitfalls:** This endpoint will fail if the user's JWT does not contain a `department_id`. Ensure users log out and log back in after any changes to the `auth_service` JWT structure.

#### 2. Expense List Table
- **Endpoint:** `GET /api/expenses/tracking/`
- **Purpose:** Fetches a paginated list of expenses for the user's department.
- **Pagination:** Returns **5 items per page**.
- **Returns:** An array of expense objects in the `results` key. Each contains `id`, `reference_no`, `type`, `description`, `status`, `accomplished`, and `date`.
- **React Implementation:** Similar to `fetchProposals`, with filters for `category__code` and `date_filter`.

#### 3. "Add Budget" Modal Action
- **Endpoint:** `POST /api/expenses/add-budget/`
- **Purpose:** Creates a new `BudgetAllocation` for a project. This is **NOT** for creating an expense.
- **Returns:** The newly created `BudgetAllocation` object.
- **React Implementation:**
  ```javascript
  const addBudget = async (token, data) => {
    // data should be an object like:
    // {
    //   project_id: 1,
    //   category_id: 2,
    //   account_id: 3,
    //   amount: '10000.00'
    // }
    const response = await fetch('/api/expenses/add-budget/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      // Handle success, e.g., show a success message and close the modal.
    } else {
      // Handle validation errors.
    }
  };
  ```
- **⚠️ Common Pitfalls:** The UI must provide dropdowns or selectors for the user to choose valid IDs for `project_id`, `category_id`, and `account_id`. The "Reference No." field in the mockup should be a dropdown to select a project.

---

### Expense History Page

- **Endpoint:** `GET /api/expenses/history/`
- **Purpose:** Fetches a paginated list of **approved** expenses for the user's department.
- **Pagination:** Returns **5 items per page**.
- **Returns:** An array of expense objects in the `results` key. Each contains `date`, `description`, `category_name`, and `amount`.
- **View Modal:** To view details of a single expense, the frontend should call a standard detail endpoint like `GET /api/expenses/{id}/` (this endpoint may need to be created if not already present).


# API Summary:
### Quick API Endpoint Guide for Frontend

**Dashboard Page**
*   `GET /api/dashboard/budget-summary/` -> **Top 3 Cards** (Budget Completion, Total, Remaining)
*   `GET /api/dashboard/overall-monthly-flow/` -> **Money Flow Graph** (Budget vs. Expense)
*   `GET /api/dashboard/top-category-allocations/` -> **Budget Pie Chart** (by category)
*   `GET /api/dashboard/category-budget-status/` -> **Budget per Category Table** (at the bottom)

**Budget Proposal Page**
*   `GET /api/budget-proposals/` -> **Main Proposal Table** (paginated list of all proposals)
*   `GET /api/budget-proposals/summary/` -> **Top 3 Cards** (Total Proposals, Pending, etc.)
*   `GET /api/budget-proposals/{id}/review-overview/` -> **Review Modal** (to populate the "Budget Overview" numbers)
*   `POST /api/external-budget-proposals/{id}/review/` -> **Review Modal** (to submit the final Approve/Reject action)
*   `GET /api/budget-proposals/{id}/export/` -> **Export Button** (to download a single proposal)

**Proposal History Page**
*   `GET /api/budget-proposals/history/` -> **Main History Table** (paginated list of all proposal actions)

**Ledger View Page**
*   `GET /api/ledger/` -> **Main Ledger Table** (paginated list of all journal entry lines)
*   `GET /api/ledger/export/` -> **Export Button** (to download the ledger as a CSV)

**Budget Adjustment Page**
*   `GET /api/journal-entries/` -> **Main Adjustment Table** (shows a history of adjustments)
*   `POST /api/budget-adjustments/` -> **"Modify Budget" Modal** (to submit a new budget adjustment)

**Budget Variance Report Page**
*   `GET /api/reports/budget-variance/` -> **Main Report Table** (shows the hierarchical budget vs. actual data)
*   `GET /api/reports/budget-variance/export/` -> **Export Button** (to download the report as Excel)

**Expense Tracking Page**
*   `GET /api/expenses/tracking/summary/` -> **Top 2 Cards** (Budget Remaining, Expenses This Month)
*   `GET /api/expenses/tracking/` -> **Main Expense Table** (paginated list of expenses)
*   `POST /api/expenses/add-budget/` -> **"Add Budget" Modal** (to create a new `BudgetAllocation`)
*   `POST /api/expenses/submit/` -> **"Add Expense" Modal** (to create a new `Expense`)

**Expense History Page**
*   `GET /api/expenses/history/` -> **Main History Table** (paginated list of approved expenses)

**General Dropdowns (for forms and filters)**
*   `GET /api/dropdowns/departments/` -> Populates **Department** dropdowns.
*   `GET /api/dropdowns/expense-categories/` -> Populates **Category** dropdowns.
*   `GET /api/dropdowns/accounts/` -> Populates **Account** dropdowns.
*   `GET /api/projects/all/` -> Populates **Project** dropdowns (e.g., for "Add Budget" modal).