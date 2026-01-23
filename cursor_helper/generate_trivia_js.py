import json

# Product Timings (from products.json for reference)
# GBC:     startTimeMs: 50395 (0m 50s),   endTimeMs: 326145 (5m 26s)
# GBA SP:  startTimeMs: 328835 (5m 29s),  endTimeMs: 643315 (10m 43s)
# DSi:     startTimeMs: 653035 (10m 53s), endTimeMs: 1079564 (17m 59s)
# 3DS XL:  startTimeMs: 1079565 (17m 59s),endTimeMs: 1876764 (31m 17s)

# Trivia questions data
# Each item: id, question, [options], correct_option_index (0-based), points, appear_time_ms, reveal_time_ms
TRIVIA_DATA = [
    {
        "id": 101, # GBC Related
        "question": "The Game Boy Color can display over 32,000 colors. True or False?",
        "options": ["True", "False"],
        "correct_option_index": 0, # True
        "points": 5,
        "appear_time_ms": 75000,  # Approx 1m 15s (during GBC)
        "reveal_time_ms": 95000   # Approx 1m 35s
    },
    {
        "id": 203, # GBC Related
        "question": "Which of these is a common issue for aging Game Boy Color consoles?",
        "options": ["Failing Speakers", "Cracked Hinges", "Drifting Analog Sticks", "Overheating Batteries"],
        "correct_option_index": 0, # Failing speakers are common, also screen issues
        "points": 10,
        "appear_time_ms": 180000,   # Approx 3m 00s (towards end of GBC)
        "reveal_time_ms": 200000    # Approx 3m 20s
    },
    {
        "id": 102, # GBA SP Related
        "question": "The 'SP' in Game Boy Advance SP stands for 'Super Portable'. True or False?",
        "options": ["True", "False"],
        "correct_option_index": 1, # False (it's Special Project)
        "points": 5,
        "appear_time_ms": 350000, # Approx 5m 50s (during GBA SP)
        "reveal_time_ms": 370000  # Approx 6m 10s
    },
    {
        "id": 201, # GBA SP Related
        "question": "Which Game Boy Advance SP model featured a brighter, backlit screen?",
        "options": ["AGS-001", "AGS-101"],
        "correct_option_index": 1, # AGS-101
        "points": 10,
        "appear_time_ms": 480000,  # Approx 8m 00s (during GBA SP)
        "reveal_time_ms": 500000   # Approx 8m 20s
    },
    {
        "id": 103, # DSi Related
        "question": "The Nintendo DSi was the first Nintendo handheld with a built-in camera. Yes or No?",
        "options": ["Yes", "No"],
        "correct_option_index": 0, # Yes
        "points": 5,
        "appear_time_ms": 680000, # Approx 11m 20s (during DSi)
        "reveal_time_ms": 700000  # Approx 11m 40s
    },
    {
        "id": 202, # DSi Related
        "question": "What was the primary new feature introduced with the Nintendo DSi over the DS Lite?",
        "options": ["Dual Screens", "SD Card Slot & DSiWare", "3D Display", "Motion Controls"],
        "correct_option_index": 1, # SD Card Slot & DSiWare (also cameras)
        "points": 10,
        "appear_time_ms": 850000,  # Approx 14m 10s (during DSi)
        "reveal_time_ms": 870000   # Approx 14m 30s
    },
    {
        "id": 104, # 3DS XL Related
        "question": "The Nintendo 3DS XL requires special glasses for its 3D effect. Yes or No?",
        "options": ["Yes", "No"],
        "correct_option_index": 1, # No
        "points": 5,
        "appear_time_ms": 1100000, # Approx 18m 20s (during 3DS XL)
        "reveal_time_ms": 1120000  # Approx 18m 40s
    }
]

def generate_trivia_events():
    events = []
    # Sort trivia data by appear_time_ms to ensure chronological order in the output file
    # This is important for how the backend processes events.
    sorted_trivia_data = sorted(TRIVIA_DATA, key=lambda x: x["appear_time_ms"])
    
    for trivia_item in sorted_trivia_data:
        # Create the "new-poll" (new trivia question) event
        new_poll_event = {
            "timeSinceVideoStartedInMs": trivia_item["appear_time_ms"],
            "persistInHistory": False, # Consistent with existing polls.js
            "action": {
                "channel": "game.new-poll", # Using existing channel for now
                "data": {
                    "id": trivia_item["id"],
                    "title": trivia_item["question"],
                    "victoryPoints": trivia_item["points"],
                    "pollType": "side", # Consistent with existing polls.js
                    "options": [
                        {"id": i + 1, "text": option_text}
                        for i, option_text in enumerate(trivia_item["options"])
                    ]
                }
            }
        }
        events.append(new_poll_event)

        # Create the "poll-results" (trivia answer reveal) event - SIMPLIFIED
        poll_results_event = {
            "timeSinceVideoStartedInMs": trivia_item["reveal_time_ms"],
            "persistInHistory": False,
            "action": {
                "channel": "game.poll-results", 
                "data": {
                    "id": trivia_item["id"],
                    "correctOption": trivia_item["correct_option_index"] + 1, # ID of the correct option
                    "pollType": "side" 
                    # No longer sending the full 'options' array with scores for results
                }
            }
        }
        events.append(poll_results_event)
        
    return events

if __name__ == "__main__":
    trivia_events = generate_trivia_events()
    output_js = "exports.polls = " + json.dumps(trivia_events, indent=2) + ";"
    
    file_path = 'cursor_helper/generated_trivia.js'
    try:
        with open(file_path, "w") as f:
            f.write(output_js)
        print(f"Successfully wrote trivia data to {file_path}")
        print(f"Generated {len(trivia_events) // 2} trivia questions.")
    except Exception as e:
        print(f"Error writing to file: {e}")

# To run this script:
# cd cursor_helper
# python generate_trivia_js.py
# Then copy contents of generated_trivia_polls.js to backend/game-data/polls.js
# Or modify to write directly to backend/game-data/polls.js 