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
        const count = 200; // Increased count for more dramatic effect
        const defaults = {
          origin: { y: 0.7 },
          gravity: 0.6, // Even slower fall for longer visibility
          drift: 0.2 // More drift for natural movement
        };

        function fire(particleRatio: number, opts: confetti.Options) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
          });
        }

        // Extended staggered animation for longer effect
        // First burst - small spread
        fire(0.25, {
          spread: 30,
          startVelocity: 30, // Slower start velocity
          decay: 0.82, // Slower decay for much longer animation
        });

        // Second burst - medium spread (delayed)
        setTimeout(() => {
          fire(0.3, {
            spread: 60,
            startVelocity: 35,
            decay: 0.84,
            scalar: 0.9
          });
        }, 300);

        // Third burst - wide spread (more delayed)
        setTimeout(() => {
          fire(0.25, {
            spread: 100,
            startVelocity: 28,
            decay: 0.82,
            scalar: 0.8
          });
        }, 600);

        // Fourth burst - very wide spread (even more delayed)
        setTimeout(() => {
          fire(0.2, {
            spread: 140,
            startVelocity: 25,
            decay: 0.8,
            scalar: 1.1
          });
        }, 900);

        // Final burst - maximum spread (most delayed)
        setTimeout(() => {
          fire(0.15, {
            spread: 180,
            startVelocity: 22,
            decay: 0.78,
            scalar: 1.2
          });
        }, 1200);
      };

      // Longer delay before confetti starts
      const confettiTimeout = setTimeout(triggerConfetti, 1000);
      
      return () => clearTimeout(confettiTimeout);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop - Remove onClick to prevent accidental closing */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
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
