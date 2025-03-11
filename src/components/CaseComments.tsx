import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  ThumbsUp, 
  Reply, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  likes: string[];
  replyCount?: number;
}

interface CaseCommentsProps {
  caseId: string;
}

const CaseComments = ({ caseId }: CaseCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [repliesLoading, setRepliesLoading] = useState<Record<string, boolean>>({});
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/cases/${caseId}/comments?parentId=null&page=${page}`);
        
        if (response.ok) {
          const data = await response.json();
          if (page === 1) {
            setComments(data.comments);
          } else {
            setComments(prev => [...prev, ...data.comments]);
          }
          setHasMore(data.pagination.page < data.pagination.pages);
        } else {
          throw new Error('Failed to fetch comments');
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
        toast({
          title: "Error",
          description: "Failed to load comments. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (caseId) {
      fetchComments();
    }
  }, [caseId, page, toast]);

  // Load more comments
  const loadMoreComments = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      setPage(prev => prev + 1);
      setLoadingMore(false);
    }
  };

  // Submit a new comment
  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to comment",
        variant: "destructive"
      });
      return;
    }
    
    if (!newComment.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter a comment",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      const idToken = await user.getIdToken(true);
      const response = await fetch(`/api/cases/${caseId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ content: newComment })
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(prev => [data.comment, ...prev]);
        setNewComment('');
        toast({
          title: "Comment added",
          description: "Your comment has been added successfully",
          variant: "default"
        });
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Edit a comment
  const handleEditComment = async (commentId: string) => {
    if (!user) return;
    
    if (!editContent.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter a comment",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      const idToken = await user.getIdToken(true);
      const response = await fetch(`/api/cases/${caseId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ content: editContent })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the comment in the state
        if (replyingTo) {
          // If it's a reply
          setReplies(prev => ({
            ...prev,
            [replyingTo]: prev[replyingTo].map(reply => 
              reply._id === commentId ? data.comment : reply
            )
          }));
        } else {
          // If it's a top-level comment
          setComments(prev => 
            prev.map(comment => comment._id === commentId ? data.comment : comment)
          );
        }
        
        setEditingComment(null);
        setEditContent('');
        
        toast({
          title: "Comment updated",
          description: "Your comment has been updated successfully",
          variant: "default"
        });
      } else {
        throw new Error('Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Error",
        description: "Failed to update comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string, parentId: string | null = null) => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch(`/api/cases/${caseId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        if (parentId) {
          // If it's a reply
          setReplies(prev => ({
            ...prev,
            [parentId]: prev[parentId].filter(reply => reply._id !== commentId)
          }));
          
          // Update the reply count
          setComments(prev => 
            prev.map(comment => 
              comment._id === parentId 
                ? { ...comment, replyCount: (comment.replyCount || 0) - 1 }
                : comment
            )
          );
        } else {
          // If it's a top-level comment
          setComments(prev => prev.filter(comment => comment._id !== commentId));
        }
        
        toast({
          title: "Comment deleted",
          description: "Your comment has been deleted successfully",
          variant: "default"
        });
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Like a comment
  const handleLikeComment = async (commentId: string, parentId: string | null = null) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to like comments",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch(`/api/cases/${caseId}/comments/${commentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the comment in the state
        if (parentId) {
          // If it's a reply
          setReplies(prev => ({
            ...prev,
            [parentId]: prev[parentId].map(reply => {
              if (reply._id === commentId) {
                return {
                  ...reply,
                  likes: data.liked 
                    ? [...reply.likes, user.uid]
                    : reply.likes.filter((id: string) => id !== user.uid)
                };
              }
              return reply;
            })
          }));
        } else {
          // If it's a top-level comment
          setComments(prev => 
            prev.map(comment => {
              if (comment._id === commentId) {
                return {
                  ...comment,
                  likes: data.liked 
                    ? [...comment.likes, user.uid]
                    : comment.likes.filter((id: string) => id !== user.uid)
                };
              }
              return comment;
            })
          );
        }
      } else {
        throw new Error('Failed to like/unlike comment');
      }
    } catch (error) {
      console.error('Error liking/unliking comment:', error);
      toast({
        title: "Error",
        description: "Failed to like/unlike comment. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Reply to a comment
  const handleReply = async (parentId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to reply",
        variant: "destructive"
      });
      return;
    }
    
    if (!replyContent.trim()) {
      toast({
        title: "Empty reply",
        description: "Please enter a reply",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      const idToken = await user.getIdToken(true);
      const response = await fetch(`/api/cases/${caseId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          content: replyContent,
          parentId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Add the reply to the state
        setReplies(prev => ({
          ...prev,
          [parentId]: prev[parentId] ? [data.comment, ...prev[parentId]] : [data.comment]
        }));
        
        // Update the reply count
        setComments(prev => 
          prev.map(comment => 
            comment._id === parentId 
              ? { ...comment, replyCount: (comment.replyCount || 0) + 1 }
              : comment
          )
        );
        
        setReplyingTo(null);
        setReplyContent('');
        
        // Make sure replies are shown
        setShowReplies(prev => ({
          ...prev,
          [parentId]: true
        }));
        
        toast({
          title: "Reply added",
          description: "Your reply has been added successfully",
          variant: "default"
        });
      } else {
        throw new Error('Failed to add reply');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast({
        title: "Error",
        description: "Failed to add reply. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle showing replies
  const toggleReplies = async (commentId: string) => {
    // If we already have the replies, just toggle visibility
    if (replies[commentId]) {
      setShowReplies(prev => ({
        ...prev,
        [commentId]: !prev[commentId]
      }));
      return;
    }
    
    // Otherwise, fetch the replies
    try {
      setRepliesLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      
      const response = await fetch(`/api/cases/${caseId}/comments?parentId=${commentId}`);
      
      if (response.ok) {
        const data = await response.json();
        setReplies(prev => ({
          ...prev,
          [commentId]: data.comments
        }));
        
        setShowReplies(prev => ({
          ...prev,
          [commentId]: true
        }));
      } else {
        throw new Error('Failed to fetch replies');
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
      toast({
        title: "Error",
        description: "Failed to load replies. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRepliesLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'some time ago';
    }
  };

  // Render a comment
  const renderComment = (comment: Comment, isReply = false) => {
    const isAuthor = user && user.uid === comment.userId;
    const hasLiked = user && comment.likes.includes(user.uid);
    
    return (
      <div key={comment._id} className={`${isReply ? 'ml-8 mt-3' : 'mb-6'}`}>
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            {comment.userAvatar && <AvatarImage src={comment.userAvatar} alt={comment.userName} />}
            <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.userName}</span>
                <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
              </div>
              
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingComment(comment._id);
                      setEditContent(comment.content);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeleteComment(comment._id, isReply ? comment.parentId : null)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {editingComment === comment._id ? (
              <div className="mt-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Edit your comment..."
                  className="min-h-[100px]"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleEditComment(comment._id)}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1">{comment.content}</p>
            )}
            
            <div className="flex items-center gap-4 mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 px-2 ${hasLiked ? 'text-primary' : ''}`}
                onClick={() => handleLikeComment(comment._id, isReply ? comment.parentId : null)}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                {comment.likes.length > 0 && (
                  <span className="text-xs">{comment.likes.length}</span>
                )}
              </Button>
              
              {!isReply && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={() => {
                    if (replyingTo === comment._id) {
                      setReplyingTo(null);
                      setReplyContent('');
                    } else {
                      setReplyingTo(comment._id);
                      setReplyContent('');
                    }
                  }}
                >
                  <Reply className="h-4 w-4 mr-1" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}
            </div>
            
            {replyingTo === comment._id && (
              <div className="mt-3">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[80px]"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleReply(comment._id)}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : 'Reply'}
                  </Button>
                </div>
              </div>
            )}
            
            {!isReply && comment.replyCount && comment.replyCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 h-8 px-2 text-muted-foreground"
                onClick={() => toggleReplies(comment._id)}
                disabled={repliesLoading[comment._id]}
              >
                {repliesLoading[comment._id] ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : showReplies[comment._id] ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-1" />
                )}
                <span className="text-xs">
                  {showReplies[comment._id] ? 'Hide' : 'Show'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                </span>
              </Button>
            )}
            
            {showReplies[comment._id] && replies[comment._id] && (
              <div className="mt-3">
                {replies[comment._id].map(reply => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5" />
        <h3 className="text-xl font-semibold">Discussion</h3>
      </div>
      
      {user ? (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts or findings about this case..."
                  className="min-h-[120px]"
                />
                <div className="flex justify-end mt-2">
                  <Button 
                    onClick={handleSubmitComment}
                    disabled={submitting || !newComment.trim()}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground mb-2">Sign in to join the discussion</p>
            <Button onClick={() => {
              // Redirect to login
              window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
            }}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Separator className="my-6" />
      
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-muted"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="h-3 w-full bg-muted rounded"></div>
                <div className="h-3 w-3/4 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div>
          <div className="space-y-6">
            {comments.map(comment => renderComment(comment))}
          </div>
          
          {hasMore && (
            <div className="text-center mt-6">
              <Button 
                variant="outline" 
                onClick={loadMoreComments}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : 'Load More Comments'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CaseComments; 