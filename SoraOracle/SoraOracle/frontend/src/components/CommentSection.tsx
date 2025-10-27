import React, { useState, useEffect } from 'react';
import { CommentService, Comment } from '../services/commentService';
import { useProfile } from '../contexts/ProfileContext';
import { useWallet } from '@sora-oracle/sdk/hooks';
import './CommentSection.css';

interface CommentSectionProps {
  marketAddress: string;
}

export function CommentSection({ marketAddress }: CommentSectionProps) {
  const { address, isConnected } = useWallet();
  const { profile } = useProfile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [marketAddress]);

  const loadComments = () => {
    const marketComments = CommentService.getMarketComments(marketAddress);
    setComments(marketComments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address || !profile || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      CommentService.addComment(
        marketAddress,
        address,
        profile.username,
        newComment.trim()
      );
      setNewComment('');
      loadComments();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (commentId: string) => {
    if (!address) return;
    if (CommentService.deleteComment(commentId, address)) {
      loadComments();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="comment-section">
      <h3>Discussion ({comments.length})</h3>

      {isConnected && profile ? (
        <form onSubmit={handleSubmit} className="comment-form">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            maxLength={500}
            rows={3}
            disabled={isSubmitting}
          />
          <div className="comment-form-actions">
            <span className="char-count">{newComment.length}/500</span>
            <button 
              type="submit" 
              disabled={!newComment.trim() || isSubmitting}
              className="btn-post-comment"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="comment-login-prompt">
          <p>Connect your wallet and create a profile to join the discussion</p>
        </div>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <div className="comment-author">
                  <span className="author-username">{comment.authorUsername}</span>
                  <span className="author-address">
                    {comment.author.slice(0, 6)}...{comment.author.slice(-4)}
                  </span>
                </div>
                <div className="comment-meta">
                  <span className="comment-time">{formatTimestamp(comment.timestamp)}</span>
                  {address?.toLowerCase() === comment.author && (
                    <button 
                      className="btn-delete-comment"
                      onClick={() => handleDelete(comment.id)}
                      title="Delete comment"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <p className="comment-content">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
