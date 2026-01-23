#!/usr/bin/env python3

# generate_reactions_js.py
# Description: Generates a JavaScript file with timed and random reactions for the live shopping app.

import os
import random

# --- Configuration for Random Reactions ---
VIDEO_DURATION_MS = 1980000  # Approx 33 minutes
NUM_ADDITIONAL_RANDOM_REACTIONS = 150
BASE_EMOJIS_FOR_RANDOM = ['👏', '💸', '😮', '🔥', '🎉']
MAX_REPEAT_FOR_RANDOM = 2
# --- End Configuration ---

REACTION_DEFINITIONS = [
    # Game Boy Color Reveal (Time: ~00:50,395)
    (50395, [
        ('🎉', 12),
        ('🔥', 9),
        ('💸', 15)
    ]),
    # GBC: "excellent shape" (00:01:10,000 = 70000 ms)
    (70000, [
        ('👏', 9),
        ('😮', 6)
    ]),
    # GBC: "Light scratch on the screen" (00:01:15,000 = 75000 ms)
    (75000, [
        ('😮', 6),
    ]),

    # Game Boy Advance SP Reveal (Time: ~00:05:28,835 = 328835 ms)
    (328835, [
        ('🎉', 9),
        ('��', 6),
        ('💸', 9)
    ]),
    # GBA SP: "Not in as good of a shape. Lots of scratches" (00:05:40,000 = 340000 ms)
    (340000, [
        ('��', 9),
        ('😡', 6)
    ]),
    # GBA SP: "Shoulder buttons in great shape." (e.g. 00:07:30,000 = 450000 ms)
    (450000, [
        ('👏', 6),
        ('🔥', 3)
    ]),

    # White DSi Reveal (Time: ~00:10:53,035 = 653035 ms)
    (653035, [
        ('🎉', 12),
        ('🔥', 9),
        ('💸', 12)
    ]),
    # DSi: "Pretty much pristine condition" (00:11:05,000 = 665000 ms)
    (665000, [
        ('👏', 12),
        ('🔥', 9),
        ('😮', 6)
    ]),
    # DSi: "Region-locked for DSi-specific games" (00:12:30,000 = 750000 ms)
    (750000, [
        ('😮', 9),
        ('😡', 3)
    ]),
    # DSi: "Can play Nintendo DS games from any region" (00:12:45,000 = 765000 ms)
    (765000, [
        ('👏', 6),
        ('🔥', 3)
    ]),

    # Nintendo 3DS XL Reveal (Time: ~00:17:59,565 = 1079565 ms)
    (1079565, [
        ('🎉', 12),
        ('🔥', 9),
        ('💸', 15)
    ]),
    # 3DS XL: "Some scratches on the shell" (00:18:15,000 = 1095000 ms)
    (1095000, [
        ('😮', 6),
        ('😡', 3)
    ]),
    # 3DS XL: "Cameras working" (00:19:30,000 = 1170000 ms)
    (1170000, [
        ('👏', 9),
        ('🔥', 6),
        ('😮', 6)
    ]),
    # 3DS XL: "Many Japanese 3DS games ... have an English language option" (e.g., 00:20:00,000 = 1200000 ms)
    (1200000, [
        ('👏', 9),
        ('🔥', 6),
        ('💸', 6)
    ]),

    # Host mentions future sales of other consoles (Dreamcast, GameCube) (Approx 00:31:00,000 = 1860000 ms)
    (1860000, [
        ('😮', 9),
        ('🔥', 12),
        ('💸', 9)
    ]),

    # Stream Wrap-up/Outro - Call to Action (00:31:16,765 = 1876765 ms)
    (1876765, [
        ('💸', 18),
        ('🔥', 12),
        ('🎉', 9)
    ]),
    # Final burst of thanks/goodbye (e.g. 00:32:30,000 = 1950000 ms)
    (1950000, [
        ('👏', 15),
        ('🎉', 9)
    ]),
]

def generate_random_reaction_data(num_additional, duration_ms, emojis, max_repeat):
    random_reactions_data = []
    for _ in range(num_additional):
        timestamp = random.randint(0, duration_ms)
        emoji = random.choice(emojis)
        repeat_count = random.randint(1, max_repeat)
        reaction_data = {
            "timeSinceVideoStartedInMs": timestamp,
            "persistInHistory": False,
            "action": {
                "channel": "game.stream-reactions",
                "data": { "text": emoji, "type": "reaction" },
            },
            "repeat": repeat_count,
        }
        random_reactions_data.append(reaction_data)
    return random_reactions_data

def generate_js_file(output_js_file_path):
    all_reaction_data_objects = []

    # Process defined reactions
    for timestamp, reactions in REACTION_DEFINITIONS:
        for emoji, repeat_count in reactions:
            reaction_data = {
                "timeSinceVideoStartedInMs": timestamp,
                "persistInHistory": False,
                "action": {
                    "channel": "game.stream-reactions",
                    "data": { "text": emoji, "type": "reaction" },
                },
                "repeat": repeat_count,
            }
            all_reaction_data_objects.append(reaction_data)
    
    # Generate and add random reactions
    random_data = generate_random_reaction_data(
        NUM_ADDITIONAL_RANDOM_REACTIONS,
        VIDEO_DURATION_MS,
        BASE_EMOJIS_FOR_RANDOM,
        MAX_REPEAT_FOR_RANDOM
    )
    all_reaction_data_objects.extend(random_data)

    # Sort all reactions by timestamp
    all_reaction_data_objects.sort(key=lambda x: x["timeSinceVideoStartedInMs"])

    # Format all reaction data objects to strings
    formatted_reaction_strings = []
    for reaction_data in all_reaction_data_objects:
        reaction_object_str = f"""\
  {{
    timeSinceVideoStartedInMs: {reaction_data["timeSinceVideoStartedInMs"]},
    persistInHistory: {str(reaction_data["persistInHistory"]).lower()},
    action: {{
      channel: "{reaction_data['action']['channel']}",
      data: {{ text: `{reaction_data['action']['data']['text']}`, type: "{reaction_data['action']['data']['type']}" }},
    }},
    repeat: {reaction_data["repeat"]},
  }}"""
        formatted_reaction_strings.append(reaction_object_str)

    output_string = "// Generated by generate_reactions_js.py\n"
    output_string += "// Contains timed and random reactions for the live shopping experience.\n\n"
    output_string += "exports.reactions = [\n"
    output_string += ",\n".join(formatted_reaction_strings)
    output_string += "\n];\n"

    try:
        with open(output_js_file_path, 'w', encoding='utf-8') as f:
            f.write(output_string)
        print(f"New reactions JavaScript file created at: {output_js_file_path}")
        print(f"Total reaction event groups (defined): {len(REACTION_DEFINITIONS)}")
        print(f"Total random reaction entries added: {NUM_ADDITIONAL_RANDOM_REACTIONS}")
        print(f"Total individual reaction entries in file: {len(all_reaction_data_objects)}")
    except IOError as e:
        print(f"Error writing JavaScript file: {e}")

if __name__ == '__main__':
    print("Starting reactions JavaScript generation script.")
    
    script_dir = os.path.dirname(__file__) if '__file__' in locals() else os.getcwd()
    output_file = os.path.join(script_dir, 'generated_reactions.js')

    print(f"Output JS file will be: {os.path.abspath(output_file)}")
    
    generate_js_file(output_file)
    
    print("Script finished.") 