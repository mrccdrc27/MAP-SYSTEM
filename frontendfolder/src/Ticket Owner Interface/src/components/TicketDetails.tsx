import { useState } from 'react';
import { Edit2, Save, X, Info, FileText, Image as ImageIcon, Download, File } from 'lucide-react';

interface TicketDetailsProps {
  ticket: {
    subject: string;
    description: string;
    technicalDetails: string;
    createdDate: string;
  };
  onUpdate: (updates: { subject?: string; description?: string; technicalDetails?: string }) => void;
}

export function TicketDetails({ ticket, onUpdate }: TicketDetailsProps) {
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingTechnical, setIsEditingTechnical] = useState(false);
  
  const [subject, setSubject] = useState(ticket.subject);
  const [description, setDescription] = useState(ticket.description);
  const [technicalDetails, setTechnicalDetails] = useState(ticket.technicalDetails);

  const handleSaveSubject = () => {
    onUpdate({ subject });
    setIsEditingSubject(false);
  };

  const handleSaveDescription = () => {
    onUpdate({ description });
    setIsEditingDescription(false);
  };

  const handleSaveTechnical = () => {
    onUpdate({ technicalDetails });
    setIsEditingTechnical(false);
  };

  const handleCancelSubject = () => {
    setSubject(ticket.subject);
    setIsEditingSubject(false);
  };

  const handleCancelDescription = () => {
    setDescription(ticket.description);
    setIsEditingDescription(false);
  };

  const handleCancelTechnical = () => {
    setTechnicalDetails(ticket.technicalDetails);
    setIsEditingTechnical(false);
  };

  // Mock attachments
  const attachments = [
    {
      id: '1',
      name: 'error-screenshot.png',
      type: 'image',
      size: '245 KB',
      uploadedBy: 'Sarah Chen',
      uploadedDate: 'Dec 2, 2025'
    },
    {
      id: '2',
      name: 'system-logs.txt',
      type: 'document',
      size: '12 KB',
      uploadedBy: 'Sarah Chen',
      uploadedDate: 'Dec 2, 2025'
    },
    {
      id: '3',
      name: 'requirements-doc.pdf',
      type: 'document',
      size: '1.2 MB',
      uploadedBy: 'Sarah Chen',
      uploadedDate: 'Dec 1, 2025'
    },
    {
      id: '4',
      name: 'architecture-diagram.png',
      type: 'image',
      size: '580 KB',
      uploadedBy: 'Mike Johnson',
      uploadedDate: 'Nov 30, 2025'
    }
  ];

  const getFileIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="w-5 h-5 text-blue-600" />;
    if (type === 'document') return <FileText className="w-5 h-5 text-gray-600" />;
    return <File className="w-5 h-5 text-gray-600" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Subject */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-600">Subject:</label>
          {!isEditingSubject && (
            <button
              onClick={() => setIsEditingSubject(true)}
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        {isEditingSubject ? (
          <div className="space-y-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveSubject}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancelSubject}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p>{ticket.subject}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Submitted: {ticket.createdDate}
        </p>
      </div>

      {/* Description */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-600">Description:</label>
          {!isEditingDescription && (
            <button
              onClick={() => setIsEditingDescription(true)}
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        {isEditingDescription ? (
          <div className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveDescription}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancelDescription}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700">{ticket.description}</p>
        )}
      </div>

      {/* Technical Details / Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start gap-2 mb-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-900">Technical Details & Instructions</span>
              {!isEditingTechnical && (
                <button
                  onClick={() => setIsEditingTechnical(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
            {isEditingTechnical ? (
              <div className="space-y-2">
                <textarea
                  value={technicalDetails}
                  onChange={(e) => setTechnicalDetails(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add technical details, requirements, or special instructions that TTS needs to know..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTechnical}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelTechnical}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-800">{ticket.technicalDetails}</p>
            )}
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className="mt-6">
        <h3 className="text-sm text-gray-600 mb-3">Attachments ({attachments.length}):</h3>
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div 
              key={attachment.id} 
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0">
                  {getFileIcon(attachment.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{attachment.name}</p>
                  <p className="text-xs text-gray-500">
                    {attachment.size} • Uploaded by {attachment.uploadedBy} • {attachment.uploadedDate}
                  </p>
                </div>
              </div>
              <button 
                className="flex-shrink-0 ml-3 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm flex items-center gap-1 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}