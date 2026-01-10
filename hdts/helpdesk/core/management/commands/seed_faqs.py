"""
Management command to seed FAQ knowledge articles for HDTS.
Creates articles for Employee, Ticket Coordinator, and System Admin visibility.
"""
from django.core.management.base import BaseCommand
from core.models import KnowledgeArticle, Employee


class Command(BaseCommand):
    help = 'Seed FAQ knowledge articles for all user roles'

    def handle(self, *args, **options):
        # Get the system administrator account or use None
        admin = None
        try:
            admin = Employee.objects.get(email='systemadministrator@gmail.com')
            self.stdout.write(self.style.SUCCESS(f'Found admin account: {admin.email}'))
        except Employee.DoesNotExist:
            # Try to find any superuser/admin
            admin = Employee.objects.filter(is_superuser=True).first()
            if admin:
                self.stdout.write(self.style.SUCCESS(f'Using superuser account: {admin.email}'))
            else:
                # Use None - the model allows null created_by
                self.stdout.write(self.style.WARNING('No admin account found. Articles will have created_by=None'))
                self.stdout.write('(To associate with an account, create systemadministrator@gmail.com first)')

        created_count = 0

        # ============================================
        # EMPLOYEE FAQs - Ticket Submission & Features
        # ============================================
        employee_faqs = [
            # IT Support Category
            {
                'subject': 'How do I submit an IT Support ticket?',
                'category': 'IT Support',
                'visibility': 'Employee',
                'description': '''<h2>Submitting an IT Support Ticket</h2>
<p>To submit an IT Support ticket, follow these steps:</p>
<ol>
    <li><strong>Log in</strong> to the HDTS portal using your employee credentials</li>
    <li>Navigate to <strong>Submit Ticket</strong> from the main menu</li>
    <li>Select <strong>"IT Support"</strong> as the ticket category</li>
    <li>Fill in the required fields:
        <ul>
            <li><strong>Subject:</strong> A brief description of your issue</li>
            <li><strong>Description:</strong> Detailed explanation of the problem</li>
            <li><strong>Priority:</strong> Select urgency level (Low, Medium, High)</li>
        </ul>
    </li>
    <li>Attach any relevant screenshots or files if needed</li>
    <li>Click <strong>Submit</strong> to create your ticket</li>
</ol>
<p><em>Note: You will receive a confirmation email with your ticket number for tracking.</em></p>'''
            },
            {
                'subject': 'What issues can IT Support help me with?',
                'category': 'IT Support',
                'visibility': 'Employee',
                'description': '''<h2>IT Support Services</h2>
<p>Our IT Support team can assist you with the following:</p>
<ul>
    <li><strong>Hardware Issues:</strong> Computer, monitor, keyboard, mouse problems</li>
    <li><strong>Software Problems:</strong> Application errors, installation requests, updates</li>
    <li><strong>Network Connectivity:</strong> Internet access, VPN issues, Wi-Fi problems</li>
    <li><strong>Email & Communication:</strong> Email setup, calendar issues, Teams/Slack problems</li>
    <li><strong>Password & Access:</strong> Password resets, account lockouts, access permissions</li>
    <li><strong>Printing Issues:</strong> Printer setup, print queue problems, paper jams</li>
    <li><strong>Security Concerns:</strong> Suspicious emails, virus alerts, data security</li>
</ul>
<p><strong>Response Times:</strong></p>
<ul>
    <li>Critical issues: Within 1 hour</li>
    <li>High priority: Within 4 hours</li>
    <li>Medium priority: Within 1 business day</li>
    <li>Low priority: Within 3 business days</li>
</ul>'''
            },
            {
                'subject': 'How do I check the status of my submitted ticket?',
                'category': 'IT Support',
                'visibility': 'Employee',
                'description': '''<h2>Tracking Your Ticket Status</h2>
<p>You can check your ticket status in several ways:</p>
<h3>Method 1: My Tickets Dashboard</h3>
<ol>
    <li>Log in to the HDTS portal</li>
    <li>Click on <strong>"My Tickets"</strong> in the navigation menu</li>
    <li>View all your submitted tickets with their current status</li>
</ol>
<h3>Method 2: Search by Ticket Number</h3>
<ol>
    <li>Use the search bar at the top of the page</li>
    <li>Enter your ticket number (e.g., HDTS-123456)</li>
    <li>Click on the ticket to view details</li>
</ol>
<h3>Ticket Status Meanings:</h3>
<ul>
    <li><strong>Submitted:</strong> Your ticket has been received and is awaiting review</li>
    <li><strong>In Progress:</strong> A coordinator is actively working on your request</li>
    <li><strong>Pending:</strong> Waiting for additional information or approval</li>
    <li><strong>Resolved:</strong> Your issue has been addressed</li>
    <li><strong>Closed:</strong> Ticket has been completed and finalized</li>
</ul>'''
            },
            # Asset Check In Category
            {
                'subject': 'How do I return company assets?',
                'category': 'Asset Check In',
                'visibility': 'Employee',
                'description': '''<h2>Returning Company Assets (Check In)</h2>
<p>When you need to return company-issued assets, follow this process:</p>
<h3>Step 1: Submit Asset Check In Request</h3>
<ol>
    <li>Go to <strong>Submit Ticket</strong></li>
    <li>Select <strong>"Asset Check In"</strong> category</li>
    <li>List all items you're returning:
        <ul>
            <li>Asset name and description</li>
            <li>Asset tag/serial number (if available)</li>
            <li>Condition of the asset</li>
        </ul>
    </li>
</ol>
<h3>Step 2: Prepare Assets</h3>
<ul>
    <li>Back up any personal files from devices</li>
    <li>Remove personal accounts from devices</li>
    <li>Gather all accessories (chargers, cables, cases)</li>
    <li>Clean the equipment if possible</li>
</ul>
<h3>Step 3: Schedule Return</h3>
<p>After your ticket is approved, you'll receive instructions for:</p>
<ul>
    <li>Drop-off location and hours</li>
    <li>Contact person for handover</li>
    <li>Documentation to sign</li>
</ul>
<p><em>Important: Keep your ticket number as proof of return until the process is complete.</em></p>'''
            },
            {
                'subject': 'What assets need to be returned when leaving the company?',
                'category': 'Asset Check In',
                'visibility': 'Employee',
                'description': '''<h2>Assets Required for Return</h2>
<p>The following company-issued items must be returned:</p>
<h3>IT Equipment:</h3>
<ul>
    <li>Laptop/Desktop computer</li>
    <li>Monitor(s)</li>
    <li>Keyboard and mouse</li>
    <li>Headset/webcam</li>
    <li>Mobile phone (if company-issued)</li>
    <li>Tablet devices</li>
    <li>USB drives and external storage</li>
</ul>
<h3>Access Items:</h3>
<ul>
    <li>Building access cards/badges</li>
    <li>Keys to offices, cabinets, or vehicles</li>
    <li>Parking passes</li>
</ul>
<h3>Other Equipment:</h3>
<ul>
    <li>Company credit cards</li>
    <li>Uniforms or branded clothing</li>
    <li>Tools and specialized equipment</li>
    <li>Books, manuals, or training materials</li>
</ul>
<p><strong>Note:</strong> Failure to return assets may result in deductions from your final paycheck or other recovery actions.</p>'''
            },
            # Asset Check Out Category
            {
                'subject': 'How do I request new equipment or assets?',
                'category': 'Asset Check Out',
                'visibility': 'Employee',
                'description': '''<h2>Requesting Company Assets (Check Out)</h2>
<p>To request new equipment or assets for your work:</p>
<h3>Step 1: Submit Request</h3>
<ol>
    <li>Navigate to <strong>Submit Ticket</strong></li>
    <li>Select <strong>"Asset Check Out"</strong> category</li>
    <li>Provide the following information:
        <ul>
            <li>Type of equipment needed</li>
            <li>Business justification</li>
            <li>Duration needed (temporary or permanent)</li>
            <li>Preferred specifications (if applicable)</li>
        </ul>
    </li>
</ol>
<h3>Step 2: Approval Process</h3>
<p>Your request will be reviewed based on:</p>
<ul>
    <li>Business necessity</li>
    <li>Budget availability</li>
    <li>Asset availability in inventory</li>
    <li>Manager approval (for certain items)</li>
</ul>
<h3>Step 3: Collection</h3>
<p>Once approved, you'll receive:</p>
<ul>
    <li>Pickup instructions or delivery details</li>
    <li>Asset acceptance form to sign</li>
    <li>User guidelines for the equipment</li>
</ul>'''
            },
            {
                'subject': 'What equipment can I request for remote work?',
                'category': 'Asset Check Out',
                'visibility': 'Employee',
                'description': '''<h2>Remote Work Equipment</h2>
<p>Employees approved for remote work may request the following:</p>
<h3>Standard Remote Work Kit:</h3>
<ul>
    <li>Laptop computer (if not already issued)</li>
    <li>External monitor</li>
    <li>Keyboard and mouse</li>
    <li>Headset with microphone</li>
    <li>Webcam (if laptop camera is insufficient)</li>
</ul>
<h3>Additional Items (with justification):</h3>
<ul>
    <li>Ergonomic chair or standing desk accessories</li>
    <li>Docking station</li>
    <li>Additional monitors</li>
    <li>Printer (for specific job requirements)</li>
    <li>Mobile hotspot device</li>
</ul>
<h3>Requirements:</h3>
<ul>
    <li>Manager approval for remote work arrangement</li>
    <li>Signed remote work agreement</li>
    <li>Secure home office environment</li>
    <li>Agreement to return equipment if remote work ends</li>
</ul>'''
            },
            # New Budget Proposal Category
            {
                'subject': 'How do I submit a budget proposal?',
                'category': 'New Budget Proposal',
                'visibility': 'Employee',
                'description': '''<h2>Submitting a Budget Proposal</h2>
<p>To request budget allocation for projects or purchases:</p>
<h3>Step 1: Prepare Your Proposal</h3>
<p>Before submitting, gather the following information:</p>
<ul>
    <li>Detailed description of the need</li>
    <li>Itemized cost breakdown</li>
    <li>Business justification and expected ROI</li>
    <li>Timeline for implementation</li>
    <li>Alternative options considered</li>
</ul>
<h3>Step 2: Submit Through HDTS</h3>
<ol>
    <li>Select <strong>"New Budget Proposal"</strong> category</li>
    <li>Fill in all required fields</li>
    <li>Attach supporting documents (quotes, research, etc.)</li>
    <li>Submit for review</li>
</ol>
<h3>Step 3: Review Process</h3>
<p>Your proposal will be evaluated by:</p>
<ol>
    <li>Direct supervisor review</li>
    <li>Department head approval</li>
    <li>Finance team assessment</li>
    <li>Final approval from management</li>
</ol>
<p><em>Processing time varies based on the amount requested and complexity.</em></p>'''
            },
            # Others Category
            {
                'subject': 'What should I do if my issue doesn\'t fit any category?',
                'category': 'Others',
                'visibility': 'Employee',
                'description': '''<h2>Using the "Others" Category</h2>
<p>If your request doesn't fit into the standard categories, use "Others":</p>
<h3>When to Use "Others":</h3>
<ul>
    <li>General inquiries about company policies</li>
    <li>Feedback or suggestions</li>
    <li>Requests that span multiple categories</li>
    <li>Unique situations not covered elsewhere</li>
    <li>Escalations or complaints</li>
</ul>
<h3>Best Practices:</h3>
<ul>
    <li><strong>Be specific:</strong> Clearly describe your issue in the subject line</li>
    <li><strong>Provide context:</strong> Explain why existing categories don't apply</li>
    <li><strong>Include details:</strong> The more information you provide, the faster we can help</li>
</ul>
<h3>Response Time:</h3>
<p>Tickets in the "Others" category may take slightly longer to process as they require manual routing to the appropriate team.</p>'''
            },
            {
                'subject': 'How do I add comments or updates to my ticket?',
                'category': 'Others',
                'visibility': 'Employee',
                'description': '''<h2>Adding Comments to Your Ticket</h2>
<p>You can communicate with the support team through ticket comments:</p>
<h3>Adding a Comment:</h3>
<ol>
    <li>Open your ticket from <strong>My Tickets</strong></li>
    <li>Scroll to the comments section</li>
    <li>Type your message in the comment box</li>
    <li>Click <strong>Send</strong> to post your comment</li>
</ol>
<h3>What You Can Do:</h3>
<ul>
    <li>Provide additional information requested by the coordinator</li>
    <li>Share updates on the situation</li>
    <li>Ask questions about the progress</li>
    <li>Attach additional files if needed</li>
</ul>
<h3>Tips:</h3>
<ul>
    <li>Be responsive when coordinators ask for information</li>
    <li>Keep comments professional and relevant</li>
    <li>Use @mentions if available to notify specific people</li>
</ul>
<p><em>Note: You'll receive email notifications when coordinators respond to your ticket.</em></p>'''
            },
            {
                'subject': 'How do I provide feedback on resolved tickets?',
                'category': 'Others',
                'visibility': 'Employee',
                'description': '''<h2>Customer Satisfaction (CSAT) Feedback</h2>
<p>After your ticket is resolved, you can provide feedback:</p>
<h3>Rating Your Experience:</h3>
<p>When a ticket is closed, you'll be prompted to:</p>
<ol>
    <li>Rate your satisfaction (1-5 stars)</li>
    <li>Provide optional comments about your experience</li>
    <li>Submit your feedback</li>
</ol>
<h3>Why Feedback Matters:</h3>
<ul>
    <li>Helps improve our service quality</li>
    <li>Recognizes excellent support coordinators</li>
    <li>Identifies areas for improvement</li>
    <li>Ensures accountability in ticket handling</li>
</ul>
<h3>Your Feedback Is:</h3>
<ul>
    <li><strong>Confidential:</strong> Used for service improvement</li>
    <li><strong>Valued:</strong> Every rating is reviewed by management</li>
    <li><strong>Important:</strong> Helps us serve you better</li>
</ul>'''
            },
        ]

        # ============================================
        # TICKET COORDINATOR FAQs - System Usage & Guidelines
        # ============================================
        coordinator_faqs = [
            {
                'subject': 'How do I claim and process tickets?',
                'category': 'IT Support',
                'visibility': 'Ticket Coordinator',
                'description': '''<h2>Claiming and Processing Tickets</h2>
<p>As a Ticket Coordinator, follow these steps to handle tickets:</p>
<h3>Step 1: Review New Tickets</h3>
<ol>
    <li>Navigate to <strong>New Tickets</strong> queue</li>
    <li>Review ticket details, category, and priority</li>
    <li>Check if the ticket falls within your expertise area</li>
</ol>
<h3>Step 2: Claim a Ticket</h3>
<ol>
    <li>Click on the ticket to open details</li>
    <li>Click <strong>Claim Ticket</strong> button</li>
    <li>The ticket is now assigned to you</li>
</ol>
<h3>Step 3: Process the Ticket</h3>
<ul>
    <li>Review all provided information</li>
    <li>Request additional details if needed via comments</li>
    <li>Take appropriate action based on the request type</li>
    <li>Update ticket status as you progress</li>
</ul>
<h3>Step 4: Resolution</h3>
<ul>
    <li>Document the resolution in comments</li>
    <li>Change status to <strong>Resolved</strong></li>
    <li>Ensure the employee is notified</li>
</ul>'''
            },
            {
                'subject': 'What are valid grounds to approve a ticket?',
                'category': 'IT Support',
                'visibility': 'Ticket Coordinator',
                'description': '''<h2>Ticket Approval Guidelines</h2>
<p>Approve tickets when the following criteria are met:</p>
<h3>General Approval Criteria:</h3>
<ul>
    <li><strong>Legitimate business need:</strong> Request supports job functions</li>
    <li><strong>Proper authorization:</strong> Employee has authority to make the request</li>
    <li><strong>Complete information:</strong> All required details are provided</li>
    <li><strong>Within policy:</strong> Request aligns with company policies</li>
</ul>
<h3>Category-Specific Criteria:</h3>
<h4>IT Support:</h4>
<ul>
    <li>Issue affects work productivity</li>
    <li>Problem is within IT department's scope</li>
    <li>Request is technically feasible</li>
</ul>
<h4>Asset Check Out:</h4>
<ul>
    <li>Clear business justification provided</li>
    <li>Asset is available in inventory</li>
    <li>Budget is available (if purchase required)</li>
    <li>Manager approval obtained (if required)</li>
</ul>
<h4>Budget Proposals:</h4>
<ul>
    <li>Detailed cost breakdown provided</li>
    <li>ROI or business benefit explained</li>
    <li>Within departmental budget limits</li>
    <li>Proper approval chain completed</li>
</ul>'''
            },
            {
                'subject': 'What are valid grounds to reject a ticket?',
                'category': 'IT Support',
                'visibility': 'Ticket Coordinator',
                'description': '''<h2>Ticket Rejection Guidelines</h2>
<p>Reject tickets when these conditions apply:</p>
<h3>Valid Rejection Reasons:</h3>
<ul>
    <li><strong>Incomplete information:</strong> Missing critical details after follow-up</li>
    <li><strong>Outside scope:</strong> Request is not within HDTS support areas</li>
    <li><strong>Policy violation:</strong> Request conflicts with company policies</li>
    <li><strong>Duplicate request:</strong> Same issue already being handled</li>
    <li><strong>Unauthorized request:</strong> Employee lacks authority for the request</li>
    <li><strong>Resource unavailable:</strong> Requested asset/budget not available</li>
</ul>
<h3>Rejection Best Practices:</h3>
<ol>
    <li><strong>Always explain:</strong> Provide clear reason for rejection</li>
    <li><strong>Be professional:</strong> Use respectful language</li>
    <li><strong>Offer alternatives:</strong> Suggest other solutions if possible</li>
    <li><strong>Document thoroughly:</strong> Record rejection reason in ticket</li>
</ol>
<h3>Before Rejecting:</h3>
<ul>
    <li>Attempt to contact employee for clarification</li>
    <li>Allow reasonable time for response (24-48 hours)</li>
    <li>Consult with supervisor if uncertain</li>
</ul>'''
            },
            {
                'subject': 'How do I handle asset check-in and check-out tickets?',
                'category': 'Asset Check In',
                'visibility': 'Ticket Coordinator',
                'description': '''<h2>Asset Management Ticket Processing</h2>
<h3>Asset Check Out Process:</h3>
<ol>
    <li><strong>Verify Request:</strong>
        <ul>
            <li>Check employee's eligibility</li>
            <li>Verify business justification</li>
            <li>Confirm manager approval if required</li>
        </ul>
    </li>
    <li><strong>Check Inventory:</strong>
        <ul>
            <li>Verify asset availability</li>
            <li>Confirm asset condition</li>
            <li>Note asset tag/serial number</li>
        </ul>
    </li>
    <li><strong>Process Assignment:</strong>
        <ul>
            <li>Update asset management system</li>
            <li>Prepare asset for handover</li>
            <li>Schedule pickup/delivery</li>
        </ul>
    </li>
    <li><strong>Complete Handover:</strong>
        <ul>
            <li>Obtain employee signature</li>
            <li>Document condition at handover</li>
            <li>Provide user guidelines</li>
        </ul>
    </li>
</ol>
<h3>Asset Check In Process:</h3>
<ol>
    <li>Verify items against original assignment</li>
    <li>Inspect asset condition</li>
    <li>Document any damage or missing accessories</li>
    <li>Update inventory system</li>
    <li>Issue return receipt to employee</li>
</ol>'''
            },
            {
                'subject': 'How do I prioritize tickets in my queue?',
                'category': 'Others',
                'visibility': 'Ticket Coordinator',
                'description': '''<h2>Ticket Prioritization Guidelines</h2>
<h3>Priority Levels:</h3>
<table>
    <tr><th>Priority</th><th>Response Time</th><th>Examples</th></tr>
    <tr><td><strong>Critical</strong></td><td>Within 1 hour</td><td>System down, security breach, data loss risk</td></tr>
    <tr><td><strong>High</strong></td><td>Within 4 hours</td><td>Cannot perform primary job function</td></tr>
    <tr><td><strong>Medium</strong></td><td>Within 1 day</td><td>Work impacted but can continue</td></tr>
    <tr><td><strong>Low</strong></td><td>Within 3 days</td><td>General requests, nice-to-have items</td></tr>
</table>
<h3>Prioritization Factors:</h3>
<ul>
    <li><strong>Business Impact:</strong> How many people affected?</li>
    <li><strong>Urgency:</strong> Is there a deadline?</li>
    <li><strong>VIP Requests:</strong> Executive or critical department?</li>
    <li><strong>SLA Compliance:</strong> Time remaining before breach</li>
    <li><strong>Dependencies:</strong> Are other tasks waiting on this?</li>
</ul>
<h3>Best Practices:</h3>
<ul>
    <li>Address critical/high priority first</li>
    <li>Don't let low-priority tickets age excessively</li>
    <li>Communicate delays proactively</li>
    <li>Escalate if unable to meet SLA</li>
</ul>'''
            },
            {
                'subject': 'How do I withdraw from a claimed ticket?',
                'category': 'Others',
                'visibility': 'Ticket Coordinator',
                'description': '''<h2>Withdrawing from a Ticket</h2>
<p>Sometimes you may need to release a ticket back to the queue:</p>
<h3>Valid Reasons to Withdraw:</h3>
<ul>
    <li>Ticket requires expertise outside your area</li>
    <li>Conflict of interest discovered</li>
    <li>Workload reassignment by supervisor</li>
    <li>Extended absence (vacation, illness)</li>
    <li>Ticket needs to be escalated</li>
</ul>
<h3>How to Withdraw:</h3>
<ol>
    <li>Open the ticket you're assigned to</li>
    <li>Click <strong>Withdraw</strong> button</li>
    <li>Provide reason for withdrawal in comments</li>
    <li>Ticket returns to unassigned queue</li>
</ol>
<h3>Important Guidelines:</h3>
<ul>
    <li><strong>Document progress:</strong> Note any actions already taken</li>
    <li><strong>Notify stakeholders:</strong> Inform employee of the change</li>
    <li><strong>Don't abandon:</strong> Ensure ticket is visible for reassignment</li>
    <li><strong>Minimize withdrawals:</strong> Only withdraw when necessary</li>
</ul>'''
            },
            {
                'subject': 'How do I handle budget proposal tickets?',
                'category': 'New Budget Proposal',
                'visibility': 'Ticket Coordinator',
                'description': '''<h2>Processing Budget Proposal Tickets</h2>
<h3>Initial Review Checklist:</h3>
<ul>
    <li>☐ Complete cost breakdown provided</li>
    <li>☐ Business justification documented</li>
    <li>☐ Supporting quotes/documentation attached</li>
    <li>☐ Timeline and implementation plan included</li>
    <li>☐ Proper approval chain initiated</li>
</ul>
<h3>Evaluation Criteria:</h3>
<ol>
    <li><strong>Alignment:</strong> Does it align with business objectives?</li>
    <li><strong>Cost-Benefit:</strong> Is the ROI reasonable?</li>
    <li><strong>Feasibility:</strong> Can it be implemented as proposed?</li>
    <li><strong>Budget Impact:</strong> Is funding available?</li>
    <li><strong>Alternatives:</strong> Were other options considered?</li>
</ol>
<h3>Processing Steps:</h3>
<ol>
    <li>Verify completeness of proposal</li>
    <li>Route to appropriate approvers</li>
    <li>Track approval status</li>
    <li>Communicate decision to requestor</li>
    <li>If approved, coordinate with finance</li>
</ol>'''
            },
            {
                'subject': 'What communication standards should I follow?',
                'category': 'Others',
                'visibility': 'Ticket Coordinator',
                'description': '''<h2>Communication Standards for Coordinators</h2>
<h3>Professional Communication:</h3>
<ul>
    <li>Use clear, concise language</li>
    <li>Avoid technical jargon with non-technical users</li>
    <li>Be empathetic and patient</li>
    <li>Maintain professional tone always</li>
</ul>
<h3>Response Guidelines:</h3>
<ul>
    <li><strong>Initial Response:</strong> Acknowledge within SLA timeframe</li>
    <li><strong>Updates:</strong> Provide progress updates every 24-48 hours</li>
    <li><strong>Resolution:</strong> Clearly explain what was done</li>
    <li><strong>Follow-up:</strong> Confirm employee satisfaction</li>
</ul>
<h3>Comment Etiquette:</h3>
<ul>
    <li>Begin with a greeting</li>
    <li>Reference the specific issue</li>
    <li>Provide actionable information</li>
    <li>End with next steps or closure</li>
</ul>
<h3>Example Good Response:</h3>
<p><em>"Hello [Name], Thank you for submitting your request. I've reviewed your ticket and need additional information about [specific detail]. Could you please provide [what's needed]? Once I receive this, I'll be able to proceed with your request. Best regards, [Your Name]"</em></p>'''
            },
        ]

        # ============================================
        # SYSTEM ADMINISTRATOR FAQs - Role & System Info
        # ============================================
        admin_faqs = [
            {
                'subject': 'What are the responsibilities of a System Administrator?',
                'category': 'IT Support',
                'visibility': 'System Admin',
                'description': '''<h2>System Administrator Responsibilities</h2>
<h3>Core Duties:</h3>
<ul>
    <li><strong>User Management:</strong>
        <ul>
            <li>Create and manage user accounts</li>
            <li>Assign roles and permissions</li>
            <li>Handle access requests and revocations</li>
            <li>Manage employee onboarding/offboarding</li>
        </ul>
    </li>
    <li><strong>System Configuration:</strong>
        <ul>
            <li>Configure system settings and preferences</li>
            <li>Manage workflow configurations</li>
            <li>Maintain knowledge base articles</li>
            <li>Set up notification rules</li>
        </ul>
    </li>
    <li><strong>Oversight & Compliance:</strong>
        <ul>
            <li>Monitor system usage and performance</li>
            <li>Ensure policy compliance</li>
            <li>Generate and review reports</li>
            <li>Handle escalations</li>
        </ul>
    </li>
</ul>
<h3>Regulatory Compliance:</h3>
<p>As a System Administrator, you are responsible for ensuring the system adheres to company policies and applicable regulations regarding data handling, access control, and audit requirements.</p>'''
            },
            {
                'subject': 'How do I manage user accounts and access?',
                'category': 'IT Support',
                'visibility': 'System Admin',
                'description': '''<h2>User Account Management</h2>
<h3>Creating New Users:</h3>
<ol>
    <li>Navigate to <strong>Admin Dashboard → Users</strong></li>
    <li>Click <strong>Register New User</strong></li>
    <li>Fill in required information:
        <ul>
            <li>Email address (must be unique)</li>
            <li>First and last name</li>
            <li>Department</li>
            <li>Role assignment</li>
        </ul>
    </li>
    <li>System sends invitation email to user</li>
</ol>
<h3>Role Assignments:</h3>
<ul>
    <li><strong>Employee:</strong> Basic ticket submission access</li>
    <li><strong>Ticket Coordinator:</strong> Can claim and process tickets</li>
    <li><strong>System Admin:</strong> Full system access and configuration</li>
</ul>
<h3>Account Actions:</h3>
<ul>
    <li><strong>Approve:</strong> Activate pending account registrations</li>
    <li><strong>Deny:</strong> Reject unauthorized registration attempts</li>
    <li><strong>Disable:</strong> Temporarily suspend user access</li>
    <li><strong>Delete:</strong> Permanently remove user account</li>
</ul>
<p><em>Note: Always document reasons for account actions for audit purposes.</em></p>'''
            },
            {
                'subject': 'How do I manage the Knowledge Base?',
                'category': 'Others',
                'visibility': 'System Admin',
                'description': '''<h2>Knowledge Base Management</h2>
<h3>Article Management:</h3>
<p>Access the Knowledge Base through <strong>Admin → Knowledge → Articles</strong></p>
<h4>Creating Articles:</h4>
<ol>
    <li>Click <strong>Create Article</strong></li>
    <li>Fill in required fields:
        <ul>
            <li><strong>Subject:</strong> Clear, descriptive title</li>
            <li><strong>Category:</strong> Select appropriate category</li>
            <li><strong>Visibility:</strong> Who can see this article</li>
            <li><strong>Description:</strong> Article content (supports HTML)</li>
        </ul>
    </li>
    <li>Click <strong>Save</strong> to publish</li>
</ol>
<h4>Article Actions:</h4>
<ul>
    <li><strong>Edit:</strong> Update article content</li>
    <li><strong>Archive:</strong> Hide article without deleting</li>
    <li><strong>Restore:</strong> Bring back archived articles</li>
    <li><strong>Delete:</strong> Permanently remove article</li>
</ul>
<h3>Visibility Levels:</h3>
<ul>
    <li><strong>Employee:</strong> Visible to all employees</li>
    <li><strong>Ticket Coordinator:</strong> Only coordinators can see</li>
    <li><strong>System Admin:</strong> Admin-only articles</li>
</ul>'''
            },
            {
                'subject': 'What reports are available in the system?',
                'category': 'Others',
                'visibility': 'System Admin',
                'description': '''<h2>System Reports & Analytics</h2>
<h3>Available Reports:</h3>
<h4>Ticket Reports:</h4>
<ul>
    <li><strong>Ticket Volume:</strong> Number of tickets by period, category, status</li>
    <li><strong>Resolution Time:</strong> Average time to resolve by category/priority</li>
    <li><strong>SLA Compliance:</strong> Percentage of tickets meeting SLA</li>
    <li><strong>Backlog Report:</strong> Open tickets aging analysis</li>
</ul>
<h4>User Reports:</h4>
<ul>
    <li><strong>Coordinator Performance:</strong> Tickets handled, resolution times, ratings</li>
    <li><strong>User Activity:</strong> Login history, ticket submissions</li>
    <li><strong>CSAT Scores:</strong> Customer satisfaction ratings and feedback</li>
</ul>
<h4>Asset Reports:</h4>
<ul>
    <li><strong>Asset Inventory:</strong> Current allocation status</li>
    <li><strong>Check In/Out History:</strong> Asset movement tracking</li>
</ul>
<h3>Using Reports:</h3>
<ol>
    <li>Navigate to <strong>Admin → Reports</strong></li>
    <li>Select report type</li>
    <li>Set date range and filters</li>
    <li>Generate and export as needed</li>
</ol>'''
            },
            {
                'subject': 'How do I handle system escalations?',
                'category': 'IT Support',
                'visibility': 'System Admin',
                'description': '''<h2>Handling System Escalations</h2>
<h3>When Escalations Occur:</h3>
<ul>
    <li>Tickets exceeding SLA thresholds</li>
    <li>Complex issues beyond coordinator authority</li>
    <li>Customer complaints or disputes</li>
    <li>Policy exceptions required</li>
    <li>Inter-departmental coordination needed</li>
</ul>
<h3>Escalation Handling Process:</h3>
<ol>
    <li><strong>Review:</strong> Understand the full ticket history</li>
    <li><strong>Assess:</strong> Determine appropriate course of action</li>
    <li><strong>Communicate:</strong> Contact all stakeholders</li>
    <li><strong>Resolve:</strong> Take necessary action or delegate</li>
    <li><strong>Document:</strong> Record resolution for future reference</li>
</ol>
<h3>Authority to:</h3>
<ul>
    <li>Override standard procedures when justified</li>
    <li>Approve exceptions to policies</li>
    <li>Reassign tickets to specific coordinators</li>
    <li>Expedite processing for urgent matters</li>
    <li>Contact external vendors or departments</li>
</ul>'''
            },
            {
                'subject': 'What security protocols must be followed?',
                'category': 'IT Support',
                'visibility': 'System Admin',
                'description': '''<h2>Security Protocols & Compliance</h2>
<h3>Access Control:</h3>
<ul>
    <li>Implement principle of least privilege</li>
    <li>Regularly audit user permissions</li>
    <li>Disable accounts immediately upon termination</li>
    <li>Require strong passwords and regular changes</li>
    <li>Monitor for unauthorized access attempts</li>
</ul>
<h3>Data Protection:</h3>
<ul>
    <li>Ensure sensitive data is properly classified</li>
    <li>Limit access to confidential information</li>
    <li>Follow data retention policies</li>
    <li>Properly dispose of obsolete data</li>
</ul>
<h3>Audit Requirements:</h3>
<ul>
    <li>Maintain audit logs for all system changes</li>
    <li>Review logs regularly for anomalies</li>
    <li>Preserve records for required retention periods</li>
    <li>Cooperate with internal/external audits</li>
</ul>
<h3>Incident Response:</h3>
<ol>
    <li>Identify and contain the incident</li>
    <li>Assess impact and scope</li>
    <li>Notify appropriate parties</li>
    <li>Document and remediate</li>
    <li>Conduct post-incident review</li>
</ol>'''
            },
            {
                'subject': 'How do I configure system settings?',
                'category': 'Others',
                'visibility': 'System Admin',
                'description': '''<h2>System Configuration Guide</h2>
<h3>Accessible Settings:</h3>
<h4>General Settings:</h4>
<ul>
    <li>System name and branding</li>
    <li>Default timezone and date formats</li>
    <li>Email notification templates</li>
    <li>Session timeout duration</li>
</ul>
<h4>Ticket Settings:</h4>
<ul>
    <li>Auto-assignment rules</li>
    <li>SLA definitions by priority</li>
    <li>Required fields configuration</li>
    <li>Status workflow customization</li>
</ul>
<h4>Notification Settings:</h4>
<ul>
    <li>Email notification triggers</li>
    <li>Escalation thresholds</li>
    <li>Reminder frequencies</li>
</ul>
<h3>Configuration Best Practices:</h3>
<ul>
    <li><strong>Test first:</strong> Test changes in a limited scope before full deployment</li>
    <li><strong>Document:</strong> Keep records of all configuration changes</li>
    <li><strong>Communicate:</strong> Notify users of significant changes</li>
    <li><strong>Backup:</strong> Ensure configurations can be restored if needed</li>
</ul>'''
            },
            {
                'subject': 'What are the data retention policies?',
                'category': 'Others',
                'visibility': 'System Admin',
                'description': '''<h2>Data Retention Policies</h2>
<h3>Retention Periods:</h3>
<table>
    <tr><th>Data Type</th><th>Retention Period</th></tr>
    <tr><td>Closed Tickets</td><td>7 years</td></tr>
    <tr><td>User Account Data</td><td>Duration of employment + 3 years</td></tr>
    <tr><td>Audit Logs</td><td>5 years</td></tr>
    <tr><td>Asset Records</td><td>Life of asset + 3 years</td></tr>
    <tr><td>Financial Records (Budget)</td><td>7 years</td></tr>
</table>
<h3>Data Archival:</h3>
<ul>
    <li>Archived data remains accessible but read-only</li>
    <li>Archives are stored in secure, separate storage</li>
    <li>Regular integrity checks performed</li>
</ul>
<h3>Data Deletion:</h3>
<ul>
    <li>Follow approved deletion procedures</li>
    <li>Obtain necessary approvals before deletion</li>
    <li>Document deletion activities</li>
    <li>Ensure secure destruction methods</li>
</ul>
<h3>Legal Holds:</h3>
<p>When litigation or investigation is anticipated, suspend normal deletion for relevant data and consult with legal department.</p>'''
            },
        ]

        # Create all articles
        all_faqs = [
            ('Employee', employee_faqs),
            ('Ticket Coordinator', coordinator_faqs),
            ('System Admin', admin_faqs),
        ]

        for role, faqs in all_faqs:
            self.stdout.write(f'\nCreating {role} FAQs...')
            for faq in faqs:
                article, created = KnowledgeArticle.objects.get_or_create(
                    subject=faq['subject'],
                    defaults={
                        'category': faq['category'],
                        'visibility': faq['visibility'],
                        'description': faq['description'],
                        'created_by': admin,
                        'is_archived': False,
                    }
                )
                if created:
                    created_count += 1
                    self.stdout.write(f'  ✓ Created: {faq["subject"][:50]}...')
                else:
                    self.stdout.write(f'  - Exists: {faq["subject"][:50]}...')

        self.stdout.write(self.style.SUCCESS(f'\n✓ Done! Created {created_count} new FAQ articles.'))
        total = KnowledgeArticle.objects.count()
        self.stdout.write(self.style.SUCCESS(f'Total articles in database: {total}'))
