'use client';

import { usePathname } from 'next/navigation';
import { AgenticAIView } from '@/components/landing/AgenticAIView';
import { ChatbotBuilderView } from '@/components/landing/ChatbotBuilderView';
import { SLMView } from '@/components/landing/SLMView';
import { VoiceAgentsView } from '@/components/landing/VoiceAgentsView';

export default function LandingPage() {
  const pathname = usePathname();

  // Determine which view to show based on the referrer or session state
  // For now, we'll cycle through different views or show a default
  // You can enhance this to track which section the user came from

  // Check if there's a section parameter in the URL or sessionStorage
  const getActiveSection = () => {
    if (typeof window !== 'undefined') {
      const section = sessionStorage.getItem('activeSection');
      return section || 'workflow';
    }
    return 'workflow';
  };

  const activeSection = getActiveSection();

  // Render the appropriate view based on the active section
  const renderView = () => {
    switch (activeSection) {
      case 'cognitive':
        return <AgenticAIView />;
      case 'chatbot':
        return <ChatbotBuilderView />;
      case 'slm':
        return <SLMView />;
      case 'voice':
        return <VoiceAgentsView />;
      case 'workflow':
      case 'dashboard':
      default:
        // Default to workflow/agentic view
        return <AgenticAIView />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {renderView()}
    </div>
  );
}
