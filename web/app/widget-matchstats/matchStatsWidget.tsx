'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import GuideOverlay from '../components/guideOverlay'
import {
  matchStatsChannelId,
  clientVideoControlChannelId,
  uiResetChannel
} from '../data/constants'

// Define the Product interface
interface ProductSpecification {
  label: string;
  value: string;
}

interface CallToAction {
  text: string;
  link: string;
}

export interface Product { // Exporting for potential use elsewhere, e.g. tests
  id: string;
  name: string;
  startTimeMs: number;
  endTimeMs: number;
  price: string;
  currency: string;
  images: string[];
  description: string;
  specifications: ProductSpecification[];
  conditionSummary: string;
  includedAccessories: string[];
  callToAction: CallToAction;
}

// Message types from backend
type ProductMessage = Product;
interface ProductEndedMessage {
  type: "PRODUCT_ENDED";
  id: string;
  originalEndTime: number;
}

type ReceivedMessageData = ProductMessage | ProductEndedMessage;

export default function MatchStatsWidget ({
  className,
  isMobilePreview,
  chat,
  isGuidedDemo,
  guidesShown,
  visibleGuide,
  setVisibleGuide,
  onAddToCart
}) {
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const [isProductDetailsVisible, setIsProductDetailsVisible] = useState(false);

  const processReceivedMessage = (message: ReceivedMessageData) => {
    if (message && typeof message === 'object' && 'type' in message && message.type === "PRODUCT_ENDED") {
      // It's a ProductEndedMessage
      if (featuredProduct && featuredProduct.id === message.id) {
        setFeaturedProduct(null); // Clear product if the current one ended
        setIsProductDetailsVisible(false);
      } else if (!featuredProduct) {
        // If we fetched a PRODUCT_ENDED message and no product is currently featured (e.g., on initial load/seek),
        // it implies we should start with no product. Live messages will update if a new one starts.
        setFeaturedProduct(null);
        setIsProductDetailsVisible(false);
      }
    } else if (message && typeof message === 'object' && 'id' in message && !('type' in message && message.type === "PRODUCT_ENDED")) {
      // It's a ProductMessage (has an 'id' and is NOT a PRODUCT_ENDED message)
      setFeaturedProduct(message as Product);
      setIsProductDetailsVisible(true);
    } else {
      // Potentially an unhandled message type or malformed data
      // console.warn("Unhandled or malformed message received in ProductShowcaseWidget:", message);
    }
  };

  useEffect(() => {
    if (!chat || !chat.sdk) return; // Ensure chat and chat.sdk are available
    const channelsToSubscribe = [matchStatsChannelId, clientVideoControlChannelId, uiResetChannel];
    
    const listener = {
      message: (messageEvent) => {
        const message = messageEvent.message as any;
        const channel = messageEvent.channel;

        if (channel === uiResetChannel && message.resetProductShowcase === true) {
          // console.log("[ProductShowcaseWidget] Received reset signal.");
          setFeaturedProduct(null);
          setIsProductDetailsVisible(false);
          return;
        }

        if (channel === matchStatsChannelId) {
          processReceivedMessage(message as ReceivedMessageData);
        }

        if (channel === clientVideoControlChannelId) {
          // ... existing logic for video control messages ...
        }
      },
    };

    chat.sdk.addListener(listener);
    chat.sdk.subscribe({ channels: channelsToSubscribe });

    // Fetch last message to set initial state
    // Ensure chat.currentStreamTimeOffset is available and accurate if used in processReceivedMessage for fetch
    if (chat.sdk.getSubscribedChannels().includes(matchStatsChannelId)) { // Check if already subscribed by this or another component
      chat.sdk
        .fetchMessages({
          channels: [matchStatsChannelId],
          count: 1,
          includeMessageActions: false, // Not using reactions/actions on these messages
          includeUUID: false,
          includeMeta: false,
        })
        .then(result => {
          if (result && result.channels[matchStatsChannelId] && result.channels[matchStatsChannelId].length > 0) {
            const lastMessage = result.channels[matchStatsChannelId][0];
            if (lastMessage) {
              processReceivedMessage(lastMessage.message as ReceivedMessageData);
            }
          } else {
            setFeaturedProduct(null); // No previous product messages, ensure it's null
            setIsProductDetailsVisible(false);
          }
        }).catch(err => {
          console.error("Error fetching last product message:", err);
          setFeaturedProduct(null);
          setIsProductDetailsVisible(false);
        });
    }

    return () => {
      if (chat?.sdk) {
        chat.sdk.removeListener(listener);
        chat.sdk.unsubscribe({ channels: channelsToSubscribe });
      }
    };
  }, [chat]); // Assuming chat.sdk and chat.currentStreamTimeOffset are stable or included if they change

  return (
    <div className={`${className} bg-gray-100 p-4 rounded-lg shadow ${isMobilePreview ? 'h-full overflow-y-auto' : ''}`}>
      <GuideOverlay 
        id='product-showcase'
        guidesShown={guidesShown} 
        visibleGuide={visibleGuide} 
        setVisibleGuide={setVisibleGuide}
        text={<span>Currently featured product information.</span>}
        xOffset={'right-[10px]'}
        yOffset={'top-[10px]'}
        flexStyle={'flex-col items-start'}
      />
      <h2 className={`${isMobilePreview ? 'text-lg' : 'text-xl'} font-bold mb-4 text-navy900`}>Product Showcase</h2>
      {featuredProduct ? (
        <div className="space-y-4">
          <div className={`flex ${isMobilePreview ? 'flex-col' : 'flex-col md:flex-row md:space-x-4'} items-start`}>
            {/* Image Column */} 
            {featuredProduct.images && featuredProduct.images.length > 0 && (
              <div className={`${isMobilePreview ? 'w-full mb-2' : 'w-full md:w-2/5 lg:w-1/3 mb-4 md:mb-0'}`}>
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <Image 
                    src={featuredProduct.images[0]} 
                    alt={`Image of ${featuredProduct.name}`}
                    width={isMobilePreview ? 200 : 250}
                    height={isMobilePreview ? 160 : 200}
                    layout="responsive"
                    objectFit="contain"
                    className="rounded-lg"
                  />
                </div>
              </div>
            )}
            {/* Details Column */} 
            <div className={`${isMobilePreview ? 'w-full' : 'w-full md:w-3/5 lg:w-2/3'} space-y-3`}>
              <h3 className={`${isMobilePreview ? 'text-lg' : 'text-2xl'} font-bold text-gray-800`}>{featuredProduct.name}</h3>
              <p className={`${isMobilePreview ? 'text-lg' : 'text-xl'} font-semibold text-green-600`}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: featuredProduct.currency }).format(parseFloat(featuredProduct.price))}
              </p>
              <div className="bg-white p-3 rounded-lg shadow">
                <h4 className={`font-semibold ${isMobilePreview ? 'text-sm' : 'text-md'} mb-1 text-gray-700`}>Description</h4>
                <p className={`text-gray-600 ${isMobilePreview ? 'text-xs' : 'text-sm'}`}>{featuredProduct.description}</p>
              </div>
            </div>
          </div>

          {featuredProduct.conditionSummary && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className={`font-semibold ${isMobilePreview ? 'text-sm' : 'text-lg'} mb-2 text-gray-700`}>Condition</h4>
              <p className={`text-gray-600 ${isMobilePreview ? 'text-xs' : 'text-sm'}`}>{featuredProduct.conditionSummary}</p>
            </div>
          )}

          {featuredProduct.includedAccessories && featuredProduct.includedAccessories.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className={`font-semibold ${isMobilePreview ? 'text-sm' : 'text-lg'} mb-2 text-gray-700`}>Included Accessories</h4>
              <ul className={`list-disc list-inside text-gray-600 ${isMobilePreview ? 'text-xs' : 'text-sm'}`}>
                {featuredProduct.includedAccessories.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {featuredProduct.specifications && featuredProduct.specifications.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className={`font-semibold ${isMobilePreview ? 'text-sm' : 'text-lg'} mb-2 text-gray-700`}>Specifications</h4>
              <ul className={`space-y-1 ${isMobilePreview ? 'text-xs' : 'text-sm'}`}>
                {featuredProduct.specifications.map((spec, index) => (
                  <li key={index} className="text-gray-800">
                    <span className="font-medium text-gray-600">{spec.label}:</span> {spec.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onAddToCart && (
            <button
              onClick={() => onAddToCart(featuredProduct)}
              className="mt-6 bg-complex-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out w-full text-center"
            >
              Add to Cart
            </button>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-10">No featured product currently. Stay tuned!</p>
      )}
    </div>
  );
}
