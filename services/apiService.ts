// API Service for Whiteboard Backend Integration
// Handles communication with the backend APIs for boards, nodes, and chat

const API_BASE_URL = 'http://localhost:3001/api'; // Backend server URL

// Types for API responses
export interface ApiBoard {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    nodes: number;
    groups: number;
  };
}

export interface ApiNode {
  id: string;
  boardId: string;
  type: string;
  title: string;
  rawText?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ApiNodePosition {
  id: string;
  nodeId: string;
  boardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface ApiEdge {
  id: string;
  boardId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
}

export interface ApiGroup {
  id: string;
  boardId: string;
  name: string;
  description?: string;
  color?: string;
  members: Array<{
    id: string;
    nodeId: string;
  }>;
}

export interface BoardState {
  board: ApiBoard;
  nodes: ApiNode[];
  positions: ApiNodePosition[];
  groups: ApiGroup[];
  edges: ApiEdge[];
}

export interface CreateBoardRequest {
  title: string;
  description?: string;
}

export interface CreateNodeRequest {
  type: 'note' | 'youtube' | 'url';
  title: string;
  content?: string;
  url?: string;
  position?: { x: number; y: number };
}

export interface UpdateNodeRequest {
  title?: string;
  content?: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  color?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// API utility functions
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      // Note: Using stub auth - no token needed in development
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ================================
// BOARD API FUNCTIONS
// ================================

export const boardApi = {
  // Get all boards for the current user
  async getBoards(): Promise<ApiBoard[]> {
    const response = await apiRequest<{ status: string; data: { boards: ApiBoard[] } }>('/boards');
    return response.data.boards;
  },

  // Create a new board
  async createBoard(data: CreateBoardRequest): Promise<ApiBoard> {
    const response = await apiRequest<{ status: string; data: { board: ApiBoard } }>('/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data.board;
  },

  // Get a specific board
  async getBoard(boardId: string): Promise<ApiBoard> {
    const response = await apiRequest<{ status: string; data: { board: ApiBoard } }>(`/boards/${boardId}`);
    return response.data.board;
  },

  // Get full board state
  async getBoardState(boardId: string): Promise<BoardState> {
    const response = await apiRequest<{ status: string; data: BoardState }>(`/boards/${boardId}/state`);
    return response.data;
  },

  // Update a board
  async updateBoard(boardId: string, data: Partial<CreateBoardRequest>): Promise<ApiBoard> {
    const response = await apiRequest<{ status: string; data: { board: ApiBoard } }>(`/boards/${boardId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data.board;
  },

  // Delete a board
  async deleteBoard(boardId: string): Promise<void> {
    await apiRequest(`/boards/${boardId}`, {
      method: 'DELETE',
    });
  },

  // Create a board snapshot
  async createSnapshot(boardId: string): Promise<any> {
    const response = await apiRequest<{ status: string; data: { snapshot: any } }>(`/boards/${boardId}/snapshot`, {
      method: 'POST',
    });
    return response.data.snapshot;
  },
};

// ================================
// NODE API FUNCTIONS
// ================================

export const nodeApi = {
  // Create a note node
  async createNote(boardId: string, data: { title: string; content?: string }): Promise<ApiNode> {
    const response = await apiRequest<{ status: string; data: { node: ApiNode } }>(`/boards/${boardId}/nodes/note`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data.node;
  },

  // Create a YouTube video node
  async createYouTubeNode(boardId: string, data: { url: string; title?: string }): Promise<ApiNode> {
    const response = await apiRequest<{ status: string; data: { node: ApiNode } }>(`/boards/${boardId}/nodes/youtube`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data.node;
  },

  // Create a URL node
  async createUrlNode(boardId: string, data: { url: string; title?: string }): Promise<ApiNode> {
    const response = await apiRequest<{ status: string; data: { node: ApiNode } }>(`/boards/${boardId}/nodes/url`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data.node;
  },

  // Get a specific node
  async getNode(boardId: string, nodeId: string): Promise<ApiNode> {
    const response = await apiRequest<{ status: string; data: { node: ApiNode } }>(`/boards/${boardId}/nodes/${nodeId}`);
    return response.data.node;
  },

  // Update a node
  async updateNode(boardId: string, nodeId: string, data: UpdateNodeRequest): Promise<ApiNode> {
    const response = await apiRequest<{ status: string; data: { node: ApiNode } }>(`/boards/${boardId}/nodes/${nodeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data.node;
  },

  // Update node position
  async updatePosition(boardId: string, nodeId: string, position: { x: number; y: number }): Promise<void> {
    await apiRequest(`/boards/${boardId}/nodes/${nodeId}/position`, {
      method: 'PATCH',
      body: JSON.stringify(position),
    });
  },

  // Delete a node
  async deleteNode(boardId: string, nodeId: string): Promise<void> {
    await apiRequest(`/boards/${boardId}/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  },
};

// ================================
// CHAT API FUNCTIONS
// ================================

export const chatApi = {
  // Send a chat message
  async sendMessage(boardId: string, message: string): Promise<{ response: string; toolCalls?: any[] }> {
    const response = await apiRequest<{ status: string; data: any }>(`/boards/${boardId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return response.data;
  },

  // Get board summary
  async getSummary(boardId: string): Promise<string> {
    const response = await apiRequest<{ status: string; data: { summary: string } }>(`/boards/${boardId}/chat/summary`);
    return response.data.summary;
  },

  // Get connection suggestions
  async getConnectionSuggestions(boardId: string): Promise<any[]> {
    const response = await apiRequest<{ status: string; data: { suggestions: any[] } }>(`/boards/${boardId}/chat/suggestions/connections`);
    return response.data.suggestions;
  },
};

// ================================
// WEBSOCKET CLIENT
// ================================

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private boardId: string | null = null;

  connect(boardId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.boardId = boardId;
      this.socket = new WebSocket(`ws://localhost:3001`);

      this.socket.onopen = () => {
        // Join the board room
        this.socket?.send(JSON.stringify({
          type: 'join_board',
          boardId: boardId,
        }));
        resolve();
      };

      this.socket.onerror = (error) => {
        reject(error);
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };
    });
  }

  disconnect(): void {
    if (this.socket) {
      if (this.boardId) {
        this.socket.send(JSON.stringify({
          type: 'leave_board',
          boardId: this.boardId,
        }));
      }
      this.socket.close();
      this.socket = null;
      this.boardId = null;
    }
  }

  // Send node updates
  updateNode(nodeId: string, updates: any): void {
    if (this.socket && this.boardId) {
      this.socket.send(JSON.stringify({
        type: 'node:update',
        boardId: this.boardId,
        nodeId,
        updates,
      }));
    }
  }

  // Send node movement
  moveNode(nodeId: string, position: { x: number; y: number }): void {
    if (this.socket && this.boardId) {
      this.socket.send(JSON.stringify({
        type: 'node:move',
        boardId: this.boardId,
        nodeId,
        position,
      }));
    }
  }

  // Send cursor movement (optional)
  moveCursor(x: number, y: number): void {
    if (this.socket && this.boardId) {
      this.socket.send(JSON.stringify({
        type: 'cursor:move',
        boardId: this.boardId,
        x,
        y,
      }));
    }
  }

  // Handle incoming messages
  private handleMessage(data: any): void {
    switch (data.type) {
      case 'node:updated':
        // Handle node updates from other users
        console.log('Node updated by another user:', data);
        break;
      case 'node:moved':
        // Handle node movement from other users
        console.log('Node moved by another user:', data);
        break;
      case 'cursor:move':
        // Handle cursor movement from other users
        console.log('Cursor moved by another user:', data);
        break;
      case 'user:joined':
        console.log('User joined:', data);
        break;
      case 'user:left':
        console.log('User left:', data);
        break;
    }
  }
}
