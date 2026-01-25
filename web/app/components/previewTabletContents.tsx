import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import UserStatus from './userStatus'
import GuideOverlay from './guideOverlay'
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
import { CommonMessageHandler, AwardPoints } from '../commonLogic'
import {
  pushChannelSelfId,
  pushChannelSalesId,
  dynamicAdChannelId,
  AlertType
} from '../data/constants'

export default function TabletContents ({
  chat,
  isGuidedDemo,
  guidesShown,
  visibleGuide,
  setVisibleGuide,
  logout,
  heightConstrained = true
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
  const [cartItems, setCartItems] = useState<any[]>([])
  const [showCartDialog, setShowCartDialog] = useState(false)
  const pushChannelId = isGuidedDemo ? pushChannelSalesId : pushChannelSelfId
  const defaultWidgetClasses =
    'rounded-lg border-1 border-navy200 bg-white shadow-md'
  
  // ==================== CART HANDLERS ====================
  const handleAddToCart = (product: any) => {
    // Check if product already in cart
    const existingItem = cartItems.find(item => item.id === product.id)
    if (!existingItem) {
      setCartItems([...cartItems, { ...product, quantity: 1 }])
      // Show notification when item is added
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
    // Mock purchase - clear cart and show success
    setCartItems([])
    setShowCartDialog(false)
    setNotification({
      heading: 'Order Confirmed!',
      message: 'Your order has been placed successfully.',
      imageUrl: null
    })
  }

  useEffect(() => {
    if (chat && chat.currentUser && chat.currentUser.custom && typeof chat.currentUser.custom.score === 'number') {
      setUiScore(chat.currentUser.custom.score);
    }
    // This effect should also re-run if chat.currentUser itself changes, e.g. on login
    // to get the initial score. If streamUpdates were working for UserStatus,
    // this wouldn't be strictly necessary here but good for initial sync.
  }, [chat, chat?.currentUser?.id]); // Depend on chat and currentUser.id for re-initialization

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

  return (
    <div className='w-full rounded-2xl bg-complex-gray-light text-neutral-900 h-full'>
      <div className='relative'>
        <div className='absolute w-1/2 right-0'>
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
      </div>
      {notification && (
        <Notification
          heading={notification.heading}
          message={notification.message}
          imageUrl={notification.imageUrl}
          onClose={() => {
            setNotification(null)
          }}
        />
      )}
      <TabletHeader 
        displayedScore={uiScore} 
        chat={chat} 
        logout={logout} 
        cartItemCount={cartItems.length}
        onCartClick={() => setShowCartDialog(true)}
      />
      <GuideOverlay
        id={'userPoints'}
        guidesShown={guidesShown}
        visibleGuide={visibleGuide}
        setVisibleGuide={setVisibleGuide}
        text={
          <span>
            User details and their points are securely stored in{' '}
            <span className='font-semibold'>App Context</span>, a flexible data
            store for user & app data. This allows{' '}
            <span className='font-semibold'>per-user personalization</span> and
            gamification.
          </span>
        }
        xOffset={`right-[120px]`}
        yOffset={'top-[0px]'}
        flexStyle={'flex-row items-start'}
      />
      <div className='overflow-y-auto overscroll-none'>
        <div
          className={`flex flex-col iframe:flex-row items-center iframe:items-start px-6 gap-3 w-full h-full ${
            heightConstrained && 'sm:min-h-[630px] sm:max-h-[630px] 3xl:min-h-[834px] 3xl:max-h-[834px] 4xl:min-h-[1030px] 4xl:max-h-[1030px]'
          } rounded-b-2xl`}
        >
          <div className={`w-[700px] flex flex-col gap-4`}>
            <StreamWidget
              className={`${defaultWidgetClasses}`}
              isMobilePreview={false}
              chat={chat}
              isGuidedDemo={isGuidedDemo}
              guidesShown={guidesShown}
              visibleGuide={visibleGuide}
              setVisibleGuide={setVisibleGuide}
              muted={undefined}
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
            <MatchStatsWidget
              className={`${defaultWidgetClasses}`}
              isMobilePreview={false}
              chat={chat}
              isGuidedDemo={isGuidedDemo}
              guidesShown={guidesShown}
              visibleGuide={visibleGuide}
              setVisibleGuide={setVisibleGuide}
              onAddToCart={handleAddToCart}
            />
            <AdvertsWidget
              className={`${defaultWidgetClasses}`}
              isMobilePreview={false}
              chat={chat}
              isGuidedDemo={isGuidedDemo}
              guidesShown={guidesShown}
              visibleGuide={visibleGuide}
              setVisibleGuide={setVisibleGuide}
              onAdClick={async points => {
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
              }}
            />
            <div className='min-h-3'></div>
          </div>
          <div className='w-full flex flex-col gap-4'>
            {dynamicAd && (
              <AdvertsOfferWidget
                className={`${defaultWidgetClasses}`}
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
                  //  Prevent clicking on both Mobile and tablet previews
                  chat?.sdk.publish({
                    message: {},
                    channel: dynamicAdChannelId
                  })
                }}
              />
            )}
            <ChatWidget
              className={`${defaultWidgetClasses}`}
              isMobilePreview={false}
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
            <PollsWidget
              className={`${defaultWidgetClasses}`}
              isMobilePreview={false}
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
            <BotWidget
              className={`${defaultWidgetClasses}`}
              isMobilePreview={false}
              chat={chat}
              isGuidedDemo={isGuidedDemo}
              guidesShown={guidesShown}
              visibleGuide={visibleGuide}
              setVisibleGuide={setVisibleGuide}
            />
            <LiveCommentaryWidget
              className={`${defaultWidgetClasses}`}
              isMobilePreview={false}
              chat={chat}
              guidesShown={guidesShown}
              visibleGuide={visibleGuide}
              setVisibleGuide={setVisibleGuide}
            />
            <div className='min-h-3'></div>
          </div>
        </div>
      </div>

      {/* ==================== CART DIALOG ==================== */}
      {showCartDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowCartDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b bg-complex-gray-dark rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">Your Cart ({cartItems.length})</h2>
              <button
                className="text-white text-3xl hover:text-gray-300 transition"
                onClick={() => setShowCartDialog(false)}
              >
                ✕
              </button>
            </div>
            
            {/* Cart contents */}
            <div className="flex-1 overflow-y-auto p-6">
              {cartItems.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-8xl mb-4 opacity-20">🛒</div>
                  <p className="text-gray-500 text-lg">Your cart is empty</p>
                  <button
                    onClick={() => setShowCartDialog(false)}
                    className="mt-6 bg-complex-red text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                      <div className="flex gap-4">
                        {item.images && item.images[0] && (
                          <Image
                            src={item.images[0]}
                            alt={item.name}
                            width={100}
                            height={100}
                            className="rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                          <p className="text-xl text-green-600 font-bold mt-2">
                            {new Intl.NumberFormat('en-US', { 
                              style: 'currency', 
                              currency: item.currency 
                            }).format(parseFloat(item.price))}
                          </p>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="text-red-500 text-sm mt-3 underline hover:text-red-700 transition font-medium"
                          >
                            Remove from cart
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer with total and purchase button */}
            {cartItems.length > 0 && (
              <div className="border-t bg-gray-50 p-6 rounded-b-2xl">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xl font-semibold text-gray-700">Total:</span>
                  <span className="text-3xl font-bold text-green-600">
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
                  className="w-full bg-complex-red hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-lg transition text-lg"
                >
                  Complete Purchase
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  function TabletHeader ({ displayedScore, chat, logout, cartItemCount, onCartClick }) {
    return (
      <div className='flex flex-row items-center justify-between w-full px-6 py-[11.5px]'>
        <div className='text-3xl font-bold'>Live Stream</div>
        <UserStatus 
          displayedScore={displayedScore} 
          chat={chat} 
          logout={logout} 
          cartItemCount={cartItemCount}
          onCartClick={onCartClick}
        />
      </div>
    )
  }
}
