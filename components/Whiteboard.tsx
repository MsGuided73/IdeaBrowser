
import React, { useState, useRef, useEffect } from 'react';
import { 
    Image as ImageIcon, Video, FileText, Mic, Link as LinkIcon, 
    Youtube, Move, X, Plus, MessageSquare, Sparkles, Send, 
    Maximize2, Trash2, Play, FileType, Loader2, Instagram, Square, Smartphone,
    GripHorizontal, ChevronRight, Bot, Cable
} from 'lucide-react';
import { WhiteboardNode, Connection } from '../types';
import { Chat } from '@google/genai';
import { createWhiteboardChatSession, convertNodesToParts } from '../services/geminiService';

const PREVIEW_LIMIT_CHARS = 150;

// Custom TikTok Icon
const TikTokIcon = ({ size = 14, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
);

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export const Whiteboard: React.FC = () => {
    const [nodes, setNodes] = useState<WhiteboardNode[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    
    // Connection Logic State
    const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // AI & Chat State
    const [activeAiNodeId, setActiveAiNodeId] = useState<string | null>(null);
    const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
    const chatSessionsRef = useRef<Record<string, Chat | null>>({});
    
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const [inputMsg, setInputMsg] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scroll chat to bottom when chat history changes
    useEffect(() => {
        if (chatEndRef.current && activeAiNodeId) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chats, activeAiNodeId]);

    // --- Node Management ---

    const addNode = (node: WhiteboardNode) => {
        const defaultDims = {
            width: node.type === 'text' ? 300 : 
                   node.type === 'ai-partner' ? 280 : 320,
            height: node.type === 'text' ? 220 : 
                    node.type === 'ai-partner' ? 180 : 300
        };
        const newNode = { ...defaultDims, ...node };
        setNodes(prev => [...prev, newNode]);

        if (node.type === 'ai-partner') {
            setChats(prev => ({
                ...prev,
                [newNode.id]: [{ role: 'model', text: "Hello! Connect source nodes to me, and I'll use them as my knowledge base." }]
            }));
            setActiveAiNodeId(newNode.id);
        }
    };

    const removeNode = (id: string) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
        
        if (activeAiNodeId === id) {
            setActiveAiNodeId(null);
        }
        // Clean up chat session
        const newChats = { ...chats };
        delete newChats[id];
        setChats(newChats);
        delete chatSessionsRef.current[id];
    };

    // --- Voice Recording ---
    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];
                
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };
                
                mediaRecorder.onstop = () => {
                     const mimeType = mediaRecorder.mimeType || 'audio/webm';
                     const blob = new Blob(audioChunksRef.current, { type: mimeType });
                     const reader = new FileReader();
                     reader.readAsDataURL(blob);
                     reader.onloadend = () => {
                         const base64 = (reader.result as string).split(',')[1];
                         addNode({
                             id: Date.now().toString(),
                             type: 'audio',
                             content: base64,
                             mimeType: mimeType,
                             fileName: `Voice Note ${new Date().toLocaleTimeString()}`,
                             title: 'Voice Memo',
                             position: { x: 300, y: 300 }
                         });
                     };
                };
                
                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Mic error", err);
                alert("Could not access microphone. Please ensure permissions are granted.");
            }
        }
    };

    // --- Drag & Drop Files ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        const x = e.clientX - (rect?.left || 0) - 100; 
        const y = e.clientY - (rect?.top || 0) - 100;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            for (const file of files) {
                await processFile(file as File, x, y);
            }
            return;
        }

        const textData = e.dataTransfer.getData('text/plain');
        const uriList = e.dataTransfer.getData('text/uri-list');
        
        const content = uriList || textData;
        if (content) {
            let type: WhiteboardNode['type'] = 'text';
            let title = 'Note';
            
            if (content.includes('youtube.com') || content.includes('youtu.be')) {
                type = 'youtube';
                title = 'Youtube Video';
            } else if (content.includes('tiktok.com')) {
                type = 'link';
                title = 'TikTok Video';
            } else if (content.includes('instagram.com')) {
                type = 'link';
                title = 'IG Reel';
            } else if (content.startsWith('http')) {
                type = 'link';
                title = 'Website';
            }

            addNode({
                id: Math.random().toString(36).substr(2, 9),
                type,
                content,
                position: { x, y },
                title
            });
        }
    };

    const processFile = (file: File, x: number, y: number) => {
        return new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                const base64 = result.split(',')[1];
                let type: WhiteboardNode['type'] = 'text';
                
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('video/')) type = 'video';
                else if (file.type.startsWith('audio/')) type = 'audio';
                else if (file.type === 'application/pdf') type = 'pdf';

                addNode({
                    id: Math.random().toString(36).substr(2, 9),
                    type,
                    content: base64,
                    mimeType: file.type,
                    fileName: file.name,
                    title: file.name,
                    position: { x, y: y + (nodes.length * 20) } 
                });
                resolve();
            };
            reader.readAsDataURL(file);
        });
    };

    // --- Node Interaction (Drag, Resize, Connect) ---

    const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
        if (connectingFromId) return; // Don't drag node if creating connection
        e.stopPropagation();
        
        // If clicking an AI node, activate its sidebar
        const node = nodes.find(n => n.id === id);
        if (node?.type === 'ai-partner') {
            setActiveAiNodeId(id);
        }

        setDraggedNodeId(id);
        if (node && canvasRef.current) {
             const rect = canvasRef.current.getBoundingClientRect();
             setOffset({
                 x: e.clientX - rect.left - node.position.x,
                 y: e.clientY - rect.top - node.position.y
             });
        }
    };

    const handleMouseDownResize = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingNodeId(id);
    };

    // Start Connection Drag
    const handleMouseDownHandle = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setConnectingFromId(id);
    };

    const handleMouseUpNode = (e: React.MouseEvent, targetId: string) => {
        if (connectingFromId && connectingFromId !== targetId) {
            // Check if connection already exists
            const exists = connections.some(c => 
                (c.from === connectingFromId && c.to === targetId) || 
                (c.from === targetId && c.to === connectingFromId)
            );
            
            if (!exists) {
                setConnections(prev => [...prev, {
                    id: Math.random().toString(36).substr(2, 9),
                    from: connectingFromId,
                    to: targetId
                }]);
                
                // If connecting TO an AI node, activate it to show feedback
                const targetNode = nodes.find(n => n.id === targetId);
                if (targetNode?.type === 'ai-partner') {
                    setActiveAiNodeId(targetId);
                }
            }
        }
        setConnectingFromId(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setMousePos({ x: mouseX, y: mouseY });

        if (resizingNodeId) {
            setNodes(prev => prev.map(n => {
                if (n.id === resizingNodeId) {
                    const newWidth = Math.max(200, mouseX - n.position.x);
                    const newHeight = Math.max(150, mouseY - n.position.y);
                    return { ...n, width: newWidth, height: newHeight };
                }
                return n;
            }));
        } else if (draggedNodeId) {
            const newX = mouseX - offset.x;
            const newY = mouseY - offset.y;
            
            setNodes(prev => prev.map(n => 
                n.id === draggedNodeId ? { ...n, position: { x: newX, y: newY } } : n
            ));
        }
    };

    const handleMouseUpCanvas = () => {
        setDraggedNodeId(null);
        setResizingNodeId(null);
        setConnectingFromId(null);
    };

    // --- Chat Logic ---
    const handleSendMessage = async () => {
        if (!activeAiNodeId || !inputMsg.trim()) return;
        
        const userText = inputMsg;
        setInputMsg('');
        
        setChats(prev => ({
            ...prev,
            [activeAiNodeId]: [...(prev[activeAiNodeId] || []), { role: 'user', text: userText }]
        }));
        
        setIsChatLoading(true);

        try {
            // 1. Identify connected nodes
            const connectedNodeIds = connections
                .filter(c => c.to === activeAiNodeId || c.from === activeAiNodeId)
                .map(c => c.to === activeAiNodeId ? c.from : c.to);
            
            const contextNodes = nodes.filter(n => connectedNodeIds.includes(n.id));

            // 2. Initialize or Reuse Session
            let session = chatSessionsRef.current[activeAiNodeId];
            
            // Always recreate session if context changed? 
            // For simplicity in this demo, we create a fresh session context for each turn if we want to guarantee latest board state,
            // OR we just send the context nodes as part of the message prompt.
            // The SDK Chat object maintains history, so passing context every time might be redundant or confuse it.
            // Strategy: Send context nodes manifest in the message if it's a new session, or just rely on the system instruction update? 
            // Since createWhiteboardChatSession sets system instructions, let's create a new session if one doesn't exist.
            
            if (!session) {
                session = createWhiteboardChatSession(contextNodes);
                chatSessionsRef.current[activeAiNodeId] = session;
            }

            // 3. Convert context nodes to parts for THIS specific message to ensure latest content is used
            // We prepend the context to the message so the model "sees" the current state of connected nodes
            const contextParts = convertNodesToParts(contextNodes);
            
            // If we have context, we send it. If strictly text chat, just text.
            let messagePayload;
            if (contextParts.length > 0) {
                 messagePayload = [
                    ...contextParts,
                    { text: `\n\nUser Query: ${userText}` }
                ];
            } else {
                messagePayload = userText;
            }

            const response = await session.sendMessage({ message: messagePayload });
            
            setChats(prev => ({
                ...prev,
                [activeAiNodeId]: [...(prev[activeAiNodeId] || []), { role: 'model', text: response.text || "I couldn't generate a response." }]
            }));

        } catch (error) {
            console.error(error);
            setChats(prev => ({
                ...prev,
                [activeAiNodeId]: [...(prev[activeAiNodeId] || []), { role: 'model', text: "Error connecting to AI. Please check your API key." }]
            }));
        } finally {
            setIsChatLoading(false);
        }
    };

    // --- Render Helpers ---
    
    const getNodeCenter = (id: string) => {
        const node = nodes.find(n => n.id === id);
        if (!node) return { x: 0, y: 0 };
        const w = node.width || 300;
        const h = node.height || 200;
        return {
            x: node.position.x + w / 2,
            y: node.position.y + h / 2
        };
    };

    const NodeTypeIcon = ({ type, title }: { type: string, title: string }) => {
        const commonClass = "w-full h-full opacity-5";
        switch(type) {
            case 'video': return <Video className={commonClass} />;
            case 'image': return <ImageIcon className={commonClass} />;
            case 'audio': return <Mic className={commonClass} />;
            case 'pdf': return <FileType className={commonClass} />;
            case 'youtube': return <Youtube className={commonClass} />;
            case 'ai-partner': return <Bot className={commonClass} />;
            case 'link': 
                if (title.includes('TikTok')) return <TikTokIcon className={commonClass} />;
                if (title.includes('IG')) return <Instagram className={commonClass} />;
                return <LinkIcon className={commonClass} />;
            default: return <FileText className={commonClass} />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
            
            {/* Whiteboard Canvas */}
            <div 
                ref={canvasRef}
                className="flex-1 relative overflow-hidden bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpCanvas}
                onMouseLeave={handleMouseUpCanvas}
            >
                 {/* Toolbar */}
                 <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-full p-2 flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
                    <button 
                        onClick={toggleRecording} 
                        className={`p-3 rounded-full transition-all duration-300 ${
                            isRecording ? 'bg-red-500 text-white shadow-red-200 shadow-lg animate-pulse' : 'hover:bg-slate-100 text-slate-600'
                        }`} 
                        title={isRecording ? "Stop Recording" : "Record Audio"}
                    >
                        {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                    </button>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Add Media">
                        <Plus size={20} />
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Add Text Note" onClick={() => {
                        addNode({id: Date.now().toString(), type: 'text', content: 'New Idea...', position: {x: 100, y: 100}, title: 'Note'});
                    }}><FileText size={20} /></button>
                    
                    {/* Add AI Partner Button */}
                    <button className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-full transition-colors border border-purple-100" title="Add AI Partner" onClick={() => {
                        addNode({
                            id: Date.now().toString(), 
                            type: 'ai-partner', 
                            content: '', 
                            position: {x: 400, y: 200}, 
                            title: `AI Partner ${nodes.filter(n => n.type === 'ai-partner').length + 1}`
                        });
                    }}><Bot size={20} /></button>

                    <div className="w-px h-6 bg-slate-200"></div>
                    
                    <button className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Add Link" onClick={() => {
                        const url = prompt("Enter URL (TikTok, IG, Youtube, Website):");
                        if(url) addNode({
                            id: Date.now().toString(), 
                            type: url.includes('youtube') ? 'youtube' : 'link', 
                            content: url, 
                            position: {x: 150, y: 150}, 
                            title: url.includes('tiktok') ? 'TikTok' : url.includes('instagram') ? 'IG Reel' : 'Link'
                        });
                    }}><LinkIcon size={20} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*,audio/*,.pdf" onChange={(e) => {
                        if(e.target.files) Array.from(e.target.files).forEach(f => processFile(f as File, 200, 200));
                    }} />
                 </div>

                 {/* Connections Layer (SVG) */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                     {connections.map(conn => {
                         const start = getNodeCenter(conn.from);
                         const end = getNodeCenter(conn.to);
                         return (
                             <line 
                                key={conn.id}
                                x1={start.x} y1={start.y}
                                x2={end.x} y2={end.y}
                                stroke="#cbd5e1"
                                strokeWidth="2"
                             />
                         );
                     })}
                     {connectingFromId && (
                         <line 
                            x1={getNodeCenter(connectingFromId).x} 
                            y1={getNodeCenter(connectingFromId).y}
                            x2={mousePos.x}
                            y2={mousePos.y}
                            stroke="#9333ea"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                         />
                     )}
                 </svg>

                 {/* Nodes */}
                 {nodes.map(node => (
                     <div 
                        key={node.id}
                        className={`absolute rounded-xl shadow-lg border flex flex-col group transition-all duration-200 
                            ${node.type === 'ai-partner' 
                                ? activeAiNodeId === node.id 
                                    ? 'border-purple-500 ring-2 ring-purple-200 shadow-purple-100' 
                                    : 'border-purple-200 bg-white'
                                : 'border-slate-200 bg-white hover:shadow-2xl hover:border-blue-300/50'
                            }
                            ${draggedNodeId === node.id ? 'cursor-grabbing shadow-2xl scale-[1.02] z-50' : 'cursor-grab'}
                        `}
                        style={{ 
                            left: node.position.x, 
                            top: node.position.y, 
                            width: node.width || 280, 
                            height: node.height || 'auto' 
                        }}
                        onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                        onMouseUp={(e) => handleMouseUpNode(e, node.id)}
                     >
                         {/* Node Header */}
                         <div className={`p-3 border-b flex items-center justify-between rounded-t-xl select-none ${
                             node.type === 'ai-partner' ? 'bg-gradient-to-r from-purple-50 to-white border-purple-100' :
                             node.type === 'audio' ? 'bg-red-50 border-slate-100' : 
                             node.type === 'video' ? 'bg-blue-50 border-slate-100' : 
                             node.type === 'pdf' ? 'bg-orange-50 border-slate-100' : 'bg-slate-50 border-slate-100'
                         }`}>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate flex-1 mr-2">
                                {node.type === 'video' && <Video size={14} className="text-blue-600"/>}
                                {node.type === 'image' && <ImageIcon size={14} className="text-purple-600"/>}
                                {node.type === 'audio' && <Mic size={14} className="text-red-600"/>}
                                {node.type === 'text' && <FileText size={14} className="text-slate-600"/>}
                                {node.type === 'pdf' && <FileType size={14} className="text-orange-600"/>}
                                {node.type === 'ai-partner' && <Bot size={14} className="text-purple-600"/>}
                                {node.type === 'link' && (
                                    node.title.includes('TikTok') ? <TikTokIcon className="text-black"/> :
                                    node.title.includes('IG') ? <Instagram size={14} className="text-pink-600"/> :
                                    <LinkIcon size={14} className="text-blue-400"/>
                                )}
                                {node.type === 'youtube' && <Youtube size={14} className="text-red-600"/>}
                                <span className="truncate">{node.title}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="text-slate-400 hover:text-red-500 transition-colors bg-white/50 rounded p-0.5">
                                <Trash2 size={14} />
                            </button>
                         </div>

                         {/* Node Content */}
                         <div className="flex-1 p-3 overflow-hidden relative bg-white rounded-b-xl group-hover:bg-slate-50/30 transition-colors">
                             {/* Background Type Icon Watermark */}
                             <div className="absolute right-2 bottom-2 w-24 h-24 pointer-events-none z-0">
                                 <NodeTypeIcon type={node.type} title={node.title} />
                             </div>

                             {/* Visual Cue Badge */}
                             <div className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400 border border-slate-100 uppercase tracking-wider pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                 {node.type.replace('-', ' ')}
                             </div>

                             <div className="relative z-10 h-full">
                                {node.type === 'text' && (
                                    <textarea 
                                        className="w-full h-full text-sm text-slate-600 resize-none focus:outline-none bg-transparent leading-relaxed"
                                        defaultValue={node.content}
                                        onChange={(e) => { node.content = e.target.value; }} 
                                        placeholder="Type something..."
                                        onMouseDown={(e) => e.stopPropagation()} 
                                    />
                                )}
                                {node.type === 'ai-partner' && (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2">
                                            <Sparkles size={24} />
                                        </div>
                                        <p className="text-xs text-slate-500 max-w-[200px]">
                                            Connect nodes to me to analyze them. Click to open chat sidebar.
                                        </p>
                                        <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                            {connections.filter(c => c.to === node.id || c.from === node.id).length} Linked Sources
                                        </div>
                                    </div>
                                )}
                                {node.type === 'image' && (
                                    <img src={`data:${node.mimeType};base64,${node.content}`} alt={node.title} className="w-full h-full object-cover rounded border border-slate-100" />
                                )}
                                {node.type === 'video' && (
                                    <div className="w-full h-full bg-slate-900 rounded flex items-center justify-center text-white relative overflow-hidden group/video">
                                        <video src={`data:${node.mimeType};base64,${node.content}`} className="w-full h-full object-cover opacity-60" />
                                        <Video size={32} className="absolute z-10 drop-shadow-lg" />
                                    </div>
                                )}
                                {node.type === 'audio' && (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-2 shadow-sm">
                                            <Mic size={24} />
                                        </div>
                                        <audio controls src={`data:${node.mimeType};base64,${node.content}`} className="w-full h-8 mt-2" />
                                    </div>
                                )}
                                {node.type === 'link' && (
                                    <div className="h-full flex flex-col justify-between">
                                        <div className="text-xs text-slate-500 line-clamp-6 break-all font-mono bg-slate-50 p-2 rounded border border-slate-100">
                                            {node.content}
                                        </div>
                                        <a 
                                            href={node.content} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-blue-50 text-blue-600 text-xs font-bold rounded border border-blue-100 transition-colors"
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            Open Link <ChevronRight size={12} />
                                        </a>
                                    </div>
                                )}
                                {node.type === 'youtube' && (
                                    <div className="bg-red-50 p-2 rounded h-full flex flex-col items-center justify-center text-center border border-red-100">
                                        <Youtube size={48} className="text-red-600 mb-2 drop-shadow-sm" />
                                        <a href={node.content} target="_blank" className="text-xs font-medium text-red-900 hover:underline line-clamp-2" onMouseDown={(e) => e.stopPropagation()}>{node.content}</a>
                                    </div>
                                )}
                                {node.type === 'pdf' && (
                                    <div className="bg-orange-50 h-full flex flex-col items-center justify-center text-orange-800 rounded border border-orange-100">
                                        <FileType size={48} className="drop-shadow-sm" />
                                        <span className="text-sm mt-3 font-bold">PDF Document</span>
                                    </div>
                                )}
                             </div>

                             {/* Resize Handle */}
                             <div 
                                className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center cursor-nwse-resize text-slate-300 hover:text-blue-500 transition-colors z-20 opacity-0 group-hover:opacity-100"
                                onMouseDown={(e) => handleMouseDownResize(e, node.id)}
                             >
                                 <GripHorizontal size={16} className="transform -rotate-45" />
                             </div>
                         </div>

                        {/* Connection Handles */}
                        <div 
                            className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair group/handle z-30"
                            onMouseDown={(e) => handleMouseDownHandle(e, node.id)}
                        >
                            <div className={`w-3 h-3 rounded-full border-2 transition-all ${connectingFromId === node.id ? 'bg-blue-500 border-white scale-125' : 'bg-white border-slate-300 group-hover/handle:bg-blue-500 group-hover/handle:border-white'}`}></div>
                        </div>
                     </div>
                 ))}
            </div>

            {/* AI Sidebar Toggle (Visible when no AI node is active, or to open general settings) */}
            {!activeAiNodeId && (
                <div className="absolute right-6 top-6 bg-white p-6 rounded-xl shadow-xl border border-slate-200 max-w-xs text-center z-40">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Cable size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">Connect to Create</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Add an <strong>AI Partner</strong> node and drag connections from your images, notes, or videos to start chatting.
                    </p>
                    <button 
                        onClick={() => addNode({
                            id: Date.now().toString(), 
                            type: 'ai-partner', 
                            content: '', 
                            position: {x: 500, y: 300}, 
                            title: 'My AI Partner'
                        })}
                        className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-purple-700 transition-colors w-full flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add AI Partner
                    </button>
                </div>
            )}

            {/* AI Sidebar */}
            <div className={`w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-2xl transition-all duration-300 ${activeAiNodeId ? 'translate-x-0' : 'translate-x-full'} absolute right-0 h-full z-40`}>
                {activeAiNodeId && (
                <>
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-blue-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-purple-200">
                                <Bot size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm max-w-[200px] truncate">
                                    {nodes.find(n => n.id === activeAiNodeId)?.title || 'AI Partner'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {connections.filter(c => c.to === activeAiNodeId || c.from === activeAiNodeId).length} sources connected
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setActiveAiNodeId(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {(chats[activeAiNodeId] || []).map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-purple-600 text-white rounded-tr-none' 
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 text-slate-500 p-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-2 shadow-sm">
                                    <Loader2 size={14} className="animate-spin" /> Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef}></div>
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-white border-t border-slate-100">
                         {/* Suggested Actions based on connected nodes */}
                         {(() => {
                             const connectedCount = connections.filter(c => c.to === activeAiNodeId || c.from === activeAiNodeId).length;
                             if (connectedCount > 0 && (chats[activeAiNodeId]?.length || 0) < 3) {
                                 return (
                                     <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                                         <button 
                                            onClick={() => { setInputMsg("Analyze the connected nodes and summarize key themes."); handleSendMessage(); }}
                                            className="whitespace-nowrap px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full hover:bg-purple-100 border border-purple-100 transition-colors"
                                         >
                                            ✨ Summarize Context
                                         </button>
                                         <button 
                                            onClick={() => { setInputMsg("Draft a creative piece based on these inputs."); handleSendMessage(); }}
                                            className="whitespace-nowrap px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 border border-blue-100 transition-colors"
                                         >
                                            📝 Draft Content
                                         </button>
                                     </div>
                                 );
                             }
                             return null;
                         })()}

                        <div className="relative flex items-center">
                            <input 
                                type="text" 
                                placeholder="Ask about connected nodes..."
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                value={inputMsg}
                                onChange={(e) => setInputMsg(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                autoFocus
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={isChatLoading || !inputMsg.trim()}
                                className="absolute right-2 p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </>
                )}
            </div>
        </div>
    );
};
