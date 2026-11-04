/**
 * Student Quiz Attempt Types
 * Data structures for students taking quizzes
 */

import { QuizQuestion } from './quiz';

export interface QuizAnswer {
    questionId: string;
    selectedAnswers: number[]; // 1-based indices of selected options
    isCorrect?: boolean; // Calculated after submission
    flagged: boolean;
    timeSpent?: number; // seconds on this question
}

export interface QuizAttempt {
    attemptId: string;
    trainingId: string;
    userId: string;
    quizId: string;
    userName?: string;
    quizTitle?: string;
    startTime: Date;
    endTime?: Date;
    timeSpent: number; // total seconds
    answers: QuizAnswer[];
    score?: number; // percentage (0-100)
    isPassed?: boolean;
    status: 'in-progress' | 'completed' | 'abandoned';
    totalQuestions: number;
    timeLimit?: number; // minutes
}

export interface QuizAttemptSummary {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    unansweredQuestions: number;
    timeSpent: number; // seconds
    score: number; // percentage
    isPassed: boolean;
}

export interface QuizMetadata {
    quizId: string;
    title: string;
    description?: string;
    totalQuestions: number;
    timeLimit?: number; // minutes
    passingScore?: number; // percentage
    instructions?: string[];
    allowedAttempts?: number; // 0 = unlimited
}

export interface PreviousAttempt {
    attemptId: string;
    date: Date;
    score: number;
    timeSpent: number;
    isPassed: boolean;
}
