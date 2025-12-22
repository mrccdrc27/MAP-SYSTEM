const faqs = [
  {
    id: 1,
    question: "How do I submit a new ticket?",
    answer: "To submit a new ticket, click on the ''Submit Ticket'' button on your home page or navigate to the ticket submission form from the navigation menu. Fill in all required fields including subject, category, priority, and description, then click Submit."
  },
  {
    id: 2,
    question: "How long does it take to get a response to my ticket?",
    answer: "Response times depend on the priority level: Critical tickets get a response within 4 hours, High priority within 24 hours, Medium within 48 hours, and Low priority within 72 hours during business hours."
  },
  {
    id: 3,
    question: "Can I track the status of my ticket?",
    answer: "Yes! You can track your tickets in the ''Active Tickets'' section. Each ticket shows its current status (New, In Progress, On Hold, Resolved) and you can view detailed information by clicking on the ticket number."
  },
  {
    id: 4,
    question: "What do the different ticket statuses mean?",
    answer: "New: Just submitted and awaiting review. In Progress: Being actively worked on by IT staff. On Hold: Temporarily paused, waiting for additional information or resources. Resolved: Issue has been fixed and awaiting your confirmation. Closed: Ticket is complete and archived."
  },
  {
    id: 5,
    question: "How do I close a resolved ticket?",
    answer: "Once your ticket is marked as ''Resolved'', you will receive a notification. Review the resolution notes, and if you are satisfied with the solution, you can close the ticket by submitting a Customer Satisfaction (CSAT) rating and optional feedback."
  },
  {
    id: 6,
    question: "Can I reopen a closed ticket?",
    answer: "No, closed tickets cannot be reopened. If the issue persists or returns, please submit a new ticket and reference the previous ticket number in the description for faster resolution."
  },
  {
    id: 7,
    question: "What is the CSAT rating?",
    answer: "CSAT (Customer Satisfaction) is a 1-5 star rating system where you can rate the quality of service you received. This helps us improve our support services and recognize excellent performance from our IT team."
  },
  {
    id: 8,
    question: "Can I attach files to my ticket?",
    answer: "Yes, you can attach screenshots, documents, or other relevant files when submitting a ticket. Supported file types include images (JPG, PNG), documents (PDF, DOCX), and compressed files (ZIP). Maximum file size is 10MB per attachment."
  },
  {
    id: 9,
    question: "How do I update my profile information?",
    answer: "Click on your profile avatar in the top right corner, select ''Settings'' from the dropdown menu, and you can update your contact information, notification preferences, and password."
  },
  {
    id: 10,
    question: "What should I do if I forgot my password?",
    answer: "On the login page, click ''Forgot Password'' and enter your email address. You will receive a password reset link via email. Follow the instructions to create a new password."
  },
  {
    id: 11,
    question: "Can I see the history of all my tickets?",
    answer: "Yes! Navigate to ''Ticket Records'' in the menu to view all your past tickets, including closed, rejected, and withdrawn tickets. You can filter by status, date range, or search by ticket number."
  },
  {
    id: 12,
    question: "What is SLA and why does it matter?",
    answer: "SLA (Service Level Agreement) is the guaranteed response and resolution time for your ticket based on its priority. Meeting SLA ensures you get timely support. You can see if your ticket is ''On Time'', ''Due Soon'', or ''Overdue'' in the ticket details."
  },
  {
    id: 13,
    question: "Can I communicate with the IT staff about my ticket?",
    answer: "Yes, you can add comments and updates to your ticket through the ticket tracker page. The assigned IT staff will receive notifications and can respond to your questions or provide updates."
  },
  {
    id: 14,
    question: "What happens if I withdraw a ticket?",
    answer: "If you no longer need assistance, you can withdraw your ticket. Withdrawn tickets are moved to your Ticket Records and cannot be reactivated. If you need help later, please submit a new ticket."
  },
  {
    id: 15,
    question: "Who will be assigned to my ticket?",
    answer: "Tickets are reviewed by the Ticket Coordinator who assigns them to the most appropriate IT staff member based on expertise, workload, and the nature of your issue. You will be notified once your ticket is assigned."
  },
  {
    id: 16,
    question: "Can I change the priority of my ticket after submission?",
    answer: "Priority levels are set during submission based on the urgency and impact of your issue. If circumstances change, you can add a comment requesting a priority change, which will be reviewed by the Ticket Coordinator."
  },
  {
    id: 17,
    question: "What if my issue is urgent?",
    answer: "For urgent issues, select ''Critical'' or ''High'' priority when submitting your ticket. Critical issues (system-wide outages, security breaches) receive immediate attention. For emergencies outside business hours, contact the IT helpdesk directly."
  },
  {
    id: 18,
    question: "How do I know if there are updates to my ticket?",
    answer: "You will receive notifications when your ticket status changes, when staff add comments, or when your ticket is resolved. You can also check the notification bell icon in the navigation bar for recent updates."
  },
  {
    id: 19,
    question: "Can I see who is working on my ticket?",
    answer: "Yes, once your ticket is assigned, you can see the name and profile of the IT staff member handling your case in the ticket details page. This ensures transparency and accountability."
  },
  {
    id: 20,
    question: "What categories of issues can I submit tickets for?",
    answer: "You can submit tickets for various categories including IT Support (hardware, software, network), Access Requests (system access, permissions), Software Requests (new software, licenses), and Hardware Issues (printer, computer, peripherals)."
  }
];

export default faqs;
