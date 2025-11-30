import React, { useState, useEffect } from 'react';
import { boardApi, ApiBoard } from '../services/apiService';
import { Plus, FolderOpen, Trash2, Edit3, Save, X, Loader2 } from 'lucide-react';

interface BoardManagerProps {
  currentBoardId?: string;
  onBoardSelect: (boardId: string) => void;
  onBoardCreate: (boardId: string) => void;
  onClose: () => void;
}

export const BoardManager: React.FC<BoardManagerProps> = ({
  currentBoardId,
  onBoardSelect,
  onBoardCreate,
  onClose,
}) => {
  const [boards, setBoards] = useState<ApiBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Load boards on mount
  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      setLoading(true);
      const userBoards = await boardApi.getBoards();
      setBoards(userBoards);
    } catch (error) {
      console.error('Failed to load boards:', error);
      alert('Failed to load boards. Please check your backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;

    try {
      setCreating(true);
      const newBoard = await boardApi.createBoard({
        title: newBoardTitle.trim(),
        description: newBoardDescription.trim() || undefined,
      });

      setBoards(prev => [newBoard, ...prev]);
      setNewBoardTitle('');
      setNewBoardDescription('');
      onBoardCreate(newBoard.id);
    } catch (error) {
      console.error('Failed to create board:', error);
      alert('Failed to create board. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectBoard = (board: ApiBoard) => {
    onBoardSelect(board.id);
  };

  const handleEditBoard = (board: ApiBoard) => {
    setEditing(board.id);
    setEditTitle(board.title);
    setEditDescription(board.description || '');
  };

  const handleSaveEdit = async (boardId: string) => {
    try {
      const updatedBoard = await boardApi.updateBoard(boardId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });

      setBoards(prev => prev.map(b => b.id === boardId ? updatedBoard : b));
      setEditing(null);
    } catch (error) {
      console.error('Failed to update board:', error);
      alert('Failed to update board. Please try again.');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(boardId);
      await boardApi.deleteBoard(boardId);
      setBoards(prev => prev.filter(b => b.id !== boardId));

      // If we deleted the current board, close the manager
      if (currentBoardId === boardId) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
      alert('Failed to delete board. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Board Manager</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Create New Board Section */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Create New Board</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Board title..."
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newBoardTitle.trim()) {
                  handleCreateBoard();
                }
              }}
            />
            <textarea
              placeholder="Board description (optional)..."
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
            />
            <button
              onClick={handleCreateBoard}
              disabled={!newBoardTitle.trim() || creating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {creating ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </div>

        {/* Boards List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Loading boards...</span>
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No boards yet. Create your first board above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Your Boards</h3>
              {boards.map((board) => (
                <div
                  key={board.id}
                  className={`border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
                    currentBoardId === board.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                >
                  {editing === board.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Board title..."
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                        placeholder="Board description..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(board.id)}
                          className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          <Save size={14} />
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="flex items-center gap-2 px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => handleSelectBoard(board)}>
                        <h4 className="font-medium text-slate-800">{board.title}</h4>
                        {board.description && (
                          <p className="text-sm text-slate-600 mt-1">{board.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>{board._count.nodes} nodes</span>
                          <span>{board._count.groups} groups</span>
                          <span>Created {formatDate(board.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => handleEditBoard(board)}
                          className="p-2 hover:bg-slate-100 rounded transition-colors"
                          title="Edit board"
                        >
                          <Edit3 size={16} className="text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteBoard(board.id)}
                          disabled={deleting === board.id}
                          className="p-2 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete board"
                        >
                          {deleting === board.id ? (
                            <Loader2 size={16} className="animate-spin text-red-500" />
                          ) : (
                            <Trash2 size={16} className="text-red-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
