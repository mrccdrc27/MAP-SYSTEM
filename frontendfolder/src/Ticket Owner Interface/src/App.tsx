import { useState } from 'react';
import { TicketHeader } from './components/TicketHeader';
import { TicketDetails } from './components/TicketDetails';
import { RequesterComms } from './components/RequesterComms';
import { MessagesPanel } from './components/MessagesPanel';
import { DetailsPanel } from './components/DetailsPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'details' | 'messages'>('details');
  const [mainTab, setMainTab] = useState<'ticket' | 'requester'>('ticket');
  
  const [ticket, setTicket] = useState({
    id: 'TX2025112374D276',
    subject: 'Equipment Request - Logitech K380 (IAM#884)',
    description: 'Requesting checkout of Logitech K380 for design work. Expected usage period: 3 months. Location: Main Office - 3rd floor. Manager approval: Alice Johnson. Will follow all equipment handling guidelines.',
    technicalDetails: 'Ensure all asset tracking requirements are met. Use a barcode scanner to log the asset\'s movement. Scan the asset tag and the new location (e.g., user\'s desk, repair-room shelf). This physical scan must match the digital update in the AMS to ensure a verifiable chain of custody.',
    status: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    priority: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH',
    ticketOwner: 'Alice Johnson',
    currentOwner: 'Jane Smith',
    requester: 'Marc Cedric Mayoga',
    createdDate: 'November 24, 2025 at 4:57 AM',
    assignedOn: '12/1/2025, 1:59:48 PM',
    role: 'Asset Manager',
    lifecycle: 'Triage Ticket' as 'Triage Ticket' | 'Resolve Ticket' | 'Finalize Ticket'
  });

  // Requester messages (ticket owner <-> requester)
  const [requesterMessages, setRequesterMessages] = useState([
    {
      id: '1',
      sender: 'Marc Cedric Mayoga',
      role: 'Requester',
      timestamp: '11/24/2025',
      time: '4:57 AM',
      content: 'Hi, I need to request a Logitech K380 keyboard for my design work. I\'ll need it for approximately 3 months. I\'m located on the 3rd floor of the main office, and my manager Alice Johnson has already approved this request. I\'ve also completed the equipment handling training last week.',
      isOwn: false
    },
    {
      id: '2',
      sender: 'Jane Smith',
      role: 'Asset Manager',
      timestamp: '11/24/2025',
      time: '9:15 AM',
      content: 'Hello Marc, thank you for your request. I can see that you\'ve completed the equipment handling training, which is great. Can you please confirm the specific return date? You mentioned approximately 3 months - would that be around March 1, 2026?',
      isOwn: true
    },
    {
      id: '3',
      sender: 'Marc Cedric Mayoga',
      role: 'Requester',
      timestamp: '11/24/2025',
      time: '10:30 AM',
      content: 'Yes, March 1, 2026 would be the expected return date. Should I come to the asset office to pick it up, or will it be delivered to my desk?',
      isOwn: false
    },
    {
      id: '4',
      sender: 'Jane Smith',
      role: 'Asset Manager',
      timestamp: '11/24/2025',
      time: '11:45 AM',
      content: 'Perfect, I\'ve noted March 1, 2026 as the return date. You\'ll need to come to the Asset Management office on the 1st floor to pick it up. We need to scan the asset tag and your employee badge to complete the checkout process. Also, can you provide your desk location code for our tracking system?',
      isOwn: true
    },
    {
      id: '5',
      sender: 'Marc Cedric Mayoga',
      role: 'Requester',
      timestamp: '11/24/2025',
      time: '2:20 PM',
      content: 'My desk location is 3F-DESIGN-042. What are your office hours? I\'d like to pick it up as soon as possible.',
      isOwn: false
    },
    {
      id: '6',
      sender: 'Jane Smith',
      role: 'Asset Manager',
      timestamp: '11/25/2025',
      time: '8:30 AM',
      content: 'Thanks for the desk code. Our office hours are Monday-Friday, 9 AM to 5 PM. I\'ll have the keyboard ready for you. Just bring your employee ID, and the checkout should only take about 5 minutes. We\'ll scan the asset, update the AMS system, and you\'ll be all set.',
      isOwn: true
    },
    {
      id: '7',
      sender: 'Marc Cedric Mayoga',
      role: 'Requester',
      timestamp: '11/25/2025',
      time: '9:45 AM',
      content: 'Great! I\'ll stop by this afternoon around 2 PM. Do I need to bring anything else besides my employee ID?',
      isOwn: false
    },
    {
      id: '8',
      sender: 'Jane Smith',
      role: 'Asset Manager',
      timestamp: '11/25/2025',
      time: '10:00 AM',
      content: 'Just your employee ID is fine. I\'ll have all the paperwork ready. See you at 2 PM!',
      isOwn: true
    },
    {
      id: '9',
      sender: 'Marc Cedric Mayoga',
      role: 'Requester',
      timestamp: '11/25/2025',
      time: '2:15 PM',
      content: 'I just picked up the keyboard. Thanks for your help! Quick question - I noticed the keyboard has a small scratch on the back. Should I note that somewhere, or was it already documented?',
      isOwn: false
    },
    {
      id: '10',
      sender: 'Jane Smith',
      role: 'Asset Manager',
      timestamp: '11/25/2025',
      time: '2:30 PM',
      content: 'Good catch! Yes, that scratch was already documented in the asset condition notes before checkout. You\'re all clear. If you notice any functional issues with the keyboard, just let me know. Otherwise, we\'ll see you on March 1, 2026 for the return. Enjoy!',
      isOwn: true
    },
    {
      id: '11',
      sender: 'Marc Cedric Mayoga',
      role: 'Requester',
      timestamp: '11/25/2025',
      time: '2:35 PM',
      content: 'Perfect, thanks again!',
      isOwn: false
    }
  ]);

  // Agent messages (ticket owner <-> TTS agents)
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'Support Agent',
      role: 'TTS Agent',
      timestamp: '12/2/2025',
      time: '8:02 PM',
      content: 'The barcode scanner in the main office is not working. You may need to use the one from the 2nd floor.'
    },
    {
      id: '2',
      sender: 'IT Admin',
      role: 'TTS Agent',
      timestamp: '12/2/2025',
      time: '8:04 PM',
      content: 'I\'ve updated the AMS with the asset location. Please verify the entry.'
    }
  ]);

  const [actionLog, setActionLog] = useState([
    {
      id: '1',
      user: 'Jane Smith',
      role: 'Asset Manager',
      action: 'IN PROGRESS',
      timestamp: '2d ago',
      badge: 'IN PROGRESS'
    },
    {
      id: '2',
      user: 'Marc Cedric Mayoga',
      role: 'Admin',
      action: 'RESOLVED',
      timestamp: '2d ago',
      badge: 'RESOLVED'
    }
  ]);

  const handleUpdateTicket = (updates: Partial<typeof ticket>) => {
    setTicket(prev => ({ ...prev, ...updates }));
  };

  const handleSendRequesterMessage = (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      sender: ticket.currentOwner,
      role: ticket.role,
      timestamp: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      content,
      isOwn: true
    };
    setRequesterMessages(prev => [...prev, newMessage]);
  };

  const handleSendAgentMessage = (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      sender: ticket.currentOwner,
      role: ticket.role,
      timestamp: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      content
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleStatusChange = (status: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    setTicket(prev => ({ ...prev, status }));
    setActionLog(prev => [{
      id: Date.now().toString(),
      user: ticket.currentOwner,
      role: ticket.role,
      action: `Changed status to ${status}`,
      timestamp: 'Just now',
      badge: status
    }, ...prev]);
  };

  const handleLifecycleChange = (lifecycle: 'Triage Ticket' | 'Resolve Ticket' | 'Finalize Ticket') => {
    setTicket(prev => ({ ...prev, lifecycle }));
    setActionLog(prev => [{
      id: Date.now().toString(),
      user: ticket.currentOwner,
      role: ticket.role,
      action: lifecycle,
      timestamp: 'Just now',
      badge: lifecycle === 'Triage Ticket' ? 'TRIAGE' : lifecycle === 'Resolve Ticket' ? 'RESOLVING' : 'FINALIZING'
    }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-2">
          Tickets / Ticket Detail
        </div>
        
        <h1 className="mb-6">Ticket Overview</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <TicketHeader 
              ticket={ticket}
              onStatusChange={handleStatusChange}
              onLifecycleChange={handleLifecycleChange}
            />
            
            {/* Main Tabs */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="flex border-b">
                <button
                  onClick={() => setMainTab('ticket')}
                  className={`flex-1 px-4 py-3 text-sm ${
                    mainTab === 'ticket'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ticket Details
                </button>
                <button
                  onClick={() => setMainTab('requester')}
                  className={`flex-1 px-4 py-3 text-sm ${
                    mainTab === 'requester'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Requester Communication
                </button>
              </div>

              {/* Tab Content */}
              {mainTab === 'ticket' ? (
                <TicketDetails 
                  ticket={ticket}
                  onUpdate={handleUpdateTicket}
                />
              ) : (
                <RequesterComms 
                  messages={requesterMessages}
                  onSendMessage={handleSendRequesterMessage}
                  currentUser={ticket.currentOwner}
                  requesterName={ticket.requester}
                />
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 px-4 py-3 text-sm ${
                    activeTab === 'details'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex-1 px-4 py-3 text-sm ${
                    activeTab === 'messages'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Messages
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'details' ? (
                <DetailsPanel 
                  ticket={ticket}
                  actionLog={actionLog}
                />
              ) : (
                <MessagesPanel 
                  messages={messages}
                  onSendMessage={handleSendAgentMessage}
                  currentUser={ticket.currentOwner}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}