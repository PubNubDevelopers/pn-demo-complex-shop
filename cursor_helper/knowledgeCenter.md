# Knowledge Center: Live Shopping App Transformation

## 1. Project Goal

Transform an existing "Live Events Showcase" (sports-focused demo) application into a live shopping application. The new use case will feature a host selling products (initially retro Nintendo handhelds) via a live video stream, with interactive elements like a synchronized chat, product information display, and trivia.

## 2. Core Assets & Content Analysis

The primary content for the initial live shopping experience is derived from a pre-recorded video (approx. 32.5 minutes long) showcasing the sale of four retro Nintendo handhelds.

### 2.1. Video Content Source Files:

*   **`rawText.md`**: A full transcript of the host's dialogue in the video. Details what is said about each product, including features, condition, history, and answers to chat questions.
*   **`subtitles.srt`**: Standard SRT subtitle file containing the complete timed dialogue of the host, synchronized with the video. This is the backbone for timing all events in the app.
*   **`questionsfromchat.md`**: A list of questions and comments with timestamps, designed to simulate viewer interaction in the chat, synchronized with the host's dialogue in the video.

### 2.2. Video Flow & Product Segmentation (Derived from `subtitles.srt`):

The video is structured around the presentation of four products:

1.  **Maroon Nintendo Game Boy Color**
    *   Presentation Start: ~`00:00:50,395`
    *   Presentation End: ~`00:05:26,145`
2.  **Red Game Boy Advance SP**
    *   Presentation Start: ~`00:05:28,835`
    *   Presentation End: ~`00:10:43,315`
3.  **White Nintendo DSi (Japanese Version)**
    *   Presentation Start: ~`00:10:53,035`
    *   Presentation End: ~`00:17:59,565` (transitions to 3DS XL)
4.  **Nintendo 3DS XL (Japanese Version - "LL")**
    *   Presentation Start: ~`00:17:59,565`
    *   Presentation concludes with stream wrap-up.

*   Video Introduction/Setup: Starts at `00:00:24,695`
*   Stream Wrap-up/Outro: Starts around `00:31:16,765` and ends around `00:32:53,125`.

### 2.3. Products for Sale (Initial Stream)

Based on `rawText.md` and `subtitles.srt`:

1.  **Maroon Nintendo Game Boy Color:**
    *   **Release:** Japan Oct 21, 1998; NA Nov 1998.
    *   **Condition:** Described as "excellent shape." Light scratch on the screen. Barcode on the back is not in the best shape but replaceable. Battery bay in excellent shape (no corrosion/rust). All stock, including labels. Some yellowing and bumpy feeling on the barcode.
    *   **Specs:** 8-bit Z80 processor, 32KB RAM, 160x144 pixel screen (up to 56 colors).
    *   **Features:** First Nintendo handheld with backward compatibility (with original Game Boy games). Region-free.
    *   **Demoed with:** Pokemon Crystal (game not included).
    *   **Power:** AA batteries (not included by default, but host offers to include some Kirkland brand).
    *   **Accessories:** No charger (uses AA batteries).

2.  **Red Game Boy Advance SP:**
    *   **Release:** Japan Feb 14, 2003; NA March 2003.
    *   **Condition:** "Not in as good of a shape." Lots of scratches, some missing film on the screen. Wear on the siding. Shell and screen not in best shape. Game Boy label on back faded, text missing. Wear and tear in cartridge port, but port itself is in "fantastic shape." Shoulder buttons in great shape. Buttons responsive, don't stick. Internal battery in great shape (not bulging, flat). All stock.
    *   **Specs:** 32-bit ARM7TDMI processor.
    *   **Features:** Backlit screen (adjustable brightness). Foldable design. Internal rechargeable battery. Compatible with Game Boy, Game Boy Color, and Game Boy Advance games. Region-free.
    *   **Demoed with:** Pokemon Ruby (game not included).
    *   **Accessories:** Charger will be included (believed to be same as original DS, but different from DSi/3DS XL).

3.  **White Nintendo DSi (Japanese Version):**
    *   **Release:** Japan Nov 1, 2008; NA April 5, 2009.
    *   **Condition:** "Pretty much pristine condition." Game card slot fine, SD card slot fine (includes an SD card). Internal battery flat (good). Headphone port. Shoulder buttons working. Hinge tight and responsive. Screens "crystal clear." Some minor wear on D-pad/buttons. Host will clean screens.
    *   **Specs:** Dual ARM processors. Dual 256x192 pixel screens.
    *   **Features:** Japanese version. **Region-locked for DSi-specific games** (plays Japanese DSi games). Can play Nintendo DS games from any region. Cannot play GBA games. Dual cameras (front and back - confirmed working but not demoed live on DSi due to SD card access, deferred to 3DS XL). DSi Shop (now defunct). Stylus will be included.
    *   **Demoed with:** Pokemon White - Japanese version (DSi-specific game, not included).
    *   **Accessories:** Charger included (different from GBA SP, same as 3DS XL). SD card included. Stylus included.

4.  **Nintendo 3DS XL (Japanese Version - "LL" in Japan):**
    *   **Release:** Japan & NA July 28, 2012.
    *   **Condition:** Some scratches on the shell (top and back), markings. Host suggests a cover or shell replacement. SD card slot has an SD card. Wireless button working. 3D slider working. Shoulder buttons working. Circle pad, D-pad, and other buttons responsive and not sticky. Touchscreen responsive. Cameras working. Overall, "front is probably in its worst shape" but "not as bad shape of the SP for sure."
    *   **Specs:** Dual-core ARM11 processor, 128MB RAM, more powerful GPU than original 3DS. Larger screens than original 3DS.
    *   **Features:** Japanese version ("LL"). **Region-locked for 3DS games** (plays Japanese 3DS games). 3D display capability (confirmed working). Dual cameras (front and rear - demoed live). eShop (now defunct). Many Japanese 3DS games (like Pokemon Moon) have an English language option. Saves game data to cartridge.
    *   **Demoed with:** Pokemon Moon - Japanese version (game not included, can be played in English).
    *   **Accessories:** Charger included (same as DSi). SD card included. Stylus will be included.

*   **General Sales Points:**
    *   Games used for demonstration are **not** included with the consoles.
    *   Host offers to potentially sell games separately in the future.
    *   Transparency about item condition is a key part of the presentation.
    *   Host mentions having "mini videos" and "screenshots" of console conditions available (likely on a sales platform).
    *   Call to action: "add them to the cart," "quantities are limited (one of each)."
    *   Teases future sales of other consoles (Dreamcast, GameCube).

### 2.4. Simulated Chat Content (`questionsfromchat.md`):

*   Contains 33 timed entries (questions and comments) spanning the video's duration.
*   Questions directly correlate to host's responses in `rawText.md` and `subtitles.srt`.
*   Includes general comments to make chat feel more alive (e.g., about audio, lighting).
*   Provides timestamps for when each chat message should appear.
*   Examples:
    *   `2:16 "Does the volume wheel work?"`
    *   `14:29 "Can I play American DS games on this console?"`
    *   `25:00 "It's a little bright, can you adjust the lighting to see the console better?"`
    *   `30:10 "What's your favorite Pokemon gen?"`

## 3. Key Application Feature Changes Required

### 3.1. Video Playback & Synchronization:
*   Replace the current sports video with the new live shopping video.
*   Use `subtitles.srt` for precise timing of all synchronized events.

### 3.2. Commentary/Subtitles:
*   The existing "Live Commentary" widget will be repurposed to display subtitles.
*   Subtitles will be sourced directly from the text and timings in `subtitles.srt`.

### 3.3. Chat:
*   The chat will be "slower/quieter" but still active.
*   Chat messages will be simulated based on `questionsfromchat.md`.
    *   Messages (questions/comments) will appear at the specified timestamps.
    *   Host's responses are in the video/subtitles.
*   The Chat SDK and presence features from the original app might still be relevant if real user chat is also enabled alongside simulated chat, but initial focus is on simulated interaction.

### 3.4. Stats Section (to become Product Showcase):
*   This section will be completely overhauled to display information about the item currently being featured in the video.
*   **Required Data (per product, to be structured separately, e.g., in JSON):**
    *   Product Name (e.g., "Nintendo Game Boy Color - Maroon")
    *   **Price (CRITICAL - currently missing from provided files)**
    *   High-Quality Product Images (URLs)
    *   Key Specifications (structured list)
    *   Condition Summary
    *   Region Information (Region-Free/Region-Locked details)
    *   Included Accessories
    *   SKU/Product ID (for linking and potential "buy" action)
    *   "Buy Now" or "Add to Cart" button/link.
*   The content of this section will change dynamically based on the video's current time, using timings from `subtitles.srt` to know which product is being discussed.

### 3.5. Polls (to become Trivia):
*   The poll system will be modified to present trivia questions related to the items being sold (e.g., Nintendo history, game facts).
*   **Required Data (per trivia question):**
    *   Trivia Question Text
    *   Multiple Choice Answers
    *   Correct Answer
    *   Timing for when the trivia poll should appear/start.
*   The current "points for correct answer" gamification in polls can be retained or adapted.

### 3.6. Data Controls / Video Controller:
*   The "Simulation" menu in "Data Controls" needs to be modified.
*   Instead of "Kickoff," "Goal," "Injury Time," it will have options to:
    *   Start/Pause/Stop the shopping video.
    *   Jump to segments where specific items are being introduced/sold (e.g., "View Game Boy Color," "View GBA SP," "View DSi," "View 3DS XL"). Timings for these jumps will come from `subtitles.srt`.

### 3.7. Gamification & Illuminate:
*   The existing gamification (points for ad clicks, poll interactions) and Illuminate features (dynamic ads, emoji upgrades based on user actions like tapping angry emoji) need to be re-evaluated for the live shopping context.
*   Possible new uses for Illuminate:
    *   Trigger "flash sale" banners if chat sentiment is high for an item.
    *   Offer discounts based on viewer count or interaction thresholds.
*   For now, the primary focus is on the core shopping experience. Adapting Illuminate can be a secondary phase. The emoji reaction system over the video could potentially be retained if desired.

## 4. Missing Information / Assets Needed:

*   **Product Prices:** Essential for a shopping application.
*   **Structured Product Data File/Source:** A separate file (e.g., JSON, CSV) or database containing detailed, structured information for each product (name, price, images, specs, condition, SKU, etc.).
*   **Product Images/Videos:** Visual assets for each console to be displayed in the product showcase. The host mentions having "mini videos and screenshots."
*   **Trivia Content:** A list of trivia questions, options, and correct answers, along with desired timings.
*   **"Buy Now" / Call-to-Action Mechanics:** Details on how the purchase/add-to-cart functionality will work (e.g., link to an external store page, internal cart system).
*   **User Interface (UI) Design for New Elements:** Mockups or designs for the product showcase, trivia interface, and updated controller.

## 5. Assumptions:

*   The provided video (`.mp4` or similar, corresponding to the SRT/text files) is available.
*   The goal is to first implement the core live shopping experience using the provided Nintendo handhelds video as the primary content.
*   Further user interaction (real live chat beyond simulation, advanced Illuminate features) can be layered on later.

This document summarizes the current understanding and should serve as a good foundation for the development process. 

## 6. Development Log / Conversation Summary (Generated by AI Assistant)

Okay, here's a summary of our conversation so far:

The overall goal is to transform a "Live Events Showcase" (sports-focused demo) application into a live shopping application. The new use case features a host selling retro Nintendo handhelds via a live video stream, with interactive elements.

**Initial Exploration & Setup:**

*   We started by exploring the `cursor_helper` folder, which contains data sources (Markdown files like `botChat.md`, `knowledgeCenter.md`, `subtitles.srt`) and Python scripts (`botchat_to_chat_js.py`, `srt_to_commentary_js.py`) to process this data into JavaScript files (`generated_chat_actions.js`, `generated_commentary.js`) used by the application.
*   `knowledgeCenter.md` was identified as a key document detailing the project, video flow, product information (Game Boy Color, GBA SP, DSi, 3DS XL), required feature changes, and missing assets (like product prices).

**Task 1: Subtitle Processing (`srt_to_commentary_js.py`)**

*   The user noted that `srt_to_commentary_js.py` was incorrect.
*   **Issue 1:** It didn't include a `timeCode` field in the output.
    *   We modified the script to add `timeCode` in "MM:SS" format to each entry in `generated_commentary.js`.
*   **Issue 2:** The generated JS file had literal `\n` characters.
    *   We corrected the Python script's string formatting to ensure proper newlines.
*   **Issue 3:** The structure of `generated_commentary.js` (ES Module export, `message` key for text, `time_code` key) didn't match the expected structure in `backend/game-data/commentary.js` (CommonJS export, `text` key, `timeCode` key).
    *   We modified `srt_to_commentary_js.py` to output CommonJS, use `text` as the key for subtitle content, and `timeCode` (camelCase) as the key for the time code.
*   The script was run successfully after these changes.

**Task 2: Reactions Setup (`reactions.js`)**

*   The goal was to update `backend/game-data/reactions.js` for the new shopping video.
*   We analyzed the existing `reactions.js` structure: an array of timed emoji reactions with `timeSinceVideoStartedInMs`, `channel: "game.stream-reactions"`, `data: { text: emoji, type: "reaction" }`, and `repeat` count.
*   **UI Emoji Investigation:**
    *   We found that `web/app/widget-stream/streamWidget.tsx` defines the base clickable stream emojis: `👏, 😢, 😡, 😮, 🔥, 🎉`.
    *   It also defines an `emojiMap` for Illuminate upgrades: `👏`->`🙌`, `😢`->`😭`, `😡`->`🤬`, `😮`->`🤯`, `🔥`->`😎`, `🎉`->`🥳`.
*   **Emoji Set Update:**
    *   The user requested removing `😢` and adding a new "Gen Z" style emoji.
    *   We decided on `💸` (Money with Wings) as the new base emoji, upgrading to `💎` (Gem Stone).
    *   `streamWidget.tsx` was updated to reflect this new set: `👏, 💸, 😡, 😮, 🔥, 🎉` and their corresponding upgrades in `emojiMap`.
*   **Generating `reactions.js`:**
    *   We created a new Python script: `cursor_helper/generate_reactions_js.py`.
    *   This script defines `REACTION_DEFINITIONS` (a list of tuples with timestamps and lists of (emoji, repeat_count) pairs) based on key moments in the shopping video (product reveals, feature highlights, flaws, call to actions).
    *   It was then enhanced to add a configurable number of *random* emoji reactions throughout the video's duration, ensuring these are sorted by time along with the defined reactions.
    *   The repeat counts for timestamped reactions were tripled, and the number of random reactions was doubled to make the emoji activity more prominent.
    *   The script generates `cursor_helper/generated_reactions.js` in the correct CommonJS format.
*   The script was run successfully.

**Task 3: Updating "Stats" to "Product Showcase"**

*   We tackled updating the "stats" section, reusing the `game.match-stats` channel.
*   **Phase 1: Data Definition and Backend Setup (Completed)**
    *   **Product Data (`products.json`):**
        *   Defined a JSON structure for products including `id`, `name`, `startTimeMs`, `endTimeMs`, `price`, `currency`, `images`, `description`, `specifications`, `conditionSummary`, `includedAccessories`, and `callToAction`.
        *   Created `backend/game-data/products.json` with data for the four Nintendo handhelds, using placeholder prices and image URLs.
    *   **Backend Logic (`backend/index.js`):**
        *   Modified `backend/index.js` to load `products.json` and created `buildProductEvents(products)` to generate "action" objects for product start and end times, publishing them to `game.match-stats`.
        *   Updated `buildMatchScript()` to use these product events.
*   **Phase 2: Frontend UI Implementation (`web/app/widget-matchstats/matchStatsWidget.tsx`) (Completed)**
    *   The `matchStatsWidget.tsx` component was successfully refactored into a "Product Showcase."
    *   It defines a `Product` interface and uses a `featuredProduct` state.
    *   It subscribes to `game.match-stats` via the PubNub SDK.
    *   A `processReceivedMessage` function handles incoming messages, setting `featuredProduct` when a new product message arrives and clearing it when a `PRODUCT_ENDED` message for the current product is received.
    *   On mount, it fetches the last message from the channel to correctly display the initially featured product.
    *   The UI dynamically renders the `featuredProduct`'s details: name, price (formatted), description, the first image, condition, accessories, specifications, and a call-to-action button.
    *   If no product is featured, a "No featured product currently. Stay tuned!" message is shown.

**Task 4: Implement Trivia Feature (Mostly Completed)**

*   The goal was to adapt the existing poll system to present trivia questions with points for correct answers.
*   **Backend Data (`backend/game-data/polls.js`):**
    *   Trivia content (questions, options, correct answers, victory points, timings) was integrated directly into the existing `polls.js` file.
    *   These trivia questions use `pollType: "side"`, distinguishing them from other potential poll types.
    *   Each trivia question event (`game.new-poll`) is followed by a corresponding timed event for its results (`game.poll-results` with `correctOption`).
*   **Backend Logic (`backend/index.js`):**
    *   Loads the trivia data from `polls.js`.
    *   The `buildMatchScript()` function incorporates these timed trivia events into the main event timeline for scheduled publishing.
    *   `handlePollDeclarationMessage`: When a "side" trivia is declared, this function simulates 4-7 votes, publishing them to `game.poll-votes` with random delays to make the trivia feel interactive.
    *   `handleVoteMessage`: Processes real and simulated votes for "side" trivia, aggregates vote counts, and publishes live-updating results (vote distributions) to `game.poll-results`.
*   **Frontend Implementation (`web/app/widget-polls/`):**
    *   `pollsWidget.tsx` (Main Trivia Widget for "side" trivia):
        *   Manages state for `activeTrivia` and `completedTrivia` (for `pollType: "side"`).
        *   Defines a `TriviaQuestion` interface including `victoryPoints` and `correctOptionId`.
        *   Subscribes to `game.new-poll` and `game.poll-results`.
        *   On new "side" trivia declaration, it sets `activeTrivia`.
        *   On "side" trivia results, it updates `activeTrivia` with scores/correct answer and moves it to `completedTrivia`.
        *   Calls `awardPoints()` prop for correct/incorrect answers.
        *   `handleVote` function updates UI for user's choice and publishes vote to `game.poll-votes`.
    *   `liveStreamPoll.tsx` (Handles `pollType: "featuredStreamPoll"`):
        *   This component manages a different type of poll that appears under the video stream.
        *   It uses a `FeaturedPoll` interface which does *not* include `victoryPoints` or `correctOptionId`.
        *   It handles its own lifecycle of declaration, votes, and results display (showing vote distributions but not correctness).
        *   The data for this poll type was not found in the current `backend/game-data/polls.js` (which only has "side" trivia). This might be a remnant of the original app's "match prediction poll" or a separate feature.

**Next Steps / Outstanding Tasks:**

*   **Refine Trivia Feature:**
    *   **Verify Live Vote Display:** Confirm if `pollsWidget.tsx`'s sub-component (`ActiveTriviaDisplay` or similar) correctly displays live-updating vote counts for "side" trivia as they come in from `backend/index.js`'s `handleVoteMessage` (before the final `correctOption` is announced).
    *   **`featuredStreamPoll` Functionality:** Decide if the `liveStreamPoll.tsx` component and its `featuredStreamPoll` type are still needed. If so:
        *   Define data for these polls (e.g., in `polls.js` or a new file).
        *   Ensure `backend/index.js` correctly handles their lifecycle if it differs from "side" polls.
    *   **Create/Curate More Trivia Content:** The current `polls.js` has a few examples; more will be needed.
*   **"Buy Now" / Call-to-Action Mechanics:**
    *   Finalize how the "Buy Now" or "Add to Cart" buttons will function (e.g., external links, internal cart placeholder). The `callToAction.link` in `products.json` currently serves as a placeholder.
*   **Populate Missing Data:**
    *   Add actual **Product Prices** to `backend/game-data/products.json`.
    *   Add real **Product Image URLs** to `backend/game-data/products.json`.
*   **Review and Refine Gamification & Illuminate:**
    *   Assess how existing gamification (points for ad clicks - though ads might be removed/repurposed) and Illuminate features (dynamic ads based on emoji, emoji upgrades) fit the live shopping model. The current points for trivia are a good start.
    *   Consider new Illuminate use cases (e.g., flash sales based on chat activity).
*   **Update Data Controls / Video Controller:**
    *   Modify the "Simulation" menu in "Data Controls" (`web/app/data-controls/dataControls.tsx` or similar) to allow jumping to specific product segments in the video.
*   **Simulated Chat Enhancement:**
    *   Ensure `questionsfromchat.md` is processed and `generated_chat_actions.js` (or similar) is correctly integrated to simulate chat messages synchronized with the video. The current `knowledgeCenter.md` implies this might be based on `botChat.md` and `botchat_to_chat_js.py`, so this needs verification and potentially updating scripts/data for `questionsfromchat.md`.
*   **UI/UX Review:**
    *   Review the overall UI/UX of the transformed application, including the Product Showcase and Trivia feature.

This covers the main points of our conversation and the progress made. 