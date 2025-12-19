import { CheckCircle, AlertTriangle, XCircle, User, Calendar } from 'lucide-react';

interface ActionLogItem {
  id: string;
  user: string;
  role: string;
  action: string;
  timestamp: string;
  badge: string;
}

interface DetailsPanelProps {
  ticket: {
    ticketOwner: string;
    currentOwner: string;
    role: string;
    createdDate: string;
    assignedOn: string;
    lifecycle: string;
  };
  actionLog: ActionLogItem[];
}

export function DetailsPanel({ ticket, actionLog }: DetailsPanelProps) {
  const getLifecycleIcon = (lifecycle: string) => {
    if (lifecycle === 'Triage Ticket') {
      return <CheckCircle className="w-12 h-12 text-green-500" />;
    } else if (lifecycle === 'Resolve Ticket') {
      return <AlertTriangle className="w-12 h-12 text-yellow-500" />;
    } else {
      return <XCircle className="w-12 h-12 text-gray-400" />;
    }
  };

  const getLifecycleColor = (lifecycle: string) => {
    if (lifecycle === 'Triage Ticket') return 'text-green-600';
    if (lifecycle === 'Resolve Ticket') return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getBadgeColor = (badge: string) => {
    if (badge.includes('PROGRESS')) return 'bg-yellow-100 text-yellow-700';
    if (badge.includes('RESOLVED')) return 'bg-green-100 text-green-700';
    if (badge.includes('TRIAGE')) return 'bg-green-100 text-green-700';
    if (badge.includes('RESOLVING')) return 'bg-yellow-100 text-yellow-700';
    if (badge.includes('FINALIZING')) return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="p-4">
      {/* Status Badge */}
      <div className="mb-6">
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
          {ticket.lifecycle === 'Triage Ticket' ? 'LOW' : 
           ticket.lifecycle === 'Resolve Ticket' ? 'IN PROGRESS' : 
           'PENDING'}
        </span>
      </div>

      {/* Lifecycle Status */}
      <div className="flex justify-center gap-6 mb-6 pb-6 border-b">
        <div className="text-center">
          <div className="mb-2 flex justify-center">
            {ticket.lifecycle === 'Triage Ticket' ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className={`text-xs ${ticket.lifecycle === 'Triage Ticket' ? 'text-green-600' : 'text-gray-400'}`}>
            Triage Ticket
          </div>
          <div className={`text-xs ${ticket.lifecycle === 'Triage Ticket' ? 'text-green-600' : 'text-gray-400'}`}>
            Status Changed
          </div>
        </div>

        <div className="text-center">
          <div className="mb-2 flex justify-center">
            {ticket.lifecycle === 'Resolve Ticket' ? (
              <AlertTriangle className="w-12 h-12 text-yellow-500" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className={`text-xs ${ticket.lifecycle === 'Resolve Ticket' ? 'text-yellow-600' : 'text-gray-400'}`}>
            Resolve Ticket
          </div>
          <div className={`text-xs ${ticket.lifecycle === 'Resolve Ticket' ? 'text-yellow-600' : 'text-gray-400'}`}>
            Status Changed
          </div>
        </div>

        <div className="text-center">
          <div className="mb-2 flex justify-center">
            {ticket.lifecycle === 'Finalize Ticket' ? (
              <XCircle className="w-12 h-12 text-gray-600" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className={`text-xs ${ticket.lifecycle === 'Finalize Ticket' ? 'text-gray-600' : 'text-gray-400'}`}>
            Finalize Ticket
          </div>
          <div className={`text-xs ${ticket.lifecycle === 'Finalize Ticket' ? 'text-gray-600' : 'text-gray-400'}`}>
            Status
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="mb-6">
        <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100">
          <span className="text-sm">Details</span>
          <span>▼</span>
        </button>
        
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Ticket Owner</span>
            <span className="text-gray-900">{ticket.ticketOwner}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Role</span>
            <span className="text-gray-900">N/A</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current Owner</span>
            <span className="text-gray-900">{ticket.currentOwner}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Owner Role</span>
            <span className="text-gray-900">{ticket.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current Status</span>
            <span className="text-gray-900">{ticket.lifecycle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Assigned On</span>
            <span className="text-gray-900">{ticket.assignedOn}</span>
          </div>
        </div>
      </div>

      {/* Action Logs */}
      <div>
        <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 mb-3">
          <span className="text-sm">Action Logs</span>
          <span>▼</span>
        </button>

        <div className="space-y-4">
          {actionLog.map((log) => (
            <div key={log.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{log.user}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${getBadgeColor(log.badge)}`}>
                    {log.badge}
                  </span>
                </div>
                <div className="text-xs text-gray-600">{log.role}</div>
                <div className="text-xs text-gray-400 mt-1">{log.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
