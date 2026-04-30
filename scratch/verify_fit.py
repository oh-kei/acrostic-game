from collections import Counter
import re

def clean_text(text):
    return re.sub(r'[^a-z]', '', text.lower())

quote = "Screeched is the longest word in the English language composed of just one syllable"
words = [
    "COLOURS",
    "DISHES",
    "JAPANESE",
    "METHYL",
    "NEWEST",
    "LENGTHS",
    "CONFIGURABLE",
    "LODGED",
    "TECHNOLOGIES"
]

quote_counts = Counter(clean_text(quote))
words_counts = Counter(clean_text("".join(words)))

print("Quote counts:", sorted(quote_counts.items()))
print("Words counts:", sorted(words_counts.items()))

if quote_counts == words_counts:
    print("\nPERFECT FIT!")
else:
    print("\nMISMATCH!")
    diff = quote_counts - words_counts
    if diff:
        print("Missing in words:", diff)
    diff = words_counts - quote_counts
    if diff:
        print("Extra in words:", diff)
