import React from "react";
import { X, DivideIcon as LucideIcon } from "lucide-react";

interface ModalProps {
  title: string;
  titleIcon?: typeof LucideIcon;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  title,
  titleIcon: TitleIcon,
  subtitle,
  onClose,
  children,
}) => {
  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking on the backdrop itself, not on modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Prevent event bubbling when clicking inside modal content
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-background bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#0B0B0B] rounded-xl border-2 border-[#181818] w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={handleContentClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <div className="flex space-x-2">
              {TitleIcon && (
                <div className="rounded-lg flex items-center justify-center">
                  <TitleIcon size={23} className="text-blue-600" />
                </div>
              )}
              <h2 className="text-xl font-semibold text-white">{title}</h2>
            </div>
            {subtitle && (
              <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-dark max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
