'use client'

import { useState, useEffect, useRef } from 'react'
import GuideOverlay from '../components/guideOverlay'
import {
  dataControlOccupancyChannelId,
  serverVideoControlChannelId,
  streamReactionsChannelId,
  uiResetChannel
} from '../data/constants'
import {
  Chat,
  User,
  Channel,
  Message,
  MixedTextTypedElement
} from '@pubnub/chat'
import ChatMessage from './components/ChatMessage'
import MessageInput from './components/MessageInput'

// Define channel constants
const mainChatChannelId = 'game.chat';
// const questionsChannelId = 'game.chat.questions'; // Removed

interface ChatWidgetProps {
  className: string
  isMobilePreview: boolean
  chat: Chat
  isGuidedDemo: boolean,
  guidesShown: boolean
  visibleGuide: string
  setVisibleGuide: (guide: string) => void
  userMentioned: (messageText: string) => void
}

export interface Restriction {
  ban: boolean
  mute: boolean
  reason: string | number | boolean | undefined
}

export default function ChatWidget ({
  className,
  isMobilePreview,
  chat,
  isGuidedDemo,
  guidesShown,
  visibleGuide,
  setVisibleGuide,
  userMentioned
}: ChatWidgetProps) {
  // Channel state
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [publicChannels, setPublicChannels] = useState<Channel[]>([])

  // Message state - NEW: Separate stores for all and question messages
  const [allMessages, setAllMessages] = useState<Message[]>([])
  // const [questionMessages, setQuestionMessages] = useState<Message[]>([]) // Removed
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]) // Messages currently shown in UI
  const [messageInput, setMessageInput] = useState('')

  // UI state
  const [showChannelCreate, setShowChannelCreate] = useState(false)
  const [channelName, setChannelName] = useState('')
  const [channelType, setChannelType] = useState('public')
  const [showMentions, setShowMentions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [whoIsPresent, setWhoIsPresent] = useState<string[]>([])
  const [realOccupancy, setRealOccupancy] = useState(0)
  const [simulatedOccupancy, setSimulatedOccupancy] = useState(0)
  const [activeChannelRestrictions, setActiveChannelRestrictions] =
    useState<Restriction | null>(null)

  // State for the question filter - RE-INTRODUCED
  const [isQuestionFilterActive, setIsQuestionFilterActive] = useState(false)

  // Check if this is an overlay mode (transparent background)
  const isOverlayMode = className.includes('bg-transparent')

  const messagesContainerRef = useRef<HTMLDivElement>(null)

  /**
   * Effect 1: Initialize basic chat settings and set the initial active channel ID.
   */
  useEffect(() => {
    if (!chat) return;

    console.log("[ChatWidget] Effect 1: Chat object available. Setting up initial state.");
    fetchUsers(); 
    // fetchChannels(); // If fetchChannels is crucial for chat.getChannel to work, ensure it completes or its necessity is re-evaluated.
    
    // Set initial activeChannelId only once if not already set.
    // The filter effect (Effect 2) will also set it based on isQuestionFilterActive,
    // ensuring it defaults to mainChatChannelId on first meaningful render with chat.
    if (!activeChannelId) {
        console.log("[ChatWidget] Effect 1: No activeChannelId set, defaulting to mainChatChannelId.");
        setActiveChannelId(mainChatChannelId);
    }

    const renderMessagePartMention = (
      messagePart: MixedTextTypedElement,
      index: number
    ) => {
      if (messagePart.type === 'mention') {
        return messagePart.content.name
      }
      if (messagePart.type === 'text') {
        return messagePart.content.text
      }
      return ''
    }
    const removeMentionsListener = chat.listenForEvents({
      user: chat.currentUser.id,
      type: 'mention',
      callback: async evt => {
        const channel = await chat.getChannel(evt.payload.channel)
        const message = await channel?.getMessage(evt.payload.messageTimetoken)
        userMentioned(
          `${message
            ?.getMessageElements()
            .map(renderMessagePartMention)
            .join('')}`
        )
      }
    })
    return () => {
      removeMentionsListener();
    };
  }, [chat, userMentioned]); // Removed activeChannelId from here to avoid loops if fetchChannels was also setting it.

  /**
   * Effect 2: Switch activeChannelId based on filter toggle. - REMOVED as we only use mainChatChannelId now
   */
  // useEffect(() => {
  //   if (!chat) return;
  //   const targetChannelId = isQuestionFilterActive ? questionsChannelId : mainChatChannelId;
  //   console.log(`[ChatWidget] Effect 2: Filter changed or chat ready. Target channel ID: ${targetChannelId}`);
  //   setActiveChannelId(targetChannelId);
  // }, [isQuestionFilterActive, chat]);

  /**
   * Effect 3: Update displayedMessages based on active filter and data stores.
   */
  useEffect(() => {
    // console.log(`[ChatWidget] Effect 3: Updating displayedMessages. Filter active: ${isQuestionFilterActive}`); // Logging removed
    if (isQuestionFilterActive) {
      setDisplayedMessages(
        allMessages.filter(msg => {
          // Reconstruct message text to check for question mark
          const fullMessageText = msg
            .getMessageElements()
            .map(part =>
              part.type === 'text'
                ? part.content.text
                : part.type === 'mention'
                ? part.content.name
                : ''
            )
            .join('');
          return fullMessageText.trim().endsWith('?');
        })
      );
    } else {
      setDisplayedMessages(allMessages);
    }
  }, [allMessages, isQuestionFilterActive]); // Dependency on isQuestionFilterActive re-added

  useEffect(() => {
    if (!chat || !activeChannel) return
    updateActiveChannelRestrictions()
    const removeModerationListener = chat.listenForEvents({
      channel: `PUBNUB_INTERNAL_MODERATION.${chat.currentUser.id}`,
      type: 'moderation',
      callback: async evt => {
        updateActiveChannelRestrictions()
      }
    })

    return () => {
      removeModerationListener()
    }
  }, [chat, activeChannel])

  useEffect(() => {
    if (simulatedOccupancy > 20) {
      const interval = setInterval(() => {
        const randomPercentage = (Math.random() * 0.2 - 0.1)
        setSimulatedOccupancy(prev => Math.max(0, Math.round(prev * (1 + randomPercentage))))
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [simulatedOccupancy])

  function updateActiveChannelRestrictions () {
    //  Update the restrictions of the currently active channel whenever that changes
    if (!activeChannel || !chat) return
    activeChannel.getUserRestrictions(chat.currentUser).then(restrictions => {
      const tempRestrictions: Restriction = {
        ban: restrictions.ban,
        mute: restrictions.mute,
        reason: restrictions.reason
      }
      setActiveChannelRestrictions(tempRestrictions)
    })
  }

  /**
   * Effect 4: Core logic to set up the active channel connection when activeChannelId changes.
   */
  useEffect(() => {
    if (!chat || !activeChannelId) {
      console.log("[ChatWidget] Effect 4: Skipping setupActiveChannel - no chat or activeChannelId.");
      setActiveChannel(null);
      return;
    }
    console.log(`[ChatWidget] Effect 4: activeChannelId changed to '${activeChannelId}'. Calling setupActiveChannel.`);
    const cleanupPromise = setupActiveChannel();
    return () => {
      console.log("[ChatWidget] Effect 4: Cleaning up previous active channel setup.");
      if (cleanupPromise && typeof cleanupPromise.then === 'function') {
        cleanupPromise.then(fn => {
          if (fn && typeof fn === 'function') fn();
        }).catch(e => console.error("[ChatWidget] Effect 4: Error in cleanup promise:", e));
      }
    };
  }, [activeChannelId, chat]); // This is the key effect for channel connection

  // Separate useEffect for the uiResetChannel listener, tied only to `chat` availability.
  useEffect(() => {
    if (!chat?.sdk) return

    const resetListener = {
      message: (messageEvent) => {
        // PubNub SDK message events have `channel` and `message` directly on messageEvent
        const msgPayload = messageEvent.message as any
        const eventChannel = messageEvent.channel

        if (eventChannel === uiResetChannel && msgPayload.resetChat === true) {
          console.log("[ChatWidget] Received resetChat signal. Clearing all message stores.");
          setAllMessages([])
          // setQuestionMessages([]) // Removed
        }
      }
    }
    
    chat.sdk.addListener(resetListener)
    chat.sdk.subscribe({ channels: [uiResetChannel] })

    return () => {
      if (chat?.sdk) { // Ensure chat.sdk still exists on cleanup
        chat.sdk.removeListener(resetListener)
        chat.sdk.unsubscribe({ channels: [uiResetChannel] })
      }
    }
  }, [chat]) // Depends only on the chat object

  /**
   * Scroll to bottom of messages when displayedMessages change
   */
  useEffect(() => {
    scrollToBottom()
  }, [displayedMessages])

  useEffect(() => {
    if (allMessages.length > 0) {
      const lastMessageUser = allMessages[allMessages.length - 1].userId
      if (lastMessageUser.startsWith('user-')) {
        Message.streamUpdatesOn(allMessages, setAllMessages)
      }
    }
    scrollToBottom()
  }, [allMessages])

  /**
   * Fetches all available channels and organizes them by type
   */
  const fetchChannels = async () => {
    if (!chat) return

    try {
      // Get all channels from PubNub Chat SDK
      // For the live shopping app, we might not need to dynamically fetch public channels
      // if 'game.chat' is the only one we care about initially.
      // However, keeping this for now in case other parts of the app use it.
      const result = await chat.getChannels()
      const channels = result.channels || []

      // Sort channels by type
      const publicChan: Channel[] = []

      for (const channel of channels) {
        if (!channel) continue

        // Add channel to appropriate array based on type
        if (channel.type === 'public') {
          publicChan.push(channel)
        }
      }

      setPublicChannels(publicChan)

      // Set default active channel if none selected
      if (!activeChannelId && publicChan.length > 0) {
        setActiveChannelId(publicChan[0].id)
      }
    } catch (error) {
      console.error('Error fetching channels:', error)
    }
  }

  /**
   * Fetches all available users for inviting to channels
   */
  const fetchUsers = async () => {
    if (!chat) return

    try {
      const result = await chat.getUsers()
      const users = result.users || []
      setAvailableUsers(users.filter(user => user.id !== chat.currentUser.id))
      setUsers(users)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  /**
   * Sets up the active channel and its message listeners
   */
  const setupActiveChannel = async () => {
    if (!chat || !activeChannelId) {
      console.error("[setupActiveChannel] Guard hit: No chat or activeChannelId.");
      setActiveChannel(null);
      return () => {};
    }

    console.log(`[setupActiveChannel] Attempting to get channel: '${activeChannelId}'`);
    try {
      const channel = await chat.getChannel(activeChannelId);

      if (!channel) {
        console.error(`[setupActiveChannel] chat.getChannel('${activeChannelId}') returned null or undefined.`);
        setActiveChannel(null);
        setAllMessages([]); // Always clear allMessages if channel fails for mainChatChannelId
        return () => {};
      }

      console.log(`[setupActiveChannel] Successfully fetched channel object for '${activeChannelId}'.`);
      setActiveChannel(channel);

      let unsubscribeMessages = () => {};
      const messageLimit = 50; // Consistent limit

      // Only setup for mainChatChannelId now
      // if (activeChannelId === mainChatChannelId) { // Condition no longer needed
      console.log(`[setupActiveChannel] Setting up main channel: ${mainChatChannelId}`);
      if (allMessages.length === 0) {
        console.log(`[setupActiveChannel] Fetching history for ${mainChatChannelId}`);
        const history = await channel.getHistory({ count: messageLimit });
        setAllMessages((history.messages || []).reverse());
      }
      unsubscribeMessages = channel.connect(async (message: Message) => {
        //console.log(`[ChatWidget] MAIN CHAT - New message received. Timetoken: ${message.timetoken}. Content:`, JSON.stringify(message.content));
        setAllMessages(prevMessages => {
          if (prevMessages.some(m => m.timetoken === message.timetoken)) return prevMessages;
          return [...prevMessages, message].slice(-messageLimit);
        });
      });
      // } else if (activeChannelId === questionsChannelId) { // All this block removed
      //   console.log(`[setupActiveChannel] Setting up questions channel: ${questionsChannelId}`);
      //   if (questionMessages.length === 0) {
      //     console.log(`[setupActiveChannel] Fetching history for ${questionsChannelId}`);
      //     const history = await channel.getHistory({ count: messageLimit });
      //     console.log(`[setupActiveChannel] History for ${questionsChannelId} received:`, history.messages);
      //     setQuestionMessages(history.messages || []); // No reverse for questions, assuming history is oldest to newest
      //   }
      //   
      //   console.log(`[setupActiveChannel] Subscribing (channel.connect) to ${questionsChannelId} for real-time messages.`);
      //   unsubscribeMessages = channel.connect(async (message: Message) => {
      //     // DETAILED LOGS FOR QUESTIONS CHANNEL REAL-TIME MESSAGES
      //     console.log(`[ChatWidget] QUESTIONS CHANNEL ('${questionsChannelId}') - Connect callback fired!`);
      //     console.log(`[ChatWidget] QUESTIONS CHANNEL - Received message object:`, message);
      //     console.log(`[ChatWidget] QUESTIONS CHANNEL - Message content:`, JSON.stringify(message.content));
      //     console.log(`[ChatWidget] QUESTIONS CHANNEL - Message timetoken: ${message.timetoken}`);
      //     console.log(`[ChatWidget] QUESTIONS CHANNEL - Current questionMessages count: ${questionMessages.length}`); // Log current length before update
      //
      //     setQuestionMessages(prevMessages => {
      //       console.log(`[ChatWidget] QUESTIONS CHANNEL - Inside setQuestionMessages. Prev count: ${prevMessages.length}`);
      //       const messageExists = prevMessages.some(m => m.timetoken === message.timetoken);
      //       if (messageExists) {
      //         console.log(`[ChatWidget] QUESTIONS CHANNEL - Duplicate message (timetoken: ${message.timetoken}). Ignoring.`);
      //         return prevMessages;
      //       }
      //       const newMessages = [...prevMessages, message];
      //       console.log(`[ChatWidget] QUESTIONS CHANNEL - Added new message. New temp count: ${newMessages.length}`);
      //       return newMessages.slice(-messageLimit);
      //     });
      //   });
      // }
      
      // Occupancy updates from Data Controls
      const occupancyChannel = chat.sdk.channel(dataControlOccupancyChannelId);
      const occupancySubscription = occupancyChannel.subscription({ receivePresenceEvents: false });
      occupancySubscription.onMessage = (messageEvent: any) => {
        setSimulatedOccupancy(+messageEvent.message.chatOccupancy);
      };
      occupancySubscription.subscribe();

      const serverVideoControlChannelSub = chat.sdk.channel(serverVideoControlChannelId);
      const serverVideoControlSubscription = serverVideoControlChannelSub.subscription({
          receivePresenceEvents: false
      });
      serverVideoControlSubscription.onMessage = (messageEvent: any) => {
          if (messageEvent.message.type === 'START_STREAM') {
              console.log("[setupActiveChannel] START_STREAM received, clearing message stores.");
              setAllMessages([]);
              // setQuestionMessages([]); // Removed
          }
      };
      serverVideoControlSubscription.subscribe();

      //  For consistency with the live stream, use the reactions channel for real occupancy
      const reactionsChannelSub = chat.sdk.channel(streamReactionsChannelId);
      const reactionsSubscription = reactionsChannelSub.subscription({ receivePresenceEvents: true });
      reactionsSubscription.onPresence = (presenceEvent: any) => {
        if (presenceEvent?.occupancy > 0) {
          setRealOccupancy(presenceEvent.occupancy);
        }
      };
      chat.sdk.hereNow({ channels: [streamReactionsChannelId] }).then(hereNowResult => {
        if (hereNowResult) {
          setRealOccupancy(hereNowResult.totalOccupancy + 1);
        }
      });
      reactionsSubscription.subscribe();

      return () => {
        console.log(`[setupActiveChannel] Cleaning up subscriptions for channel '${activeChannelId}'`);
        if (typeof unsubscribeMessages === 'function') unsubscribeMessages();
        occupancySubscription.unsubscribe();
        reactionsSubscription.unsubscribe();
        serverVideoControlSubscription.unsubscribe();
      };
    } catch (error) {
      console.error(`[setupActiveChannel] Error setting up channel '${activeChannelId}':`, error);
      setActiveChannel(null);
      setAllMessages([]); // Always clear allMessages if channel setup fails
      return () => {};
    }
  };

  /**
   * Scrolls to the bottom of the message list
   */
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }

  /**
   * Creates a new channel based on selected type
   */
  const createChannel = async () => {
    if (!chat || !channelName.trim()) return

    try {
      let newChannel: any = null

      // Create appropriate channel type
      if (channelType === 'public') {
        // Create public channel
        newChannel = await chat.createPublicConversation({
          channelData: {
            name: channelName,
            description: `${channelName} public channel`
          }
        })
      } else if (channelType === 'private') {
        // Create private (group) channel with selected users
        if (selectedUsers.length === 0) {
          alert('Please select at least one user to invite')
          return
        }

        const users = await Promise.all(
          selectedUsers.map(userId => chat.getUser(userId))
        )

        const filteredUsers = users.filter(Boolean) as User[]

        newChannel = await chat.createGroupConversation({
          users: filteredUsers,
          channelData: {
            name: channelName,
            description: `${channelName} private group channel`
          }
        })
      } else if (channelType === 'direct' && selectedUsers.length === 1) {
        // Create direct (1:1) channel with selected user
        const user = await chat.getUser(selectedUsers[0])
        if (!user) {
          alert('Selected user not found')
          return
        }

        newChannel = await chat.createDirectConversation({
          user,
          channelData: {
            name: channelName || `Chat with ${user.name || user.id}`
          }
        })
      }

      if (newChannel && newChannel.channel) {
        // Refresh channels and select the new one
        await fetchChannels()
        setActiveChannelId(newChannel.channel.id)

        // Reset UI state
        setShowChannelCreate(false)
        setChannelName('')
        setChannelType('public')
        setSelectedUsers([])
      }
    } catch (error) {
      console.error('Error creating channel:', error)
    }
  }

  /**
   * Toggles user selection for channel invites
   */
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  function backgroundClicked (e) {
    setShowMentions(false)
    setShowReactions(false)
  }

  return (
    <div
      className={`${className} w-full ${isOverlayMode ? 'h-fit' : 'h-fit'}`}
      onClick={e => backgroundClicked(e)}
    >
      {!isOverlayMode && (
        <GuideOverlay
          id={'chatGuide'}
          guidesShown={guidesShown}
          visibleGuide={visibleGuide}
          setVisibleGuide={setVisibleGuide}
          text={
            <span>
              The <span className='font-semibold'>PubNub Chat SDK</span> provides
              you with everything you need to develop a fully featured,
              production-ready chat component:
              <ul className='list-disc list-inside my-2'>
                <li>Public, private, and direct channels</li>
                <li>Send and receive real-time messages</li>
                <li>Add emoji reactions to messages</li>
                <li>Track whether users are online or offline</li>
              </ul>
              Also: Integration with AI and Moderation through{' '}
              <span className='font-semibold'>BizOps Workspace</span> and{' '}
              <span className='font-semibold'>Functions</span>
            </span>
          }
          xOffset={`${isMobilePreview ? 'left-[0px]' : '-left-[60px]'}`}
          yOffset={'top-[10px]'}
          flexStyle={'flex-row items-start'}
        />
      )}

      {!activeChannel && !isOverlayMode && (
        <div className='text-lg border-b pb-2 flex items-center bg-navy900 overflow-hidden rounded-t px-[16px] py-[12px] text-white text-[16px] font-[600] leading-[24px] h-[56px]'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='20'
            height='20'
            viewBox='0 0 20 20'
            fill='none'
          >
            <path
              d='M12.4998 3.33341V9.16675H4.30817L3.33317 10.1417V3.33341H12.4998ZM13.3332 1.66675H2.49984C2.0415 1.66675 1.6665 2.04175 1.6665 2.50008V14.1667L4.99984 10.8334H13.3332C13.7915 10.8334 14.1665 10.4584 14.1665 10.0001V2.50008C14.1665 2.04175 13.7915 1.66675 13.3332 1.66675ZM17.4998 5.00008H15.8332V12.5001H4.99984V14.1667C4.99984 14.6251 5.37484 15.0001 5.83317 15.0001H14.9998L18.3332 18.3334V5.83342C18.3332 5.37508 17.9582 5.00008 17.4998 5.00008Z'
              fill='white'
            />
          </svg>
          <div className={'pl-[16px]'}>
            {showChannelCreate ? 'Create channel' : 'Chats'}
          </div>
          <div className={'grow'} />
          <button
            className='cursor-pointer'
            onClick={() => setShowChannelCreate(!showChannelCreate)}
          >
            {showChannelCreate ? (
              'Cancel'
            ) : (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='20'
                height='20'
                viewBox='0 0 20 20'
                fill='none'
              >
                <path
                  d='M15.8332 10.8334H10.8332V15.8334H9.1665V10.8334H4.1665V9.16675H9.1665V4.16675H10.8332V9.16675H15.8332V10.8334Z'
                  fill='#FAFAFA'
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {activeChannel && !isOverlayMode && (
        <div className='text-lg border-b pb-2 flex items-center bg-complex-black overflow-hidden rounded-t px-[16px] py-[12px] text-white text-[16px] font-[600] leading-[24px] h-[56px]'>
          <div
            className={'rounded-full w-[32px] h-[32px] !bg-cover bg-gray-100'}
            style={
              activeChannel.custom?.profileUrl
                ? {
                    background: `url(${activeChannel.custom?.profileUrl}) center center no-repeat`
                  }
                : {}
            }
          ></div>
          <div className={'ml-[16px]'}>
            {activeChannel.name || activeChannel.id}
          </div>
          <div className={'grow'} />
          <div className={'flex items-center justify-center gap-1'}>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='8'
              height='8'
              viewBox='0 0 8 8'
              fill='none'
            >
              <circle cx='4' cy='4' r='4' fill='#22C55E' />
            </svg>{' '}
            {simulatedOccupancy + realOccupancy} online
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {activeChannel && (
        <div className={`${isOverlayMode ? 'h-full' : 'h-[400px]'} flex flex-col`}>
          <div
            ref={messagesContainerRef}
            className={`${isOverlayMode 
              ? 'overflow-y-scroll h-full space-y-1 touch-pan-y' 
              : 'py-[12px] px-[16px] overflow-y-auto flex-grow hide-scrollbar'
            }`}
            style={isOverlayMode ? { 
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y'
            } : {}}
            onTouchMove={(e) => {
              // Allow touch scrolling and prevent event bubbling
              e.stopPropagation();
            }}
            onWheel={(e) => {
              // Allow trackpad/mouse wheel scrolling
              e.stopPropagation();
            }}
          >
            {displayedMessages.length === 0 ? (
              !isOverlayMode && (
                <div className='text-center text-gray-500 py-4'>
                  No messages yet. Be the first to say something!
                </div>
              )
            ) : activeChannelRestrictions?.ban ? (
              !isOverlayMode && (
                <div className='flex flex-row justify-center items-center h-full'>
                  You have been banned from this chat. Please contact the
                  administrator
                </div>
              )
            ) : (
              <>
                {displayedMessages
                  .slice(isOverlayMode ? -3 : 0) // Show only last 3 messages in overlay mode
                  .map((message, index) => {
                    return (
                      <div
                        key={`${message.timetoken}-${index}`}
                        className={isOverlayMode 
                          ? 'mb-2 animate-fade-in-up' 
                          : ''
                        }
                      >
                        {isOverlayMode ? (
                          <div className="bg-black/60 text-white text-sm px-3 py-2 rounded-2xl backdrop-blur-sm max-w-fit shadow-lg">
                            <div className="flex items-start space-x-2">
                              <div className="font-semibold text-xs opacity-80 min-w-fit">
                                {message.userId === chat.currentUser.id ? 'You' : users.find(u => u.id === message.userId)?.name?.split(' ')[0] || 'User'}:
                              </div>
                              <div className="text-sm">
                                {message.content.text}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <ChatMessage
                            message={message}
                            currentUser={chat.currentUser}
                            users={users}
                            channel={activeChannel}
                          />
                        )}
                      </div>
                    )
                  })}
              </>
            )}
          </div>

          {!isOverlayMode && (
            <>
              <MessageInput
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                showMentions={showMentions}
                setShowMentions={setShowMentions}
                showReactions={showReactions}
                setShowReactions={setShowReactions}
                availableUsers={users}
                channel={activeChannel}
                activeChannelRestrictions={activeChannelRestrictions}
                isGuidedDemo={isGuidedDemo}
              />

              {/* Question Filter Toggle Button - RE-INTRODUCED */}
              <button
                onClick={() => setIsQuestionFilterActive(prev => !prev)}
                className="w-full p-2 mt-1 text-xs text-white bg-gray-700 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-navy200"
              >
                {isQuestionFilterActive ? "Show All Messages" : "Show Questions Only"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
