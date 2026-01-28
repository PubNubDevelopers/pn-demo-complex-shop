'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [productHistory, setProductHistory] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isProductDetailsVisible, setIsProductDetailsVisible] = useState(false);
  const thumbnailScrollRef = useRef<HTMLDivElement>(null);
  
  const selectedProduct = currentIndex >= 0 ? productHistory[currentIndex] : null;

  const processReceivedMessage = (message: ReceivedMessageData) => {
    if (message && typeof message === 'object' && 'type' in message && message.type === "PRODUCT_ENDED") {
      // It's a ProductEndedMessage - we keep the product in history
      // No action needed for carousel implementation
    } else if (message && typeof message === 'object' && 'id' in message && !('type' in message && message.type === "PRODUCT_ENDED")) {
      // It's a ProductMessage (has an 'id' and is NOT a PRODUCT_ENDED message)
      const newProduct = message as Product;
      
      setProductHistory(prev => {
        // Check if product already exists in history
        const existingIndex = prev.findIndex(p => p.id === newProduct.id);
        if (existingIndex >= 0) {
          // Product already exists, just navigate to it
          setCurrentIndex(existingIndex);
          setIsProductDetailsVisible(true);
          return prev;
        }
        
        // Add new product to history
        const updated = [...prev, newProduct];
        setCurrentIndex(updated.length - 1); // Auto-advance to newest
        setIsProductDetailsVisible(true);
        return updated;
      });
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
          setProductHistory([]);
          setCurrentIndex(-1);
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
            setProductHistory([]); // No previous product messages
            setCurrentIndex(-1);
            setIsProductDetailsVisible(false);
          }
        }).catch(err => {
          console.error("Error fetching last product message:", err);
          setProductHistory([]);
          setCurrentIndex(-1);
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

  // Auto-scroll thumbnail strip to show current product
  useEffect(() => {
    if (thumbnailScrollRef.current && currentIndex >= 0 && productHistory.length > 0) {
      const thumbnailWidth = isMobilePreview ? 80 : 100; // Approximate width + margin
      const scrollPosition = currentIndex * thumbnailWidth;
      thumbnailScrollRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, isMobilePreview]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < productHistory.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

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
      
      {/* Thumbnail Carousel Strip */}
      {productHistory.length > 1 && (
        <div className="mb-4 relative">
          <div className="flex items-center gap-2">
            {/* Left Arrow */}
            <button
              onClick={handlePrevious}
              disabled={currentIndex <= 0}
              className={`flex-shrink-0 p-1 rounded-full ${
                currentIndex <= 0
                  ? 'bg-gray-300 cursor-not-allowed opacity-50'
                  : 'bg-complex-red hover:bg-red-700 cursor-pointer'
              } text-white transition-colors`}
              aria-label="Previous product"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Thumbnail Strip */}
            <div
              ref={thumbnailScrollRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide flex-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {productHistory.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 ${isMobilePreview ? 'w-16 h-16' : 'w-20 h-20'} rounded-lg overflow-hidden transition-all ${
                    index === currentIndex
                      ? 'ring-4 ring-complex-red shadow-lg scale-105'
                      : 'ring-2 ring-gray-300 hover:ring-gray-400 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`View ${product.name}`}
                >
                  {product.images && product.images.length > 0 && (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={isMobilePreview ? 64 : 80}
                      height={isMobilePreview ? 64 : 80}
                      className="object-contain bg-white"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Right Arrow */}
            <button
              onClick={handleNext}
              disabled={currentIndex >= productHistory.length - 1}
              className={`flex-shrink-0 p-1 rounded-full ${
                currentIndex >= productHistory.length - 1
                  ? 'bg-gray-300 cursor-not-allowed opacity-50'
                  : 'bg-complex-red hover:bg-red-700 cursor-pointer'
              } text-white transition-colors`}
              aria-label="Next product"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {selectedProduct ? (
          <motion.div
            key={selectedProduct.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className={`flex ${isMobilePreview ? 'flex-col' : 'flex-col md:flex-row md:space-x-4'} items-start`}>
              {/* Image Column */} 
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className={`${isMobilePreview ? 'w-full mb-2' : 'w-full md:w-2/5 lg:w-1/3 mb-4 md:mb-0'}`}>
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <Image 
                      src={selectedProduct.images[0]} 
                      alt={`Image of ${selectedProduct.name}`}
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
                <h3 className={`${isMobilePreview ? 'text-lg' : 'text-2xl'} font-bold text-gray-800`}>{selectedProduct.name}</h3>
                <p className={`${isMobilePreview ? 'text-lg' : 'text-xl'} font-semibold text-green-600`}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedProduct.currency }).format(parseFloat(selectedProduct.price))}
                </p>
                <div className="bg-white p-3 rounded-lg shadow">
                  <h4 className={`font-semibold ${isMobilePreview ? 'text-sm' : 'text-md'} mb-1 text-gray-700`}>Description</h4>
                  <p className={`text-gray-600 ${isMobilePreview ? 'text-xs' : 'text-sm'}`}>{selectedProduct.description}</p>
                </div>
              </div>
            </div>

            {selectedProduct.conditionSummary && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className={`font-semibold ${isMobilePreview ? 'text-sm' : 'text-lg'} mb-2 text-gray-700`}>Condition</h4>
                <p className={`text-gray-600 ${isMobilePreview ? 'text-xs' : 'text-sm'}`}>{selectedProduct.conditionSummary}</p>
              </div>
            )}

            {selectedProduct.includedAccessories && selectedProduct.includedAccessories.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className={`font-semibold ${isMobilePreview ? 'text-sm' : 'text-lg'} mb-2 text-gray-700`}>Included Accessories</h4>
                <ul className={`list-disc list-inside text-gray-600 ${isMobilePreview ? 'text-xs' : 'text-sm'}`}>
                  {selectedProduct.includedAccessories.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedProduct.specifications && selectedProduct.specifications.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className={`font-semibold ${isMobilePreview ? 'text-sm' : 'text-lg'} mb-2 text-gray-700`}>Specifications</h4>
                <ul className={`space-y-1 ${isMobilePreview ? 'text-xs' : 'text-sm'}`}>
                  {selectedProduct.specifications.map((spec, index) => (
                    <li key={index} className="text-gray-800">
                      <span className="font-medium text-gray-600">{spec.label}:</span> {spec.value}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {onAddToCart && (
              <button
                onClick={() => onAddToCart(selectedProduct)}
                className="mt-6 bg-complex-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out w-full text-center"
              >
                Add to Cart
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="no-product"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-gray-500 text-center py-10">No featured product currently. Stay tuned!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
