import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface SuccessModalProps {
  show: boolean;
  onHide: () => void;
  title?: string;
  message?: string;
  actionButton?: {
    text: string;
    onClick: () => void;
  };
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  show,
  onHide,
  title = "Success! 🎉",
  message = "Your preferences have been saved successfully!",
  actionButton
}) => {
  
  useEffect(() => {
    if (show) {
      // Trigger confetti animation when modal opens
      const triggerConfetti = () => {
        const count = 150; // Optimized count for better performance
        const defaults = {
          origin: { y: 0.7 },
          gravity: 0.8, // Faster fall for better performance
          drift: 0.1 // Less drift for smoother animation
        };

        function fire(particleRatio: number, opts: confetti.Options) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
          });
        }

        // Simplified, faster animation
        fire(0.25, {
          spread: 26,
          startVelocity: 55,
        });
        
        fire(0.2, {
          spread: 60,
        });
        
        fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.8
        });
        
        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2
        });
      };

      // Shorter delay for better responsiveness
      const confettiTimeout = setTimeout(triggerConfetti, 200);
      
      return () => clearTimeout(confettiTimeout);
    }
  }, [show]);

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-300 ${
      show ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300" />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all duration-300 sm:my-8 sm:w-full sm:max-w-sm sm:p-6 ${
          show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}>
          {/* Content */}
          <div className="text-center">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
            
            {/* Message */}
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-6">
              {message}
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {actionButton && (
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                  onClick={actionButton.onClick}
                >
                  {actionButton.text}
                </button>
              )}
              
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                onClick={onHide}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;