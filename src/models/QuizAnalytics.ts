import mongoose, { Schema, Document } from 'mongoose';

interface QuestionStat {
  questionId: string;
  successRate: number;
  averageTimeSpent: number;
  skipRate: number;
}

// Define the type for the attempt parameter
interface AttemptType {
  completedAt?: Date;
  startedAt: Date;
  score: number;
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

interface QuizAnalyticsDocument extends Document {
  quizId: string;
  totalAttempts: number;
  completionRate: number;
  averageScore: number;
  averageTimeSpent: number;
  questionStats: QuestionStat[];
  updateWithAttempt: (attempt: AttemptType) => Promise<void>;
}

const QuizAnalyticsSchema = new Schema<QuizAnalyticsDocument>({
  quizId: {
    type: String,
    required: true,
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  completionRate: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  averageTimeSpent: {
    type: Number,
    default: 0
  },
  questionStats: [{
    questionId: String,
    successRate: {
      type: Number,
      default: 0
    },
    averageTimeSpent: {
      type: Number,
      default: 0
    },
    skipRate: {
      type: Number,
      default: 0
    }
  }]
}, { timestamps: true });

// Create a single index on quizId
QuizAnalyticsSchema.index({ quizId: 1 });

QuizAnalyticsSchema.methods.updateWithAttempt = async function(attempt: AttemptType): Promise<void> {
  // Update total attempts
  this.totalAttempts += 1;
  
  // Update completion rate
  const isComplete = !!attempt.completedAt;
  const totalComplete = this.completionRate * (this.totalAttempts - 1) / 100 + (isComplete ? 1 : 0);
  this.completionRate = (totalComplete / this.totalAttempts) * 100;
  
  // Update average score
  this.averageScore = ((this.averageScore * (this.totalAttempts - 1)) + attempt.score) / this.totalAttempts;
  
  // Update average time spent
  const timeSpent = attempt.completedAt 
    ? new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime()
    : 0;
  
  this.averageTimeSpent = ((this.averageTimeSpent * (this.totalAttempts - 1)) + timeSpent) / this.totalAttempts;
  
  // Update question stats
  for (const answer of attempt.answers) {
    let questionStat = this.questionStats.find((stat: QuestionStat) => stat.questionId === answer.questionId);
    
    if (!questionStat) {
      questionStat = {
        questionId: answer.questionId,
        successRate: 0,
        averageTimeSpent: 0,
        skipRate: 0
      };
      this.questionStats.push(questionStat);
    }
    
    // Update success rate
    const totalSuccess = questionStat.successRate * (this.totalAttempts - 1) / 100 + (answer.isCorrect ? 1 : 0);
    questionStat.successRate = (totalSuccess / this.totalAttempts) * 100;
    
    // Update average time spent
    questionStat.averageTimeSpent = ((questionStat.averageTimeSpent * (this.totalAttempts - 1)) + answer.timeSpent) / this.totalAttempts;
  }
  
  await this.save();
};

const QuizAnalytics = mongoose.models.QuizAnalytics || mongoose.model<QuizAnalyticsDocument>('QuizAnalytics', QuizAnalyticsSchema);

export default QuizAnalytics; 