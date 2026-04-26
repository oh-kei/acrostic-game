import pulp
from collections import Counter
import re

def solve_perfect_acrostic():
    # 1. THE TARGET BANK (The 42 letters remaining after 'chunder')
    target_bank = Counter({'a': 9, 't': 6, 's': 5, 'h': 4, 'e': 3, 'm': 2, 'd': 2, 
    'o': 2, 'y': 2, 'i': 1, 'c': 1, 'r': 1, 'n': 1, 'b': 1, 'u': 1, 'w': 1})
    letters = sorted(target_bank.keys())

    # 2. LOAD & FILTER DICTIONARY
    # Note: Make sure you save your new word list as a .txt file
    dict_path = r"C:\Users\keizu\GitHub\acrostic-game\scratch\twk.txt"
    
    dictionary = []
    print(f"Loading and filtering dictionary from {dict_path}...")
    
    try:
        with open(dict_path, 'r', encoding='utf-8') as f:
            for line in f:
                word = line.strip().lower()
                
                # FILTER CRITERIA:
                # - Length between 3 and 10 characters
                # - Must be alphabetic (no numbers or symbols)
                # - Must contain at least 2 unique letters
                if (3 <= len(word) <= 10 and 
                    word.isalpha() and 
                    len(set(word)) > 1):
                    
                    # Only keep the word if its letters actually fit in our bank
                    word_counts = Counter(word)
                    if all(word_counts[char] <= target_bank[char] for char in word_counts):
                        dictionary.append(word)
                            
        dictionary = list(set(dictionary)) # Remove duplicates
        print(f"Filtered down to {len(dictionary)} usable words.")

    except FileNotFoundError:
        print("Error: Could not find the dictionary file at that path.")
        return

    # 3. DEFINE THE ILP PROBLEM
    prob = pulp.LpProblem("Acrostic_Solver", pulp.LpMinimize)
    
    # Variables: x[word] is how many times we use that word
    word_vars = pulp.LpVariable.dicts("Words", dictionary, lowBound=0, cat='Integer')

    # Objective: Minimize the number of words (keeps the puzzle clean)
    prob += pulp.lpSum([word_vars[w] for w in dictionary])

    # 4. THE CONSTRAINTS
    for char in letters:
        prob += pulp.lpSum([word_vars[w] * Counter(w)[char] for w in dictionary]) == target_bank[char]

    # 5. SOLVE
    print("Solving... this may take a few seconds...")
    status = prob.solve(pulp.PULP_CBC_CMD(msg=0))

    if pulp.LpStatus[status] == 'Optimal':
        print("\n" + "="*30)
        print(" SUCCESS! PERFECT FIT FOUND ")
        print("="*30)
        print("1. CHUNDER (Mandatory)")
        count = 2
        for w in dictionary:
            if word_vars[w].varValue > 0:
                for _ in range(int(word_vars[w].varValue)):
                    print(f"{count}. {w.upper()}")
                    count += 1
        print("="*30)
        print("All letters from the quote are exactly accounted for.")
    else:
        print("\nInfeasible: No perfect combination found in this word list.")
        print("Try using a slightly larger list of common words.")

if __name__ == "__main__":
    solve_perfect_acrostic()