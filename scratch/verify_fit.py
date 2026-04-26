quote = "in the end its not the years in your life that count its the life in your years"
words = [
    "FALAFEL",
    "YOUTHS",
    "INSERTIONS",
    "AUTHENTICITY",
    "HIDES",
    "NINETEENTH",
    "YOU",
    "TERRITORY"
]

def count_letters(s):
    counts = {}
    for char in s.lower():
        if 'a' <= char <= 'z':
            counts[char] = counts.get(char, 0) + 1
    return counts

quote_counts = count_letters(quote)
words_combined = "".join(words)
words_counts = count_letters(words_combined)

print(f"Quote letters: {sum(quote_counts.values())}")
print(f"Words letters: {sum(words_counts.values())}")

all_chars = sorted(set(list(quote_counts.keys()) + list(words_counts.keys())))
print(f"{'Char':<5} | {'Quote':<6} | {'Words':<6}")
print("-" * 25)
for char in all_chars:
    q = quote_counts.get(char, 0)
    w = words_counts.get(char, 0)
    diff = q - w
    print(f"{char:<5} | {q:<6} | {w:<6} {'!!!' if diff != 0 else ''}")
