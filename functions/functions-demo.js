// Default skeleton for the REST endpoint function
export default (request, response) => {
    const pubnub = require('pubnub');
    const kvstore = require('kvstore');
    const xhr = require('xhr');
    let headersObject = request.headers;
    let paramsObject = request.params;
    let methodString = request.method;
    let bodyString = request.body;
    console.log('request',request); // Log the request envelope passed
    // Query parameters passed are parsed into the request.params object for you.
    // console.log(paramsObject.a) // This would print "5" for query string "a=5"
    // Set the status code - by default it would return 200
    response.status = 200;
    // Set the headers the way you like
    response.headers['X-Custom-Header'] = 'CustomHeaderValue';
    return request.json().then((body) => {
       const functionsUseCases = "PubNub Functions allows you to add code into PubNub to route, filter, aggregate, and augment messages.  Example use cases for live events include:\n\n* Use AI to process messages\n* Translate messages in real-time into multiple languages\n* Moderate messages for profanity or undesired behavior\n* Re-route important messages and signals for immediate action\n* Determine user sentiment in real-time and track sentiment as the event progresses\n\nAll PubNub Functions scale automatically and are proven to handle any size event."
       return response.send(functionsUseCases);
    }).catch((err) => {
        // console.log(err);
        return response.send("Malformed JSON body.");
    });
};
