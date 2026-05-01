import pulp
from collections import Counter
import random
import re

# --- CONFIGURATION ---
MIN_LEN = 3         # Minimum length of any word
MAX_LEN = 12       # Maximum length of any word
MIN_SHORT = 4       # Force at least this many short words
MIN_LONG = 4        # Force at least this many long words
MAX_SHORT_LEN = 6   # Words <= this are 'short', above are 'long'
PREF_LEN_MIN = 6    # Preferred length range (lower cost)
PREF_LEN_MAX = 8    # Preferred length range (lower cost)

def solve_perfect_acrostic(quote_str, mandatory_word, seed_value=42):
    # Set seed for variation
    random.seed(seed_value)
    
    # 1. PROCESS QUOTE & SUBTRACT MANDATORY WORD
    def clean_text(text):
        return re.sub(r'[^a-z]', '', text.lower())

    quote_clean = clean_text(quote_str)
    mandatory_clean = clean_text(mandatory_word)
    
    target_bank = Counter(quote_clean)
    target_bank.subtract(Counter(mandatory_clean))
    
    # Check if subtraction was valid (no negative counts)
    if any(count < 0 for count in target_bank.values()):
        print(f"Error: Your quote doesn't contain all the letters of '{mandatory_word}'")
        return

    letters = sorted([c for c in target_bank if target_bank[c] > 0])

    # 2. LOAD & FILTER DICTIONARY
    dict_path = r"C:\Users\keizu\GitHub\acrostic-game\scratch\twk.txt"
    dictionary = []
    word_counts_map = {} # PRE-CALCULATE FOR SPEED
    
    print(f"Loading dictionary from {dict_path}...")
    try:
        with open(dict_path, 'r', encoding='utf-8') as f:
            for line in f:
                w = line.strip().lower()
                if MIN_LEN <= len(w) <= MAX_LEN and w.isalpha() and len(set(w)) > 1:
                    counts = Counter(w)
                    # Only add words that fit in the remaining bank
                    if all(counts[c] <= target_bank[c] for c in counts):
                        dictionary.append(w)
                        word_counts_map[w] = counts
                            
        dictionary = list(set(dictionary))
        random.shuffle(dictionary) # Randomize word order
        print(f"Found {len(dictionary)} usable words.")

    except FileNotFoundError:
        print("Error: Dictionary file not found.")
        return

    # 3. DEFINE THE ILP PROBLEM
    prob = pulp.LpProblem("Acrostic_Solver", pulp.LpMinimize)
    
    # Variables: x[word] is how many times we use that word
    word_vars = pulp.LpVariable.dicts("Words", dictionary, lowBound=0, cat='Binary')

    # --- BALANCED OBJECTIVE & CONSTRAINTS ---
    # 1. Define 'long' and 'short' based on config
    long_words = [w for w in dictionary if len(w) > MAX_SHORT_LEN]
    short_words = [w for w in dictionary if len(w) <= MAX_SHORT_LEN]

    # 2. CONSTRAINTS: Ensure we have a mix
    prob += pulp.lpSum([word_vars[w] for w in long_words]) >= MIN_LONG
    prob += pulp.lpSum([word_vars[w] for w in short_words]) >= MIN_SHORT

    # 3. OBJECTIVE: Encourage mid-range words and add variety
    word_weights = {}
    for w in dictionary:
        length = len(w)
        # Preferred range words are 'cheapest' to encourage their use
        if PREF_LEN_MIN <= length <= PREF_LEN_MAX:
            base_cost = 1.0
        else:
            base_cost = 1.2 
        word_weights[w] = base_cost + random.uniform(0, 0.5)

    prob += pulp.lpSum([word_vars[w] * word_weights[w] for w in dictionary])

    # 4. THE CONSTRAINTS (Optimized with pre-calculated counts)
    for char in letters:
        prob += pulp.lpSum([word_vars[w] * word_counts_map[w][char] for w in dictionary]) == target_bank[char]

    # 5. SOLVE
    # 5. SOLVE (Using multi-threading)
    print(f"Solving (Seed: {seed_value}) using multiple CPU cores...")
    status = prob.solve(pulp.PULP_CBC_CMD(msg=0, timeLimit=30))

    if pulp.LpStatus[status] == 'Optimal':
        print("\n" + "="*30)
        print(" SUCCESS! PERFECT FIT FOUND ")
        print("="*30)
        print(f"1. {mandatory_word.upper()} (Mandatory)")
        count = 2
        for w in dictionary:
            if word_vars[w].varValue > 0:
                for _ in range(int(word_vars[w].varValue)):
                    print(f"{count}. {w.upper()}")
                    count += 1
        print("="*30)
    else:
        print("\nInfeasible: No perfect combination found.")

if __name__ == "__main__":
    # --- EDIT THESE THREE LINES ---
    # Note: Punctuation (commas, quotes, etc.) is ignored automatically.
    MY_QUOTE = "In Switzerland, it is illegal to own only one guinea pig. Also, A baby octopus is about as small as a flea when it is born."
    MY_MANDATORY_WORD = "campus"
    MY_SEED = 827  # Change this to get different word lists
    solve_perfect_acrostic(MY_QUOTE, MY_MANDATORY_WORD, seed_value=MY_SEED)
