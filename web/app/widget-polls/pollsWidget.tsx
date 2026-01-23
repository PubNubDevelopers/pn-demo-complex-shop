import { useState, useEffect, useRef } from 'react'
import GuideOverlay from '../components/guideOverlay'
import Alert from '../components/alert'
import {
  pollDeclarations,
  pollVotes,
  pollResults,
  illuminatePollTesting,
  AlertType,
  uiResetChannel
} from '../data/constants'
import { actionCompleted } from 'pubnub-demo-integration'

// Define new interfaces for Trivia
interface TriviaOption {
  id: number;
  text: string;
  score: number; // To store vote counts/percentages
  isUserChoice?: boolean; // Optional: to highlight user's selection
}

interface TriviaQuestion {
  id: number;
  title: string;
  options: TriviaOption[];
  victoryPoints: number;
  userHasVoted: boolean;
  userChoiceId: number | null;
  isEnded: boolean;
  correctOptionId: number | null;
  alertText?: string; // From original poll declaration
  pollType?: string; // To ensure we only process 'side' polls/trivia
}

// For PubNub message payloads
interface PollDeclarationPayload {
  id: number;
  title: string;
  options: {id: number, text: string}[]; // Raw options from PN
  victoryPoints: number;
  pollType: string;
  alertText?: string;
}

interface PollResultPayload {
  id: number;
  options?: {id: number, score: number}[]; // Made options optional
  pollType: string;
  correctOption?: number;
}

export default function PollsWidget ({
  className,
  isMobilePreview,
  chat,
  isGuidedDemo,
  guidesShown,
  visibleGuide,
  setVisibleGuide,
  awardPoints
}) {
  const [activeTrivia, setActiveTrivia] = useState<TriviaQuestion | null>(null);
  const [completedTrivia, setCompletedTrivia] = useState<TriviaQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: number }>({});
  const [alert, setAlert] = useState<{
    points: number | null
    body: string
  } | null>(null)
  
  const activeTriviaRef = useRef(activeTrivia);
  useEffect(() => {
    activeTriviaRef.current = activeTrivia;
  }, [activeTrivia]);

  const completedTriviaRef = useRef(completedTrivia);
  useEffect(() => {
    completedTriviaRef.current = completedTrivia;
  }, [completedTrivia]);

  useEffect(() => {
    if (!chat?.sdk) return;

    const allChannels = [pollDeclarations, pollVotes, pollResults, uiResetChannel];

    const listener = {
      message: (event: any) => {
        const msg = event.message as any;
        const chnl = event.channel;
        if (chnl === uiResetChannel && msg.resetPollsWidget === true) {
          setActiveTrivia(null);
          setCompletedTrivia([]);
          setUserAnswers({});
          return;
        }

        if (chnl === pollDeclarations && msg.pollType === 'side') {
          const newTriviaData = msg as PollDeclarationPayload;
          showPollAlert(newTriviaData.alertText || `New Trivia: ${newTriviaData.title}`);
          if (activeTriviaRef.current) {
            if (activeTriviaRef.current.isEnded) {
              setCompletedTrivia(prev => [activeTriviaRef.current as TriviaQuestion, ...prev].slice(0,3));
            } else {
              console.warn(`New trivia (ID: ${newTriviaData.id}) started while active trivia (ID: ${activeTriviaRef.current.id}) was not formally ended. Moving old one to completed.`);
              setCompletedTrivia(prev => [{...activeTriviaRef.current as TriviaQuestion, isEnded: true}, ...prev].slice(0,3));
            }
          }
          setActiveTrivia({
            id: newTriviaData.id,
            title: newTriviaData.title,
            options: newTriviaData.options.map(opt => ({ id: opt.id, text: opt.text, score: 0, isUserChoice: false })),
            victoryPoints: newTriviaData.victoryPoints,
            userHasVoted: false,
            userChoiceId: null,
            isEnded: false,
            correctOptionId: null,
            alertText: newTriviaData.alertText,
            pollType: newTriviaData.pollType
          });
        } else if (chnl === pollResults && msg.pollType === 'side') {
          const resultsData = msg as PollResultPayload;
          if (activeTriviaRef.current && resultsData.id === activeTriviaRef.current.id && resultsData.pollType === 'side') {
            setActiveTrivia(prevTrivia => {
              if (!prevTrivia) return null;
              
              let updatedOptions = prevTrivia.options; // Keep existing options (text, id)

              let triviaIsNowEnded = prevTrivia.isEnded;
              let finalCorrectOptionId = prevTrivia.correctOptionId;
              let shouldMoveToCompleted = false;

              if (resultsData.correctOption !== undefined) {
                triviaIsNowEnded = true;
                finalCorrectOptionId = resultsData.correctOption;
                shouldMoveToCompleted = true; 
                if (prevTrivia.userHasVoted && prevTrivia.userChoiceId !== null && !isMobilePreview) {
                  if (prevTrivia.userChoiceId === finalCorrectOptionId) {
                    awardPoints(prevTrivia.victoryPoints, 'Correct Trivia Answer!');
                  } else {
                    awardPoints(1, 'Incorrect Trivia Answer 😢');
                  }
                }
              }
              const updatedTriviaState = { ...prevTrivia, options: updatedOptions, isEnded: triviaIsNowEnded, correctOptionId: finalCorrectOptionId };
              if (shouldMoveToCompleted) {
                setTimeout(() => {
                  setCompletedTrivia(prevCompleted => [updatedTriviaState, ...prevCompleted].slice(0,3));
                }, 500); 
              }
              return updatedTriviaState;
            });
          }
        } else if (chnl === pollVotes && msg.pollType === 'side') {
          // Handle a vote from the current user
          // This might update userAnswers and then call setActiveTrivia with userHasVoted:true
        }
      }
    };
    chat.sdk.addListener(listener);
    chat.sdk.subscribe({ channels: allChannels });
    return () => {
      chat.sdk.removeListener(listener);
      chat.sdk.unsubscribe({ channels: allChannels });
    }
  }, [chat, awardPoints, isMobilePreview]);

  function showPollAlert (pollText) {
    setAlert({ points: null, body: `${pollText ?? 'New trivia available'}` })
    setTimeout(() => { try { setAlert(null) } catch {} }, 2000)
  }

  const handleVote = (triviaId: number, optionId: number) => {
    if (!activeTrivia || activeTrivia.userHasVoted || activeTrivia.id !== triviaId) return;

    setActiveTrivia(prev => {
      if (!prev) return null;
      return {
        ...prev,
        userHasVoted: true,
        userChoiceId: optionId,
        options: prev.options.map(opt => 
          opt.id === optionId ? { ...opt, isUserChoice: true } : opt
        )
      };
    });

    chat.sdk.publish({
      channel: pollVotes,
      message: {
        pollId: triviaId,
        choiceId: optionId,
        pollType: "side",
      },
    });

    if (!isGuidedDemo) {
      actionCompleted({ action: 'Voted in Trivia' });
    }
  };

  return (
    <div className={`${className} px-6 pt-3 pb-4`}>
      {alert && (
        <Alert
          type={AlertType.NEW_POLL}
          message={alert}
          onClose={() => setAlert(null)}
        />
      )}
      <GuideOverlay
        id={'pollsGuide'}
        guidesShown={guidesShown}
        visibleGuide={visibleGuide}
        setVisibleGuide={setVisibleGuide}
        text={<span>Trivia is built on top of PubNub's Core Messaging Service, to announce new quizzes, allow users to vote, and distribute results. Functions allow you to tabulate results with serverless processing. Access Manager provides fine grain access control so users cannot see results before they are published.</span>}
        xOffset={`${isMobilePreview ? 'left-[0px]' : '-left-[60px]'}`}
        yOffset={''}
        flexStyle={'flex-row items-start'}
      />

      {activeTrivia ? (
        <ActiveTriviaDisplay trivia={activeTrivia} onVote={handleVote} onBack={() => setActiveTrivia(null)} />
      ) : (
        <CompletedTriviaList completed={completedTrivia} onViewResult={(trivia) => setActiveTrivia(trivia)} />
      )}
    </div>
  );
}

function ActiveTriviaDisplay({ trivia, onVote, onBack }: { trivia: TriviaQuestion, onVote: (triviaId: number, optionId: number) => void, onBack: () => void }) {
  return (
    <div className='py-3'>
      <PollCardTitle text={trivia.isEnded ? `Trivia Results: ${trivia.title}` : `New Trivia: ${trivia.title}`} />
      <p className="mb-2 text-sm">{trivia.title}</p>
      {trivia.options.map(option => {
        const isCorrect = trivia.isEnded && option.id === trivia.correctOptionId;
        const isUserVotedThis = option.id === trivia.userChoiceId;

        return (
          <div key={option.id} className={`my-1 p-2 border rounded-md 
            ${isUserVotedThis && !trivia.isEnded ? 'bg-navy100 border-navy300' : ''}
            ${trivia.isEnded && isCorrect ? 'bg-green-100 border-green-400' : ''}
            ${trivia.isEnded && isUserVotedThis && !isCorrect ? 'bg-red-100 border-red-400' : ''}
            ${!trivia.userHasVoted && !trivia.isEnded ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}
          `}
            onClick={() => !trivia.userHasVoted && !trivia.isEnded && onVote(trivia.id, option.id)}
          >
            <div className="flex justify-between items-center">
              <span>{option.text}</span>
            </div>
            {trivia.isEnded && isCorrect && <span className="text-xs text-green-700">Correct Answer!</span>}
            {trivia.isEnded && isUserVotedThis && !isCorrect && <span className="text-xs text-red-700">Your Answer</span>}
            {trivia.isEnded && isUserVotedThis && isCorrect && <span className="text-xs text-green-700">(Your Answer)</span>}
          </div>
        );
      })}
      {!trivia.isEnded && trivia.userHasVoted && <p className="text-xs mt-2">Thanks for voting! Waiting for final results...</p>}
      {trivia.isEnded && trivia.userChoiceId === null && <p className="text-xs mt-2">Trivia ended. You did not vote.</p>}
      {trivia.isEnded && (
         <button 
            className='mt-3 px-3 py-1.5 text-xs font-medium text-center text-white bg-navy700 rounded-lg hover:bg-navy800 focus:ring-4 focus:outline-none focus:ring-navy300 disabled:opacity-50'
            onClick={onBack}
          >Back to Trivia List</button>
      )}
    </div>
  );
}

function CompletedTriviaList({ completed, onViewResult }: { completed: TriviaQuestion[], onViewResult: (trivia: TriviaQuestion) => void }) {
  if (completed.length === 0) {
    return <div className='text-base font-normal py-3'>No past trivia to show.</div>;
  }
  return (
    <div className='py-3'>
      <PollCardTitle text="Past Trivia Results" />
      {[...new Map(completed.map(trivia => [trivia.id, trivia])).values()].map(trivia => (
        <div key={trivia.id} className="my-1 p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
             onClick={() => onViewResult(trivia)}
        >
          <p className="text-sm font-semibold">{trivia.title}</p>
          <p className="text-xs text-gray-500">
            {trivia.userChoiceId !== null ? (trivia.userChoiceId === trivia.correctOptionId ? 'Answered Correctly' : 'Answered Incorrectly') : 'Not Answered'} - {trivia.victoryPoints} points potential
          </p>
        </div>
      ))}
    </div>
  );
}

function PollCardTitle ({ text }) {
  return <div className='text-lg font-semibold mb-2'>{text}</div>
}
