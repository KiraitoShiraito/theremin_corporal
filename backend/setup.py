# backend/setup.py

#!/usr/bin/env python3
"""
Script de instalación para el Theremin Corporal - Versión Windows
"""

import subprocess
import sys
import os
import platform

def install_requirements():
    """Instalar dependencias del proyecto con --user"""
    print("Instalando dependencias...")
    
    # Usar --user para evitar problemas de permisos
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "-r", "requirements.txt"])
        print("Dependencias instaladas correctamente")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error instalando dependencias: {e}")
        return False

def check_dependencies():
    """Verificar que todas las dependencias estén instaladas"""
    print("Verificando dependencias...")
    
    dependencies = [
        ('cv2', 'opencv-python'),
        ('mediapipe', 'mediapipe'),
        ('numpy', 'numpy'),
        ('pyaudio', 'pyaudio'),
        ('flask', 'Flask'),
        ('flask_cors', 'flask-cors'),
        ('PIL', 'Pillow')
    ]
    
    all_ok = True
    for import_name, package_name in dependencies:
        try:
            __import__(import_name)
            print(f"  ✅ {package_name}")
        except ImportError as e:
            print(f"  ❌ {package_name} - Faltante: {e}")
            all_ok = False
    
    return all_ok

def main():
    print("Configuración del Theremin Corporal")
    print("=" * 50)
    
    # Instalar dependencias con --user
    if install_requirements():
        print("\nDependencias instaladas!")
    else:
        print("\nHubo problemas con la instalación automática")
        print("Intentemos instalar manualmente...")
    
    # Verificar instalación
    print("\n" + "=" * 50)
    dependencies_ok = check_dependencies()
    
    if dependencies_ok:
        print("\n¡Configuración completada exitosamente!")
        print("\nPara ejecutar el backend:")
        print("  python main.py")
    else:
        print("\nAlgunas dependencias faltan.")
        print("\nSOLUCIÓN MANUAL - Ejecuta estos comandos:")
        print("pip install --user opencv-python mediapipe numpy pyaudio Flask Flask-CORS Pillow")

if __name__ == "__main__":
    main()