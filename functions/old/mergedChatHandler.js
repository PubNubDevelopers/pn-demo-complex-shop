// Suggested Filename: backend/mergedChatHandler.js
// Function Name: mergedChatHandler (or similar)
// Event Type: Before Publish or Fire
// Channel: game.chat (Recommended)

export default (request) => {
    const pubnub = require('pubnub');
    const kvstore = require('kvstore');
    const xhr =require('xhr');
    const console = require('console');

    const originalRequestChannel = request.channel; // Channel the message is originally published to

    console.log(`[MergedHandler] Event on channel '${originalRequestChannel}'. Original message:`, JSON.stringify(request.message));

    // --- Helper Function for Content Moderation ---
    function moderateContent(currentRequest) {
        let contentToModerate = '';
        const originalMsg = currentRequest.message;

        // Extract content for moderation (adapted from your moderationFunction.js)
        if (typeof originalMsg === 'object' && originalMsg !== null && originalMsg.type === 'text' && typeof originalMsg.text === 'string') {
            contentToModerate = originalMsg.text;
        } else if (typeof originalMsg === 'string') {
            contentToModerate = originalMsg;
        } else if (originalMsg && typeof originalMsg === 'object') {
            contentToModerate = originalMsg.text || originalMsg.content || '';
            if (typeof contentToModerate === 'object' && contentToModerate !== null) {
                contentToModerate = JSON.stringify(contentToModerate);
            }
        }
        if (typeof contentToModerate !== 'string') contentToModerate = '';

        if (!contentToModerate || contentToModerate.length < 2) {
            console.log('[MergedHandler - Moderation] Content too short or empty. Skipping moderation.');
            return Promise.resolve(currentRequest); // No moderation needed
        }

        console.log(`[MergedHandler - Moderation] Content for moderation API: "${contentToModerate}"`);
        return new Promise((resolveModeration) => {
            xhr.fetch('https://vector.profanity.dev', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: contentToModerate })
            }).then(response => {
                if (response.status === 200) {
                    const result = JSON.parse(response.body);
                    if (result.isProfanity === true || result.score > 0.85) { // Adjust threshold as needed
                        console.log('[MergedHandler - Moderation] Profanity detected:', JSON.stringify(result));
                        const censoredContent = contentToModerate.split(' ').map(word => {
                            if (word.length <= 2) return word;
                            return word[0] + '*'.repeat(Math.max(0, word.length - 2)) + (word.length > 1 ? word[word.length - 1] : '');
                        }).join(' ');
                        
                        console.log(`[MergedHandler - Moderation] Original: "${contentToModerate}", Censored: "${censoredContent}"`);

                        // Modify currentRequest.message
                        if (typeof currentRequest.message === 'object' && currentRequest.message !== null && currentRequest.message.type === 'text') {
                            currentRequest.message.text = censoredContent;
                        } else if (typeof currentRequest.message === 'string') {
                            currentRequest.message = censoredContent;
                        } else if (typeof currentRequest.message === 'object' && currentRequest.message !== null) {
                            if ('text' in currentRequest.message) currentRequest.message.text = censoredContent;
                            else if ('content' in currentRequest.message) currentRequest.message.content = censoredContent;
                            else console.warn("[MergedHandler - Moderation] Could not determine how to set censored text on complex object.");
                        }

                        if (typeof currentRequest.message === 'object' && currentRequest.message !== null) {
                            if (!currentRequest.message.meta) currentRequest.message.meta = {};
                            currentRequest.message.meta.moderated = true;
                            currentRequest.message.meta.moderationTime = Date.now();
                            currentRequest.message.meta.profanityScore = result.score;
                            
                            kvstore.incrCounter('moderation_count', 1).catch(e => console.error("KVStore incrCounter error:", e));
                            const moderationEvent = {
                                original: contentToModerate,
                                moderated: censoredContent,
                                channel: currentRequest.channel,
                                timestamp: Date.now(),
                                userId: currentRequest.params?.uuid || 'unknown',
                                profanityData: result
                              };
                            kvstore.setItem(`moderation:${Date.now()}`, moderationEvent, { ttl: 7 * 24 * 60 * 60 })
                                .catch(e => console.error("KVStore setItem error:", e));
                        }
                         console.log("[MergedHandler - Moderation] Message after moderation:", JSON.stringify(currentRequest.message));
                    } else {
                        console.log('[MergedHandler - Moderation] No profanity detected or score too low.');
                    }
                } else {
                    console.error('[MergedHandler - Moderation] Profanity API Error Status:', response.status, response.body);
                }
                resolveModeration(currentRequest);
            }).catch(error => {
                console.error('[MergedHandler - Moderation] Profanity API Fetch Error:', JSON.stringify(error));
                resolveModeration(currentRequest); // Resolve even if moderation API call fails
            });
        });
    }

    // --- Helper Function for Question Duplication ---
    function duplicateQuestionIfApplicable(currentRequest) {
        const messageForDuplication = currentRequest.message;
        let textContentForCheck = '';

        if (typeof messageForDuplication === 'object' && messageForDuplication !== null && messageForDuplication.type === 'text' && typeof messageForDuplication.text === 'string') {
            textContentForCheck = messageForDuplication.text;
        } else if (typeof messageForDuplication === 'string') {
            textContentForCheck = messageForDuplication;
        } else if (typeof messageForDuplication === 'object' && messageForDuplication !== null && typeof messageForDuplication.text === 'string') {
             textContentForCheck = messageForDuplication.text;
        } else {
            console.log('[MergedHandler - Questions] Message for duplication has no readable text. Skipping question check.');
            return Promise.resolve(currentRequest);
        }

        console.log(`[MergedHandler - Questions] Text for question check: "${textContentForCheck}"`);
        const isQuestion = textContentForCheck.trim().endsWith('?');

        if (isQuestion) {
            const questionDestinationChannel = 'game.chat.questions';
            const payloadForQuestionChannel = { text: textContentForCheck }; // Simplified payload

            console.log(`[MergedHandler - Questions] Question detected. Forwarding simplified payload to '${questionDestinationChannel}':`, JSON.stringify(payloadForQuestionChannel));

            return pubnub.publish({
                channel: questionDestinationChannel,
                message: payloadForQuestionChannel
            }).then(publishResult => {
                console.log(`[MergedHandler - Questions] Question forwarded to '${questionDestinationChannel}'. Result:`, JSON.stringify(publishResult));
                return currentRequest;
            }).catch(error => {
                console.error(`[MergedHandler - Questions] Error forwarding question to '${questionDestinationChannel}':`, JSON.stringify(error));
                return currentRequest; // Still resolve with currentRequest if publish fails
            });
        } else {
            console.log('[MergedHandler - Questions] Message is not a question. Skipping duplication.');
            return Promise.resolve(currentRequest);
        }
    }

    // --- Main Logic: Chain Moderation then Question Duplication ---
    return moderateContent(request)
        .then(moderatedRequest => {
            // The message in moderatedRequest.message is now potentially censored
            return duplicateQuestionIfApplicable(moderatedRequest);
        })
        .then(finalRequest => {
            // The message in finalRequest.message is (potentially) moderated, 
            // and (if it was a question) has been duplicated.
            // Now, allow this final version of the message to proceed to its original channel.
            console.log(`[MergedHandler] Processing complete. Allowing final message to '${originalRequestChannel}':`, JSON.stringify(finalRequest.message));
            return finalRequest.ok();
        })
        .catch(unexpectedError => {
            // This catches errors in the promise chaining itself or unhandled rejections
            console.error('[MergedHandler] Unexpected error in processing chain:', JSON.stringify(unexpectedError));
            return request.ok(); // Fallback: allow original message (as it was at the start) to proceed
        });
}; 