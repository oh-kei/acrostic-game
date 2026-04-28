import pulp
from collections import Counter
import random
import re

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
                if 3 <= len(w) <= 10 and w.isalpha() and len(set(w)) > 1:
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

    # OBJECTIVE: Minimize word count + slight random weights to vary results
    word_weights = {w: random.uniform(1.0, 1.1) for w in dictionary}
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
    MY_QUOTE = "tardigrades can withstand the vacuum of outer space, extreme radiation, and boiling temperatures"
    MY_MANDATORY_WORD = "inheritance"
    MY_SEED = 827  # Change this to get different word lists
    solve_perfect_acrostic(MY_QUOTE, MY_MANDATORY_WORD, seed_value=MY_SEED)
