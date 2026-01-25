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
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'reviews' | 'products'>('none')
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const [chatMessage, setChatMessage] = useState('')
  
  // Poll state (reusing pattern from liveStreamPoll.tsx)
  interface FeaturedPollOption {
    id: number
    text: string
    score?: number
  }
  
  interface FeaturedPoll {
    id: number
    title: string
    options: FeaturedPollOption[]
    pollType: 'featuredStreamPoll'
    answered: boolean
    isPollOpen: boolean
    userAnswerId?: number
  }
  
  const [activePoll, setActivePoll] = useState<FeaturedPoll | null>(null)
  const [pollViewState, setPollViewState] = useState<'hidden' | 'minimized' | 'fullscreen'>('hidden')
  const [userAnswerText, setUserAnswerText] = useState<string | null>(null)
  
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

  // Poll listener (reused from liveStreamPoll.tsx)
  useEffect(() => {
    if (!chat?.sdk) return

    const allChannels = [pollDeclarations, pollVotes, pollResults, uiResetChannel]

    const listener = {
      message: (messageEvent) => {
        const message = messageEvent.message as any

        // Handle reset
        if (messageEvent.channel === uiResetChannel && message.resetLiveStreamPoll === true) {
          setActivePoll(null)
          setUserAnswerText(null)
          setPollViewState('hidden')
          return
        }

        // Handle new poll declaration
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
          setPollViewState('minimized') // Auto-show when new poll arrives
        } 
        // Handle user's vote
        else if (messageEvent.channel === pollVotes && message.pollType === 'featuredStreamPoll' && activePollRef.current && message.pollId === activePollRef.current.id) {
          const choiceId = message.choiceId
          const choice = activePollRef.current.options.find(opt => opt.id === choiceId)
          
          if (choice && messageEvent.publisher === chat.currentUser.id) {
            setUserAnswerText(choice.text)
            setActivePoll(prevPoll => {
              const updatedPoll = prevPoll ? { ...prevPoll, answered: true, userAnswerId: choiceId } : null
              return updatedPoll
            })
            setPollViewState('minimized') // Show confirmation
          }
        } 
        // Handle poll results
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
            if (resultsData.isFinal === true) {
              pollStillOpen = false
              setPollViewState('minimized') // Show results when poll ends
            }

            const updatedPoll = {
              ...prevPoll,
              options: newOptions,
              isPollOpen: pollStillOpen,
              answered: !pollStillOpen ? true : prevPoll.answered
            }
            return updatedPoll
          })
          
          // Auto-hide results after 5 seconds
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

  // Handle poll vote (reused from liveStreamPoll.tsx)
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
            <div 
              className="absolute bottom-32 left-4 right-20 z-20 pointer-events-auto" 
              style={{ maxHeight: '384px' }}
              data-chat-scroll
            >
              <ChatWidget
                className="bg-transparent border-none shadow-none"
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

        {/* Poll icon button - shows when poll is active but dismissed */}
        {pollViewState === 'hidden' && activePoll && activePoll.isPollOpen && (
          <button
            className="absolute bottom-4 left-16 z-20 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm animate-pulse"
            onClick={() => setPollViewState('minimized')}
          >
            <div className="w-6 h-6 flex items-center justify-center text-lg">
              📊
            </div>
          </button>
        )}

        {/* Poll slide-up card */}
        <AnimatePresence>
          {pollViewState === 'minimized' && activePoll && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute bottom-16 left-4 right-4 z-30 bg-white/95 backdrop-blur rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Poll card content */}
              <div className="p-4">
                {/* Header with dismiss and expand buttons */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    {!activePoll.isPollOpen ? (
                      <div className="text-sm font-semibold text-complex-red">Poll Results</div>
                    ) : activePoll.answered ? (
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
                {!activePoll.isPollOpen ? (
                  // Show results
                  <div className="text-sm">
                    {(() => {
                      const totalVotes = activePoll.options.reduce((sum, opt) => sum + (opt.score || 0), 0)
                      const topOption = activePoll.options.reduce((max, opt) => 
                        (opt.score || 0) > (max.score || 0) ? opt : max, activePoll.options[0])
                      return (
                        <div className="space-y-2">
                          <div className="text-gray-600 mb-2">
                            Winner: <span className="font-semibold text-green-600">{topOption.text}</span>
                          </div>
                          {activePoll.options.map(opt => {
                            const percentage = totalVotes > 0 && opt.score ? (opt.score / totalVotes) * 100 : 0
                            return (
                              <div key={opt.id} className="text-xs text-gray-600">
                                {opt.text}: {opt.score || 0} votes ({percentage.toFixed(0)}%)
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                ) : activePoll.answered ? (
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

          {/* Poll full-screen overlay */}
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
