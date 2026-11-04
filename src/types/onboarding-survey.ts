export type OnboardingQuestionType = 
  | 'text'
  | 'url'
  | 'select'
  | 'tel'
  | 'custom-certifications';

export interface OnboardingQuestion {
  id: string;
  question: string;
  type: OnboardingQuestionType;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
  optional?: boolean;
}
