import { useEffect, useState, useRef } from "react";
import { liveCommentaryChannelId, uiResetChannel } from "../data/constants";
import GuideOverlay from "../components/guideOverlay";

interface CommentaryItem {
  id: string;
  text: string;
  time?: string;
  timeCode?: string;      // Original MM:SS from backend
  videoTimeMs?: number;   // Milliseconds since video start
  receivedAt?: string;    // Wall clock time when received
}

interface CommentaryWidgetProps {
  chat: any;
  kullanıcıKimliği?: string;
  isGuidedDemo?: boolean;
  guidesShown?: boolean;
  visibleGuide?: any;
  setVisibleGuide?: (guide: any) => void;
}

const MAX_COMMENTARY_ITEMS = 50;

// Helper function to format elapsed time in "## m ## s" format
function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} m ${seconds} s`;
}

export default function CommentaryWidget(props: CommentaryWidgetProps) {
  const { chat, kullanıcıKimliği, isGuidedDemo, guidesShown, visibleGuide, setVisibleGuide } = props;
  const [commentaryItems, setCommentaryItems] = useState<CommentaryItem[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commentaryItems]);

  useEffect(() => {
    if (!chat?.sdk) return;

    const channelsToSubscribe = [liveCommentaryChannelId, uiResetChannel];

    const listener = {
      message: (messageEvent) => {
        const message = messageEvent.message as any;
        const channel = messageEvent.channel;

        if (channel === uiResetChannel && message.resetCommentary === true) {
          setCommentaryItems([]);
          return;
        }

        if (channel === liveCommentaryChannelId) {
          // Add wall clock time when received
          const newCommentary = {
            ...message,
            receivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          } as CommentaryItem;
          
          setCommentaryItems(prevItems => {
            const updatedItems = [...prevItems, newCommentary];
            if (updatedItems.length > MAX_COMMENTARY_ITEMS) {
              return updatedItems.slice(updatedItems.length - MAX_COMMENTARY_ITEMS);
            }
            return updatedItems;
          });
        }
      }
    };

    chat.sdk.addListener(listener);
    chat.sdk.subscribe({ channels: channelsToSubscribe });

    chat.sdk.fetchMessages({
      channels: [liveCommentaryChannelId],
      count: MAX_COMMENTARY_ITEMS 
    }).then(historyResponse => {
      const historicalMessages = historyResponse.channels[liveCommentaryChannelId] || [];
      const formattedHistoricalItems = historicalMessages.map(msg => {
        const item = msg.message as CommentaryItem;
        // Add receivedAt for historical messages (use current time as fallback)
        return {
          ...item,
          receivedAt: item.receivedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }).filter(item => item.text);
      setCommentaryItems(formattedHistoricalItems.slice(-MAX_COMMENTARY_ITEMS));
    }).catch(err => console.error("[CommentaryWidget] Error fetching history:", err));

    return () => {
      chat.sdk.removeListener(listener);
      chat.sdk.unsubscribe({ channels: channelsToSubscribe });
    };
  }, [chat, kullanıcıKimliği]);

  return (
    <div className="widget-container commentary-widget p-4 bg-gray-800 text-white rounded shadow-lg h-full flex flex-col">
      <h3 className="widget-title text-lg font-semibold mb-2 border-b border-gray-700 pb-1">Real-time Video Transcription</h3>
      {/* {isGuidedDemo && guidesShown && (
        <GuideOverlay section="live_commentary" isMobilePreview={false} visibleGuide={visibleGuide} setVisibleGuide={setVisibleGuide} />
      )} */}
      <div className="commentary-list flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {commentaryItems.length === 0 && (
          <p className="text-gray-400 italic text-sm">No commentary yet...</p>
        )}
        {commentaryItems.map((item, index) => (
          <div key={item.id || index} className="commentary-item mb-2 p-2 bg-gray-700 rounded-md text-sm">
            <span className="commentary-time text-gray-400 mr-2">
              [{item.videoTimeMs !== undefined ? formatElapsedTime(item.videoTimeMs) : (item.time || '0 m 0 s')}] {item.receivedAt || ''}
            </span>
            <span className="commentary-text">{item.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
} 