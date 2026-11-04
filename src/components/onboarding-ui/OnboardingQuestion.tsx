import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import React, { KeyboardEvent } from 'react';
import { OnboardingQuestion as QuestionType } from '../../types/onboarding-survey';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { QuestionInput } from './inputs/QuestionInput';
import { Background } from './Background';

interface Props {
  question: QuestionType;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  error?: string;
  isSubmitting?: boolean;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
}

export const OnboardingQuestion: React.FC<Props> = ({ 
  question, 
  value, 
  onChange, 
  onSubmit,
  onBack,
  error,
  isSubmitting = false,
  isFirstQuestion,
  isLastQuestion
}) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const getGradientPosition = (id: string) => {
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return sum % 4;
  };

  const isDisabled = () => {
    if (isSubmitting) return true;
    if (error) return true;
    
    // For custom-certifications, value is a JSON string of array. Need at least one if not optional.
    if (question.type === 'custom-certifications' && !question.optional) {
      try {
        const arr = JSON.parse(value);
        if (!Array.isArray(arr) || arr.length === 0) return true;
      } catch {
        return true;
      }
    } else if (question.type === 'tel' && !question.optional) {
       try {
        const parsed = JSON.parse(value);
        if (!parsed.code || !parsed.phone || !parsed.phone.trim()) return true;
      } catch {
        if (!value.trim()) return true;
      }
    } else if (!question.optional && !value.trim()) {
      return true;
    }
    
    return false;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !isDisabled() && question.type !== 'custom-certifications') {
      onSubmit();
    }
  };

  return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: 20 }}
        animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-col justify-center py-4 w-full"
        onKeyDown={handleKeyDown}
      >
        <div className="w-full">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-lg sm:text-xl font-bold text-gray-900 mb-2 tracking-tight"
          >
            {question.question}
          </motion.h2>

          {question.description && (
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-xs sm:text-sm text-gray-600 mb-3"
            >
              {question.description}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="w-full"
          >
            <QuestionInput
              question={question}
              value={value}
              onChange={onChange}
              error={error}
            />
          </motion.div>
          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-xs mt-1.5 font-medium"
            >
              {error}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5 flex items-center justify-between gap-3"
          >
            {!isFirstQuestion ? (
              <button
                onClick={onBack}
                className="group flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 hover:bg-gray-50 shadow-sm border border-gray-200"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                <span>Back</span>
              </button>
            ) : <div />}
            
            <button
              onClick={onSubmit}
              disabled={isDisabled()}
              className={`group relative flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 ml-auto shadow-md
                ${isDisabled() 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-primary/90'
                }`}
            >
              <span className="relative z-10">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isLastQuestion ? 'Complete Setup' : 'Continue'
                )}
              </span>
              {!isSubmitting && (
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 relative z-10" />
              )}
            </button>
          </motion.div>

          {(question.type === 'text' || question.type === 'url' || question.type === 'tel') && !error && (
            <p className="text-[11px] text-gray-400 text-center mt-3">
              Press Enter ↵ to continue
            </p>
          )}
        </div>
      </motion.div>
  );
};
