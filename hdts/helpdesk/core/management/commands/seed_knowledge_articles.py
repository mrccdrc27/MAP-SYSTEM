"""
Management command to seed Knowledge Base articles with realistic FAQ content.

Usage:
    python manage.py seed_knowledge_articles
    python manage.py seed_knowledge_articles --clear  # Clear existing articles first
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import KnowledgeArticle, KnowledgeArticleVersion


class Command(BaseCommand):
    help = 'Seed the Knowledge Base with realistic FAQ articles for different user roles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing articles before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing articles...')
            KnowledgeArticleVersion.objects.all().delete()
            KnowledgeArticle.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared all existing articles.'))

        self.stdout.write('Seeding Knowledge Base articles...')

        # =====================================================================
        # EMPLOYEE FAQs - General questions and concerns (without system usage)
        # =====================================================================
        employee_articles = [
            {
                'subject': 'How do I request IT support for my workstation?',
                'category': 'IT Support',
                'visibility': 'Employee',
                'description': '''If you're experiencing issues with your workstation, there are several ways to get help:

1. **Check Common Solutions First**
   - Restart your computer - this resolves many common issues
   - Check all cable connections are secure
   - Ensure your device is connected to the network

2. **Contact IT Support**
   - Email: it.support@company.com
   - Phone: Extension 1234
   - Walk-in: IT Department, 3rd Floor, Room 305

3. **Information to Provide**
   When contacting IT, please have the following ready:
   - Your employee ID and department
   - Description of the issue
   - When the problem started
   - Any error messages you've seen

4. **Response Times**
   - Critical issues (cannot work): Within 1 hour
   - High priority: Within 4 hours
   - Standard requests: Within 24 hours

Remember, never attempt to repair hardware yourself as this may void warranties and cause additional damage.''',
                'tags': ['IT Support', 'Workstation', 'Help Desk', 'Technical Support'],
                'versions': [
                    {'changes': 'Created article', 'content': 'If you need IT support, contact the IT department via email or phone.'},
                    {'changes': 'Added detailed contact information', 'content': 'If you need IT support, contact the IT department via email at it.support@company.com or phone extension 1234.'},
                    {'changes': 'Expanded with troubleshooting steps and response times', 'content': None},  # Use current content
                ]
            },
            {
                'subject': 'What should I do if I forgot my password?',
                'category': 'IT Support',
                'visibility': 'Employee',
                'description': '''If you've forgotten your password, follow these steps to regain access:

**For Email/System Password:**
1. Go to the login page and click "Forgot Password"
2. Enter your company email address
3. Check your email for a reset link (including spam folder)
4. Create a new password following our security requirements

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

**If Self-Service Doesn't Work:**
Contact IT Support with your employee ID for manual password reset.

**Security Reminders:**
- Never share your password with anyone
- Change your password every 90 days
- Don't reuse previous passwords
- Use unique passwords for different systems

For immediate assistance, call IT Support at extension 1234.''',
                'tags': ['Password', 'Account Access', 'Security', 'Login'],
            },
            {
                'subject': 'How do I request new equipment or hardware?',
                'category': 'Asset Check Out',
                'visibility': 'Employee',
                'description': '''To request new equipment or hardware for your work needs:

**Standard Equipment Requests:**
1. Speak with your direct supervisor about your equipment needs
2. Your supervisor will submit the request through proper channels
3. The Asset Department will review and process the request
4. You'll be notified when equipment is ready for pickup

**Commonly Available Equipment:**
- Laptops and desktop computers
- Monitors and peripherals
- Keyboards, mice, and headsets
- Mobile devices (with manager approval)
- Specialized software licenses

**What to Include in Your Request:**
- Justification for the equipment
- Specific requirements (e.g., software compatibility)
- Preferred specifications if any
- Urgency level

**Processing Times:**
- Standard equipment: 3-5 business days
- Specialized equipment: 2-4 weeks
- Custom orders: 4-6 weeks

**Note:** All equipment remains company property and must be returned upon request or when leaving the company.''',
                'tags': ['Equipment', 'Hardware', 'Asset Request', 'New Equipment'],
            },
            {
                'subject': 'How do I return company equipment?',
                'category': 'Asset Check In',
                'visibility': 'Employee',
                'description': '''When returning company equipment, follow these guidelines:

**When to Return Equipment:**
- When you no longer need the equipment
- When upgrading to new equipment
- Upon transfer to a different department
- When leaving the company

**Return Process:**
1. Ensure all personal data is backed up and removed
2. Include all accessories (chargers, cables, cases, etc.)
3. Bring equipment to the Asset Department during business hours
4. Complete the equipment return form
5. Obtain a receipt for your records

**Equipment Condition:**
- Clean the equipment before returning
- Report any damage or issues
- Do not attempt repairs yourself
- Normal wear and tear is expected

**Asset Department Location:**
Building A, Ground Floor, Room 102
Hours: Monday-Friday, 8:00 AM - 5:00 PM

**Important Notes:**
- Unreturned equipment may result in payroll deductions
- Lost or stolen equipment must be reported immediately
- Keep your return receipt until separation clearance is complete''',
                'tags': ['Equipment Return', 'Asset Check In', 'Company Property'],
            },
            {
                'subject': 'What are the office hours and break policies?',
                'category': 'Others',
                'visibility': 'Employee',
                'description': '''**Standard Office Hours:**
- Monday to Friday: 8:00 AM - 5:00 PM
- Lunch Break: 12:00 PM - 1:00 PM (1 hour)

**Break Policies:**
- Morning Break: 15 minutes (10:00 AM - 10:15 AM)
- Afternoon Break: 15 minutes (3:00 PM - 3:15 PM)
- Breaks should be taken in designated areas

**Flexible Work Arrangements:**
Some departments may offer flexible schedules. Consult with your supervisor and HR for options available to you.

**Overtime:**
- Must be pre-approved by your supervisor
- Overtime rates apply per company policy
- Maximum overtime hours are regulated

**Attendance Requirements:**
- Arrive on time for your scheduled shift
- Notify your supervisor of any absences
- Follow proper leave request procedures

For questions about specific department schedules, please consult your supervisor or HR department.''',
                'tags': ['Office Hours', 'Break Policy', 'Work Schedule', 'HR'],
            },
            {
                'subject': 'How do I report a lost or stolen company asset?',
                'category': 'Others',
                'visibility': 'Employee',
                'description': '''If company equipment is lost or stolen, take these immediate steps:

**Immediate Actions:**
1. Report to your supervisor immediately
2. File a report with Building Security
3. If stolen outside company premises, file a police report
4. Contact the Asset Department

**Information to Provide:**
- Asset tag number (if known)
- Description of the item
- Last known location
- Date and time of loss/theft
- Circumstances of the incident

**Contact Information:**
- Security: Extension 9999 (24/7)
- Asset Department: Extension 2345
- IT Security (for laptops/devices): Extension 1234

**Important Notes:**
- Do NOT attempt to recover stolen items yourself
- Remote wiping may be initiated for laptops and mobile devices
- You may be asked to provide a written statement
- Lost items may be subject to cost recovery based on circumstances

**Prevention Tips:**
- Never leave equipment unattended in public areas
- Use cable locks for laptops when possible
- Keep asset tag information in a safe place
- Report suspicious activity immediately''',
                'tags': ['Lost Equipment', 'Stolen Asset', 'Security', 'Incident Report'],
                'versions': [
                    {'changes': 'Created article', 'content': 'Report lost or stolen equipment to your supervisor and security immediately.'},
                    {'changes': 'Added detailed reporting procedures', 'content': None},
                ]
            },
            {
                'subject': 'What network and internet usage policies should I follow?',
                'category': 'IT Support',
                'visibility': 'Employee',
                'description': '''**Acceptable Use of Company Network:**

The company network and internet access are provided for business purposes. Please follow these guidelines:

**Permitted Activities:**
- Work-related research and communication
- Accessing business applications and tools
- Professional development and training
- Limited personal use during breaks

**Prohibited Activities:**
- Downloading unauthorized software
- Accessing inappropriate or illegal content
- Streaming non-work-related videos during work hours
- Sharing confidential information externally
- Using peer-to-peer file sharing
- Attempting to bypass security controls

**Email Guidelines:**
- Use professional language in all communications
- Don't open suspicious attachments or links
- Report phishing attempts to IT Security
- Don't send large attachments unnecessarily

**Security Best Practices:**
- Lock your computer when stepping away (Win+L)
- Don't share your login credentials
- Report suspicious emails or websites
- Keep software updated

**Monitoring Notice:**
Network activity may be monitored for security purposes. All traffic through company systems is subject to review.

Violations may result in disciplinary action. Contact IT if you have questions about appropriate use.''',
                'tags': ['Network Policy', 'Internet Usage', 'Security', 'Acceptable Use'],
            },
        ]

        # =====================================================================
        # TICKET COORDINATOR FAQs - System navigation and approval guidelines
        # =====================================================================
        coordinator_articles = [
            {
                'subject': 'How to Navigate the Ticket Management Dashboard',
                'category': 'IT Support',
                'visibility': 'Ticket Coordinator',
                'description': '''**Ticket Management Dashboard Overview**

As a Ticket Coordinator, your dashboard provides a centralized view of all tickets requiring attention.

**Dashboard Sections:**

1. **Ticket Queue**
   - New tickets awaiting assignment
   - Tickets sorted by priority and age
   - Quick filters for category and status

2. **My Assigned Tickets**
   - Tickets you're currently handling
   - Status indicators (In Progress, On Hold, Pending)
   - Due date warnings

3. **Performance Metrics**
   - Response time statistics
   - Resolution rates
   - SLA compliance indicators

**Navigation Tips:**
- Use the sidebar menu to switch between sections
- Click column headers to sort tickets
- Use the search bar for quick ticket lookup by number or keyword
- Filters persist until manually cleared

**Quick Actions:**
- Click a ticket row to view details
- Use action buttons for common operations
- Bulk select for batch operations
- Export options for reporting

**Keyboard Shortcuts:**
- Ctrl+N: New ticket
- Ctrl+F: Search
- Ctrl+R: Refresh
- Esc: Close modal/popup

For detailed training, refer to the Coordinator Training Manual or contact your supervisor.''',
                'tags': ['Dashboard', 'Navigation', 'Ticket Management', 'Coordinator Guide'],
                'versions': [
                    {'changes': 'Created article', 'content': 'The dashboard shows all tickets in your queue.'},
                    {'changes': 'Added navigation sections', 'content': 'The dashboard shows all tickets in your queue. Use the sidebar to navigate between sections.'},
                    {'changes': 'Added keyboard shortcuts and quick actions', 'content': None},
                ]
            },
            {
                'subject': 'Guidelines for Approving Support Tickets',
                'category': 'IT Support',
                'visibility': 'Ticket Coordinator',
                'description': '''**Ticket Approval Guidelines**

Before approving a ticket, verify the following criteria are met:

**Required Information:**
✓ Complete requester information (name, department, contact)
✓ Clear problem description
✓ Category correctly assigned
✓ Priority appropriately set
✓ Relevant attachments included (screenshots, error logs)

**Approval Criteria:**

1. **Valid Business Need**
   - Request aligns with job responsibilities
   - Proper justification provided
   - Budget authorization (if applicable)

2. **Correct Categorization**
   - Verify the category matches the request type
   - Re-categorize if necessary before approval

3. **Priority Assessment**
   - Critical: System down, multiple users affected
   - High: Single user blocked, urgent deadline
   - Medium: Important but has workaround
   - Low: Enhancement, non-urgent request

4. **Complete Information**
   - All required fields filled
   - Sufficient detail for resolution
   - Contact information accurate

**Approval Actions:**
1. Review all ticket details
2. Verify requester eligibility
3. Confirm category and priority
4. Add coordinator notes if needed
5. Click "Approve" to move to queue

**When to Request More Information:**
- Vague or unclear descriptions
- Missing required details
- Questionable priority level
- Need supervisor approval for large requests''',
                'tags': ['Approval', 'Guidelines', 'Ticket Review', 'Process'],
            },
            {
                'subject': 'When and How to Reject Support Tickets',
                'category': 'IT Support',
                'visibility': 'Ticket Coordinator',
                'description': '''**Ticket Rejection Guidelines**

Tickets should be rejected only when they don't meet submission requirements or are outside scope.

**Valid Reasons for Rejection:**

1. **Incomplete Information**
   - Missing critical details
   - Cannot identify requester
   - No description of issue

2. **Duplicate Ticket**
   - Same issue already submitted
   - Link to existing ticket in rejection notes

3. **Out of Scope**
   - Request not covered by IT/Support
   - Should be directed to another department
   - Personal (non-work) requests

4. **Unauthorized Request**
   - Requester not eligible for service
   - Needs manager approval first
   - Violates company policy

**Rejection Process:**

1. Document the specific reason for rejection
2. Be professional and constructive in your notes
3. Provide guidance on how to resubmit correctly
4. Select appropriate rejection reason from dropdown
5. Click "Reject" button
6. Requester will be notified automatically

**Sample Rejection Notes:**

❌ "Rejected - incomplete" (Too vague)

✓ "Your ticket requires additional information. Please resubmit with:
   - Specific error message received
   - Steps taken before the issue occurred
   - Screenshot of the error if possible"

**Important:**
- Always be respectful and helpful
- Rejection is not punishment - it's guidance
- Follow up if requester has questions
- Escalate if you're unsure about rejection''',
                'tags': ['Rejection', 'Guidelines', 'Ticket Review', 'Process'],
                'versions': [
                    {'changes': 'Created article', 'content': 'Reject tickets when they are incomplete or out of scope.'},
                    {'changes': 'Added valid rejection reasons', 'content': None},
                ]
            },
            {
                'subject': 'How to Prioritize and Assign Tickets',
                'category': 'IT Support',
                'visibility': 'Ticket Coordinator',
                'description': '''**Ticket Prioritization and Assignment Guide**

Effective prioritization ensures critical issues are addressed first while maintaining fairness.

**Priority Levels:**

| Priority | Response Time | Resolution Target | Examples |
|----------|--------------|-------------------|----------|
| Critical | 15 minutes | 4 hours | System outage, security breach |
| High | 1 hour | 8 hours | User blocked, data issue |
| Medium | 4 hours | 24 hours | Software issue with workaround |
| Low | 24 hours | 72 hours | Enhancement, general question |

**Prioritization Factors:**
1. Business impact (how many affected?)
2. Urgency (is there a deadline?)
3. Workaround availability
4. VIP status (executives, critical roles)
5. SLA requirements

**Assignment Considerations:**
- Agent expertise and specialization
- Current workload balance
- Availability (shifts, time off)
- Previous ticket history with requester
- Escalation requirements

**Assignment Process:**
1. Assess ticket requirements
2. Review available agents
3. Check agent current workload
4. Assign to most suitable agent
5. Add assignment notes if needed

**Auto-Assignment Rules:**
Some tickets may auto-assign based on:
- Category to team routing
- Round-robin distribution
- Skill-based matching

**Reassignment:**
If reassignment is needed:
- Document reason for transfer
- Notify original assignee
- Update ticket notes
- Verify new assignee availability''',
                'tags': ['Priority', 'Assignment', 'Workload', 'SLA'],
            },
            {
                'subject': 'Understanding and Meeting SLA Requirements',
                'category': 'IT Support',
                'visibility': 'Ticket Coordinator',
                'description': '''**Service Level Agreement (SLA) Guidelines**

SLAs define our commitment to response and resolution times. Meeting SLAs is critical for service quality.

**SLA Definitions:**

1. **First Response Time**
   - Time from ticket creation to first coordinator response
   - Acknowledgment counts as first response
   - Auto-replies do NOT count

2. **Resolution Time**
   - Time from creation to "Resolved" status
   - Clock pauses when "On Hold" or "Pending Customer"
   - Reopened tickets restart the clock

**SLA Targets by Priority:**

| Priority | First Response | Resolution |
|----------|---------------|------------|
| Critical | 15 minutes | 4 hours |
| High | 1 hour | 8 hours |
| Medium | 4 hours | 24 hours |
| Low | 8 hours | 72 hours |

**SLA Breach Prevention:**
- Monitor the SLA countdown indicators
- Yellow warning: < 25% time remaining
- Red alert: SLA breached
- Set personal reminders for aging tickets

**What to Do When SLA is At Risk:**
1. Escalate immediately if you cannot resolve
2. Communicate with the requester
3. Document delays and reasons
4. Request additional resources if needed

**SLA Exemptions:**
- Waiting for customer response (clock pauses)
- Third-party dependencies (documented)
- Approved extensions by management

**Reporting:**
- SLA compliance is tracked automatically
- Weekly reports sent to management
- Individual performance affects reviews''',
                'tags': ['SLA', 'Response Time', 'Resolution', 'Performance'],
            },
            {
                'subject': 'Handling Escalations and Difficult Tickets',
                'category': 'Others',
                'visibility': 'Ticket Coordinator',
                'description': '''**Escalation and Difficult Ticket Guidelines**

Some tickets require escalation to higher support levels or management involvement.

**When to Escalate:**

1. **Technical Escalation**
   - Issue beyond your expertise
   - Requires admin/root access
   - Needs vendor involvement
   - Complex multi-system issue

2. **Management Escalation**
   - Angry or abusive requester
   - Policy exception needed
   - VIP or executive request
   - Legal or compliance concerns

3. **Priority Escalation**
   - Impact larger than initially assessed
   - Affecting multiple departments
   - Business-critical deadline at risk

**Escalation Process:**

1. Document all troubleshooting steps taken
2. Summarize the issue clearly
3. Select escalation path (Technical/Management)
4. Add escalation notes with context
5. Notify the escalation recipient directly
6. Remain available for questions

**Handling Difficult Requesters:**

- Stay calm and professional
- Listen actively to concerns
- Acknowledge their frustration
- Focus on solutions, not blame
- Set clear expectations
- Escalate if situation worsens

**De-escalation Phrases:**
- "I understand this is frustrating..."
- "Let me see how I can help you right now..."
- "I want to make sure we resolve this for you..."
- "Here's what I can do..."

**Documentation:**
Always document difficult interactions in ticket notes. This protects you and provides context for future interactions.''',
                'tags': ['Escalation', 'Difficult Tickets', 'Customer Service', 'Process'],
            },
            {
                'subject': 'Asset Request Approval Workflow',
                'category': 'Asset Check Out',
                'visibility': 'Ticket Coordinator',
                'description': '''**Asset Request Approval Workflow for Coordinators**

Asset requests require careful verification before approval.

**Verification Checklist:**

□ Requester is an active employee
□ Manager approval attached (for items over $500)
□ Business justification is valid
□ Asset is available in inventory
□ No duplicate active requests
□ Budget allocation confirmed (if applicable)

**Asset Categories:**

1. **Standard Equipment** (Pre-approved types)
   - Basic laptops
   - Standard monitors
   - Keyboards/mice
   - Headsets
   
2. **Specialized Equipment** (Requires justification)
   - High-performance laptops
   - Multiple monitors
   - Specialized peripherals
   
3. **High-Value Assets** (Requires director approval)
   - Items over $2,000
   - Mobile devices
   - Specialized software licenses

**Approval Steps:**
1. Verify requester eligibility
2. Check inventory availability
3. Confirm approval chain complete
4. Add coordinator notes
5. Approve and route to Asset Department
6. Notify requester of expected timeline

**Rejection Scenarios:**
- Insufficient justification
- Duplicate request
- Budget not approved
- Item not standard (needs exception)

**Tracking:**
All approved requests should be followed up within 48 hours to ensure Asset Department is processing.''',
                'tags': ['Asset Approval', 'Workflow', 'Equipment', 'Process'],
                'versions': [
                    {'changes': 'Created article', 'content': 'Asset requests need verification before approval.'},
                    {'changes': 'Added verification checklist', 'content': None},
                ]
            },
        ]

        # =====================================================================
        # SYSTEM ADMIN FAQs - System regulations and administration
        # =====================================================================
        admin_articles = [
            {
                'subject': 'System Administration: User Account Management',
                'category': 'IT Support',
                'visibility': 'System Admin',
                'description': '''**User Account Management Guide**

System Administrators are responsible for managing user accounts across the organization.

**Account Creation:**

1. **New Employee Onboarding**
   - Verify HR approval documentation
   - Create account with temporary password
   - Assign appropriate role (Employee, Coordinator, Admin)
   - Set department and access permissions
   - Send welcome email with credentials

2. **Account Naming Convention**
   - Format: firstname.lastname@company.com
   - Duplicates: firstname.lastname2@company.com
   - Company ID: MA#### format

**Role Assignments:**

| Role | Access Level | Capabilities |
|------|--------------|--------------|
| Employee | Basic | Submit tickets, view own tickets |
| Ticket Coordinator | Elevated | Manage tickets, approve/reject |
| System Admin | Full | All features, user management |

**Account Modifications:**
- Role changes require manager approval
- Department transfers update access automatically
- Document all changes in the audit log

**Account Deactivation:**
1. Receive separation notice from HR
2. Disable account (do not delete)
3. Revoke all access tokens
4. Transfer or archive user data
5. Update asset records
6. Document in separation checklist

**Security Policies:**
- Enforce password complexity requirements
- Enable MFA for admin accounts
- Regular access reviews (quarterly)
- Inactive accounts disabled after 90 days''',
                'tags': ['User Management', 'Account Administration', 'Security', 'Onboarding'],
                'versions': [
                    {'changes': 'Created article', 'content': 'User accounts are managed by System Administrators.'},
                    {'changes': 'Added role assignments table', 'content': None},
                ]
            },
            {
                'subject': 'System Access Control and Permissions',
                'category': 'IT Support',
                'visibility': 'System Admin',
                'description': '''**Access Control Framework**

This document outlines the access control policies and implementation guidelines.

**Principle of Least Privilege:**
Users should have only the minimum access required to perform their job functions.

**Access Levels:**

1. **View Only**
   - Read access to assigned areas
   - Cannot modify or delete
   - Standard for new users

2. **Contributor**
   - Create and edit own content
   - Cannot delete or modify others' content
   - Cannot change system settings

3. **Manager**
   - Full access to department data
   - Can approve requests
   - Limited system configuration

4. **Administrator**
   - Full system access
   - User management
   - System configuration
   - Audit log access

**Permission Request Process:**
1. User submits access request ticket
2. Manager approval required
3. Admin reviews and implements
4. User notified of access grant
5. Documented in access log

**Access Review Schedule:**
- Critical systems: Monthly
- Standard systems: Quarterly
- All access: Annually

**Emergency Access:**
- Break-glass procedures documented separately
- All emergency access logged and reviewed
- Must be reversed within 24 hours

**Audit Requirements:**
- All access changes logged
- Regular audit reports generated
- Compliance reviews quarterly
- Exceptions require documentation''',
                'tags': ['Access Control', 'Permissions', 'Security', 'Compliance'],
            },
            {
                'subject': 'Knowledge Base Administration and Content Management',
                'category': 'Others',
                'visibility': 'System Admin',
                'description': '''**Knowledge Base Administration Guide**

System Administrators manage the Knowledge Base content and structure.

**Content Management:**

1. **Article Categories**
   - IT Support
   - Asset Check In
   - Asset Check Out
   - New Budget Proposal
   - Others

2. **Visibility Levels**
   - Employee: General information
   - Ticket Coordinator: Operational procedures
   - System Admin: Administrative guides

**Article Lifecycle:**

| Status | Description |
|--------|-------------|
| Draft | Being created/edited |
| Active | Published and visible |
| Archived | Hidden but preserved |
| Deleted | Permanently removed |

**Quality Standards:**
- Clear, concise titles
- Well-structured content
- Accurate and current information
- Proper categorization
- Relevant tags assigned

**Version Control:**
- All changes tracked automatically
- Version history preserved
- Previous versions can be restored
- Compare versions for changes

**Content Review:**
- Monthly review of top articles
- Quarterly full content audit
- User feedback integration
- Analytics-driven improvements

**Article Creation Guidelines:**
1. Identify knowledge gap
2. Research and gather information
3. Draft content following templates
4. Review for accuracy
5. Assign category and visibility
6. Add relevant tags
7. Publish and monitor feedback

**Archiving Policy:**
- Outdated articles archived, not deleted
- Archived content searchable by admins
- Restore process available
- Deletion requires director approval''',
                'tags': ['Knowledge Base', 'Content Management', 'Administration', 'Documentation'],
                'versions': [
                    {'changes': 'Created article', 'content': 'Knowledge Base is managed by System Administrators.'},
                    {'changes': 'Added article lifecycle table', 'content': 'Knowledge Base is managed by System Administrators. Articles have lifecycle stages: Draft, Active, Archived, Deleted.'},
                    {'changes': 'Added comprehensive administration guidelines', 'content': None},
                ]
            },
            {
                'subject': 'Ticket System Configuration and Settings',
                'category': 'IT Support',
                'visibility': 'System Admin',
                'description': '''**Ticket System Configuration Guide**

This guide covers the configurable settings and options for the ticketing system.

**System Settings:**

1. **General Settings**
   - Company name and branding
   - Default timezone
   - Business hours configuration
   - Email notification templates

2. **Ticket Settings**
   - Auto-assignment rules
   - Priority definitions
   - Category management
   - Custom fields configuration

3. **SLA Configuration**
   - Response time targets
   - Resolution time targets
   - Escalation rules
   - Business hours calculation

**Email Integration:**
- Incoming email parsing
- Automatic ticket creation
- Reply threading
- Attachment handling

**Notification Settings:**
| Event | Recipients |
|-------|------------|
| New Ticket | Assigned coordinator |
| Status Change | Requester, Assignee |
| SLA Warning | Assignee, Manager |
| Escalation | Escalation team |

**Automation Rules:**
- Auto-categorization based on keywords
- Priority suggestion based on content
- Duplicate detection
- Auto-close after inactivity

**Integration Settings:**
- Email server configuration
- SSO/LDAP integration
- API access tokens
- Webhook configurations

**Backup and Recovery:**
- Daily automated backups
- 30-day retention policy
- Manual backup option
- Recovery procedures documented

**Maintenance Windows:**
- Schedule during off-hours
- Notify users in advance
- Document changes made
- Test after maintenance''',
                'tags': ['Configuration', 'System Settings', 'Ticket System', 'Administration'],
            },
            {
                'subject': 'Data Privacy and Compliance Regulations',
                'category': 'Others',
                'visibility': 'System Admin',
                'description': '''**Data Privacy and Compliance Guide**

System Administrators must ensure all data handling complies with regulations.

**Data Classification:**

| Level | Description | Handling Requirements |
|-------|-------------|----------------------|
| Public | General information | No restrictions |
| Internal | Company-wide info | Internal access only |
| Confidential | Sensitive business data | Need-to-know basis |
| Restricted | Personal/financial data | Strict access controls |

**Personal Data Handling:**
- Collect only necessary data
- Store securely with encryption
- Limit access to authorized personnel
- Delete when no longer needed
- Honor data subject requests

**Compliance Requirements:**
1. Data Protection Act compliance
2. Regular privacy impact assessments
3. Data breach notification procedures
4. User consent management
5. Third-party data processing agreements

**Data Retention:**
| Data Type | Retention Period |
|-----------|-----------------|
| User accounts | Duration of employment + 7 years |
| Tickets | 5 years |
| Audit logs | 7 years |
| Session data | 30 days |

**Breach Response:**
1. Identify and contain the breach
2. Assess the risk and impact
3. Notify affected individuals (if required)
4. Report to authorities (within 72 hours)
5. Document and review

**Regular Audits:**
- Monthly access reviews
- Quarterly compliance checks
- Annual third-party audits
- Continuous monitoring systems

**Training Requirements:**
- Annual privacy training for all staff
- Specialized training for data handlers
- Incident response drills
- Policy acknowledgment records''',
                'tags': ['Privacy', 'Compliance', 'Data Protection', 'Regulations', 'Security'],
                'versions': [
                    {'changes': 'Created article', 'content': 'System Administrators ensure data compliance.'},
                    {'changes': 'Added data classification table', 'content': None},
                ]
            },
            {
                'subject': 'System Monitoring and Performance Management',
                'category': 'IT Support',
                'visibility': 'System Admin',
                'description': '''**System Monitoring and Performance Guide**

Administrators are responsible for monitoring system health and performance.

**Key Metrics to Monitor:**

1. **System Health**
   - CPU utilization
   - Memory usage
   - Disk space
   - Network throughput

2. **Application Performance**
   - Response times
   - Error rates
   - User sessions
   - API call volumes

3. **Ticket Metrics**
   - Open ticket count
   - Average resolution time
   - SLA compliance rate
   - User satisfaction scores

**Monitoring Tools:**
- Dashboard with real-time metrics
- Automated alerting system
- Log aggregation and analysis
- Performance trending reports

**Alert Thresholds:**
| Metric | Warning | Critical |
|--------|---------|----------|
| CPU | 70% | 90% |
| Memory | 75% | 90% |
| Disk | 80% | 95% |
| Response Time | 2s | 5s |

**Incident Response:**
1. Acknowledge alert
2. Assess impact and severity
3. Begin troubleshooting
4. Communicate status
5. Implement fix
6. Document resolution

**Capacity Planning:**
- Monthly usage trending
- Quarterly capacity reviews
- Annual infrastructure planning
- Growth projections

**Reporting:**
- Daily health summaries
- Weekly performance reports
- Monthly trend analysis
- Quarterly executive summaries''',
                'tags': ['Monitoring', 'Performance', 'System Health', 'Administration'],
            },
            {
                'subject': 'Budget Proposal Review and Approval Process',
                'category': 'New Budget Proposal',
                'visibility': 'System Admin',
                'description': '''**Budget Proposal Administration Guide**

System Administrators oversee the budget proposal workflow and approvals.

**Budget Request Categories:**

1. **Capital Expenditure (CapEx)**
   - Hardware purchases
   - Infrastructure upgrades
   - Software licenses (perpetual)

2. **Operational Expenditure (OpEx)**
   - Subscriptions and renewals
   - Maintenance contracts
   - Support services

**Approval Thresholds:**

| Amount | Approval Level |
|--------|---------------|
| < $1,000 | Manager |
| $1,000 - $5,000 | Director |
| $5,000 - $25,000 | VP |
| > $25,000 | Executive Committee |

**Review Process:**
1. Verify requestor eligibility
2. Confirm budget availability
3. Validate business justification
4. Check vendor/pricing
5. Ensure proper approvals obtained
6. Process or escalate

**Required Documentation:**
- Detailed cost breakdown
- Business justification
- Vendor quotes (minimum 3 for >$5,000)
- ROI analysis (for major purchases)
- Manager approval

**Tracking and Reporting:**
- All requests logged in system
- Monthly budget utilization reports
- Quarterly variance analysis
- Annual budget planning support

**Rejection Handling:**
- Clear reason documentation
- Guidance for resubmission
- Escalation path available
- Appeal process defined

**Audit Trail:**
All budget decisions are logged with full audit trail for compliance and review.''',
                'tags': ['Budget', 'Approval', 'Finance', 'Administration', 'Process'],
                'versions': [
                    {'changes': 'Created article', 'content': 'Budget proposals are reviewed by administrators.'},
                    {'changes': 'Added approval thresholds', 'content': None},
                ]
            },
        ]

        # Create all articles
        all_articles = employee_articles + coordinator_articles + admin_articles
        created_count = 0
        version_count = 0

        for article_data in all_articles:
            # Extract version data if present
            versions_data = article_data.pop('versions', None)
            
            # Create the article
            article = KnowledgeArticle.objects.create(**article_data)
            created_count += 1

            # Create version history
            if versions_data:
                # Create multiple versions
                for idx, v_data in enumerate(versions_data):
                    version_content = v_data.get('content')
                    if version_content is None:
                        # Use current article content for latest version
                        version_content = article_data['description']
                    
                    KnowledgeArticleVersion.objects.create(
                        article=article,
                        version_number=str(idx + 1),
                        editor=None,
                        changes=v_data.get('changes', 'Updated article'),
                        metadata={'auto_seeded': True},
                        subject_snapshot=article_data['subject'],
                        description_snapshot=version_content,
                        category_snapshot=article_data['category'],
                        visibility_snapshot=article_data['visibility'],
                        tags_snapshot=article_data['tags'],
                    )
                    version_count += 1
            else:
                # Create single initial version
                KnowledgeArticleVersion.objects.create(
                    article=article,
                    version_number='1',
                    editor=None,
                    changes='Created article',
                    metadata={'auto_seeded': True},
                    subject_snapshot=article_data['subject'],
                    description_snapshot=article_data['description'],
                    category_snapshot=article_data['category'],
                    visibility_snapshot=article_data['visibility'],
                    tags_snapshot=article_data['tags'],
                )
                version_count += 1

            self.stdout.write(f'  Created: {article.subject} ({article.visibility})')

        self.stdout.write(self.style.SUCCESS(
            f'\nSuccessfully seeded {created_count} articles with {version_count} versions!'
        ))
        self.stdout.write(f'  - Employee articles: {len(employee_articles)}')
        self.stdout.write(f'  - Coordinator articles: {len(coordinator_articles)}')
        self.stdout.write(f'  - Admin articles: {len(admin_articles)}')
