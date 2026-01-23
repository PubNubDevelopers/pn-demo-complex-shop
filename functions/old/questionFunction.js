// Function Name: duplicateQuestionMessages
// Event Type: After Publish
// Channel: game.chat

export default (request, response) => {
    const pubnub = require('pubnub');
    const console = require('console');

    // Wrap the entire function logic in a promise that is returned.
    return new Promise((resolveOuterScope) => {
        const originalMessage = request.message;
        // Correctly access the channel name the message was published to
        const sourceChannel = request.params.channelName; 

        console.log(`Function triggered on channel '${sourceChannel}'. Message: ${JSON.stringify(originalMessage)}`);

        // --- Sanity Checks ---
        if (!originalMessage) {
            console.log('No message content found. Exiting.');
            response.send('No message content.');
            resolveOuterScope(); // Resolve the outer promise to signal function completion
            return; // Exit this handler
        }

        if (typeof originalMessage.text !== 'string') {
            console.log("Message does not have a 'text' property of type string. Exiting.");
            response.send('Message format not as expected.');
            resolveOuterScope(); // Resolve the outer promise
            return; // Exit this handler
        }

        // --- Logic to identify a question ---
        const isQuestion = originalMessage.text.trim().endsWith('?');

        if (isQuestion) {
            const questionChannel = 'game.chat.questions'; 

            const publishPayload = {
                channel: questionChannel,
                message: originalMessage 
            };

            pubnub.publish(publishPayload)
                .then(() => {
                    console.log(`Question message successfully forwarded to '${questionChannel}'.`);
                    response.send('Question message forwarded.');
                    resolveOuterScope(); // Resolve the outer promise after successful forwarding
                })
                .catch((error) => {
                    // Log the actual error object for better diagnostics
                    console.error(`Error publishing message to '${questionChannel}':`, error);
                    response.send('Processed. Error during forwarding attempt.');
                    resolveOuterScope(); // Resolve the outer promise even if forwarding failed
                });
        } else {
            console.log('Message is not a question. No action taken.');
            response.send('Message processed. Not a question.');
            resolveOuterScope(); // Resolve the outer promise
        }
    });
};