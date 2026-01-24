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
  chatChannelId
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
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'reviews' | 'products'>('none')
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const [chatMessage, setChatMessage] = useState('')
  
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

  return (
    <div
      className={`${className} w-[460px] border-4 border-navy200 rounded-3xl bg-black px-2 py-[14px] h-full max-h-[954px]`}
      {...handlers}
    >
      <div className='w-full rounded-2xl text-white h-full relative bg-black overflow-hidden'>
        {/* Main video stream - full screen */}
        <StreamWidget
          className="absolute inset-0 z-0"
          isMobilePreview={true}
          chat={chat}
          isGuidedDemo={isGuidedDemo}
          guidesShown={guidesShown}
          visibleGuide={visibleGuide}
          setVisibleGuide={setVisibleGuide}
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

        {/* Clean top header - Always visible */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4">
          <MobileHeader displayedScore={uiScore} chat={chat} />
        </div>

        {/* Live commentary as subtitles - moved to top */}
        <div className="absolute top-16 left-4 right-4 z-30">
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
          />
        </div>

        {/* Chat overlay - bottom left */}
        {showChat && (
          <>
            <div className="absolute bottom-20 left-4 right-20 z-10">
              <div className="pointer-events-none">
                <ChatWidget
                  className="bg-transparent border-none shadow-none hide-scrollbar"
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
          <div className="absolute top-20 left-4 right-4 z-20">
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
                <div className="shrink-0">
                  <RandomAdDisplay onAdClick={handleAdClick} />
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
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  function MobileHeader ({ displayedScore, chat }) {
    return (
      <div className='flex items-center justify-between w-full'>
        {/* Left side - Clean score display */}
        <div className='flex items-center space-x-3'>
          <div className='bg-yellow-500 text-black text-sm font-bold px-3 py-1 rounded-full shadow-lg'>
            🏆 {displayedScore}
          </div>
          <div className='text-white text-sm font-medium opacity-90'>
            {chat?.currentUser?.name?.split(' ')[0] || 'User'}
          </div>
        </div>
      </div>
    )
  }

  function RandomAdDisplay({ onAdClick }) {
    const randomAd = getRandomAd()
    
    if (!randomAd) return null

    return (
      <div className="p-4 border-t bg-gray-50">
        <div className="text-xs text-gray-500 mb-2 text-center">Sponsored</div>
        <div 
          className="relative cursor-pointer"
          onClick={() => onAdClick(randomAd.clickPoints || 0)}
        >
          <Image
            src={randomAd.src}
            alt="Advertisement"
            width={402}
            height={150}
            className="rounded-lg shadow-sm w-full object-cover"
          />
          {randomAd.clickPoints > 0 && (
            <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
              +{randomAd.clickPoints} pts
            </div>
          )}
        </div>
      </div>
    )
  }
}
