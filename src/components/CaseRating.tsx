import React, { useState, useEffect } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CaseRatingProps {
  caseId: string;
  isOwner: boolean;
}

const CaseRating = ({ caseId, isOwner }: CaseRatingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRating, setUserRating] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Fetch the current rating information
  useEffect(() => {
    const fetchRatingInfo = async () => {
      try {
        setInitialLoading(true);
        const response = await fetch(`/api/cases/${caseId}/rate`);
        
        if (response.ok) {
          const data = await response.json();
          setAverageRating(data.caseRating.average);
          setRatingCount(data.caseRating.count);
          setUserRating(data.userRating);
        }
      } catch (error) {
        console.error('Error fetching rating info:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    if (caseId) {
      fetchRatingInfo();
    }
  }, [caseId]);

  // Handle rating submission
  const handleRating = async (rating: number) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to rate this case",
        variant: "destructive"
      });
      return;
    }
    
    if (isOwner) {
      toast({
        title: "Cannot rate own case",
        description: "You cannot rate your own case",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const idToken = await user.getIdToken(true);
      const response = await fetch(`/api/cases/${caseId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ rating })
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserRating(rating);
        setAverageRating(data.caseRating.average);
        setRatingCount(data.caseRating.count);
        
        toast({
          title: "Rating submitted",
          description: "Thank you for rating this case!",
          variant: "default"
        });
      } else {
        throw new Error('Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Render stars for rating display
  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.floor(rating);
          const halfFilled = !filled && star === Math.ceil(rating) && rating % 1 !== 0;
          
          return (
            <div 
              key={star}
              className={`${interactive ? 'cursor-pointer' : ''} p-1`}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              onClick={() => interactive && handleRating(star)}
            >
              {halfFilled ? (
                <StarHalf className="h-5 w-5 text-yellow-500" />
              ) : (
                <Star 
                  className={`h-5 w-5 ${filled ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                  fill={filled ? 'currentColor' : 'none'}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="flex items-center space-x-2 animate-pulse">
        <div className="h-5 w-24 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {renderStars(averageRating)}
          <span className="text-sm text-muted-foreground">
            {averageRating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
          </span>
        </div>
      </div>
      
      {user && !isOwner && (
        <div className="mt-2">
          <p className="text-sm font-medium mb-1">
            {userRating ? 'Your rating:' : 'Rate this case:'}
          </p>
          <div className="flex items-center space-x-2">
            {renderStars(hoverRating || userRating || 0, true)}
            {loading && <span className="text-xs text-muted-foreground animate-pulse">Submitting...</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseRating; 