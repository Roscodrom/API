dict_letters = {
 'A': 0, 'B': 0, 'C': 0, 'Ç': 0, 'D': 0, 'E': 0, 'F': 0, 'G': 0, 'H': 0, 'I': 0, 'J': 0, 'K': 0, 'L': 0, 'M': 0, 
 'N': 0, 'O': 0, 'P': 0, 'Q': 0, 'R': 0, 'S': 0, 'T': 0, 'U': 0, 'V': 0, 'W': 0, 'X': 0, 'Y': 0, 'Z': 0, '·': 0
}

words_length_average = 0
letters_count = 0
words_count = 0
palabra_mas_larga = ""
count_vocales = 0
count_consonantes = 0

with open('C:\\Users\\Alcaudon\\GitHub\\roscodrom\\API\\data\\dicts\\catala_dict.txt', 'r', encoding='utf-8') as f:
    for word in f:
        if len(word) > len(palabra_mas_larga):
            palabra_mas_larga = word
        words_count += 1
        for letter in word:
            if letter in ['A', 'E', 'I', 'O', 'U']:
                count_vocales += 1
            else:
                if letter == '·':
                    count_consonantes -= 1
                elif letter != 'Y':
                    count_consonantes += 1
            if letter in dict_letters:
                letters_count += 1
                if letter == '·':
                    dict_letters['·'] += 1
                    dict_letters['L'] -= 2
                elif letter == 'Y':
                    dict_letters['Y'] += 1
                    dict_letters['N'] -= 1
                else:
                    dict_letters[letter] += 1

print("Vocales: " + str(count_vocales))
print("Consonantes: " + str(count_consonantes))
print("Media de letras por palabra: " + str(letters_count/words_count))
print("Total de letras: " + str(len(dict_letters)))
print("Palabra mas larga: " + palabra_mas_larga)
print(dict_letters)