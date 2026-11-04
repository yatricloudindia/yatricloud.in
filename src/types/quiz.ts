/**
 * Quiz Builder Types
 * Data structures for training quiz/practice test feature
 */

export interface AnswerOption {
    text: string;
    explanation: string;
}

export interface QuizQuestion {
    id: string;
    question: string;
    questionType: 'multiple-choice' | 'multi-select';
    options: AnswerOption[];
    correctAnswers: number[]; // 1-based indices of correct options
    overallExplanation: string;
    domain?: string;
    order: number;
}

export interface TrainingQuiz {
    trainingId: string;
    questions: QuizQuestion[];
    passingScore?: number; // Percentage (optional)
    timeLimit?: number; // Minutes (optional)
}

export interface CSVQuizRow {
    Question: string;
    'Question Type': string;
    'Answer Option 1': string;
    'Explanation 1': string;
    'Answer Option 2': string;
    'Explanation 2': string;
    'Answer Option 3': string;
    'Explanation 3': string;
    'Answer Option 4': string;
    'Explanation 4': string;
    'Answer Option 5': string;
    'Explanation 5': string;
    'Answer Option 6': string;
    'Explanation 6': string;
    'Correct Answers': string;
    'Overall Explanation': string;
    Domain: string;
}
