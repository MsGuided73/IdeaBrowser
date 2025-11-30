import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Image as ImageIcon, Video, FileText, Mic, Link as LinkIcon,
    Youtube, Move, X, Plus, MessageSquare, Sparkles, Send,
    Maximize2, Trash2, Play, FileType, Loader2, Instagram, Square, Smartphone,
    GripHorizontal, ChevronRight, Bot, Cable, Copy, Download, Check, Subtitles,
    Eye, ZoomIn, ZoomOut, MousePointer2, Palette, MoreHorizontal, Group, Ungroup, BoxSelect,
    StickyNote, Save, FolderOpen
} from 'lucide-react';
import { WhiteboardNode, Connection } from '../types';
import { Chat } from '@google/genai';
import { createWhiteboardChatSession } from '../services/geminiService';
import { boardApi, nodeApi, chatApi, WebSocketClient, BoardState, ApiNode, ApiNodePosition, ApiEdge, ApiGroup } from '../services/apiService';
import { BoardManager } from './BoardManager';
import { YouTubeProcessor } from './YouTubeProcessor';

const PREVIEW_LIMIT_CHARS = 150;

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
    if (!url) return null;
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

interface SelectionBox {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface WhiteboardProps {
    boardId?: string;
    onBoardChange?: (boardId: string) => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ boardId, onBoardChange }) => {
    // Board State
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(boardId || null);
    const [boardTitle, setBoardTitle] = useState<string>('Untitled Board');
    const [isBoardManagerOpen, setIsBoardManagerOpen] = useState(false);
    const [isYouTubeProcessorOpen, setIsYouTubeProcessorOpen] = useState(false);
    const [isLoadingBoard, setIsLoadingBoard] = useState(false);
    const [isSavingBoard, setIsSavingBoard] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // WebSocket for real-time sync
    const wsClientRef = useRef<WebSocketClient | null>(null);

    // Canvas State
    const [nodes, setNodes] = useState<WhiteboardNode[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    
    // Interaction State
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
    const [isDraggingNodes, setIsDraggingNodes] = useState(false);
    
    const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
    const [lastWorldMousePos, setLastWorldMousePos] = useState({ x: 0, y: 0 });
    const [lastPanMousePos, setLastPanMousePos] = useState({ x: 0, y: 0 });
    
    // Connection Logic State
    const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // Current world mouse pos

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId?: string } | null>(null);

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

    useEffect(() => {
        if (chatEndRef.current && activeAiNodeId) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chats, activeAiNodeId]);

    // --- Board Management Functions ---
    const loadBoard = async (boardId: string) => {
        try {
            setIsLoadingBoard(true);
            const boardState = await boardApi.getBoardState(boardId);

            // Convert API data to whiteboard format
            const whiteboardNodes: WhiteboardNode[] = boardState.nodes.map(apiNode => ({
                id: apiNode.id,
                type: apiNode.type === 'NOTE' ? 'text' : apiNode.type === 'YOUTUBE_VIDEO' ? 'youtube' : 'text',
                title: apiNode.title,
                content: apiNode.rawText || '',
                position: { x: 100, y: 100 }, // Will be updated from positions
                width: 300,
                height: 200,
            }));

            // Apply positions
            boardState.positions.forEach(pos => {
                const node = whiteboardNodes.find(n => n.id === pos.nodeId);
                if (node) {
                    node.position = { x: pos.x, y: pos.y };
                    node.width = pos.width;
                    node.height = pos.height;
                    node.color = pos.color || undefined;
                }
            });

            // Convert edges to connections
            const connectionsData: Connection[] = boardState.edges.map(edge => ({
                id: edge.id,
                from: edge.sourceNodeId,
                to: edge.targetNodeId,
                label: edge.label || undefined,
            }));

            setNodes(whiteboardNodes);
            setConnections(connectionsData);
            setCurrentBoardId(boardId);
            setBoardTitle(boardState.board.title);
            setHasUnsavedChanges(false);

            // Initialize WebSocket for real-time sync
            if (wsClientRef.current) {
                wsClientRef.current.disconnect();
            }
            wsClientRef.current = new WebSocketClient();
            await wsClientRef.current.connect(boardId);

        } catch (error) {
            console.error('Failed to load board:', error);
            alert('Failed to load board. Please check your backend server.');
        } finally {
            setIsLoadingBoard(false);
        }
    };

    const saveBoard = async () => {
        if (!currentBoardId) {
            alert('No board loaded to save');
            return;
        }

        try {
            setIsSavingBoard(true);

            // Save nodes and positions
            for (const node of nodes) {
                try {
                    // Create or update node
                    await nodeApi.updateNode(currentBoardId, node.id, {
                        title: node.title,
                        content: node.content,
                        position: node.position,
                        width: node.width,
                        height: node.height,
                        color: node.color,
                    });
                } catch (error) {
                    // If node doesn't exist, create it
                    if (node.type === 'text') {
                        await nodeApi.createNote(currentBoardId, {
                            title: node.title,
                            content: node.content || '',
                        });
                    } else if (node.type === 'youtube') {
                        await nodeApi.createYouTubeNode(currentBoardId, {
                            url: node.content,
                            title: node.title,
                        });
                    }
                }
            }

            setHasUnsavedChanges(false);
            alert('Board saved successfully!');

        } catch (error) {
            console.error('Failed to save board:', error);
            alert('Failed to save board. Please try again.');
        } finally {
            setIsSavingBoard(false);
        }
    };

    const handleBoardSelect = (boardId: string) => {
        loadBoard(boardId);
        setIsBoardManagerOpen(false);
        onBoardChange?.(boardId);
    };

    const handleBoardCreate = (boardId: string) => {
        loadBoard(boardId);
        setIsBoardManagerOpen(false);
        onBoardChange?.(boardId);
    };

    // Mark as having unsaved changes when nodes/connections change
    useEffect(() => {
        if (currentBoardId) {
            setHasUnsavedChanges(true);
        }
    }, [nodes, connections, currentBoardId]);

    // --- Helpers ---
    const getWorldMousePos = (e: React.MouseEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - transform.x) / transform.scale,
            y: (e.clientY - rect.top - transform.y) / transform.scale
        };
    };

    // --- Infinite Canvas Logic (Zoom & Pan) ---
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const newScale = Math.min(Math.max(0.1, transform.scale + delta), 5);
            setTransform(prev => ({ ...prev, scale: newScale }));
        } else {
            setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            e.preventDefault();
            setIsPanning(true);
            setLastPanMousePos({ x: e.clientX, y: e.clientY });
            return;
        }

        if (e.button === 0) {
            if (!e.shiftKey) {
                setSelectedNodeIds(new Set());
            }
            const worldPos = getWorldMousePos(e);
            setSelectionBox({
                startX: worldPos.x,
                startY: worldPos.y,
                currentX: worldPos.x,
                currentY: worldPos.y
            });
        }
        setContextMenu(null);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        const worldPos = getWorldMousePos(e);
        setMousePos(worldPos);

        if (isPanning) {
            const dx = e.clientX - lastPanMousePos.x;
            const dy = e.clientY - lastPanMousePos.y;
            setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setLastPanMousePos({ x: e.clientX, y: e.clientY });
            return;
        }

        if (selectionBox) {
            setSelectionBox(prev => prev ? ({ ...prev, currentX: worldPos.x, currentY: worldPos.y }) : null);
            return;
        }

        if (isDraggingNodes) {
            const dx = worldPos.x - lastWorldMousePos.x;
            const dy = worldPos.y - lastWorldMousePos.y;
            setNodes(prev => prev.map(n => {
                if (selectedNodeIds.has(n.id)) {
                    return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
                }
                return n;
            }));
            setLastWorldMousePos(worldPos);
            return;
        }

        if (resizingNodeId) {
            setNodes(prev => prev.map(n => {
                if (n.id === resizingNodeId) {
                    const newWidth = Math.max(200, worldPos.x - n.position.x);
                    const newHeight = Math.max(150, worldPos.y - n.position.y);
                    return { ...n, width: newWidth, height: newHeight };
                }
                return n;
            }));
        }
    };

    const handleCanvasMouseUp = () => {
        if (selectionBox) {
            const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
            const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
            const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
            const y2 = Math.max(selectionBox.startY, selectionBox.currentY);

            const newSelected = new Set(selectedNodeIds);
            
            nodes.forEach(node => {
                const nw = node.width || 300;
                const nh = node.height || 200;
                if (node.position.x < x2 && node.position.x + nw > x1 && node.position.y < y2 && node.position.y + nh > y1) {
                    newSelected.add(node.id);
                    if (node.groupId) {
                        nodes.filter(n => n.groupId === node.groupId).forEach(g => newSelected.add(g.id));
                    }
                }
            });
            
            setSelectedNodeIds(newSelected);
            setSelectionBox(null);
        }

        // Handle connection end on canvas (cancel)
        if (connectingFromId) {
            setConnectingFromId(null);
        }

        setIsDraggingNodes(false);
        setResizingNodeId(null);
        setIsPanning(false);
    };

    const addNode = useCallback((node: WhiteboardNode) => {
        const defaultDims = {
            width: node.type === 'text' ? 300 : node.type === 'ai-partner' ? 320 : node.type === 'youtube' ? 400 : 320,
            height: node.type === 'text' ? 220 : node.type === 'ai-partner' ? 400 : node.type === 'youtube' ? 300 : 300
        };
        const newNode = { ...defaultDims, ...node };
        setNodes(prev => [...prev, newNode]);

        if (node.type === 'ai-partner') {
            setChats(prev => ({
                ...prev,
                [newNode.id]: [{ role: 'model', text: "Hello! I'm your AI Creative Partner. I can see images, watch videos, and even create sticky notes for you. Try asking me to 'Brainstorm ideas' or 'Organize this board'." }]
            }));
            setActiveAiNodeId(newNode.id);
        }
    }, []);

    const removeNode = (id: string) => {
        let idsToRemove = [id];
        if (selectedNodeIds.has(id)) {
            idsToRemove = Array.from(selectedNodeIds);
        }

        setNodes(prev => prev.filter(n => !idsToRemove.includes(n.id)));
        setConnections(prev => prev.filter(c => !idsToRemove.includes(c.from) && !idsToRemove.includes(c.to)));
        
        if (idsToRemove.includes(activeAiNodeId || '')) setActiveAiNodeId(null);
        setSelectedNodeIds(new Set());
        setContextMenu(null);
    };
    
    const updateNodeColor = (id: string, color: string) => {
        const idsToUpdate = selectedNodeIds.has(id) ? Array.from(selectedNodeIds) : [id];
        setNodes(prev => prev.map(n => idsToUpdate.includes(n.id) ? { ...n, color } : n));
        setContextMenu(null);
    };

    const handleGroupNodes = () => {
        if (selectedNodeIds.size < 2) return;
        const newGroupId = Math.random().toString(36).substr(2, 9);
        setNodes(prev => prev.map(n => selectedNodeIds.has(n.id) ? { ...n, groupId: newGroupId } : n));
        setContextMenu(null);
    };

    const handleUngroupNodes = () => {
        if (selectedNodeIds.size === 0) return;
        setNodes(prev => prev.map(n => selectedNodeIds.has(n.id) ? { ...n, groupId: undefined } : n));
        setContextMenu(null);
    };

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;

            const text = e.clipboardData?.getData('text');
            if (!text) return;

            const isUrl = /^(http|https):\/\/[^ "]+$/.test(text.trim());
            
            if (isUrl) {
                e.preventDefault();
                const rect = canvasRef.current?.getBoundingClientRect();
                const centerX = ((rect?.width || window.innerWidth) / 2 - transform.x) / transform.scale;
                const centerY = ((rect?.height || window.innerHeight) / 2 - transform.y) / transform.scale;

                const url = text.trim();
                let type: WhiteboardNode['type'] = 'link';
                let title = 'Link';

                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    type = 'youtube';
                    title = 'Youtube Video';
                }

                addNode({
                    id: Date.now().toString(),
                    type,
                    content: url,
                    position: { x: centerX, y: centerY },
                    title
                });
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [addNode, transform]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        const x = (rawX - transform.x) / transform.scale - 100;
        const y = (rawY - transform.y) / transform.scale - 100;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            for (const file of files) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const result = ev.target?.result as string;
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
                };
                reader.readAsDataURL(file);
            }
            return;
        }

        const textData = e.dataTransfer.getData('text/plain');
        if (textData) {
            let type: WhiteboardNode['type'] = 'text';
            let title = 'Note';
            if (textData.includes('youtube.com')) { type = 'youtube'; title = 'Youtube Video'; }
            else if (textData.startsWith('http')) { type = 'link'; title = 'Link'; }

            addNode({
                id: Math.random().toString(36).substr(2, 9),
                type,
                content: textData,
                position: { x, y },
                title
            });
        }
    };

    const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
        if (e.button === 2) {
            e.stopPropagation();
            e.preventDefault();
            if (!selectedNodeIds.has(id)) setSelectedNodeIds(new Set([id]));
            setContextMenu({ x: e.clientX, y: e.clientY, nodeId: id });
            return;
        }

        if (connectingFromId) {
             e.stopPropagation();
             if (connectingFromId !== id) {
                setConnections(prev => [...prev, {
                    id: Math.random().toString(36).substr(2, 9),
                    from: connectingFromId,
                    to: id
                }]);
             }
             setConnectingFromId(null);
             return;
        }

        e.stopPropagation();
        const node = nodes.find(n => n.id === id);
        if (node?.type === 'ai-partner') setActiveAiNodeId(id);

        const worldPos = getWorldMousePos(e);
        setLastWorldMousePos(worldPos);

        let newSelection = new Set(selectedNodeIds);
        if (e.shiftKey) {
            if (newSelection.has(id)) {
                newSelection.delete(id);
                if (node?.groupId) nodes.filter(n => n.groupId === node.groupId).forEach(g => newSelection.delete(g.id));
            } else {
                newSelection.add(id);
                if (node?.groupId) nodes.filter(n => n.groupId === node.groupId).forEach(g => newSelection.add(g.id));
            }
        } else {
            if (!newSelection.has(id)) {
                newSelection = new Set([id]);
                if (node?.groupId) nodes.filter(n => n.groupId === node.groupId).forEach(g => newSelection.add(g.id));
            }
        }
        setSelectedNodeIds(newSelection);
        setIsDraggingNodes(true);
        setContextMenu(null);
    };

    const handleMouseDownResize = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingNodeId(id);
    };

    const executeToolCalls = (toolCalls: any[]) => {
        if (!toolCalls) return;
        
        toolCalls.forEach(fc => {
             const args = fc.args;
             if (fc.name === 'create_notes') {
                 const newNodes: WhiteboardNode[] = args.notes.map((n: any) => ({
                     id: Math.random().toString(36).substr(2, 9),
                     type: 'text',
                     title: n.title || 'Note',
                     content: n.content,
                     position: { x: -transform.x / transform.scale + 100 + Math.random()*200, y: -transform.y / transform.scale + 100 + Math.random()*200 },
                     color: n.color,
                     width: 300,
                     height: 200
                 }));
                 setNodes(prev => [...prev, ...newNodes]);
             } else if (fc.name === 'organize_layout') {
                 setNodes(prev => prev.map(n => {
                     const move = args.moves.find((m: any) => m.id === n.id);
                     return move ? { ...n, position: { x: move.x, y: move.y } } : n;
                 }));
             } else if (fc.name === 'connect_nodes') {
                 const newConns = args.connections.map((c: any) => ({
                     id: Math.random().toString(36).substr(2, 9),
                     from: c.fromId,
                     to: c.toId
                 }));
                 setConnections(prev => [...prev, ...newConns]);
             } else if (fc.name === 'delete_nodes') {
                 setNodes(prev => prev.filter(n => !args.nodeIds.includes(n.id)));
                 setConnections(prev => prev.filter(c => !args.nodeIds.includes(c.from) && !args.nodeIds.includes(c.to)));
             } else if (fc.name === 'group_nodes') {
                 const groupId = Math.random().toString(36).substr(2, 9);
                 setNodes(prev => prev.map(n => args.nodeIds.includes(n.id) ? { ...n, groupId } : n));
             } else if (fc.name === 'ungroup_nodes') {
                 setNodes(prev => prev.map(n => args.nodeIds.includes(n.id) ? { ...n, groupId: undefined } : n));
             }
        });
    };

    const handleChatSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputMsg.trim() || !activeAiNodeId) return;

        const nodeId = activeAiNodeId;
        const userText = inputMsg;
        setInputMsg('');

        setChats(prev => ({ ...prev, [nodeId]: [...(prev[nodeId] || []), { role: 'user', text: userText }] }));
        setIsChatLoading(true);

        try {
            let chat = chatSessionsRef.current[nodeId];
            if (!chat) {
                // Only include nodes that are connected TO the AI agent
                const connectedNodeIds = new Set(
                    connections
                        .filter(conn => conn.to === nodeId)
                        .map(conn => conn.from)
                );

                // Include the AI agent itself and all connected nodes
                const relevantNodes = nodes.filter(n =>
                    n.id === nodeId || connectedNodeIds.has(n.id)
                );

                chat = createWhiteboardChatSession(relevantNodes);
                chatSessionsRef.current[nodeId] = chat;
            }

            const response = await chat.sendMessage({ message: userText });
            const aiText = response.text;

            // Handle Tool Calls
            if (response.functionCalls && response.functionCalls.length > 0) {
                 executeToolCalls(response.functionCalls);
                 // In a real loop we would send functionResponse back, but for UI updates one-off is okay for this demo
                 setChats(prev => ({ ...prev, [nodeId]: [...(prev[nodeId] || []), { role: 'model', text: aiText || "I've updated the board for you." }] }));
            } else {
                 setChats(prev => ({ ...prev, [nodeId]: [...(prev[nodeId] || []), { role: 'model', text: aiText || "Done." }] }));
            }

        } catch (err) {
            console.error(err);
             setChats(prev => ({ ...prev, [nodeId]: [...(prev[nodeId] || []), { role: 'model', text: "Sorry, I encountered an error." }] }));
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div 
            className="w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-50 relative select-none" 
            ref={canvasRef}
            onWheel={handleWheel as any}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
             {/* Grid */}
             <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                    backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
                    backgroundPosition: `${transform.x}px ${transform.y}px`
                }}
             />

             {/* Canvas Content */}
             <div 
                className="absolute origin-top-left will-change-transform"
                style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
             >
                 {/* Connections Layer */}
                 <svg className="overflow-visible absolute top-0 left-0 w-1 h-1 pointer-events-none">
                     {connections.map(conn => {
                         const from = nodes.find(n => n.id === conn.from);
                         const to = nodes.find(n => n.id === conn.to);
                         if (!from || !to) return null;
                         const fromX = from.position.x + (from.width || 300)/2;
                         const fromY = from.position.y + (from.height || 200)/2;
                         const toX = to.position.x + (to.width || 300)/2;
                         const toY = to.position.y + (to.height || 200)/2;
                         return (
                             <path 
                                key={conn.id}
                                d={`M ${fromX} ${fromY} C ${fromX} ${fromY + 100}, ${toX} ${toY - 100}, ${toX} ${toY}`}
                                stroke="#94a3b8"
                                strokeWidth="2"
                                fill="none"
                             />
                         );
                     })}
                     {connectingFromId && (() => {
                         const from = nodes.find(n => n.id === connectingFromId);
                         if (!from) return null;
                         const fromX = from.position.x + (from.width || 300)/2;
                         const fromY = from.position.y + (from.height || 200)/2;
                         return <path d={`M ${fromX} ${fromY} L ${mousePos.x} ${mousePos.y}`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" fill="none" />
                     })()}
                 </svg>

                 {/* Nodes Layer */}
                 {nodes.map(node => (
                     <div
                        key={node.id}
                        className={`absolute bg-white rounded-xl shadow-sm border transition-shadow group flex flex-col overflow-hidden ${
                            selectedNodeIds.has(node.id) ? 'ring-2 ring-blue-500 shadow-md z-10' : 'border-slate-200 hover:shadow-md'
                        } ${node.groupId ? 'ring-1 ring-dashed ring-slate-300' : ''}`}
                        style={{
                            left: node.position.x,
                            top: node.position.y,
                            width: node.width || 300,
                            height: node.height || 200,
                            backgroundColor: node.color || 'white'
                        }}
                        onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                     >
                         {/* Node Header */}
                         <div className="h-8 border-b border-black/5 bg-black/5 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing">
                             <div className="flex items-center gap-2">
                                {node.type === 'text' && <FileText size={14} className="text-slate-500" />}
                                {node.type === 'image' && <ImageIcon size={14} className="text-blue-500" />}
                                {node.type === 'youtube' && <Youtube size={14} className="text-red-500" />}
                                {node.type === 'ai-partner' && <Bot size={14} className="text-purple-600" />}
                                <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">{node.title}</span>
                             </div>
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1 hover:bg-black/10 rounded" onClick={(e) => { e.stopPropagation(); setConnectingFromId(node.id); }} title="Connect">
                                    <Cable size={12} />
                                </button>
                             </div>
                         </div>
                         
                         {/* Node Content */}
                         <div className="flex-1 overflow-hidden relative p-3">
                             {node.type === 'text' && (
                                 <textarea 
                                    className="w-full h-full bg-transparent resize-none outline-none text-sm text-slate-700"
                                    value={node.content}
                                    onChange={(e) => setNodes(prev => prev.map(n => n.id === node.id ? { ...n, content: e.target.value } : n))}
                                    onMouseDown={(e) => e.stopPropagation()}
                                 />
                             )}
                             {node.type === 'image' && (
                                 <img src={`data:${node.mimeType};base64,${node.content}`} className="w-full h-full object-contain" alt="" />
                             )}
                             {node.type === 'youtube' && (
                                 <iframe 
                                    width="100%" height="100%" 
                                    src={`https://www.youtube.com/embed/${getYoutubeId(node.content)}`} 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                    className="pointer-events-auto"
                                    onMouseDown={(e) => e.stopPropagation()}
                                 />
                             )}
                             {node.type === 'ai-partner' && (
                                 <div className="flex flex-col h-full">
                                     <div className="flex-1 overflow-y-auto space-y-3 p-1">
                                         {(chats[node.id] || []).map((msg, i) => (
                                             <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                 <div className={`max-w-[85%] p-2 rounded-lg text-xs ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                                     {msg.text}
                                                 </div>
                                             </div>
                                         ))}
                                         <div ref={chatEndRef} />
                                     </div>
                                     <div className="mt-2 pt-2 border-t border-slate-100">
                                         <form onSubmit={handleChatSubmit} className="flex gap-2">
                                             <input 
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                                                placeholder="Ask AI..."
                                                value={inputMsg}
                                                onChange={e => setInputMsg(e.target.value)}
                                                onMouseDown={e => e.stopPropagation()}
                                             />
                                             <button type="submit" className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={isChatLoading}>
                                                 {isChatLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                             </button>
                                         </form>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Resizer */}
                         <div 
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => handleMouseDownResize(e, node.id)}
                         >
                             <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400 fill-current">
                                 <path d="M10 10 L0 10 L10 0 Z" />
                             </svg>
                         </div>
                     </div>
                 ))}

                 {/* Selection Box */}
                 {selectionBox && (
                     <div 
                        className="absolute bg-blue-500/10 border border-blue-500/50 pointer-events-none"
                        style={{
                            left: Math.min(selectionBox.startX, selectionBox.currentX),
                            top: Math.min(selectionBox.startY, selectionBox.currentY),
                            width: Math.abs(selectionBox.currentX - selectionBox.startX),
                            height: Math.abs(selectionBox.currentY - selectionBox.startY)
                        }}
                     />
                 )}
             </div>

             {/* UI: Top Bar */}
             <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                 {/* Board Info */}
                 <div className="flex items-center gap-4">
                     <div className="bg-white rounded-lg shadow border border-slate-200 px-4 py-2">
                         <div className="text-sm font-medium text-slate-800">{boardTitle}</div>
                         <div className="text-xs text-slate-500">
                             {currentBoardId ? `${nodes.length} nodes` : 'No board loaded'}
                             {hasUnsavedChanges && <span className="text-orange-500 ml-2">• Unsaved changes</span>}
                         </div>
                     </div>
                 </div>

                 {/* Board Management */}
                 <div className="flex items-center gap-2">
                     <button
                         onClick={() => setIsBoardManagerOpen(true)}
                         className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
                         title="Open Board Manager"
                     >
                         <FolderOpen size={16} className="text-slate-600" />
                         <span className="text-sm text-slate-700">Boards</span>
                     </button>

                     {currentBoardId && (
                         <button
                             onClick={saveBoard}
                             disabled={isSavingBoard}
                             className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                             title="Save Board"
                         >
                             {isSavingBoard ? (
                                 <Loader2 size={16} className="animate-spin" />
                             ) : (
                                 <Save size={16} />
                             )}
                             <span className="text-sm">Save</span>
                         </button>
                     )}
                 </div>
             </div>

             {/* UI: Toolbar */}
             <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border border-slate-100 p-2 flex gap-2">
                 <button onClick={() => addNode({ id: Date.now().toString(), type: 'text', content: '', position: { x: -transform.x/transform.scale + 100, y: -transform.y/transform.scale + 100 }, title: 'Note' })} className="p-2 hover:bg-slate-100 rounded-full text-slate-600" title="Sticky Note">
                     <StickyNote size={20} />
                 </button>
                 <button onClick={() => addNode({ id: Date.now().toString(), type: 'ai-partner', content: '', position: { x: -transform.x/transform.scale + 150, y: -transform.y/transform.scale + 150 }, title: 'AI Partner' })} className="p-2 hover:bg-slate-100 rounded-full text-purple-600" title="AI Partner">
                     <Sparkles size={20} />
                 </button>
                 <button onClick={() => setIsYouTubeProcessorOpen(true)} className="p-2 hover:bg-slate-100 rounded-full text-red-600" title="YouTube Video Processor">
                     <Youtube size={20} />
                 </button>
                 <div className="w-px bg-slate-200 mx-1" />
                 <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded-full text-slate-600" title="Upload Media">
                     <ImageIcon size={20} />
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,application/pdf" onChange={(e) => { const files = (e.target as HTMLInputElement).files; if(files?.[0]) handleDrop({ preventDefault:()=>{}, dataTransfer: { files }, clientX: 500, clientY: 500 } as any); }} />
             </div>

             {/* Board Manager Modal */}
             {isBoardManagerOpen && (
                 <BoardManager
                     currentBoardId={currentBoardId}
                     onBoardSelect={handleBoardSelect}
                     onBoardCreate={handleBoardCreate}
                     onClose={() => setIsBoardManagerOpen(false)}
                 />
             )}

             {/* YouTube Processor Modal */}
             {isYouTubeProcessorOpen && (
                 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                     <YouTubeProcessor
                         onNodeCreate={(nodeData) => {
                             addNode(nodeData);
                             setIsYouTubeProcessorOpen(false);
                         }}
                         onClose={() => setIsYouTubeProcessorOpen(false)}
                     />
                 </div>
             )}

             {/* Loading Overlay */}
             {isLoadingBoard && (
                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-30">
                     <div className="bg-white rounded-lg shadow-lg p-6 flex items-center gap-3">
                         <Loader2 size={24} className="animate-spin text-blue-500" />
                         <span className="text-slate-700">Loading board...</span>
                     </div>
                 </div>
             )}

             {/* UI: Context Menu */}
             {contextMenu && (
                 <div className="fixed bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 w-48" style={{ top: contextMenu.y, left: contextMenu.x }}>
                     <button onClick={() => updateNodeColor(contextMenu.nodeId!, '#fef3c7')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm">
                         <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200"></div> Yellow
                     </button>
                     <button onClick={() => updateNodeColor(contextMenu.nodeId!, '#dbeafe')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm">
                         <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"></div> Blue
                     </button>
                     <button onClick={() => updateNodeColor(contextMenu.nodeId!, '#fce7f3')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm">
                         <div className="w-3 h-3 rounded-full bg-pink-100 border border-pink-200"></div> Pink
                     </button>
                     <div className="h-px bg-slate-100 my-1" />
                     <button onClick={handleGroupNodes} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700">
                         <Group size={14} /> Group Selection
                     </button>
                     <button onClick={handleUngroupNodes} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700">
                         <Ungroup size={14} /> Ungroup
                     </button>
                     <div className="h-px bg-slate-100 my-1" />
                     <button onClick={() => removeNode(contextMenu.nodeId!)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm">
                         <Trash2 size={14} /> Delete
                     </button>
                 </div>
             )}
        </div>
    );
};
