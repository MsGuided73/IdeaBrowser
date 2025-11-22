
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Image as ImageIcon, Video, FileText, Mic, Link as LinkIcon, 
    Youtube, Move, X, Plus, MessageSquare, Sparkles, Send, 
    Maximize2, Trash2, Play, FileType, Loader2, Instagram, Square, Smartphone,
    GripHorizontal, ChevronRight, Bot, Cable, Copy, Download, Check, Subtitles,
    Eye
} from 'lucide-react';
import { WhiteboardNode, Connection } from '../types';
import { Chat } from '@google/genai';
import { createWhiteboardChatSession, convertNodesToParts } from '../services/geminiService';

const PREVIEW_LIMIT_CHARS = 150;

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
    if (!url) return null;
    // Expanded regex to handle shorts and looser matching
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?\/]*).*/;
    const match = url.match(regExp);
    return (match && match[2]) ? match[2] : null;
};

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
    const [copiedState, setCopiedState] = useState<number | null>(null); // Index of copied message
    
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const [inputMsg, setInputMsg] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derived state to check if user is interacting (dragging/resizing/connecting)
    const isInteracting = !!draggedNodeId || !!resizingNodeId || !!connectingFromId;

    // Scroll chat to bottom when chat history changes
    useEffect(() => {
        if (chatEndRef.current && activeAiNodeId) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chats, activeAiNodeId]);

    // --- Node Management ---

    const addNode = useCallback((node: WhiteboardNode) => {
        const defaultDims = {
            width: node.type === 'text' ? 300 : 
                   node.type === 'ai-partner' ? 280 : 
                   node.type === 'youtube' ? 400 : 320,
            height: node.type === 'text' ? 220 : 
                    node.type === 'ai-partner' ? 180 : 
                    node.type === 'youtube' ? 300 : 300
        };
        const newNode = { ...defaultDims, ...node };
        setNodes(prev => [...prev, newNode]);

        if (node.type === 'ai-partner') {
            setChats(prev => ({
                ...prev,
                [newNode.id]: [{ role: 'model', text: "Hello! Connect video, images, or text nodes to me. I can watch uploaded videos and analyze them visually." }]
            }));
            setActiveAiNodeId(newNode.id);
        }
    }, []);

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

    // --- Global Paste Handler ---
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            // Don't intercept paste if user is typing in an input
            if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;

            const text = e.clipboardData?.getData('text');
            if (!text) return;

            // Basic URL detection
            const isUrl = /^(http|https):\/\/[^ "]+$/.test(text.trim());
            
            if (isUrl) {
                e.preventDefault();
                const x = window.innerWidth / 2 - 200 + (Math.random() * 50);
                const y = window.innerHeight / 2 - 150 + (Math.random() * 50);
                
                const url = text.trim();
                let type: WhiteboardNode['type'] = 'link';
                let title = 'Link';

                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    type = 'youtube';
                    title = 'Youtube Video';
                } else if (url.includes('tiktok.com')) {
                    type = 'link';
                    title = 'TikTok';
                } else if (url.includes('instagram.com')) {
                    type = 'link';
                    title = 'IG Reel';
                }

                addNode({
                    id: Date.now().toString(),
                    type,
                    content: url,
                    position: { x, y },
                    title
                });
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [addNode]);


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
    const handleMouseDownPort = (e: React.MouseEvent, id: string) => {
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
                // Enforce direction: connectingFromId (Source/Output) -> targetId (Target/Input)
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
    
    const handleCopyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedState(index);
        setTimeout(() => setCopiedState(null), 2000);
    };

    const handleDownloadMarkdown = (text: string) => {
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `AI-Partner-Output-${Date.now()}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSendMessage = async (textOverride?: string) => {
        const textToSend = textOverride || inputMsg;
        if (!activeAiNodeId || !textToSend.trim()) return;
        
        // Clear input if not using override, or just clear it anyway to be safe
        if (!textOverride) setInputMsg('');
        
        setChats(prev => ({
            ...prev,
            [activeAiNodeId]: [...(prev[activeAiNodeId] || []), { role: 'user', text: textToSend }]
        }));
        
        setIsChatLoading(true);

        try {
            // 1. Identify connected nodes (Sources feeding INTO this AI node)
            // Logic: Connections where 'to' is the AI node.
            const sourceNodeIds = connections
                .filter(c => c.to === activeAiNodeId)
                .map(c => c.from);
            
            const contextNodes = nodes.filter(n => sourceNodeIds.includes(n.id));

            // 2. Initialize or Reuse Session
            let session = chatSessionsRef.current[activeAiNodeId];
            
            if (!session) {
                session = createWhiteboardChatSession(contextNodes);
                chatSessionsRef.current[activeAiNodeId] = session;
            }

            // 3. Convert context nodes to parts for THIS specific message
            const contextParts = convertNodesToParts(contextNodes);
            
            let messagePayload;
            if (contextParts.length > 0) {
                 messagePayload = [
                    ...contextParts,
                    { text: `\n\nUser Query: ${textToSend}` }
                ];
            } else {
                messagePayload = textToSend;
            }

            const response = await session.sendMessage({ message: messagePayload });
            
            setChats(prev => ({
                ...prev,
                [activeAiNodeId]: [...(prev[activeAiNodeId] || []), { role: 'model', text: response.text || "I couldn't generate a response." }]
            }));

        } catch (error: any) {
            console.error("Chat error:", error);
            let errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            // Attempt to extract clean message from JSON string if present
            try {
                if (errorMessage.includes('{')) {
                    const parsed = JSON.parse(errorMessage.substring(errorMessage.indexOf('{')));
                    if (parsed.error?.message) errorMessage = parsed.error.message;
                }
            } catch (e) { /* ignore parse error */ }

            setChats(prev => ({
                ...prev,
                [activeAiNodeId]: [...(prev[activeAiNodeId] || []), { role: 'model', text: `⚠️ Error: ${errorMessage}.` }]
            }));
        } finally {
            setIsChatLoading(false);
        }
    };

    // --- Render Helpers ---
    
    // Calculate positions for "Left" (Input) and "Right" (Output) ports
    const getNodePortPosition = (id: string, type: 'input' | 'output') => {
        const node = nodes.find(n => n.id === id);
        if (!node) return { x: 0, y: 0 };
        
        const w = node.width || 280;
        const h = node.height || 200;
        
        // Vertically centered
        const y = node.position.y + h / 2;
        // Input = Left edge, Output = Right edge
        const x = type === 'input' ? node.position.x : node.position.x + w;

        return { x, y };
    };

    const NodeCornerIcon = ({ type, title }: { type: string, title: string }) => {
        const size = 16;
        switch(type) {
            case 'video': return <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 shadow-sm"><Video size={size} /></div>;
            case 'image': return <div className="bg-purple-100 p-1.5 rounded-full text-purple-600 shadow-sm"><ImageIcon size={size} /></div>;
            case 'audio': return <div className="bg-red-100 p-1.5 rounded-full text-red-600 shadow-sm"><Mic size={size} /></div>;
            case 'pdf': return <div className="bg-orange-100 p-1.5 rounded-full text-orange-600 shadow-sm"><FileType size={size} /></div>;
            case 'youtube': return <div className="bg-red-100 p-1.5 rounded-full text-red-600 shadow-sm"><Youtube size={size} /></div>;
            case 'ai-partner': return <div className="bg-indigo-100 p-1.5 rounded-full text-indigo-600 shadow-sm"><Bot size={size} /></div>;
            case 'link': 
                if (title.includes('TikTok')) return <div className="bg-black p-1.5 rounded-full text-white shadow-sm"><TikTokIcon size={size} /></div>;
                if (title.includes('IG')) return <div className="bg-pink-100 p-1.5 rounded-full text-pink-600 shadow-sm"><Instagram size={size} /></div>;
                return <div className="bg-slate-100 p-1.5 rounded-full text-slate-600 shadow-sm"><LinkIcon size={size} /></div>;
            default: return <div className="bg-slate-100 p-1.5 rounded-full text-slate-600 shadow-sm"><FileText size={size} /></div>;
        }
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

                    {/* Add YouTube Button */}
                     <button 
                        className="p-2 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-full transition-colors" 
                        title="Add YouTube Video" 
                        onClick={() => {
                            const url = prompt("Enter YouTube URL (Video or Short):");
                            if (!url) return;
                            
                            // Basic validation
                            const hasYoutubeDomain = url.includes('youtube.com') || url.includes('youtu.be');
                            if (hasYoutubeDomain) {
                                addNode({
                                    id: Date.now().toString(), 
                                    type: 'youtube', 
                                    content: url, 
                                    // Center in view roughly
                                    position: {x: Math.max(100, window.innerWidth/2 - 200), y: Math.max(100, window.innerHeight/2 - 150)}, 
                                    title: 'Youtube Video'
                                });
                            } else {
                                alert("Please enter a valid YouTube URL (e.g. youtube.com/watch?v=... or youtu.be/...)");
                            }
                        }}
                    >
                        <Youtube size={20} />
                    </button>
                    
                    <button className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Add Link" onClick={() => {
                        const url = prompt("Enter URL (Website, TikTok, etc.):");
                        if (url) {
                            let type: WhiteboardNode['type'] = 'link';
                            let title = 'Link';
                             if (url.includes('tiktok.com')) {
                                title = 'TikTok';
                            }
                            
                            addNode({
                                id: Date.now().toString(), 
                                type, 
                                content: url, 
                                position: {x: 150, y: 150}, 
                                title
                            });
                        }
                    }}><LinkIcon size={20} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*,audio/*,.pdf" onChange={(e) => {
                        if(e.target.files) Array.from(e.target.files).forEach(f => processFile(f as File, 200, 200));
                    }} />
                 </div>

                 {/* Connections Layer (SVG) */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                     <defs>
                         <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                             <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                         </marker>
                     </defs>
                     {connections.map(conn => {
                         // From = Output (Right), To = Input (Left)
                         const start = getNodePortPosition(conn.from, 'output');
                         const end = getNodePortPosition(conn.to, 'input');
                         
                         // Create a bezier curve for smoother connections
                         const controlPoint1 = { x: start.x + 50, y: start.y };
                         const controlPoint2 = { x: end.x - 50, y: end.y };
                         
                         return (
                             <path 
                                key={conn.id}
                                d={`M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${end.x} ${end.y}`}
                                stroke="#cbd5e1"
                                strokeWidth="2"
                                fill="none"
                                markerEnd="url(#arrowhead)"
                             />
                         );
                     })}
                     {connectingFromId && (
                         <line 
                            x1={getNodePortPosition(connectingFromId, 'output').x} 
                            y1={getNodePortPosition(connectingFromId, 'output').y}
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
                        className={`absolute rounded-xl shadow-sm border flex flex-col group transition-all duration-200 
                            ${node.type === 'ai-partner' 
                                ? activeAiNodeId === node.id 
                                    ? 'border-purple-500 ring-2 ring-purple-200 shadow-xl shadow-purple-100' 
                                    : 'border-purple-200 bg-white'
                                : 'border-slate-200 bg-white hover:shadow-xl hover:ring-2 hover:ring-blue-400/20'
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
                                <span className="truncate">{node.title}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="text-slate-400 hover:text-red-500 transition-colors bg-white/50 rounded p-0.5">
                                <Trash2 size={14} />
                            </button>
                         </div>

                         {/* Node Content */}
                         <div className={`flex-1 p-3 overflow-hidden relative bg-white rounded-b-xl group-hover:bg-slate-50/30 transition-colors ${isInteracting ? 'pointer-events-none' : ''}`}>
                             
                             {/* Background Type Icon Watermark */}
                             <div className="absolute right-2 bottom-2 w-24 h-24 pointer-events-none z-0">
                                 <NodeTypeIcon type={node.type} title={node.title} />
                             </div>

                             {/* Visual Cue Corner Icon */}
                             <div className="absolute top-3 right-3 z-10 pointer-events-none opacity-90">
                                 <NodeCornerIcon type={node.type} title={node.title} />
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
                                            Connect nodes to the Left Input to feed me data.
                                        </p>
                                        <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                            {connections.filter(c => c.to === node.id).length} Inputs | {connections.filter(c => c.from === node.id).length} Outputs
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
                                    <div className="w-full h-full bg-black rounded overflow-hidden border border-slate-100 relative">
                                        {getYoutubeId(node.content) ? (
                                            <iframe 
                                                width="100%" 
                                                height="100%" 
                                                src={`https://www.youtube.com/embed/${getYoutubeId(node.content)}?origin=${window.location.origin || 'https://ideabrowser.com'}&rel=0`} 
                                                title="YouTube video player" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                                referrerPolicy="strict-origin-when-cross-origin"
                                                allowFullScreen
                                                className="w-full h-full border-0"
                                                onMouseDown={(e) => e.stopPropagation()} 
                                            ></iframe>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                                                <Youtube size={48} className="mb-2" />
                                                <p className="text-xs">Invalid Video URL</p>
                                            </div>
                                        )}
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

                        {/* Input Port (Left) */}
                        <div 
                            className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 flex items-center justify-center z-30"
                            title="Input (Drop here)"
                        >
                            <div className="w-3 h-3 rounded-full border-2 bg-white border-slate-300"></div>
                        </div>

                        {/* Output Port (Right) - Draggable */}
                        <div 
                            className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair group/handle z-30"
                            onMouseDown={(e) => handleMouseDownPort(e, node.id)}
                            title="Output (Drag to connect)"
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
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Eye size={10} /> Vision Active
                                    </span>
                                    <span className="text-[10px] text-slate-400">| {connections.filter(c => c.to === activeAiNodeId || c.from === activeAiNodeId).length} sources</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setActiveAiNodeId(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {(chats[activeAiNodeId] || []).map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`group relative max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-purple-600 text-white rounded-tr-none' 
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                }`}>
                                    {msg.text}

                                    {/* Copy/Export Actions for AI Messages */}
                                    {msg.role === 'model' && (
                                        <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 items-center p-1 bg-white/80 backdrop-blur border border-slate-100 rounded-lg shadow-sm">
                                            <button 
                                                onClick={() => handleCopyToClipboard(msg.text, i)}
                                                className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                title="Copy to Clipboard"
                                            >
                                                {copiedState === i ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
                                            </button>
                                            <button 
                                                onClick={() => handleDownloadMarkdown(msg.text)}
                                                className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                title="Export Markdown"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    )}
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
                             const connectedNodes = nodes.filter(n => 
                                connections.some(c => (c.to === activeAiNodeId && c.from === n.id) || (c.from === activeAiNodeId && c.to === n.id))
                             );
                             
                             const hasYoutube = connectedNodes.some(n => n.type === 'youtube');
                             const hasNativeVideo = connectedNodes.some(n => n.type === 'video');
                             const connectedCount = connectedNodes.length;

                             return (
                                 <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                                     {/* Quick Transcript Button for YouTube */}
                                     {hasYoutube && (
                                        <button 
                                            onClick={() => handleSendMessage("Please find and generate the full transcript for the YouTube video provided in the context. Use Google Search to find the transcript if needed. Format it as a clean Markdown script.")}
                                            className="whitespace-nowrap px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-full hover:bg-red-100 border border-red-100 transition-colors flex items-center gap-1"
                                        >
                                           <Subtitles size={12} /> Get YT Transcript
                                        </button>
                                     )}
                                     
                                     {/* Analyze Video Button for Native Video */}
                                     {hasNativeVideo && (
                                        <button 
                                            onClick={() => handleSendMessage("Watch the attached video file. Describe the visual style, key events, and the emotion conveyed.")}
                                            className="whitespace-nowrap px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 border border-blue-100 transition-colors flex items-center gap-1"
                                        >
                                           <Eye size={12} /> Analyze Video
                                        </button>
                                     )}
                                     
                                     {connectedCount > 0 && (chats[activeAiNodeId]?.length || 0) < 3 && (
                                        <>
                                            <button 
                                                onClick={() => handleSendMessage("Draft a creative piece based on these inputs.")}
                                                className="whitespace-nowrap px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full hover:bg-purple-100 border border-purple-100 transition-colors"
                                            >
                                                📝 Draft Content
                                            </button>
                                        </>
                                     )}
                                 </div>
                             );
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
                                onClick={() => handleSendMessage()}
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
