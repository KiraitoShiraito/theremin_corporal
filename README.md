# 🎵 Theremin corporal

**Instrumento musical - Implementación de cognición corporizada y extendida**

[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://www.python.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.8+-green.svg)](https://opencv.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10+-orange.svg)](https://mediapipe.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Descripción

El **theremin corporal** es un instrumento musical digital el cuál detecta el movimiento de las manos y lo convierte en sonido en tiempo real. Este proyecto implementa principios de **cognición corporizada y extendida**, donde la tecnología funciona como una extensión de los procesos cognitivos humanos para la expresión musical.

### 🎯 Características principales:

- **🎭 Control gestual**: Con la mano izquierda se controla el volumen, y con la mano derecha se controla la frecuencia (grave o agudo).
- **🎨 Múltiples formas de onda**: Senoidal, cuadrada, sierra y triangular.

## 🚀 Instalación:

### Prerrequisitos:
- Python 3.7 o superior.
- Webcam funcional.
- Navegador web.

### Pasos de instalación:

1) **Clonar el repositorio**
```bash
git clone https://github.com/KiraitoShiraito/theremin_corporal.git

2) Abrir dos consolas/terminales. En ambas, moverse hasta estar ubicados en la raíz de la carpeta "theremin-corporal". Seguido. en una terminal moverse a "backend" y en la otra moverse a "frontend".

3) Primero, en la de "backend" teclear "py -3.10 main.py" (cambiar el "3.10" por la versión de Python que tengan instalada). Dar enter y esperar unos segundos.

4) Luego, en la del "frontend" teclear "python -m http.server 8000"

5) Abrir una pestaña del navegador, y entrar a "localhost:8000"

## DETALLES:
En esta versión del software aún no se arreglan estos problemas:
- No se puede ver a la persona mientras el software se ejecuta.
- Los parámetros que deberían actualizarse en tiempo real, no se actualizan.

Fuera de eso, el theremin es funcional.