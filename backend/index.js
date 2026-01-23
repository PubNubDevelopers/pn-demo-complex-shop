"use strict";

// index.js

require("dotenv").config();
const PubNub = require("pubnub");

// Import the data modules:
const { chat } = require("./game-data/chat.js");
const { commentary } = require("./game-data/commentary.js");
const { polls } = require("./game-data/polls.js");
const { reactions } = require("./game-data/reactions.js");
const productsData = require("./game-data/products.json");
const { fanExcitement } = require("./on-demand/fan-excitement.js");
const { fanFrustration } = require("./on-demand/fan-frustration.js");
const { goalScored } = require("./on-demand/push-goal.js");
const { fiveMinutesRemaining } = require("./on-demand/push-5mins.js");
const { angry, cheer } = require("./illuminate/illuminate-polls.js");

// Initialize PubNub
const pubnub = new PubNub({
  publishKey: process.env.PUBNUB_PUBLISH_KEY,
  subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY,
  secretKey: process.env.PUBNUB_SECRET_KEY,
  userId: "game-server",
});

// Track vote counts for each poll
let voteCounts = {};

// Subscribe to control events from the UI
const CONTROL_CHANNEL = "game.server-video-control";
const POLL_DECLARATION_CHANNEL = "game.new-poll";
const POLL_VOTE_CHANNEL = "game.poll-votes";
const POLL_RESULTS_CHANNEL = "game.poll-results";
const UI_RESET_CHANNEL = "game.ui-reset"; // New channel for UI reset signals
pubnub.subscribe({
  channels: [
    CONTROL_CHANNEL, 
    POLL_DECLARATION_CHANNEL, 
    POLL_VOTE_CHANNEL, 
    POLL_RESULTS_CHANNEL,
    // UI_RESET_CHANNEL // No need for backend to subscribe to its own reset publish channel
  ],
});
pubnub.addListener({
  message: async ({ channel, message }) => {
    if (channel === CONTROL_CHANNEL) {
      await handleControlMessage(message);
    } else if (
      channel === POLL_DECLARATION_CHANNEL &&
      (message.pollType === "side" || message.pollType === "featuredStreamPoll")
    ) {
      await handlePollDeclarationMessage(message);
    } else if (channel === POLL_VOTE_CHANNEL && (message.pollType === "side" || message.pollType === "featuredStreamPoll")) {
      await handleVoteMessage(message);
    } else if (channel === POLL_RESULTS_CHANNEL && message.isFinalSignal === true && message.pollType === 'featuredStreamPoll') {
      // This was the old condition for processFeaturedPollEnd, which is now integrated into the main loop's poll processing
      await processFeaturedPollEnd(message); // This specific call might be redundant if main loop handles poll end event from polls.js
      // The main loop will publish the isFinal:true from polls.js data, which processFeaturedPollEnd handles.
      // However, processFeaturedPollEnd is also called by the script runner when a poll event with isFinalSignal comes up.
      // For clarity, let's assume the main script runner's call to processFeaturedPollEnd (via a direct event in polls.js)
      // is the primary way this is triggered for featured polls based on its definition in polls.js
    }
  },
});

/**
 * Handle UI control messages to manipulate the timeline.
 * Supported message types:
 *  - START_STREAM: reset to start
 *  - SEEK: jump to playbackTime
 *  - END_STREAM: advance to end
 */
async function handleControlMessage(msg) {
  switch (msg.type) {
    case "START_STREAM":
      currentTime = 0;
      scriptIndex = 0;
      loopCount = 0;
      voteCounts = {};
      shouldSendChatMessages = true;
      matchScript = buildMatchScript();
      await publishVideoEvent("START_STREAM", {});
      startLoop();
      break;
    case "SEEK": {
      if (!intervalId) return;
      const seekTime = msg.params.playbackTime;
      currentTime = seekTime;
      scriptIndex = matchScript.findIndex(
        (ev) => ev.timeSinceVideoStartedInMs >= currentTime
      );
      if (scriptIndex < 0) scriptIndex = matchScript.length;
      await publishVideoEvent("SEEK", { playbackTime: currentTime });
      break;
    }
    case "END_STREAM":
      stopLoop();
      currentTime = lastEventTime; // 20 minutes
      scriptIndex = matchScript.findIndex(
        (ev) => ev.timeSinceVideoStartedInMs >= currentTime
      );
      // Reset backend states
      voteCounts = {};
      // console.log("[Backend] voteCounts reset on END_STREAM."); // Optional: for debugging
      
      // Publish a message to tell UI components to reset themselves
      await pubnub.publish({
        channel: UI_RESET_CHANNEL,
        message: { 
          resetLiveStreamPoll: true, 
          resetPollsWidget: true, 
          resetCommentary: true,
          resetChat: true,
          resetProductShowcase: true
        },
        storeInHistory: false // No need to store this signal
      });

      await publishVideoEvent("END_STREAM", {});
      break;
    case "BOT_CHAT":
      if (!intervalId) return;
      let messageText = "Messages Restarted";
      if (shouldSendChatMessages) {
        messageText = "Messages Paused";
      }
      shouldSendChatMessages = !shouldSendChatMessages;
      publishMessage("game.chat", { user: "bot-33", text: messageText }, false);
      break;
    case "ON_DEMAND_SCRIPT":
      if (!intervalId) return;
      const scriptName = msg.params.scriptName;
      const scriptEmoji = msg.params.emoji;

      var onDemandScript = null;
      var delay = 0;
      if (scriptName === "fan-excitement") {
        onDemandScript = shuffleArray(expandRepeatedEvents(fanExcitement));
      } else if (scriptName === "fan-frustration") {
        onDemandScript = shuffleArray(expandRepeatedEvents(fanFrustration));
      } else if (scriptName === "push-goal") {
        onDemandScript = goalScored;
      } else if (scriptName === "push-5mins") {
        onDemandScript = fiveMinutesRemaining;
      } else if (scriptEmoji === "😡") {
        onDemandScript = angry;
        console.log("Angry script");
        delay = 30000;
      } else if (scriptEmoji === "🎉") {
        onDemandScript = cheer;
        console.log("Cheer script");
        delay = 30000;
      } else {
        console.error("[Control] Unknown script name:", scriptName);
        return;
      }
      runOnDemandScript(onDemandScript, delay);

      break;
    default:
      console.log("[Control] Unknown control type:", msg.type);
  }
}

async function handlePollDeclarationMessage(msg) {
  const pollId = msg.id;
  const pollOptions = msg.options;
  const incomingPollType = msg.pollType;

  if (!pollOptions || pollOptions.length === 0) {
    console.error("[SimulateVotes] No options found for poll/trivia ID:", pollId);
    return;
  }

  const numberOfSimulatedVotes = Math.floor(Math.random() * 4) + 4; // Simulate 4 to 7 votes

  for (let i = 0; i < numberOfSimulatedVotes; i++) {
    // Delay each simulated vote by 1.5 to 4 seconds randomly
    const randomDelay = Math.floor(Math.random() * 2500) + 1500;
    setTimeout(async () => {
      // Ensure we are still processing the same poll, in case a new one came in quickly
      // This check might be overly cautious if handlePollDeclarationMessage is not re-entrant for same poll ID
      // or if the outer script processing ensures one poll declaration completes before another.
      // For simplicity, assuming the setTimeout closure captures the correct pollId and pollOptions.

      const randomOption = pollOptions[Math.floor(Math.random() * pollOptions.length)];
      const simulatedVote = {
        pollId: pollId,
        choiceId: randomOption.id,
        pollType: incomingPollType,
        simulated: true
      };

      // Publish to POLL_VOTE_CHANNEL. This will be picked up by the listener,
      // which calls handleVoteMessage, which updates voteCounts and publishes to POLL_RESULTS_CHANNEL.
      try {
        // Directly use pubnub.publish here as publishMessage has extra logic we might not need for this simple case,
        // and to ensure it goes to the intended channel for the listener.
        // The main listener for POLL_VOTE_CHANNEL will call handleVoteMessage.
        await pubnub.publish({
          channel: POLL_VOTE_CHANNEL,
          message: simulatedVote,
          storeInHistory: false // Simulated votes shouldn't be in history
        });
      } catch (error) {
        console.error("[SimulateVotes] Error publishing simulated vote:", error);
      }
    }, i * 2000 + randomDelay); // Stagger votes, ensure `i` factor is significant enough
  }
}

async function handleVoteMessage(msg) {
  const pollId = msg.pollId;
  const choiceId = msg.choiceId;
  const incomingPollType = msg.pollType;

  // Initialize vote counts for this poll if not already tracked
  if (!voteCounts[pollId]) {
    voteCounts[pollId] = {};
  }

  // Increment the vote count for this choice
  if (!voteCounts[pollId][choiceId]) {
    voteCounts[pollId][choiceId] = 0;
  }
  voteCounts[pollId][choiceId]++;

  // Publish interim results immediately after a vote
  const currentVotesForPoll = voteCounts[pollId];
  const optionsForInterimResult = Object.entries(currentVotesForPoll).map(
    ([optId, score]) => ({
      id: parseInt(optId),
      score: score,
    })
  );

  const interimResultMessage = {
    id: pollId,
    options: optionsForInterimResult,
    pollType: incomingPollType,
  };

  // Publish to POLL_RESULTS_CHANNEL, not stored in history
  try {
    await pubnub.publish({
      channel: POLL_RESULTS_CHANNEL,
      message: interimResultMessage,
      storeInHistory: false,
    });
  } catch (error) {
    console.error("[Backend] Error publishing interim results:", error);
  }
}

// Function to process the end of a featured poll
async function processFeaturedPollEnd(signalMessage) {
  const pollId = signalMessage.id;
  console.log(`[Backend] Processing featured poll end signal for ID: ${pollId}`);

  // Synchronous vote simulation if no votes are present (e.g., due to a fast jump)
  if (!voteCounts[pollId] || Object.keys(voteCounts[pollId]).length === 0) {
    console.warn(`[Backend] No vote counts found for ended featured poll ID: ${pollId}. Attempting synchronous simulation.`);
    
    // Find the original poll declaration to get its options
    // The 'polls' variable is imported from './game-data/polls.js' at the top of the file.
    const originalPollEvent = polls.find(
      (p) => p.action.data.id === pollId && p.action.channel === POLL_DECLARATION_CHANNEL
    );

    if (originalPollEvent && originalPollEvent.action.data.options && originalPollEvent.action.data.options.length > 0) {
      const pollOptions = originalPollEvent.action.data.options;
      voteCounts[pollId] = {}; // Initialize/reset for this poll
      const numberOfSimulatedVotes = Math.floor(Math.random() * 20) + 10; // Simulate 10-29 votes

      for (let i = 0; i < numberOfSimulatedVotes; i++) {
        const randomOption = pollOptions[Math.floor(Math.random() * pollOptions.length)];
        if (!voteCounts[pollId][randomOption.id]) {
          voteCounts[pollId][randomOption.id] = 0;
        }
        voteCounts[pollId][randomOption.id]++;
      }
      console.log(`[Backend] Synchronously simulated votes for poll ${pollId}:`, voteCounts[pollId]);
    } else {
      console.error(`[Backend] Could not find original declaration or options for poll ${pollId} to perform synchronous vote simulation.`);
      // If simulation fails, publish empty final results to still signal the end.
      const finalResults = {
        id: pollId,
        pollType: "featuredStreamPoll",
        options: [], 
        isFinal: true,
      };
      try {
        await pubnub.publish({
          channel: POLL_RESULTS_CHANNEL,
          message: finalResults,
          storeInHistory: true, 
        });
      } catch (error) {
        console.error("[Backend] Error publishing final results:", error);
      }
      // Clean up vote counts for this poll even if it was empty or simulation failed
      delete voteCounts[pollId]; 
      return; 
    }
  }

  const finalVoteCounts = voteCounts[pollId];
  const optionsWithFinalScores = Object.entries(finalVoteCounts).map(
    ([optId, score]) => ({
      id: parseInt(optId),
      score: score,
    })
  );

  const finalResultsMessage = {
    id: pollId,
    pollType: "featuredStreamPoll",
    options: optionsWithFinalScores,
    isFinal: true,
  };

  console.log(`[Backend] Publishing final results for featured poll ID: ${pollId}:`, finalResultsMessage);
  try {
    await pubnub.publish({
      channel: POLL_RESULTS_CHANNEL,
      message: finalResultsMessage,
      storeInHistory: true, // Store final results
    });
  } catch (error) {
    console.error("[Backend] Error publishing final results:", error);
  }

  // Clean up vote counts for this poll
  delete voteCounts[pollId];
  console.log(`[Backend] Cleaned up vote counts for featured poll ID: ${pollId}`);
}

// New function to build product events
function buildProductEvents(products) {
  const productEvents = [];
  products.forEach(product => {
    // Event to show the product
    productEvents.push({
      timeSinceVideoStartedInMs: product.startTimeMs,
      persistInHistory: true,
      action: {
        channel: "game.match-stats", // Reusing channel
        data: product
      }
    });
    // Event to clear the product when it ends
    productEvents.push({
      timeSinceVideoStartedInMs: product.endTimeMs,
      persistInHistory: true, // Important for late joiners to know product ended
      action: {
        channel: "game.match-stats",
        data: { type: "PRODUCT_ENDED", id: product.id, originalEndTime: product.endTimeMs }
      }
    });
  });
  return productEvents;
}

async function handlePollResultsMessage(msg) {
  const votes = voteCounts[msg.id];
  if (!votes) {
    console.log("No votes, or poll was not declared");
    //  No votes, or poll was not declared
    return;
  }

  const options = Object.entries(voteCounts[msg.id] || {}).map(
    ([id, score]) => ({
      id: parseInt(id),
      score: score,
    })
  );
  const message = {
    id: msg.id,
    options: options,
    ...(msg.correctOption !== undefined && {
      correctOption: msg.correctOption,
    }),
    pollType: "side",
  };
  try {
    await pubnub.publish({
      channel: POLL_RESULTS_CHANNEL,
      message: message,
      storeInHistory: false,
    });
  } catch (error) {
    console.error("[Backend] Error publishing poll results:", error);
  }
}

// --------------------------------------------------------------------------------
// Expand repeated events with realistic random delays
function expandRepeatedEvents(events) {
  const expanded = [];

  events.forEach((ev) => {
    if (ev.repeat && ev.repeat > 1) {
      // We'll expand this event into multiple occurrences with random delays
      let lastTime = ev.timeSinceVideoStartedInMs;
      for (let i = 0; i < ev.repeat; i++) {
        // Random delay between 500ms and 2500ms
        let randomDelay = Math.floor(500 + Math.random() * 2000);

        // The first of the repeated actions occurs exactly at the original time
        if (i === 0) {
          randomDelay = 0;
        }

        let newTime = lastTime + randomDelay;
        lastTime = newTime;

        let newItem = {
          ...ev,
          timeSinceVideoStartedInMs: newTime,
          repeat: 1, // Mark as processed so we don't expand again
        };

        expanded.push(newItem);
      }
    } else {
      expanded.push(ev);
    }
  });

  return expanded;
}

// --------------------------------------------------------------------------------
// Merge data from all modules and sort by the timeline
function buildMatchScript() {
  const productActionEvents = buildProductEvents(productsData); // Generate product events
  // All modules combined
  let merged = [...chat, ...commentary, ...polls, ...reactions, ...productActionEvents]; // Use product events, remove stats

  // Expand repeats first
  let expanded = expandRepeatedEvents(merged);

  // Sort by timeSinceVideoStartedInMs
  expanded.sort(
    (a, b) => a.timeSinceVideoStartedInMs - b.timeSinceVideoStartedInMs
  );

  return expanded;
}

// --------------------------------------------------------------------------------
// Main timeline logic
let matchScript = buildMatchScript();
let currentTime = 0;
let lastPublishedTime = -1;
let scriptIndex = 0;
let loopCount = 0;
let shouldSendChatMessages = true;
const MS_INTERVAL = 1000;

// Identify the final time for resetting the timeline
const lastEventTime =
  matchScript.length > 0
    ? matchScript[matchScript.length - 1].timeSinceVideoStartedInMs
    : 0;

// Publish a message to PubNub
async function publishMessage(channel, message, persistInHistory = false) {
  try {
    if (channel === POLL_RESULTS_CHANNEL && message.pollType === "side") {
      handlePollResultsMessage(message);
    } else {
      // Set User ID
      let userId = message.user || "other";
      pubnub.setUUID(userId);
      console.log("publishing message: ", message);
      try {
      await pubnub.publish({
        channel: channel,
        message: message,
          storeInHistory: persistInHistory,
        });
      } catch (error) {
        console.error("[Backend] Error publishing message:", error);
      }
    }
  } catch (err) {
    console.error("Error publishing message:", err);
  }
}

// Send the current video time so clients can sync
async function publishVideoStatus() {
  const isStart = currentTime === 0;
  // If we consider "end" as the final event time
  const isEnd = currentTime >= lastEventTime;

  const message = {
    type: "STATUS",
    params: {
      playbackTime: currentTime,
      videoStarted: isStart,
      videoEnded: isEnd,
    },
  };

  await publishMessage("game.client-video-control", message);
}

//  Send a message to the client to indicate a video playback event has occurred
async function publishVideoEvent(videoEvent, eventData) {
  const message = {
    type: videoEvent,
    params: eventData,
  };
  await publishMessage("game.client-video-control", message);
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function runOnDemandScript(script, delay = 0) {
  let index = 0;
  while (index < script.length) {
    const eventObj = script[index];
    // Publish the event
    await publishMessage(
      eventObj.action.channel,
      eventObj.action.data,
      !!eventObj.persistInHistory
    );

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    index++;
  }
}

// We'll run the timeline in a loop
async function runLoop() {
  console.log('running loop at time:', currentTime);
  if (currentTime === lastPublishedTime) {
    console.log('currentTime === lastPublishedTime, skipping loop');
    return;
  }
  lastPublishedTime = currentTime;
  // 1. Check if we have reached or passed the next event in matchScript
  while (
    scriptIndex < matchScript.length &&
    matchScript[scriptIndex].timeSinceVideoStartedInMs <= currentTime
  ) {
    const eventObj = matchScript[scriptIndex];
    // Publish the event

    if (!(eventObj.action.channel === "game.chat" && !shouldSendChatMessages)) {
      try {
        await publishMessage(
          eventObj.action.channel,
          eventObj.action.data,
          !!eventObj.persistInHistory
        );
      } catch (err) {
        console.error("Error publishing message:", err);
      }
    }

    scriptIndex++;
  }

  // 2. Send a periodic video status message
  if (!intervalId) return;

  console.log('publishing video status at time:', currentTime);
  await publishVideoStatus();

  // 3. Increment the current time
  currentTime += MS_INTERVAL;

  // 4. If we've hit the end, reset everything
  if (currentTime > lastEventTime) {
    currentTime = 0;
    scriptIndex = 0;
    loopCount++;
    voteCounts = {};
    //  To save wasting resources, stop the loop after 5 loops in guided demo mode
    if (loopCount >= 5 && process.env.GUIDED_DEMO === "true") {
      stopLoop();
    }

    // Re-build the script with new random expansions for repeats on each loop
    matchScript = buildMatchScript();
  }
}

let intervalId = null;

const startLoop = () => {
  if (intervalId) {
    return;
  }

  console.log("Starting loop...");
  intervalId = setInterval(async () => {
    try {
      //currentTime += MS_INTERVAL;
      await runLoop();
    } catch (err) {
      console.error("Error in runLoop:", err);
      // Optionally stop the loop on critical errors
      if (err.isCritical) {
        stopLoop();
      }
    }
  }, MS_INTERVAL);
};

const stopLoop = () => {
  if (intervalId) {
    console.log("Stopping loop...");
    clearInterval(intervalId);
    intervalId = null;
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  stopLoop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  stopLoop();
  process.exit(0);
});

// Start the loop only if GUIDED_DEMO is true
if (process.env.GUIDED_DEMO === "true") {
  console.log("GUIDED_DEMO is true, loop will not start automatically");
} else {
  console.log("GUIDED_DEMO is not true, starting loop");
  startLoop();
}
