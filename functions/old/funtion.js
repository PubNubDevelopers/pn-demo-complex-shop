// PubNub Function for Content Moderation using vector.profanity.dev API
// Event Type: Before Publish or Fire
// Channel: game.chat.* 

export default (request) => {
    const pubnub = require('pubnub');
    const kvstore = require('kvstore');
    const xhr = require('xhr'); // PubNub's HTTP module
    
    // Extract message content - handle both text and object types
    let content = '';
    let messageObject = request.message;
    
    // Check if the message is a text message (Chat SDK)
    if (typeof messageObject === 'object' && messageObject.type === 'text') {
      content = messageObject.text || '';
      
      // If no text content is found, check if there's a message object
      if (!content && messageObject.message) {
        content = typeof messageObject.message === 'string' 
          ? messageObject.message 
          : JSON.stringify(messageObject.message);
      }
    } 
    // Check if this is a direct text string
    else if (typeof messageObject === 'string') {
      content = messageObject;
    }
    // For other message formats, try to extract content
    else if (messageObject) {
      // Look for text or content fields
      content = messageObject.text || messageObject.content || '';
      
      // If content is an object, stringify it
      if (typeof content === 'object') {
        content = JSON.stringify(content);
      }
    }
    
    // Guard against non-string content
    if (typeof content !== 'string') {
      content = '';
    }
    
    // Skip moderation for empty content or very short messages
    if (!content || content.length < 2) {
      return request.ok();
    }
    
    // Call the Vector Profanity API
    return new Promise((resolve) => {
      try {
        xhr.fetch('https://vector.profanity.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content })
        }).then(response => {
          if (response.status === 200) {
            const result = JSON.parse(response.body);
            
            // If profanity was detected (isProfanity is true or score is high)
            // You may need to adjust the threshold based on your requirements
            if (result.isProfanity === true || result.score > 0.85) {
              console.log('[Content Moderation] Profanity detected:', result);
              
              // Since the API doesn't return a censored version, we need to create one
              // Simple method: replace letters with asterisks but keep the first and last letter
              const censoredContent = content.split(' ').map(word => {
                if (word.length <= 2) return word;
                return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
              }).join(' ');
              
              // Add moderation metadata
              if (!messageObject.meta) {
                messageObject.meta = {};
              }
              
              messageObject.meta.moderated = true;
              messageObject.meta.moderationTime = Date.now();
              messageObject.meta.profanityScore = result.score;
              
              // Update the message based on its type
              if (typeof messageObject === 'object' && messageObject.type === 'text') {
                messageObject.text = censoredContent;
              } else if (typeof messageObject === 'string') {
                request.message = censoredContent;
              } else {
                // Try to find and update the appropriate content field
                if (messageObject.text) {
                  messageObject.text = censoredContent;
                }
                if (messageObject.content) {
                  messageObject.content = censoredContent;
                }
              }
              
              // Log the moderation for analytics
              kvstore.incrCounter('moderation_count', 1);
              
              // Store moderation event for review
              const moderationEvent = {
                original: content,
                moderated: censoredContent,
                channel: request.channel,
                timestamp: Date.now(),
                userId: request.params && request.params.uuid ? request.params.uuid : 'unknown',
                profanityData: result
              };
              
              // Store event in a time-limited TTL collection
              kvstore.setItem(`moderation:${Date.now()}`, moderationEvent, { ttl: 7 * 24 * 60 * 60 }); // 7 day TTL
            }
            
            resolve(request.ok());
          } else {
            console.error('[Content Moderation] API Error:', response.status, response.body);
            resolve(request.ok()); // Continue without moderation if API fails
          }
        }).catch(error => {
          console.error('[Content Moderation] API Error:', error);
          resolve(request.ok()); // Continue without moderation if API fails
        });
      } catch (error) {
        console.error('[Content Moderation] Error:', error);
        resolve(request.ok()); // Continue without moderation if API fails
      }
    });
  };