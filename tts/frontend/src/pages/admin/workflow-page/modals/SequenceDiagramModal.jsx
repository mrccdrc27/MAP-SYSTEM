import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { 
  X, 
  Layout, 
  Code, 
  Copy, 
  Check, 
  Download, 
  Image as ImageIcon, 
  FileCode, 
  AlertCircle 
} from 'lucide-react';
import styles from './sequence-diagram-modal.module.css';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    fontFamily: 'inherit',
    primaryColor: '#e3f2fd',
    primaryTextColor: '#0277bd',
    primaryBorderColor: '#81d4fa',
    lineColor: '#78909c',
    secondaryColor: '#f1f8e9',
    tertiaryColor: '#ffffff',
    noteBkgColor: '#fff9c4',
    noteBorderColor: '#fff59d'
  },
  securityLevel: 'loose',
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 20,
    actorMargin: 60,
    width: 160,
    height: 60,
    boxMargin: 15,
    boxTextMargin: 10,
    noteMargin: 15,
    messageMargin: 40,
    mirrorActors: false,
    bottomMarginAdj: 1,
    useMaxWidth: true,
    rightAngles: false,
    showSequenceNumbers: true,
  },
});

/**
 * Generate Mermaid sequence diagram code from workflow nodes and edges
 */
function generateMermaidCode(nodes, edges, workflowName = 'Workflow') {
  if (!nodes || nodes.length === 0) {
    return `sequenceDiagram
    Note over System: No steps defined yet`;
  }

  let code = `sequenceDiagram
    title ${sanitizeText(workflowName) || 'Workflow Sequence Diagram'}
`;

  // Create a map of node id to node for quick lookup
  const nodeMap = {};
  nodes.forEach(n => {
    nodeMap[n.id] = n;
  });

  // Create participants from nodes (each step is a participant)
  // Use step name as alias for cleaner display
  nodes.forEach((node) => {
    const participantId = sanitizeParticipant(node.id);
    const displayName = sanitizeText(node.name);
    const role = node.role ? ` (${sanitizeText(node.role)})` : '';
    code += `    participant ${participantId} as ${displayName}${role}\n`;
  });

  code += '\n';

  // Find start node
  const startNode = nodes.find(n => n.is_start);
  if (!startNode) {
    const firstNodeId = sanitizeParticipant(nodes[0]?.id || 'System');
    code += `    Note over ${firstNodeId}: No start step defined\n`;
    return code;
  }

  // Build adjacency list for traversal
  const adjacency = {};
  nodes.forEach(n => {
    adjacency[n.id] = [];
  });
  edges.forEach(e => {
    if (adjacency[e.from]) {
      adjacency[e.from].push(e);
    }
  });

  // Mark start node
  const startId = sanitizeParticipant(startNode.id);
  code += `    Note over ${startId}: ▶ START\n`;

  // BFS traversal to generate sequence in order
  const visited = new Set();
  const queue = [startNode.id];
  const processedEdges = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = nodeMap[currentId];
    if (!currentNode) continue;

    const outgoingEdges = adjacency[currentId] || [];
    
    // Sort edges for consistent output
    outgoingEdges.forEach(edge => {
      const edgeKey = `${edge.from}-${edge.to}`;
      if (processedEdges.has(edgeKey)) return;
      processedEdges.add(edgeKey);

      const targetNode = nodeMap[edge.to];
      if (!targetNode) return;

      const sourceId = sanitizeParticipant(currentNode.id);
      const targetId = sanitizeParticipant(targetNode.id);
      const actionName = sanitizeText(edge.name) || 'proceed';

      // Draw arrow from source to target
      code += `    ${sourceId}->>${targetId}: ${actionName}\n`;
      
      // Add activation for the target
      code += `    activate ${targetId}\n`;

      // If target is an end node, mark it
      if (targetNode.is_end) {
        code += `    Note over ${targetId}: ■ END\n`;
      }
      
      code += `    deactivate ${targetId}\n`;

      if (!visited.has(targetNode.id)) {
        queue.push(targetNode.id);
      }
    });
  }

  // Add note for end nodes summary
  const endNodes = nodes.filter(n => n.is_end);
  if (endNodes.length > 0) {
    const endNodeIds = endNodes.map(n => sanitizeParticipant(n.id)).join(',');
    code += `\n    Note over ${endNodeIds}: Workflow Complete\n`;
  }

  return code;
}

/**
 * Sanitize participant names for mermaid (no spaces, special chars)
 */
function sanitizeParticipant(name) {
  // Create a short hash-like id from the name
  return 'P_' + String(name).replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
}

/**
 * Sanitize text for mermaid labels
 */
function sanitizeText(text) {
  return (text || '').replace(/[#;:<>]/g, '').substring(0, 50);
}

export default function SequenceDiagramModal({ 
  isOpen, 
  onClose, 
  nodes, 
  edges, 
  workflowName,
  onConfirm,
  isCreating
}) {
  const diagramRef = useRef(null);
  const [mermaidCode, setMermaidCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [svgContent, setSvgContent] = useState('');

  // Generate mermaid code when props change
  useEffect(() => {
    if (isOpen && nodes) {
      const code = generateMermaidCode(nodes, edges, workflowName);
      setMermaidCode(code);
      setError(null);
    }
  }, [isOpen, nodes, edges, workflowName]);
  
  // ... (rest of the render logic remains the same)

  // Render mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (!mermaidCode || !diagramRef.current || !isOpen) return;

      try {
        // Clear previous content
        diagramRef.current.innerHTML = '';
        
        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}`;
        
        // Render the diagram
        const { svg } = await mermaid.render(id, mermaidCode);
        setSvgContent(svg);
        diagramRef.current.innerHTML = svg;
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Failed to render diagram. Check the workflow structure.');
        diagramRef.current.innerHTML = `<div class="${styles.errorMessage}">Unable to render diagram</div>`;
      }
    };

    renderDiagram();
  }, [mermaidCode, isOpen]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [mermaidCode]);

  const handleExportSVG = useCallback(() => {
    if (!svgContent) return;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflowName || 'workflow'}-sequence-diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [svgContent, workflowName]);

  const handleExportPNG = useCallback(async () => {
    if (!svgContent) return;

    try {
      // Create a canvas to render the SVG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Convert SVG to data URL
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width * 2; // Higher resolution
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Download
        const link = document.createElement('a');
        link.download = `${workflowName || 'workflow'}-sequence-diagram.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    } catch (err) {
      console.error('PNG export error:', err);
    }
  }, [svgContent, workflowName]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>
            <Layout size={20} /> 
            {onConfirm ? 'Review & Confirm Workflow' : 'Sequence Diagram'}
          </h2>
          <p className={styles.subtitle}>{workflowName || 'Workflow'}</p>
          {!onConfirm && (
            <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
          )}
        </div>

        {onConfirm && (
          <div className={styles.helperBox}>
            <AlertCircle size={20} />
            <div>
              <strong>Pre-Creation Review</strong>
              <br />
              Please review the sequence diagram below. This visualizes how your workflow steps interaction will flow in the system. If the logic appears correct, click <strong>Create Workflow</strong> to finish.
            </div>
          </div>
        )}

        <div className={styles.content}>
          {/* Tab Toggle */}
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${!showCode ? styles.tabActive : ''}`}
              onClick={() => setShowCode(false)}
            >
              <Layout size={16} /> Diagram
            </button>
            <button 
              className={`${styles.tab} ${showCode ? styles.tabActive : ''}`}
              onClick={() => setShowCode(true)}
            >
              <Code size={16} /> Mermaid Code
            </button>
          </div>

          {/* Diagram View */}
          <div className={`${styles.diagramContainer} ${showCode ? styles.hidden : ''}`}>
            {error && (
              <div className={styles.error}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <div ref={diagramRef} className={styles.diagram} />
          </div>

          {/* Code View */}
          <div className={`${styles.codeContainer} ${!showCode ? styles.hidden : ''}`}>
            <pre className={styles.codeBlock}>
              <code>{mermaidCode}</code>
            </pre>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.exportButtons}>
            <button 
              className={styles.exportBtn} 
              onClick={handleCopyCode}
              title="Copy Mermaid code to clipboard"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button 
              className={styles.exportBtn} 
              onClick={handleExportSVG}
              disabled={!svgContent}
              title="Export as SVG"
            >
              <FileCode size={16} /> Export SVG
            </button>
            <button 
              className={styles.exportBtn} 
              onClick={handleExportPNG}
              disabled={!svgContent}
              title="Export as PNG"
            >
              <ImageIcon size={16} /> Export PNG
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className={styles.closeFooterBtn} 
              onClick={onClose}
              disabled={isCreating}
            >
              {onConfirm ? 'Back to Editor' : 'Close'}
            </button>
            
            {onConfirm && (
              <button 
                className={styles.confirmBtn}
                onClick={onConfirm}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Workflow'}
                {!isCreating && <Check size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
