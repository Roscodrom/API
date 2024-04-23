import unicodedata
import re

def eliminar_signos_puntuacion(palabra):
    # Normalizar la palabra para tratar caracteres con diacríticos
    palabra_normalizada = unicodedata.normalize('NFKD', palabra)
    # Eliminar todos los signos de puntuación y convertir a mayúsculas
    palabra_sin_puntuacion = re.sub(r'[^\w\s]', '', palabra_normalizada).upper()
    return palabra_sin_puntuacion

def procesar_fichero(input_file, output_file):
    # Abrir el archivo de entrada en modo lectura con la codificación 'utf-8'
    with open(input_file, 'r', encoding='utf-8') as file:
        # Leer todas las líneas del archivo
        lines = file.readlines()

    # Lista para almacenar las palabras procesadas
    palabras_procesadas = []

    # Procesar cada línea del archivo
    for line in lines:
        # Eliminar signos de puntuación y convertir a mayúsculas
        palabra_procesada = eliminar_signos_puntuacion(line.strip())
        # Agregar la palabra procesada a la lista
        palabras_procesadas.append(palabra_procesada)

    # Abrir el archivo de salida en modo escritura con la codificación 'utf-8'
    with open(output_file, 'w', encoding='utf-8') as file:
        # Escribir las palabras procesadas en el archivo de salida
        for palabra in palabras_procesadas:
            file.write(palabra + '\n')

# Llamar a la función y proporcionar los nombres de los archivos de entrada y salida
procesar_fichero('fichero_entrada', 'fichero_salida')