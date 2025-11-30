import React, { useState, useRef, useCallback } from 'react';
import {
    Youtube, Play, Square, Loader2, FileText, MessageSquare,
    Check, X, AlertCircle, Download, Eye, EyeOff
} from 'lucide-react';
import { youtubeApi, YouTubeMetadata, YouTubeProcessingResult } from '../services/apiService';

interface YouTubeProcessorProps {
    onNodeCreate?: (nodeData: any) => void;
    onClose?: () => void;
}

export const YouTubeProcessor: React.FC<YouTubeProcessorProps> = ({ onNodeCreate, onClose }) => {
    // State
    const [url, setUrl] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [result, setResult] = useState<YouTubeProcessingResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Refs
    const urlInputRef = useRef<HTMLInputElement>(null);

    // Extract video ID for preview
    const videoId = youtubeApi.extractVideoId(url);

    // Handle URL processing
    const handleProcess = useCallback(async () => {
        if (!url.trim()) {
            setError('Please enter a YouTube URL');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setResult(null);
        setProcessingStep('Getting video metadata...');

        try {
            // First, get metadata
            const metadata = await youtubeApi.getMetadata(url);
            setProcessingStep('Downloading audio...');

            // For demo purposes, we'll create a temporary node ID
            // In a real implementation, this would be created when adding to the board
            const tempNodeId = `youtube-${Date.now()}`;

            setProcessingStep('Transcribing audio...');

            // Process the video
            const processingResult = await youtubeApi.processVideo('temp-board', tempNodeId, url);

            setResult(processingResult);
            setProcessingStep('Processing complete!');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process YouTube video');
        } finally {
            setIsProcessing(false);
            setProcessingStep('');
        }
    }, [url]);

    // Handle analysis
    const handleAnalyze = useCallback(async () => {
        if (!result?.transcript) return;

        setIsAnalyzing(true);
        try {
            const analysisResult = await youtubeApi.analyzeTranscript(result.transcript);
            setAnalysis(analysisResult);
        } catch (err) {
            console.error('Analysis failed:', err);
        } finally {
            setIsAnalyzing(false);
        }
    }, [result]);

    // Handle adding to whiteboard
    const handleAddToBoard = useCallback(() => {
        if (!result) return;

        const nodeData = {
            id: `youtube-${Date.now()}`,
            type: 'youtube' as const,
            title: result.metadata.title || 'YouTube Video',
            content: url,
            position: { x: 100, y: 100 },
            width: 400,
            height: 300,
            metadata: {
                transcript: result.transcript,
                summary: result.summary,
                analysis: analysis,
                thumbnail: result.metadata.thumbnail,
                channel: result.metadata.channel,
                duration: result.metadata.duration,
            }
        };

        onNodeCreate?.(nodeData);
        onClose?.();
    }, [result, analysis, url, onNodeCreate, onClose]);

    // Handle key press in URL input
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isProcessing) {
            handleProcess();
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg border border-slate-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <Youtube size={24} className="text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">YouTube Video Processor</h2>
                        <p className="text-sm text-slate-500">Add YouTube videos with automatic transcription and analysis</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                )}
            </div>

            {/* URL Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    YouTube URL
                </label>
                <div className="flex gap-3">
                    <input
                        ref={urlInputRef}
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isProcessing}
                    />
                    <button
                        onClick={handleProcess}
                        disabled={isProcessing || !url.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Processing
                            </>
                        ) : (
                            <>
                                <Play size={16} />
                                Process
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Processing Status */}
            {isProcessing && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Loader2 size={20} className="animate-spin text-blue-600" />
                        <div>
                            <p className="font-medium text-blue-800">Processing YouTube Video</p>
                            <p className="text-sm text-blue-600">{processingStep}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-600" />
                        <p className="text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Video Preview */}
            {videoId && !result && !error && (
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3">Video Preview</h3>
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                        />
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6">
                    {/* Metadata */}
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <h3 className="font-medium text-slate-800 mb-2">Video Information</h3>
                        <div className="space-y-1 text-sm text-slate-600">
                            <p><strong>Title:</strong> {result.metadata.title}</p>
                            <p><strong>Channel:</strong> {result.metadata.channel}</p>
                            {result.metadata.duration && (
                                <p><strong>Duration:</strong> {Math.floor(result.metadata.duration / 60)}:{(result.metadata.duration % 60).toString().padStart(2, '0')}</p>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Check size={16} className="text-green-600" />
                            <h3 className="font-medium text-green-800">Processing Complete</h3>
                        </div>
                        <p className="text-sm text-green-700">{result.summary}</p>
                    </div>

                    {/* Transcript */}
                    <div className="border border-slate-200 rounded-lg">
                        <button
                            onClick={() => setShowTranscript(!showTranscript)}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <FileText size={20} className="text-slate-600" />
                                <div className="text-left">
                                    <h3 className="font-medium text-slate-800">Transcript</h3>
                                    <p className="text-sm text-slate-500">
                                        {result.transcript.length} characters
                                    </p>
                                </div>
                            </div>
                            {showTranscript ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        {showTranscript && (
                            <div className="px-4 pb-4">
                                <div className="max-h-60 overflow-y-auto text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                                    {result.transcript}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Analysis */}
                    <div className="border border-slate-200 rounded-lg">
                        <div className="p-4">
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <MessageSquare size={20} className="text-slate-600" />
                                    <div className="text-left">
                                        <h3 className="font-medium text-slate-800">AI Analysis</h3>
                                        <p className="text-sm text-slate-500">
                                            Analyze the content for insights and key points
                                        </p>
                                    </div>
                                </div>
                                {isAnalyzing ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    showAnalysis ? <EyeOff size={16} /> : <Eye size={16} />
                                )}
                            </button>
                        </div>
                        {analysis && (
                            <div className="px-4 pb-4">
                                <div className="max-h-60 overflow-y-auto text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                                    {analysis}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            onClick={handleAddToBoard}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Youtube size={16} />
                            Add to Whiteboard
                        </button>
                        <button
                            onClick={() => {
                                const blob = new Blob([result.transcript], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${result.metadata.title || 'transcript'}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                            <Download size={16} />
                            Download
                        </button>
                    </div>
                </div>
            )}

            {/* Instructions */}
            {!result && !isProcessing && !error && (
                <div className="text-center py-8 text-slate-500">
                    <Youtube size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-sm">
                        Enter a YouTube URL above to automatically transcribe and analyze the video content.
                        <br />
                        The processed content will be available for analysis by the AI whiteboard assistant.
                    </p>
                </div>
            )}
        </div>
    );
};
