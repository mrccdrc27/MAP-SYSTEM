Dashboard - In the dashboard, I changed the Export Report Button, previously when you exported it, it was in .json, now it is in excel format .xlsx, and I also changed the sample data/structure in Budget per Department, which was previously per category.


Budget proposals
- Remove the description and status in the table and add a "Department", "Sub - category".
- FOR ACTIONS Button it all now contains 'REVIEW' BUTTON ONLY.
- Add a "Department" filter before category
- In Submitted by Column, It must be a person who submit the proposal so i change it also.
- In our Budget Proposal Form, Now the Print file has functionality where you can now print the our Ticket and some data there is revise now this is the sequence, Budget Proposals turns into (Ticket Review), Category, Sub category, Department, Budget amount and Submitted by: employee (department)
- And also in lower Budget Form there is At the end of the ticket there is

Finance Operator name:
Signature:
Date submitted:

The table sequence now is;
- Ticket ID → Department → Category → sub - category → Submiited by → Amount  → Actions 

Proposal history
- Add a "Department" filter before category
- Fix the content inside the category and the status, it must be a Approved and Rejected only.
- Fix the content of sub-category
- Fix the content of Modified by must be a FINANCE MANAGER or DEPARTMENT HEAD

The sequence is;
Ticket ID → Department → Category → sub - category → Last modified → Modified By → Status

Ledger View
- Add "Department filter" 
- Fix the content of categories
- Change the "description" into a "Sub - category"
The table sequence is;
Ticket ID → Date → Department → Category → sub - category → Account → Amount 

BudgetAllocation
*Ticket ID - system generated

*Date - Standardized date format (YYYY-MM-DD)
↓
Add *Department field
↓
*Category (per department)
↓
*Debit from Account (sub-category in each department)
↓
*Credit to the Account (sub-category each department)
↓
*Amount

- Now the table is same format as the Modify budget form once you add a manual entry. 
- Remove the description
- Add some disabled 'MODIFY BUDGET' when a user didn't select a row from the table.

Note: (I already add this)
1. Field-level error messages
2. Form-level validation summary
3. Change "save" into "submit"
4. Success confirmation upon submit (submit means the budget allocation has been forwarded to the finance manager)
5. The amount field will atomatic turn into peso once you input a value
6. Modify budget entry will only show in FINANCE MANAGER

Budget Variance Report
- Color Coding: Green (on budget), Yellow (warning), Red (over budget)
- Icons: Warning symbols for critical variances
- Trend Arrows: Indicators showing improvement/deterioration
- Highlighting: Emphasis on main category totals
- I alsoadd sample data here

Expense Tracking
- The ticket ID field is disabled (system generated)
- Add a department filter
- Remove the description
- Add attachment file: JPG, PDF, and PNG
- Now, "Submit" button instead save inAdd Expense Form.
- The table is now the same format as the Add expense form except for "Status".
- The "ACCOMPLISHED" will update 'yes' if the manual entry already checked by Finance Manager ( i Add conditions here already.)

Expense History
- I update here the Category filter button the data there to CapEx and OpEx data only
- i also add sample data here to visualize it properly.