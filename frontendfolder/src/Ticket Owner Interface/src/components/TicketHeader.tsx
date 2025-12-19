import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface TicketHeaderProps {
  ticket: {
    id: string;
    status: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    lifecycle: 'Triage Ticket' | 'Resolve Ticket' | 'Finalize Ticket';
  };
  onStatusChange: (status: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => void;
  onLifecycleChange: (lifecycle: 'Triage Ticket' | 'Resolve Ticket' | 'Finalize Ticket') => void;
}

export function TicketHeader({ ticket, onStatusChange, onLifecycleChange }: TicketHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LOW':
        return 'bg-green-100 text-green-700';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700';
      case 'CRITICAL':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2>Ticket No. {ticket.id}</h2>
          <span className={`px-3 py-1 rounded text-xs ${getStatusColor(ticket.status)}`}>
            ● {ticket.status}
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onLifecycleChange('Triage Ticket')}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              ticket.lifecycle === 'Triage Ticket'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Triage Ticket
          </button>
          <button
            onClick={() => onLifecycleChange('Resolve Ticket')}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              ticket.lifecycle === 'Resolve Ticket'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Resolve Ticket
          </button>
          <button
            onClick={() => onLifecycleChange('Finalize Ticket')}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              ticket.lifecycle === 'Finalize Ticket'
                ? 'bg-red-400 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Finalize Ticket
          </button>
        </div>
      </div>

      {/* Priority Selector */}
      <div className="flex gap-2">
        <span className="text-sm text-gray-600">Priority:</span>
        <div className="flex gap-2">
          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((priority) => (
            <button
              key={priority}
              onClick={() => onStatusChange(priority)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                ticket.status === priority
                  ? getStatusColor(priority)
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {priority}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
