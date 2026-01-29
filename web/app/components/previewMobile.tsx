import { useState, useEffect, useRef } from 'react'
import { useSwipeable } from 'react-swipeable'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import UserStatus from './userStatus'
import ChatWidget from '../widget-chat/chatWidget'
import StreamWidget from '../widget-stream/streamWidget'
import MatchStatsWidget from '../widget-matchstats/matchStatsWidget'
import AdvertsWidget from '../widget-adverts/advertsWidget'
import AdvertsOfferWidget from '../widget-adverts/advertsOfferWidget'
import PollsWidget from '../widget-polls/pollsWidget'
import BotWidget from '../widget-bot/botWidget'
import LiveCommentaryWidget from '../widget-liveCommentary/liveCommentaryWidget'
import Notification from './notification'
import Alert from './alert'
import GuideOverlay from './guideOverlay'
import { CommonMessageHandler, AwardPoints } from '../commonLogic'
import {
  pushChannelSelfId,
  pushChannelSalesId,
  dynamicAdChannelId,
  AlertType,
  chatChannelId,
  pollDeclarations,
  pollVotes,
  pollResults,
  uiResetChannel
} from '../data/constants'

export default function PreviewMobile ({
  className,
  chat,
  isGuidedDemo,
  guidesShown,
  visibleGuide,
  setVisibleGuide,
  logout,
  }) {
  const [uiScore, setUiScore] = useState<number>(0);
  const [notification, setNotification] = useState<{
    heading: string
    message: string
    imageUrl: string | null
  } | null>(null)
  const [alert, setAlert] = useState<{ points: number; body: string } | null>(
    null
  )
  const [dynamicAd, setDynamicAd] = useState<{
    adId: string
    clickPoints: number
  } | null>(null)
  
  // New states for overlay management
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'reviews' | 'products' | 'cart'>('none')
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const [chatMessage, setChatMessage] = useState('')
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [showAddedToast, setShowAddedToast] = useState(false)
  const [muted, setMuted] = useState(true) // Mobile video starts muted for autoplay
  
  // ==================== POLL STATE ====================
  // Poll state management - reuses interfaces and patterns from liveStreamPoll.tsx
  // This provides mobile-specific UI (slide-up cards) around existing poll logic
  
  interface FeaturedPollOption {
    id: number
    text: string
    score?: number  // Vote count, populated from poll results
  }
  
  interface FeaturedPoll {
    id: number
    title: string
    options: FeaturedPollOption[]
    pollType: 'featuredStreamPoll'
    answered: boolean      // Has current user voted?
    isPollOpen: boolean    // Is poll still accepting votes?
    userAnswerId?: number  // Which option did user vote for?
  }
  
  const [activePoll, setActivePoll] = useState<FeaturedPoll | null>(null)
  // pollViewState controls mobile UI: hidden (dismissed), minimized (slide-up card), fullscreen (overlay)
  const [pollViewState, setPollViewState] = useState<'hidden' | 'minimized' | 'fullscreen'>('hidden')
  const [userAnswerText, setUserAnswerText] = useState<string | null>(null)
  
  // Ref allows listener to access latest poll state without re-subscribing
  const activePollRef = useRef(activePoll)
  useEffect(() => {
    activePollRef.current = activePoll
  }, [activePoll])
  
  const pushChannelId = isGuidedDemo ? pushChannelSalesId : pushChannelSelfId
  const defaultWidgetClasses =
    'rounded-lg border-1 border-navy200 bg-white shadow-sm'

  // Swipe gesture handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeOverlay === 'none') {
        setActiveOverlay('reviews')
      }
    },
    onSwipedRight: () => {
      if (activeOverlay === 'none') {
        setActiveOverlay('products')
      }
    },
    onSwipedDown: () => {
      if (activeOverlay !== 'none') {
        setActiveOverlay('none')
      }
    },
    trackMouse: true
  })

  useEffect(() => {
    if (chat && chat.currentUser && chat.currentUser.custom && typeof chat.currentUser.custom.score === 'number') {
      setUiScore(chat.currentUser.custom.score);
    }
  }, [chat, chat?.currentUser?.id]);

  useEffect(() => {
    if (!chat) return
    //const channel = chat.sdk.channel(pushChannelId)
    //const subscription = channel.subscription({ receivePresenceEvents: false })
    const subscriptionSet = chat.sdk.subscriptionSet({
      channels: [pushChannelId, dynamicAdChannelId]
    })
    subscriptionSet.onMessage = messageEvent => {
      CommonMessageHandler(
        isGuidedDemo,
        messageEvent,
        data => {
          setNotification(data)
        },
        data => setDynamicAd(data)
      )
    }
    subscriptionSet.subscribe()
    return () => {
      subscriptionSet.unsubscribe()
    }
  }, [chat])

  // ==================== POLL LISTENER ====================
  // PubNub listener for poll events - reuses exact logic from liveStreamPoll.tsx
  // Subscribes to: pollDeclarations, pollVotes, pollResults, uiResetChannel
  useEffect(() => {
    if (!chat?.sdk) return

    const allChannels = [pollDeclarations, pollVotes, pollResults, uiResetChannel]

    const listener = {
      message: (messageEvent) => {
        const message = messageEvent.message as any

        // Handle UI reset signal from backend (when stream ends)
        if (messageEvent.channel === uiResetChannel && message.resetLiveStreamPoll === true) {
          setActivePoll(null)
          setUserAnswerText(null)
          setPollViewState('hidden')
          return
        }

        // Handle new poll declaration from backend
        // Auto-shows slide-up when new poll arrives
        if (messageEvent.channel === pollDeclarations && message.pollType === 'featuredStreamPoll') {
          const pollData = message as any
          setActivePoll({
            id: pollData.id,
            title: pollData.title,
            options: pollData.options.map(opt => ({ ...opt, score: 0 })),
            pollType: 'featuredStreamPoll',
            answered: false,
            isPollOpen: true,
          })
          setPollViewState('minimized') // Auto-show slide-up when new poll arrives
        } 
        // Handle vote messages - only update UI if it's the current user's vote
        // Uses messageEvent.publisher to identify who voted
        else if (messageEvent.channel === pollVotes && message.pollType === 'featuredStreamPoll' && activePollRef.current && message.pollId === activePollRef.current.id) {
          const choiceId = message.choiceId
          const choice = activePollRef.current.options.find(opt => opt.id === choiceId)
          
          if (choice && messageEvent.publisher === chat.currentUser.id) {
            setUserAnswerText(choice.text)
            setActivePoll(prevPoll => {
              const updatedPoll = prevPoll ? { ...prevPoll, answered: true, userAnswerId: choiceId } : null
              return updatedPoll
            })
            setPollViewState('minimized') // Show confirmation in slide-up
          }
        } 
        // Handle poll results - both interim (live vote counts) and final (isFinal: true)
        else if (messageEvent.channel === pollResults && message.pollType === 'featuredStreamPoll' && activePollRef.current && message.id === activePollRef.current.id) {
          const resultsData = message as any
          setActivePoll(prevPoll => {
            if (!prevPoll) return null
            
            let newOptions = prevPoll.options
            if (resultsData.options && resultsData.options.length > 0) {
              newOptions = prevPoll.options.map(opt => {
                const resultOpt = resultsData.options.find(ro => ro.id === opt.id)
                const currentOptScore = prevPoll.options.find(o => o.id === opt.id)?.score || 0
                return { ...opt, score: resultOpt ? resultOpt.score : currentOptScore }
              })
            }

            let pollStillOpen = prevPoll.isPollOpen
            // isFinal: true means poll has ended, show results
            if (resultsData.isFinal === true) {
              pollStillOpen = false
              setPollViewState('minimized') // Show results slide-up
            }

            const updatedPoll = {
              ...prevPoll,
              options: newOptions,
              isPollOpen: pollStillOpen,
              // Mark as answered when poll closes to show results
              answered: !pollStillOpen ? true : prevPoll.answered
            }
            return updatedPoll
          })
          
          // Auto-hide results after 5 seconds so they don't block the video
          if (resultsData.isFinal === true) {
            setTimeout(() => {
              setPollViewState('hidden')
            }, 5000)
          }
        }
      },
    }

    chat.sdk.addListener(listener)
    chat.sdk.subscribe({ channels: allChannels })

    return () => {
      chat.sdk.removeListener(listener)
      chat.sdk.unsubscribe({ channels: allChannels })
    }
  }, [chat])

  function showNewPointsAlert (points, message) {
    setAlert({ points: points, body: message })
  }

  // Get a random ad for overlays
  const getRandomAd = () => {
    // Import ads from constants
    const { ads } = require('../data/constants')
    const nonPremiumAds = ads.filter(ad => ad.isPremium === false)
    if (nonPremiumAds.length === 0) return null
    
    const randomIndex = Math.floor(Math.random() * nonPremiumAds.length)
    return nonPremiumAds[randomIndex]
  }

  const handleAdClick = async (points) => {
    const newScore = await AwardPoints(
      chat,
      points,
      null,
      uiScore,
      showNewPointsAlert
    );
    if (typeof newScore === 'number') {
      setUiScore(newScore);
    }
  }

  const handleSendMessage = async () => {
    if (!chat || !chatMessage.trim()) return
    
    try {
      const channel = await chat.getChannel(chatChannelId)
      if (channel) {
        await channel.sendText(chatMessage)
        setChatMessage('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // ==================== POLL VOTE HANDLER ====================
  // Publishes user's vote to PubNub - reuses exact publish pattern from liveStreamPoll.tsx
  // The listener above will receive this vote and update the UI
  const handlePollVote = (pollId: number, choiceId: number) => {
    if (!chat?.sdk || !activePoll || activePoll.answered) return
    
    chat.sdk.publish({
      message: {
        pollId: pollId,
        choiceId: choiceId,
        pollType: 'featuredStreamPoll',
      },
      channel: pollVotes,
    })
  }

  // ==================== CART HANDLER ====================
  const handleAddToCart = (product: any) => {
    // Check if product already in cart
    const existingItem = cartItems.find(item => item.id === product.id)
    if (!existingItem) {
      // Use callback form to ensure immediate state update
      setCartItems(prevItems => [...prevItems, { ...product, quantity: 1 }])
      // Show notification instead of toast
      setNotification({
        heading: 'Added to Cart',
        message: `${product.name} has been added to your cart`,
        imageUrl: product.images?.[0] || null
      })
    }
  }

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.id !== productId))
  }

  const handlePurchase = () => {
    // Mock purchase - just clear cart and show success
    setCartItems([])
    setActiveOverlay('none')
    setNotification({
      heading: 'Order Confirmed!',
      message: 'Your order has been placed successfully.',
      imageUrl: null
    })
  }

  return (
    <div
      className={`${className} w-[460px] border-4 border-navy200 rounded-3xl bg-black px-2 py-[14px] h-full max-h-[954px]`}
      {...handlers}
      onTouchStart={(e) => {
        // Prevent swipe gestures from interfering with chat scrolling
        const target = e.target as HTMLElement;
        if (target.closest('[data-chat-scroll]')) {
          e.stopPropagation();
        }
      }}
      onWheel={(e) => {
        // Allow trackpad scrolling in chat area
        const target = e.target as HTMLElement;
        if (target.closest('[data-chat-scroll]')) {
          e.stopPropagation();
        }
      }}
    >
      <div className='w-full rounded-2xl text-white h-full relative bg-black overflow-hidden'>
        {/* Clean top header - Always visible */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <MobileHeader 
            displayedScore={uiScore} 
            chat={chat} 
            onProfileClick={() => setShowLogoutDialog(true)}
            cartItemCount={cartItems.length}
            onCartClick={() => setActiveOverlay('cart')}
          />
        </div>

        {/* Logout confirmation dialog */}
        {showLogoutDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 mx-8 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Logout</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutDialog(false)
                    logout && logout()
                  }}
                  className="flex-1 px-4 py-2 bg-complex-red text-white rounded-lg font-medium hover:bg-red-600"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add to cart toast notification */}
        {showAddedToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg font-medium animate-fade-in-up">
            ✓ Added to cart
          </div>
        )}

        {/* Live commentary - positioned above video on the left */}
        <div className="absolute left-2 z-30" style={{ top: '60px', maxWidth: '220px' }}>
          <LiveCommentaryWidget
            className="bg-transparent border-none text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]"
            isMobilePreview={true}
            chat={chat}
            guidesShown={guidesShown}
            visibleGuide={visibleGuide}
            setVisibleGuide={setVisibleGuide}
            showCommentaryIcon={true}
            commentaryEnabled={showSubtitles}
            onToggleCommentary={() => setShowSubtitles(!showSubtitles)}
            maxContentHeight="200px"
          />
        </div>

        {/* Main video stream - positioned below commentary label */}
        <div className="absolute left-0 right-0 z-0" style={{ top: '96px', height: '280px' }}>
          {/* Swipe visual cues - show when no overlay is active */}
          {activeOverlay === 'none' && (
            <>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-r-lg">
                  <div className="text-white text-xs font-medium flex items-center">
                    <span className="mr-1">→</span> Swipe
                  </div>
                </div>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-l-lg">
                  <div className="text-white text-xs font-medium flex items-center">
                    Swipe <span className="ml-1">←</span>
                  </div>
                </div>
              </div>
            </>
          )}
          
        <StreamWidget
            className="w-full h-full"
          isMobilePreview={true}
          chat={chat}
          isGuidedDemo={isGuidedDemo}
          guidesShown={guidesShown}
          visibleGuide={visibleGuide}
          setVisibleGuide={setVisibleGuide}
            muted={muted}
          awardPoints={async (points, message) => {
            const newScore = await AwardPoints(
              chat,
              points,
              message,
              uiScore,
              showNewPointsAlert
            );
            if (typeof newScore === 'number') {
              setUiScore(newScore);
            }
          }}
        />
        </div>

        {/* Chat overlay - positioned below video, above input */}
        {showChat && (
          <>
            {/* Chat messages container - scrollable, starts below video */}
            <div 
              className="absolute left-4 right-4 z-20 pointer-events-auto"
              style={{ 
                top: '386px',  // Below video (96px + 280px + 10px padding)
                bottom: '140px',  // Above input box
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
              data-chat-scroll
            >
              <ChatWidget
                className="bg-transparent border-none shadow-none h-full"
                isMobilePreview={true}
                chat={chat}
                isGuidedDemo={isGuidedDemo}
                guidesShown={guidesShown}
                visibleGuide={visibleGuide}
                setVisibleGuide={setVisibleGuide}
                userMentioned={messageText => {
                  setNotification({
                    heading: 'You were mentioned',
                    message: messageText,
                    imageUrl: null
                  })
                }}
              />
            </div>
            
            {/* Chat input - always visible when chat is enabled */}
            <div className="absolute bottom-16 left-4 right-4 z-10">
              <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Add a comment..."
                  className="flex-1 bg-black/70 text-white placeholder-white/60 rounded-full px-4 py-2 text-sm border-none outline-none backdrop-blur-sm"
                      style={{ fontSize: '16px' }} // Prevent iOS zoom
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage()
                        }
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                  className="bg-complex-red text-white rounded-full px-4 py-2 text-sm font-medium min-w-fit shadow-lg"
                    >
                      Send
                    </button>
              </div>
            </div>
          </>
        )}

        {/* Chat toggle button - bottom left */}
        <button
          className="absolute bottom-4 left-4 z-20 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm"
          onClick={() => setShowChat(!showChat)}
        >
          <div className="w-6 h-6 flex items-center justify-center text-lg relative">
            {showChat ? '💬' : (
              <>
                <span className="opacity-50">💬</span>
                <span className="absolute inset-0 flex items-center justify-center text-complex-red text-2xl font-bold">⨯</span>
              </>
            )}
          </div>
        </button>


        {/* ==================== MUTE TOGGLE BUTTON ====================
            Volume control - positioned at bottom-right corner of video */}
        <button
          className="absolute z-20 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition"
          style={{ 
            top: '336px',  // Video bottom (96px + 280px - 40px for button centering)
            right: '8px'
          }}
          onClick={() => setMuted(!muted)}
        >
          <div className="w-6 h-6 flex items-center justify-center text-lg">
            {muted ? '🔇' : '🔊'}
          </div>
        </button>

        {/* ==================== POLL ICON BUTTON ====================
            Shows on right side when a poll exists
            Allows user to open/re-open the poll slide-up */}
        {activePoll && pollViewState !== 'fullscreen' && (
          <button
            className={`absolute bottom-4 right-4 z-20 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm ${pollViewState === 'hidden' && activePoll.isPollOpen ? 'animate-pulse' : ''}`}
            onClick={() => setPollViewState(pollViewState === 'minimized' ? 'hidden' : 'minimized')}
          >
            <div className="w-6 h-6 flex items-center justify-center text-lg relative">
              {pollViewState === 'minimized' ? '📊' : (
                <>
                  <span className={activePoll.isPollOpen ? '' : 'opacity-50'}>📊</span>
                  {pollViewState === 'hidden' && !activePoll.isPollOpen && (
                    <span className="absolute inset-0 flex items-center justify-center text-complex-red text-2xl font-bold">⨯</span>
                  )}
                </>
              )}
            </div>
          </button>
        )}

        {/* ==================== POLL RESULTS ALERT ====================
            When poll closes, show results as an alert sliding up from bottom
            Stays on top until dismissed */}
        <AnimatePresence>
          {activePoll && !activePoll.isPollOpen && pollViewState !== 'hidden' && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 z-50 bg-white shadow-2xl"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">📊</span>
                      <div className="text-lg font-bold text-complex-red">Poll Results</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{activePoll.title}</div>
                  </div>
                  <button
                    onClick={() => setPollViewState('hidden')}
                    className="text-gray-500 hover:text-gray-700 p-2 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Results */}
                <div className="space-y-3">
                  {(() => {
                    const totalVotes = activePoll.options.reduce((sum, opt) => sum + (opt.score || 0), 0)
                    const topOption = activePoll.options.reduce((max, opt) => 
                      (opt.score || 0) > (max.score || 0) ? opt : max, activePoll.options[0])
                    
                    return (
                      <>
                        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 mb-4">
                          <div className="text-sm text-green-700 font-semibold mb-1">🏆 Winner</div>
                          <div className="text-lg font-bold text-green-800">{topOption.text}</div>
                          <div className="text-sm text-green-600 mt-1">
                            {topOption.score || 0} votes ({totalVotes > 0 ? ((topOption.score || 0) / totalVotes * 100).toFixed(0) : 0}%)
                          </div>
                        </div>
                        
                        <div className="text-sm font-semibold text-gray-700 mb-2">All Results:</div>
                        {activePoll.options.map(opt => {
                          const percentage = totalVotes > 0 && opt.score ? (opt.score / totalVotes) * 100 : 0
                          const isWinner = opt.id === topOption.id
                          return (
                            <div key={opt.id} className={`p-3 rounded-lg ${isWinner ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`font-medium ${isWinner ? 'text-green-800' : 'text-gray-800'}`}>
                                  {opt.text}
                                </span>
                                <span className={`text-sm ${isWinner ? 'text-green-700' : 'text-gray-600'}`}>
                                  {opt.score || 0} votes
                                </span>
                              </div>
                              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  style={{ width: `${percentage}%` }} 
                                  className={`h-full rounded-full ${isWinner ? 'bg-green-500' : 'bg-gray-400'}`}
                                ></div>
                              </div>
                              <div className={`text-xs mt-1 ${isWinner ? 'text-green-600' : 'text-gray-500'}`}>
                                {percentage.toFixed(0)}%
                              </div>
                            </div>
                          )
                        })}
                      </>
                    )
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== POLL SLIDE-UP CARD ====================
            Compact card that slides up from bottom for active polls and vote confirmations
            Shows: poll title, option count, dismiss/expand buttons */}
        <AnimatePresence>
          {pollViewState === 'minimized' && activePoll && activePoll.isPollOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute bottom-16 left-4 right-4 z-30 bg-white/95 backdrop-blur rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Poll card content */}
              <div className="p-4">
                {/* Header with dismiss button */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    {activePoll.answered ? (
                      <div className="text-sm font-semibold text-green-600">Your choice:</div>
                    ) : (
                      <div className="text-sm font-semibold text-complex-red">New Poll</div>
                    )}
                    <div className="text-base font-bold text-gray-900 mt-1">{activePoll.title}</div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => setPollViewState('hidden')}
                      className="text-gray-500 hover:text-gray-700 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Poll content based on state */}
                {activePoll.answered ? (
                  // Show user's choice
                  <div className="text-sm text-gray-700">
                    {userAnswerText || 'Waiting for confirmation...'}
                  </div>
                ) : (
                  // Show options count and expand button
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {activePoll.options.length} options
                    </div>
                    <button
                      onClick={() => setPollViewState('fullscreen')}
                      className="bg-complex-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600"
                    >
                      Answer
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alerts and notifications */}
        <div className='absolute top-16 right-4 z-20'>
          {alert && (
            <Alert
              type={AlertType.POINTS}
              message={alert}
              onClose={() => {
                setAlert(null)
              }}
            />
          )}
        </div>

        {notification && (
          <div className="absolute top-20 left-4 right-4 z-[60]">
            <Notification
              heading={notification.heading}
              message={notification.message}
              imageUrl={notification.imageUrl}
              onClose={() => {
                setNotification(null)
              }}
            />
          </div>
        )}

        {/* Dynamic ad overlay */}
        {dynamicAd && (
          <div className="absolute bottom-32 left-4 right-20 z-10">
            <AdvertsOfferWidget
              className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg"
              isMobilePreview={false}
              chat={chat}
              guidesShown={guidesShown}
              visibleGuide={visibleGuide}
              setVisibleGuide={setVisibleGuide}
              adId={dynamicAd.adId}
              clickPoints={dynamicAd.clickPoints}
              onAdClick={async (points, adId) => {
                const newScore = await AwardPoints(
                  chat,
                  points,
                  null,
                  uiScore,
                  showNewPointsAlert
                );
                if (typeof newScore === 'number') {
                  setUiScore(newScore);
                }
                chat?.sdk.publish({
                  message: {},
                  channel: dynamicAdChannelId
                })
              }}
            />
          </div>
        )}

        {/* Guide overlay */}
        <GuideOverlay
          id={'userPoints'}
          guidesShown={guidesShown}
          visibleGuide={visibleGuide}
          setVisibleGuide={setVisibleGuide}
          text={
            <span>
              User details and their points are securely stored in{' '}
              <span className='font-semibold'>App Context</span>, a flexible
              data store for user & app data. This allows{' '}
              <span className='font-semibold'>per-user personalization</span>{' '}
              and gamification.
            </span>
          }
          xOffset={`right-[60px]`}
          yOffset={'-top-[40px]'}
          flexStyle={'flex-row items-start'}
        />

        {/* Full-screen overlays - Within mobile bounds */}
        <AnimatePresence>
          {activeOverlay === 'reviews' && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute inset-0 z-50 bg-white rounded-2xl"
            >
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center p-4 border-b bg-complex-gray-dark relative z-10 shrink-0">
                  <h2 className="text-xl font-bold">Adverts</h2>
                  <button
                    className="text-2xl p-2 rounded-full min-w-fit "
                    onClick={() => setActiveOverlay('none')}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <AllAdsDisplay onAdClick={handleAdClick} />
                </div>
              </div>
            </motion.div>
          )}

          {activeOverlay === 'products' && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute inset-0 z-50 bg-white rounded-2xl"
            >
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center p-4 border-b bg-complex-gray-dark relative z-10 shrink-0">
                  <h2 className="text-xl font-bold">Product Showcase</h2>
                  <button
                    className="text-2xl p-2 rounded-full min-w-fit"
                    onClick={() => setActiveOverlay('none')}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-hidden min-h-0">
                  <MatchStatsWidget
                    className="hide-scrollbar h-full"
                    isMobilePreview={true}
                    chat={chat}
                    isGuidedDemo={isGuidedDemo}
                    guidesShown={guidesShown}
                    visibleGuide={visibleGuide}
                    setVisibleGuide={setVisibleGuide}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== CART OVERLAY ====================
              Shopping cart with items, quantities, and mock checkout */}
          {activeOverlay === 'cart' && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute inset-0 z-50 bg-white rounded-2xl"
            >
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center p-4 border-b bg-complex-gray-dark relative z-10 shrink-0">
                  <h2 className="text-xl font-bold text-white">Your Cart ({cartItems.length})</h2>
                  <button
                    className="text-white text-2xl p-2 rounded-full min-w-fit"
                    onClick={() => setActiveOverlay('none')}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="text-6xl mb-4 opacity-30">🛒</div>
                      <p className="text-gray-500">Your cart is empty</p>
                      <button
                        onClick={() => setActiveOverlay('products')}
                        className="mt-4 bg-complex-red text-white px-6 py-2 rounded-lg font-medium"
                      >
                        Browse Products
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex gap-4">
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={80}
                              height={80}
                              className="rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{item.name}</h3>
                              <p className="text-lg text-green-600 font-semibold mt-1">
                                {new Intl.NumberFormat('en-US', { 
                                  style: 'currency', 
                                  currency: item.currency 
                                }).format(parseFloat(item.price))}
                              </p>
                              <button
                                onClick={() => handleRemoveFromCart(item.id)}
                                className="text-red-500 text-sm mt-2 underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {cartItems.length > 0 && (
                  <div className="border-t bg-gray-50 p-4 shrink-0">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: cartItems[0]?.currency || 'USD'
                        }).format(
                          cartItems.reduce((sum, item) => sum + parseFloat(item.price) * (item.quantity || 1), 0)
                        )}
                      </span>
                    </div>
                    <button
                      onClick={handlePurchase}
                      className="w-full bg-complex-red hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-lg transition"
                    >
                      Complete Purchase
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================== POLL FULL-SCREEN OVERLAY ====================
              Full-screen poll interface for voting and viewing results
              Slides up from bottom like products/reviews overlays
              Reuses voting logic from liveStreamPoll.tsx */}
          {pollViewState === 'fullscreen' && activePoll && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute inset-0 z-50 bg-white rounded-2xl"
            >
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center p-4 border-b bg-complex-gray-dark relative z-10 shrink-0">
                  <h2 className="text-xl font-bold">{activePoll.title}</h2>
                  <button
                    className="text-2xl p-2 rounded-full min-w-fit"
                    onClick={() => setPollViewState('minimized')}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {activePoll.isPollOpen && !activePoll.answered ? (
                    // Show voting options
                    <div className="space-y-3">
                      <p className="text-gray-700 mb-6">{activePoll.title}</p>
                      {activePoll.options.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            handlePollVote(activePoll.id, option.id)
                            setPollViewState('minimized')
                          }}
                          className="w-full py-4 px-6 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:border-complex-red hover:bg-gray-50 text-left text-base font-medium text-gray-900 transition-all"
                        >
                          {option.text}
                        </button>
                      ))}
                    </div>
                  ) : activePoll.answered && activePoll.isPollOpen ? (
                    // Show user's choice confirmation
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">✓</div>
                      <h3 className="text-xl font-bold mb-2">Thanks for voting!</h3>
                      <p className="text-gray-600">Your choice: <span className="font-semibold">{userAnswerText}</span></p>
                      <button
                        onClick={() => setPollViewState('minimized')}
                        className="mt-6 bg-complex-red text-white px-6 py-2 rounded-lg font-medium"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    // Show results
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold mb-4">Poll Results</h3>
                      {(() => {
                        const totalVotes = activePoll.options.reduce((sum, opt) => sum + (opt.score || 0), 0)
                        return activePoll.options.map(option => {
                          const percentage = totalVotes > 0 && option.score ? (option.score / totalVotes) * 100 : 0
                          const isTopChoice = activePoll.options.every(opt => (option.score || 0) >= (opt.score || 0))
                          return (
                            <div key={option.id} className={`p-4 border-2 rounded-lg ${isTopChoice && option.score ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold">{option.text}</span>
                                <span className="text-sm text-gray-600">
                                  {option.score || 0} votes ({percentage.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="h-2 w-full bg-gray-200 rounded">
                                <div 
                                  style={{ width: `${percentage}%` }} 
                                  className={`h-full rounded ${isTopChoice && option.score ? 'bg-green-500' : 'bg-gray-400'}`}
                                ></div>
                              </div>
                            </div>
                          )
                        })
                      })()}
                      <button
                        onClick={() => setPollViewState('minimized')}
                        className="mt-6 w-full bg-complex-red text-white px-6 py-3 rounded-lg font-medium"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  function MobileHeader ({ displayedScore, chat, onProfileClick, cartItemCount, onCartClick }) {
    const profileUrl = chat?.currentUser?.profileUrl
    const userName = chat?.currentUser?.name?.split(' ')[0] || 'User'
    
    return (
      <div className='flex items-center justify-between w-full'>
        {/* Left side - Score and profile */}
        <div className='flex items-center space-x-3'>
          <div className='bg-yellow-500 text-black text-sm font-bold px-3 py-1 rounded-full shadow-lg'>
            🏆 {displayedScore}
          </div>
          {/* Profile pic and name - clickable for logout */}
          <div 
            className='flex items-center space-x-2 cursor-pointer hover:opacity-80'
            onClick={onProfileClick}
          >
            <div 
              className='w-8 h-8 rounded-full bg-gray-400 bg-cover bg-center border-2 border-white/50'
              style={profileUrl ? { backgroundImage: `url(${profileUrl})` } : {}}
            />
          <div className='text-white text-sm font-medium opacity-90'>
              {userName}
            </div>
          </div>
        </div>
        
        {/* Right side - Cart button */}
        <button
          onClick={onCartClick}
          className="relative bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition"
        >
          <div className="w-6 h-6 flex items-center justify-center text-xl">
            🛒
          </div>
          {cartItemCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-complex-red text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartItemCount}
            </div>
          )}
        </button>
      </div>
    )
  }

  function AllAdsDisplay({ onAdClick }) {
    const { ads } = require('../data/constants')

    return (
      <div className="space-y-4">
        <div className="text-xs text-gray-500 mb-4 text-center">Sponsored Content</div>
        {ads.map((ad, index) => (
        <div 
            key={ad.id}
            className="relative cursor-pointer border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            onClick={() => onAdClick(ad.clickPoints || 0)}
        >
          <Image
              src={ad.src}
              alt={`Advertisement ${index + 1}`}
            width={402}
            height={150}
              className="w-full object-cover"
          />
            {ad.clickPoints > 0 && (
            <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
                +{ad.clickPoints} pts
            </div>
          )}
        </div>
        ))}
      </div>
    )
  }
}
