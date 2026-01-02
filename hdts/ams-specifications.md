Note: Order Number field will be added to repair, like in asset register and component register. So it will be added to the ticket as BMS will return that value.

Ticket of Assets on Helpdesk Side:
Asset Request/Asset Acquisition Proposal Ticket ( For Budget Approval )

Hypothetically, it is created by budget officers by different departments. Not sure pa kung they already have files to attached pero nasa baba yung mga requirements na needed.  Information of products must be fetched from the product model of ams. If not some fields are not provided, they can input themselves and fetch category ams in dropdown.

CATEGORY
Asset Request


SUB-CATEGORY
New Asset, Asset Renewal (Dropdown)


ASSET MODEL ITEM
Product Name (Field)
Fetch from our product model
MODEL
Model ID (Field)
Fetch from our product model
CATEGORY
Category Dropdown
Fetch from our product model
MANUFACTURER
Fields
Fetch from our product model
SUPPLIER
FIelds
Fetch from our product model
SPECS:
Cpu
Gpu
Os
Ram
Screen size
Storage
Fields
Fetch from our product model
JUSTIFICATION (NOTES)
(Field) (optional)
Fetch from our product model
DEFAULT/UNIT COST
Currency and amount (ex. PHP 1000)
Fetch from our product model
QUANTITY
(Field)
Fetch from our product model
TOTAL REQUEST
Total Amount
Derived computation on helpdesk side
EOL DATE
Date
Fetch from our product model
DEPRECIATION MONTHS
(Field)
Fetch from our product model. Derived value into years and months from ams
FILE ATTACHEMENTS
Multiple Attachments
Budget proposal document, letter, etc


Example:
ASSET ACQUISITION PROPOSAL,
Item:,Lenovo ThinkPad X1 Carbon (name)
Model:,20U9005MUS (model_number)
Category:,Laptops (category)
Specs:,i7-10510U (cpu) / 16GB (ram) / 512GB SSD (storage)
Justification:,"notes: ""Standard issue device for Senior Developers. Current inventory is below safety stock."""
COST ANALYSIS,
Unit Cost:,"₱ 85,000.00 (default_purchase_cost)"
Quantity:,5 (Input at runtime)
Total Request:,"₱ 425,000.00"
LIFECYCLE,
EOL Date:,2028-12-31 (end_of_life)
Depreciation:,3-Year Straight Line (depreciation)

Sample Workflow:
Employee opens “Asset Request” form
HDTS fetches Asset Models from AMS
Employee submits ticket
Status: NEW
Supervisor reviews
If rejected → Status: REJECTED → END
Supervisor approves
Status: APPROVED
Ticket is forwarded for Budget validation
Status: PENDING_FINANCE
AMS received the data from BMS
AMS confirm action as ‘resolved’
Employee/requestor is informed on the process, ending ticket lifecycle
➡ Output: Approved request becomes basis for acquisition. Upon approval, bms must return order number as reference for approval for acquisition which is provided by finance officer. 

Asset Registration / Asset Acquisition Ticket

This ticket is submitted by IT Admin or IT operator (ams user.) Once the IT department receives the physical product and its supporting documents. Requesters can submit tickets for registration to be overseen by the department head users in TTS. Note that it is not strict as assets can still be registered without ticket by AMS admin if needed. 

Also, it is 1:1 registration unless helpdesk supports bulk requests in one ticket.

Field
Type
Source
CATEGORY
Asset Registration / Acquisition


SUB-CATEGORY
New Asset Entry


REQUEST REFERENCE
Dropdown or input the ticket ID/Number to populate other fields below
Approved Asset Request Ticket
ASSET MODEL
Auto Field using reference ticket
Approved Asset Request Ticket / AMS
CATEGORY
Auto Field using reference ticket
Approved Asset Request Ticket / AMS
ORDER NUMBER
Auto Field using reference ticket
Approved Asset Request Ticket / BMS
SERIAL NUMBER
Input
Requestor
PURCHASE COST
Input (currency and value)
Requestor
WARRANTY EXP 
Input (date)
Requestor
LOCATION
Input (dropdown)
Requestor
DEPARTMENT
Input (dropdown) 
Requestor
PURCHASE DATE
Input (Date)
Requestor
JUSTIFICATION / NOTES
Input (optional)
Requestor
FILE ATTACHEMENTS
Multiple for receipts, invoice, etc.
Requestor





Example:
ASSET DETAILS
Item:, Lenovo ThinkPad X1 Carbon (asset_model)
Model:, 20U9005MUS (model_number)
Category:, Laptops (category)
Order Number:, PO-2025-0142 (order_number – from BMS via approved request)
Serial Number:, PF-X1-0098123 (serial_number – input at runtime)
Location:, Makati City (location)
Department:, IT Department (department)
Purchase Date:, 2025-02-10 (purchase_date)
Warranty Expiry:, 2028-02-10 (warranty_exp)

COST INFORMATION
Purchase Cost:, ₱85,000.00 (purchase_cost)
Attachments:, invoice_PO-2025-0142.pdf (file_attachments)

JUSTIFICATION / NOTES
Notes:, “Received from supplier based on approved acquisition request.”

Workflow:
IT Asset Officer opens “Asset Registration / Acquisition” form
HDTS fetches Approved Asset Request Tickets
IT selects Request Reference (e.g., AR-2025-0031)
System auto-fills: Item, Model, Category, and Order Number
IT enters: Serial Number, Purchase Cost, Warranty Expiry, Location, Department, Purchase Date
IT uploads invoice / receipt files
IT submits ticket
Status: NEW
TTS IT Supervisor reviews asset details and attachments
If incorrect → returns ticket → Status: OPEN
If verified → approved ticket → Status: APPROVED
➡ Output: AMS receives the ticket, performs an automated registration with prefilled data and sets status to READY TO DEPLOY, ready for checkout.



Asset Checkin and Checkout Ticket

Same process for original workflow. However, no need to look for stock since assets are 1:1. Instead stock, fetch assets that has status of ready to deploy, if requested assets are not listed, Asset requestor user(not normal employee) can request for new asset (undergo on budget approval like the process above)

Asset Repair Ticket

This ticket will be created by the IT operator to track record of asset repair/maintenance. This repair has 2 versions depending if repair is done inside and outside the company. Assets can be repaired inside the company and outside. If inside, no need for service fee unless there is an upgrade. If outside, service fee and component cost will be listed.

Category
Option 1: Service only, no cost needed if inside the company just record of repair done and no need for ticket. If outside, service will have a fee and need for a ticket to send cost on bms for approval.

Option 2: If upgrade, component in inventory and component to buy cost will be sent to bms for approval. Also, if new acquirers, bms must provide an order number which is from a financial operator.

Repair Type / Sub-Category
Green sub-category required approval from bms as it has cost and need order number

Choice
Definition
Real-World Example
Corrective Repair
The asset is broken and you are fixing it to restore functionality.
Fixing a loose hinge; soldering a power jack.
Preventive Maintenance
The asset works fine, but you are servicing it to keep it that way.
"PM Schedule": Cleaning dust from server fans; applying new thermal paste.
Upgrade
The asset works, but you are making it better or faster.
Increasing RAM from 8GB to 16GB; installing a GPU.
Part Replacement
A specific component failed and was swapped out.
Dead battery replaced with a new one.
OS Re-imaging
Purely software-level fix for viruses or slow systems.
Reformatting a laptop that has become slow or infected.
Warranty Service
You didn't fix it yourself; you sent it to the vendor.
Sending a MacBook to Apple for a recall issue.


Repair per sub-category field
Field
Type
Source
CATEGORY
Asset Repair


SUB-CATEGORY
Corrective Repair


REPAIR/SERVICE NAME
Input


ASSET ID 
Input
ams
START DATE
date


END DATE
date


SERVICE COST
Currency and amount


ORDER NUMBER
Input
bms
NOTES
Input (optional)


FILE ATTACHMENT
Multiple file attachment. (receipt, memo, etc.)




Workflow:
User submits → NEW
IT checks → status OPEN
Supervisor approves → PENDING_FINANCE
Finance operator approves → APPROVED
BMS will return order number
Resolve ticket → AMS inserts:


Repair per sub-category field
Field
Type
Source
CATEGORY
Asset Repair


SUB-CATEGORY
Upgrade or Part Replacement


REPAIR NAME
Input


ASSET ID 
Input
ams
START DATE
date


END DATE
date


COMPONENT ALREADY IN COMPONENT INVENTORY
COMPONENT NAME
Dropdown
ams
CATEGORY
dropdown
ams
QUANTITY
Input 


PURCHASED COST
Currency and amount


NOTES
Input (optional)


FILE ATTACHMENT
Multiple file attachment. (receipt, memo, etc.)


IF NEW COMPONENT REQUIRE
COMPONENT NAME
input


CATEGORY
dropdown
ams
SUPPLIER
dropdown
ams
MANUFACTURER
dropdown
ams
LOCATION
dropdown


MODEL NUMBER
input


ORDER NUMBER
input
bms
PURCHASED DATE
input


QUANTITY
input


PURCHASED COST
Currency and amount


NOTES
Input (optional)


FILE ATTACHMENT
Multiple file attachment. (receipt, memo, etc.)




Workflow:
User submits → NEW
IT checks → status OPEN
Supervisor approves → PENDING_FINANCE
Finance operator approves → APPROVED
BMS will return order number
Resolve ticket → AMS inserts new component 


Asset Incident Ticket

This ticket will be submitted by any employee in case an incident happens on an asset they have. Once this ticket is approved, the asset will change its status for auditing.

Incident Type:
Stolen
Damage (Scenario where after check-out, asset has damage or broken)
Employee Resign (Includes if employee die)

Field
Type
Source
CATEGORY
Asset Incident


SUB-CATEGORY
Dropdown
Stolen
Damage
Employee Resign


ASSET ID 
Input
ams
INCIDENT DATE




JUSTIFICATION / NOTES
Input


FILE ATTACHEMENT
Multiple (Police report, resignation letter, etc.)




Workflow
Employee Submit Ticket → NEW
Manager approves → APPROVED
	Employee will be messaged or emailed that they must check-in the asset (applicable for
resign or employee dies)
Resolve → AMS updates asset.status


Asset Disposal | Asset Lifecycle Review Ticket

This ticket is for reviewing asset lifecycles which are considered as candidates for asset disposal. It is yearly, considering previous yearends. It can be automated ticket (optional)

DECISION CRITERIA (Based only on your real data)
Metric
Dispose
Asset Age vs EOL
At / Beyond EOL
Utilization (3-month avg)
≤ 30%
Repair Count (12 months)
≥ 3
Repair Cost %
≥ 60%
Audit Result
Failed


Fields here will be fetched from ams. AMS will provide endpoints for fetching the derived/computed value once an asset is selected.
Field
Type
Source
CATEGORY
Asset Lifecycle Review


SUB-CATEGORY
Disposal


ASSET ID 
Dropdown
ams
AGE
Input
ams
TOTAL UTILIZATION 
Input
ams
REPAIR COUNT
Input
ams
TOTAL REPAIR COST
Input
ams
LAST AUDIT RESULT
Input
ams
FILE ATTACHEMENT
Multiple, for reports







Workflow
Every year Disposal Review
IT opens Disposal Ticket
Status: NEW
IT Manager reviews
Reject does not passed on criteria → REJECTED
Approve passed on criteria → APPROVED
Property / Finance validates
Status: DISPOSE_APPROVED
AMS updates asset status → Disposed

