
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { DashboardNav } from '../components/DashboardNav';
import ChatPanel from '../components/ChatPanel';

export default function AssistantPage() {
  const navigate = useNavigate();
  const { 
    userLocation, 
    selectedPort, 
    messages,
    isLoading,
    error,
    currentLang,
    handleSendMessage,
    setError,
    resetChat
  } = useGlobalContext();
  
  const locationName = selectedPort ? `${selectedPort.name}, ${selectedPort.state}` : `${userLocation.lat.toFixed(4)}° N, ${userLocation.lon.toFixed(4)}° E`;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F7F9FC] text-slate-900 font-body overflow-hidden">
      <DashboardNav />
      
      {/* Subheader */}
      <div className="bg-[#f4f7f9] border-b border-slate-200 px-6 py-2.5 flex justify-between items-center text-sm shadow-sm shrink-0">
        <span className="text-slate-700 font-medium">{locationName}</span>
        <button 
          onClick={() => navigate('/location')}
          className="text-[#0a2540] font-medium hover:text-teal-700 transition-colors cursor-pointer"
        >
          Change location
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f8fafc] pt-12 pb-20">
        <div className="w-full max-w-[800px] mx-auto px-6">
           <ChatPanel
              messages={messages}
              isLoading={isLoading}
              error={error}
              currentLang={currentLang}
              onSendMessage={handleSendMessage}
              onClearError={() => setError(null)}
              onResetChat={resetChat}
            />
        </div>
      </div>
    </div>
  );
}
