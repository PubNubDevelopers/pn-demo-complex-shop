import { useState, useEffect, useRef } from 'react'
import GuideOverlay from '../components/guideOverlay'
import { pollDeclarations, pollVotes, pollResults, uiResetChannel } from '../data/constants'
import { ActivitiesIcon } from './pollsIcons'
import { actionCompleted } from 'pubnub-demo-integration'

// Interface for the poll structure this widget handles
interface FeaturedPollOption {
  id: number;
  text: string;
  score?: number; // Score will come from results message
}

// Add VoteMessage interface
interface VoteMessage {
  pollId: number;
  choiceId: number;
  pollType: 'featuredStreamPoll' | 'side';
  userId: string;
  timetoken?: string | number; // PubNub timetokens can be string or number
}

interface FeaturedPoll {
  id: number;
  title: string;
  options: FeaturedPollOption[];
  pollType: 'featuredStreamPoll'; // Explicitly this type
  answered: boolean;
  isPollOpen: boolean;
  userAnswerId?: number;
  // No correctOption or victoryPoints for this type of poll
}

// Interface for the declaration payload
interface FeaturedPollDeclarationPayload {
  id: number;
  title: string;
  options: { id: number; text: string }[];
  pollType: 'featuredStreamPoll';
  alertText?: string;
  // actionTimeMs is NOT part of this payload from the backend
}

// Interface for the results payload
interface FeaturedPollResultPayload {
  id: number;
  pollType: 'featuredStreamPoll';
  options: { id: number; score: number }[]; // Expecting scores in results
  isFinal?: boolean; // Added for definitive poll end signal
}

export default function LiveStreamPoll ({
  isMobilePreview,
  chat,
  isGuidedDemo,
  guidesShown,
  visibleGuide,
  setVisibleGuide,
}) {
  const [currentPoll, setCurrentPoll] = useState<FeaturedPoll | null>(null)
  const [currentPollAnswerText, setCurrentPollAnswerText] = useState<string | null>(null)

  // Ref to hold the latest currentPoll for the listener
  const currentPollRef = useRef(currentPoll);
  useEffect(() => {
    currentPollRef.current = currentPoll;
  }, [currentPoll]);

  useEffect(() => {
    if (!chat?.sdk) {
      return;
    }

    const allChannels = [pollDeclarations, pollVotes, pollResults, uiResetChannel];

    const listener = {
      message: (messageEvent) => {
        const message = messageEvent.message as any;

        if (messageEvent.channel === uiResetChannel && message.resetLiveStreamPoll === true) {
          // console.log("[LiveStreamPoll] Received reset signal."); // Optional: for debugging
          setCurrentPoll(null);
          setCurrentPollAnswerText(null);
          return; // Early exit after handling reset
        }

        if (messageEvent.channel === pollDeclarations && message.pollType === 'featuredStreamPoll') {
          const pollData = message as FeaturedPollDeclarationPayload;
          setCurrentPoll({
            id: pollData.id,
            title: pollData.title,
            options: pollData.options.map(opt => ({ ...opt, score: 0 })), // Init scores to 0
            pollType: 'featuredStreamPoll',
            answered: false,
            isPollOpen: true,
          });
          // setCurrentPollAnswerText(null); // Resetting answer text when a new poll becomes active
        } else if (messageEvent.channel === pollVotes && message.pollType === 'featuredStreamPoll' && currentPollRef.current && message.pollId === currentPollRef.current.id) {
          const messagePayload = messageEvent.message as any; // Payload of the message
          const choiceId = messagePayload.choiceId;
          const choice = currentPollRef.current.options.find(opt => opt.id === choiceId);
          
          // Only update "Your choice" and answered status if the vote is from the current user
          // CHECKING messageEvent.publisher instead of messagePayload.userId
          if (choice && messageEvent.publisher === chat.currentUser.id) { 
            setCurrentPollAnswerText(choice.text);
            setCurrentPoll(prevPoll => {
              const updatedPoll = prevPoll ? { ...prevPoll, answered: true, userAnswerId: choiceId } : null;
              return updatedPoll;
            });
          }
        } else if (messageEvent.channel === pollResults && message.pollType === 'featuredStreamPoll' && currentPollRef.current && message.id === currentPollRef.current.id) {
          const resultsData = message as FeaturedPollResultPayload;
          setCurrentPoll(prevPoll => {
            if (!prevPoll) return null;
            
            let newOptions = prevPoll.options; // Default to existing options
            // Only try to update scores from options if resultsData.options exists and is not empty
            if (resultsData.options && resultsData.options.length > 0) {
              newOptions = prevPoll.options.map(opt => {
                const resultOpt = resultsData.options.find(ro => ro.id === opt.id);
                // Ensure we fallback to existing score if not in this particular update
                const currentOptScore = prevPoll.options.find(o => o.id === opt.id)?.score || 0;
                return { ...opt, score: resultOpt ? resultOpt.score : currentOptScore }; 
              });
            }

            let pollStillOpen = prevPoll.isPollOpen;
            if (resultsData.isFinal === true) {
              pollStillOpen = false; // Poll is now definitively closed
            }

            const updatedPoll = {
              ...prevPoll,
              options: newOptions,
              isPollOpen: pollStillOpen,
              // If poll is now closed (due to isFinal), consider it answered to show results.
              // Otherwise, retain existing answered status.
              answered: !pollStillOpen ? true : prevPoll.answered 
            };
            return updatedPoll;
          });
        }
      },
    };

    chat.sdk.addListener(listener);
    chat.sdk.subscribe({ channels: allChannels });

    chat.sdk.fetchMessages({
      channels: [pollDeclarations, pollResults],
      count: 10 // Fetch a few more to find the relevant poll
    }).then(async history => {
      const pollDeclarationsHistory = history.channels[pollDeclarations] || [];
      const pollResultsHistory = history.channels[pollResults] || [];

      // Store declaration with its timetoken (converted to ms)
      let latestDeclarationInfo: { message: FeaturedPollDeclarationPayload; timestamp: number } | null = null;
      
      // Assuming currentPlaybackTimeRef.current exists and holds current video time in MS
      const currentPlaybackTimeMs = chat.currentStreamTimeOffset ? chat.currentStreamTimeOffset : 0; // Or a more reliable source for playback time

      for (let i = pollDeclarationsHistory.length - 1; i >= 0; i--) {
        const msg = pollDeclarationsHistory[i];
        const declarationMessage = msg.message as FeaturedPollDeclarationPayload;
        const messageTimestamp = msg.timetoken ? parseInt(msg.timetoken.toString().substring(0, 13)) : 0;

        if (declarationMessage.pollType === 'featuredStreamPoll' && messageTimestamp <= currentPlaybackTimeMs) {
          if (!latestDeclarationInfo || messageTimestamp > latestDeclarationInfo.timestamp) {
            latestDeclarationInfo = { message: declarationMessage, timestamp: messageTimestamp };
          }
        }
      }
      
      // If multiple declarations could be relevant (e.g. same timestamp or very close), pick the one with highest ID or last in array
      // For simplicity, the loop above finds the latest IN TIME that is not in the future.
      // If found, latestDeclarationInfo will hold it.

      if (latestDeclarationInfo) {
        const latestDeclaration = latestDeclarationInfo.message; // This is the payload
        const latestDeclarationTimestamp = latestDeclarationInfo.timestamp; // This is its time in MS

        let finalCorrespondingResult: FeaturedPollResultPayload | null = null;
        let latestInterimResultScores: { id: number; score: number }[] | null = null;

        for (let i = pollResultsHistory.length - 1; i >= 0; i--) {
          const resultMsg = pollResultsHistory[i].message as FeaturedPollResultPayload;
          if (resultMsg.pollType === 'featuredStreamPoll' && resultMsg.id === latestDeclaration.id) {
            if (resultMsg.isFinal === true) {
              finalCorrespondingResult = resultMsg;
              break;
            }
            if (!latestInterimResultScores && resultMsg.options) {
              latestInterimResultScores = resultMsg.options;
            }
          }
        }

        if (finalCorrespondingResult) {
          const scoresToUse = latestInterimResultScores || [];
          const historicalPollWithFinalResults = {
            id: latestDeclaration.id,
            title: latestDeclaration.title,
            options: latestDeclaration.options.map(opt => ({
              ...opt,
              score: scoresToUse.find(ro => ro.id === opt.id)?.score || 0,
            })),
            pollType: latestDeclaration.pollType as 'featuredStreamPoll',
            answered: true, 
            isPollOpen: false,
          };
          setCurrentPoll(historicalPollWithFinalResults);
        } else {
          const scoresToUse = latestInterimResultScores || [];
          const historicalPollOpenOrWithInterim = {
            id: latestDeclaration.id,
            title: latestDeclaration.title,
            options: latestDeclaration.options.map(opt => ({
              ...opt,
              score: scoresToUse.find(ro => ro.id === opt.id)?.score || 0, 
            })),
            pollType: latestDeclaration.pollType as 'featuredStreamPoll',
            answered: false,
            isPollOpen: true,
          };
          setCurrentPoll(historicalPollOpenOrWithInterim);
        }

        // Fetch and process vote history for the latest declared poll
        // Use latestDeclaration (payload) and latestDeclarationTimestamp (ms time)
        if (latestDeclaration && chat?.sdk) {
          const voteHistory = await chat.sdk.fetchMessages({
            channels: [pollVotes],
            count: 25, // Fetch a decent number of recent votes
            includeMessageActions: false,
            includeUUID: true,
            includeMeta: false,
            // Use the timetoken (converted from MS back to PN format) of the declaration as start
            start: latestDeclarationTimestamp ? (latestDeclarationTimestamp * 10000).toString() : undefined,
            // end: (latestDeclaration.endTimeMs * 10000).toString() // Only votes during the poll's active time
          });

          if (voteHistory.channels[pollVotes]) {
            const userVotesForThisPollInHistory = voteHistory.channels[pollVotes]
              .map(msg => msg.message as VoteMessage) // VoteMessage is now defined
              .filter(vm => vm.pollId === latestDeclaration.id && vm.userId === chat.currentUser.id);

            if (userVotesForThisPollInHistory.length > 0) {
              const latestUserVote = userVotesForThisPollInHistory.sort((a, b) => {
                // Ensure timetokens are numbers for correct sorting
                const timeA = typeof a.timetoken === 'string' ? parseInt(a.timetoken.substring(0, 13)) : Number(a.timetoken);
                const timeB = typeof b.timetoken === 'string' ? parseInt(b.timetoken.substring(0, 13)) : Number(b.timetoken);
                return timeB - timeA;
              })[0];
              const chosenOption = latestDeclaration.options.find(o => o.id === latestUserVote.choiceId);
              if (chosenOption) {
                // setCurrentPollAnswerText(chosenOption.text); // Intentionally removed/commented to stop recalling past choice from history
              }
            }
          }
        }
      }
    }).catch(err => console.error("[LiveStreamPoll] Error fetching history:", err));

    return () => {
      chat.sdk.removeListener(listener);
      chat.sdk.unsubscribe({ channels: allChannels });
    };
  }, [chat]);

  if (!currentPoll) {
    return <LivePollNotAvailable />
  }

  return (
    <>
      {!currentPoll.answered && currentPoll.isPollOpen && (
        <LiveStreamPollQuestion poll={currentPoll} chat={chat} isGuidedDemo={isGuidedDemo} isMobilePreview={isMobilePreview} />
      )}
      {currentPoll.answered && currentPoll.isPollOpen && (
        <LiveStreamPollAnswered poll={currentPoll} userAnswerText={currentPollAnswerText} />
      )}
      {(currentPoll.answered && !currentPoll.isPollOpen) && (
        <LivePollResults poll={currentPoll} />
      )}
      {!currentPoll.isPollOpen && !currentPoll.answered && currentPoll.options.some(o => o.score && o.score > 0) && (
         <LivePollResults poll={currentPoll} />
      )}
    </>
  )
}

function LiveStreamPollQuestion ({ poll, chat, isGuidedDemo, isMobilePreview }) {
  return (
    <div className={`flex flex-col items-start justify-center px-6 py-4 gap-4`}>
      <div className='text-neutral-800 text-lg font-semibold'>{poll.title}</div>
      <div className={`flex ${isMobilePreview ? 'flex-col w-full' : 'flex-row flex-wrap justify-start gap-3'}`}>
        {poll.options.map((option) => (
          <LiveStreamPollButton
            key={option.id}
            id={option.id}
            buttonText={option.text}
            onClick={(id, _optionText) => {
              chat.sdk.publish({
                message: {
                  pollId: poll.id,
                  choiceId: id,
                  pollType: poll.pollType,
                },
                channel: pollVotes,
              });
              if (!isGuidedDemo) {
                actionCompleted({ action: 'Voted in featured poll', blockDuplicateCalls: false });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function LiveStreamPollAnswered ({ poll, userAnswerText }) {
  return (
    <div className='flex flex-row w-full items-center justify-center px-6 py-3 gap-1'>
      <div className='text-base font-semibold'>Your choice:</div>
      <div className='text-base font-normal'>{userAnswerText || 'Waiting for vote confirmation...'}</div>
    </div>
  );
}

function LivePollResults ({ poll }) {
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.score || 0), 0);
  return (
    <div className='flex flex-col px-6 py-2 text-sm'>
        <div className='text-base font-semibold mb-2'>Poll Ended: {poll.title}</div>
        <div className='text-xs text-gray-600 mb-2'>Thanks for your input! Here's how everyone voted:</div>
        {poll.options.map(option => {
            const percentage = totalVotes > 0 && option.score ? (option.score / totalVotes) * 100 : 0;
            return (
                <div key={option.id} className="my-1 p-2 border rounded-md bg-gray-50">
                    <div className="flex justify-between items-center">
                        <span>{option.text}</span>
                        <span className="text-xs text-gray-800 font-medium">
                            {option.score || 0} votes ({percentage.toFixed(0)}%)
                        </span>
                    </div>
                     <div className="mt-1 h-2 w-full bg-gray-200 rounded">
                        <div style={{ width: `${percentage}%`}} className="h-full bg-navy500 rounded"></div>
                    </div>
                </div>
            );
        })}
         <div className='flex justify-center mt-3'><ActivitiesIcon width={32} height={32} /></div>
    </div>
  );
}

function LivePollNotAvailable () {
  return <div className='px-6 py-3 text-sm text-gray-500'>No featured poll currently active.</div>;
}

function LiveStreamPollButton ({ id, buttonText, onClick }) {
  return (
    <button
      className={`flex py-2.5 px-5 justify-center items-center min-w-28 max-h-12 text-sm font-medium text-navy900 bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
      onClick={e => {
        e.stopPropagation();
        onClick(id, buttonText);
      }}
    >
      {buttonText}
    </button>
  );
}
