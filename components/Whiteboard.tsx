
import React, { useState, useRef, useEffect } from 'react';
import { 
    Image as ImageIcon, Video, FileText, Mic, Link as LinkIcon, 
    Youtube, Move, X, Plus, MessageSquare, Sparkles, Send, 
    Maximize2, Trash2, Play, FileType, Loader2, Instagram, Square, Smartphone
} from 'lucide-react';
import { WhiteboardNode } from '../types';
import { Chat } from '@google/genai';
import { createWhiteboardChatSession, convertNodesToParts } from '../services/geminiService';

const PREVIEW_LIMIT_CHARS = 150;

// Custom TikTok Icon since Lucide might not have it in this version
const TikTokIcon = ({ size = 14, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
);

export const Whiteboard: React.FC = () => {
    const [nodes, setNodes] = useState<WhiteboardNode[]>([]);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [chatOpen, setChatOpen] = useState(true);
    
    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    // Chat State
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([
        { role: 'model', text: "Welcome to your creative studio. I'm ready to help you write viral scripts, brainstorm book chapters, or analyze your data. Drag and drop your research here!" }
    ]);
    const [inputMsg, setInputMsg] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatSessionRef = useRef<Chat | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scroll chat to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, chatOpen]);

    // --- Node Management ---

    const addNode = (node: WhiteboardNode) => {
        setNodes(prev => [...prev, node]);
        // Invalidate chat session to force context update on next message
        chatSessionRef.current = null; 
    };

    const removeNode = (id: string) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        chatSessionRef.current = null;
    };

    // --- Voice Recording Logic ---
    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            // Stop all tracks
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

    // --- Drag & Drop Logic ---

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        const x = e.clientX - (rect?.left || 0) - 100; // Center roughly
        const y = e.clientY - (rect?.top || 0) - 100;

        // Handle Files
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            for (const file of files) {
                await processFile(file, x, y);
            }
            return;
        }

        // Handle Text/Links
        const textData = e.dataTransfer.getData('text/plain');
        const uriList = e.dataTransfer.getData('text/uri-list');
        
        const content = uriList || textData;
        if (content) {
            let type: WhiteboardNode['type'] = 'text';
            let title = 'Note';
            
            // Enhanced Link Detection
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
                    position: { x, y: y + (nodes.length * 20) } // Cascading offset
                });
                resolve();
            };
            reader.readAsDataURL(file);
        });
    };

    // --- Node Dragging Logic ---
    const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDraggedNodeId(id);
        const node = nodes.find(n => n.id === id);
        if (node && canvasRef.current) {
             const rect = canvasRef.current.getBoundingClientRect();
             setOffset({
                 x: e.clientX - rect.left - node.position.x,
                 y: e.clientY - rect.top - node.position.y
             });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggedNodeId && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const newX = e.clientX - rect.left - offset.x;
            const newY = e.clientY - rect.top - offset.y;
            
            setNodes(prev => prev.map(n => 
                n.id === draggedNodeId ? { ...n, position: { x: newX, y: newY } } : n
            ));
        }
    };

    const handleMouseUp = () => {
        setDraggedNodeId(null);
    };

    // --- Chat Logic ---
    
    const handleSendMessage = async () => {
        if (!inputMsg.trim() && nodes.length === 0) return;
        
        const userText = inputMsg;
        setInputMsg('');
        setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
        setIsChatLoading(true);

        try {
            // Initialize session if new or nodes changed
            if (!chatSessionRef.current) {
                chatSessionRef.current = createWhiteboardChatSession(nodes);
                
                // Send context + user question
                const parts = convertNodesToParts(nodes);
                const messageContent = [
                    ...parts, 
                    { text: `User Question: ${userText}` }
                ];
                
                const response = await chatSessionRef.current.sendMessage({ message: messageContent });
                setChatHistory(prev => [...prev, { role: 'model', text: response.text || "No response generated." }]);
            } else {
                const response = await chatSessionRef.current.sendMessage({ message: userText });
                setChatHistory(prev => [...prev, { role: 'model', text: response.text || "No response generated." }]);
            }

        } catch (error) {
            console.error(error);
            setChatHistory(prev => [...prev, { role: 'model', text: "I encountered an error processing your request. Please check your API key or internet connection." }]);
        } finally {
            setIsChatLoading(false);
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
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                 {/* Floating Toolbar */}
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
                        if(e.target.files) Array.from(e.target.files).forEach(f => processFile(f, 200, 200));
                    }} />
                 </div>

                 {/* Instructions Overlay (if empty) */}
                 {nodes.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                         <div className="text-center">
                             <div className="flex justify-center mb-4 space-x-4">
                                 <div className="p-4 bg-slate-100 rounded-2xl"><Video size={32} className="text-slate-400"/></div>
                                 <div className="p-4 bg-slate-100 rounded-2xl"><ImageIcon size={32} className="text-slate-400"/></div>
                                 <div className="p-4 bg-slate-100 rounded-2xl"><Mic size={32} className="text-slate-400"/></div>
                             </div>
                             <h2 className="text-2xl font-bold text-slate-400">Drag & Drop Anything</h2>
                             <p className="text-slate-400 mt-2">Videos, Images, Audio, PDFs, or Links</p>
                         </div>
                     </div>
                 )}

                 {/* Nodes */}
                 {nodes.map(node => (
                     <div 
                        key={node.id}
                        className="absolute bg-white rounded-xl shadow-lg border border-slate-200 w-64 flex flex-col group transition-all hover:shadow-2xl hover:ring-1 hover:ring-slate-300"
                        style={{ left: node.position.x, top: node.position.y }}
                        onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                     >
                         {/* Node Header */}
                         <div className={`p-3 border-b border-slate-100 flex items-center justify-between cursor-move rounded-t-xl ${
                             node.type === 'audio' ? 'bg-red-50' : 
                             node.type === 'video' ? 'bg-blue-50' : 
                             node.type === 'pdf' ? 'bg-orange-50' : 'bg-slate-50'
                         }`}>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate max-w-[160px]">
                                {node.type === 'video' && <Video size={14} className="text-blue-600"/>}
                                {node.type === 'image' && <ImageIcon size={14} className="text-purple-600"/>}
                                {node.type === 'audio' && <Mic size={14} className="text-red-600"/>}
                                {node.type === 'text' && <FileText size={14} className="text-slate-600"/>}
                                {node.type === 'pdf' && <FileType size={14} className="text-orange-600"/>}
                                {node.type === 'link' && (
                                    node.title.includes('TikTok') ? <TikTokIcon className="text-black"/> :
                                    node.title.includes('IG') ? <Instagram size={14} className="text-pink-600"/> :
                                    <LinkIcon size={14} className="text-blue-400"/>
                                )}
                                {node.type === 'youtube' && <Youtube size={14} className="text-red-600"/>}
                                {node.title}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="text-slate-400 hover:text-red-500 transition-colors bg-white/50 rounded p-0.5">
                                <Trash2 size={14} />
                            </button>
                         </div>

                         {/* Node Content */}
                         <div className="p-3 min-h-[100px] max-h-[200px] overflow-hidden relative bg-white rounded-b-xl">
                             {node.type === 'text' && (
                                 <textarea 
                                    className="w-full h-full text-sm text-slate-600 resize-none focus:outline-none bg-transparent"
                                    defaultValue={node.content}
                                    onChange={(e) => { node.content = e.target.value; }} 
                                    placeholder="Type something..."
                                 />
                             )}
                             {node.type === 'image' && (
                                 <img src={`data:${node.mimeType};base64,${node.content}`} alt={node.title} className="w-full h-32 object-cover rounded border border-slate-100" />
                             )}
                             {node.type === 'video' && (
                                 <div className="w-full h-32 bg-slate-900 rounded flex items-center justify-center text-white relative overflow-hidden">
                                     <video src={`data:${node.mimeType};base64,${node.content}`} className="w-full h-full object-cover opacity-60" />
                                     <Video size={32} className="absolute z-10" />
                                 </div>
                             )}
                             {node.type === 'audio' && (
                                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                     <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-2">
                                        <Mic size={24} />
                                     </div>
                                     <audio controls src={`data:${node.mimeType};base64,${node.content}`} className="w-full h-8 mt-1 scale-90 origin-center" />
                                 </div>
                             )}
                             {node.type === 'link' && (
                                 <div className="h-full flex flex-col justify-between">
                                     <div className="text-xs text-slate-500 line-clamp-3 break-all">
                                        {node.content}
                                     </div>
                                     <a 
                                        href={node.content} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="mt-2 block text-center py-1.5 bg-slate-50 hover:bg-slate-100 text-blue-600 text-xs font-medium rounded border border-slate-100 transition-colors"
                                    >
                                        Open Link
                                     </a>
                                 </div>
                             )}
                             {node.type === 'youtube' && (
                                 <div className="bg-red-50 p-2 rounded h-full flex flex-col items-center justify-center text-center">
                                     <Youtube size={32} className="text-red-600 mb-2" />
                                     <a href={node.content} target="_blank" className="text-[10px] text-red-800 hover:underline line-clamp-2">{node.content}</a>
                                 </div>
                             )}
                             {node.type === 'pdf' && (
                                 <div className="bg-orange-50 h-full flex flex-col items-center justify-center text-orange-800 rounded border border-orange-100">
                                     <FileType size={32} />
                                     <span className="text-xs mt-2 font-bold">PDF Document</span>
                                 </div>
                             )}
                         </div>
                     </div>
                 ))}
            </div>

            {/* AI Sidebar Toggle */}
            {!chatOpen && (
                <button 
                    onClick={() => setChatOpen(true)}
                    className="absolute top-6 right-6 bg-white p-3 rounded-full shadow-xl border border-slate-200 text-purple-600 hover:scale-110 transition-all z-50"
                >
                    <Sparkles size={24} />
                </button>
            )}

            {/* AI Sidebar */}
            <div className={`w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-2xl transition-all duration-300 ${chatOpen ? 'translate-x-0' : 'translate-x-full'} absolute right-0 h-full z-40`}>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-blue-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-purple-200">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">AI Creative Partner</h3>
                            <p className="text-xs text-slate-500">{nodes.length} sources connected</p>
                        </div>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {chatHistory.map((msg, i) => (
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
                     {/* Suggested Actions */}
                     {nodes.length > 0 && chatHistory.length < 3 && (
                         <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                             <button 
                                onClick={() => { setInputMsg("Draft a viral short-form video script using these inputs."); handleSendMessage(); }}
                                className="whitespace-nowrap px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full hover:bg-purple-100 border border-purple-100 transition-colors"
                             >
                                ✨ Viral Script
                             </button>
                             <button 
                                onClick={() => { setInputMsg("Summarize key insights and patterns from these documents."); handleSendMessage(); }}
                                className="whitespace-nowrap px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 border border-blue-100 transition-colors"
                             >
                                📊 Summarize
                             </button>
                             <button 
                                onClick={() => { setInputMsg("Create a blog post outline based on this."); handleSendMessage(); }}
                                className="whitespace-nowrap px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-full hover:bg-green-100 border border-green-100 transition-colors"
                             >
                                📝 Blog Post
                             </button>
                         </div>
                     )}

                    <div className="relative flex items-center">
                        <input 
                            type="text" 
                            placeholder="Ask to generate content..."
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={isChatLoading || (!inputMsg.trim() && nodes.length === 0)}
                            className="absolute right-2 p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
