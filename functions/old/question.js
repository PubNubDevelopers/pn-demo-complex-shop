// Function Name: duplicateQuestionMessages
// Event Type: Before Publish or Fire (NEEDS RECONFIGURATION IN PUBNUB PORTAL)
// Channel: game.chat

export default (request) => {
    const pubnub = require('pubnub');
    const console = require('console');

    const originalMessage = request.message; 
    // For "Before Publish", the channel is known and is where the message is headed.
    const targetChannel = request.params.channel; // Should be 'game.chat'

    console.log(`Before Publish on channel '${targetChannel}'. Inspecting message: ${JSON.stringify(originalMessage)}`);

    // --- Sanity check for message structure ---
    if (!originalMessage || typeof originalMessage.text !== 'string') {
        console.log("Message does not have a 'text' property of type string. Allowing original message to proceed to '" + targetChannel + "' without further action.");
        return request.ok(); // Allow the original message to proceed
    }

    const isQuestion = originalMessage.text.trim().endsWith('?');

    if (isQuestion) {
        const questionDestinationChannel = 'game.chat.questions';
        
        // We're forwarding the original message object as is to the questions channel.
        // If you wanted to send a modified object, you'd construct it here.
        const payloadForQuestionChannel = originalMessage; 

        console.log(`Message is a question. Attempting to forward to '${questionDestinationChannel}'.`);

        // Asynchronously publish to the questions channel.
        // It's crucial to return request.ok() after this, regardless of success or failure,
        // to ensure the original message flow to 'game.chat' is not blocked indefinitely.
        return pubnub.publish({
            channel: questionDestinationChannel,
            message: payloadForQuestionChannel
        })
        .then(() => {
            console.log(`Question message successfully forwarded to '${questionDestinationChannel}'. Allowing original message to proceed to '${targetChannel}'.`);
            return request.ok(); // Allow the original message to be published to 'game.chat'
        })
        .catch((error) => {
            console.error(`Error forwarding question message to '${questionDestinationChannel}'. Detailed error:`, error);
            console.log(`Despite forwarding error, allowing original message to proceed to '${targetChannel}'.`);
            return request.ok(); // IMPORTANT: Still allow original message to 'game.chat' even if forwarding fails
        });
    } else {
        console.log(`Message is not a question. Allowing message to proceed to '${targetChannel}'.`);
        return request.ok(); // Not a question, just allow it to be published to 'game.chat'
    }
}; 