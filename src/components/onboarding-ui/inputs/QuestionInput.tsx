import React from 'react';
import { OnboardingQuestion } from '@/types/onboarding-survey';
import { InterestedCertificationsPicker } from '../../certified-yatris/InterestedCertificationsPicker';
import { Input } from '../../ui/input';
import { isDummyPhoneNumber } from '@/lib/auth';

interface Props {
  question: OnboardingQuestion;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const QuestionInput: React.FC<Props> = ({
  question,
  value,
  onChange,
  error
}) => {
  const commonClasses = `w-full px-3.5 py-2.5 text-sm sm:text-base bg-white text-gray-900 border border-gray-200 outline-none rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`;

  switch (question.type) {
    case 'custom-certifications':
      return (
        <div className="p-2 bg-white rounded-lg">
          <InterestedCertificationsPicker
            value={value ? JSON.parse(value) : []}
            onChange={(items) => onChange(JSON.stringify(items))}
            label=""
            description=""
          />
        </div>
      );

    case 'select':
      return (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${commonClasses} text-gray-800 bg-white appearance-none pr-10`}
          >
            <option value="" disabled>
              Select an option...
            </option>
            {question.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
      );

    case 'tel':
      let phoneData = { code: '+91', phone: '' };
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (parsed.code) phoneData.code = parsed.code;
          if (parsed.phone && !isDummyPhoneNumber(parsed.phone)) phoneData.phone = parsed.phone;
        } catch {
          if (!isDummyPhoneNumber(value)) phoneData.phone = value; // fallback
        }
      }

      return (
        <div className="flex bg-white rounded-lg overflow-hidden border border-gray-200">
          <input
            type="text"
            className="w-18 sm:w-20 px-2 py-2.5 text-center font-mono text-xs sm:text-sm border-r border-gray-200 outline-none bg-white text-gray-900"
            value={phoneData.code}
            onChange={(e) => onChange(JSON.stringify({ ...phoneData, code: e.target.value }))}
            placeholder="+91"
          />
          <input
            type="tel"
            className="flex-1 px-3 py-2.5 text-sm sm:text-base outline-none bg-white text-gray-900"
            value={phoneData.phone}
            onChange={(e) => onChange(JSON.stringify({ ...phoneData, phone: e.target.value }))}
            placeholder={question.placeholder}
            autoFocus
          />
        </div>
      );

    case 'text':
    case 'url':
    default:
      return (
        <input
          type={question.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className={`${commonClasses} ${error ? 'text-red-500 placeholder-red-300' : 'text-gray-900 placeholder-gray-400'}`}
          autoFocus
        />
      );
  }
};
