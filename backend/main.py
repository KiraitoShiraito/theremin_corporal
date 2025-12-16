# backend/main.py

import sys
import os
import json
import threading
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import base64
import time

# Añadir el directorio actual al path para importar nuestros módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from theremin_backend import CorporalTheremin, ThereminConfig
from config import ThereminConfig as ConfigClass

app = Flask(__name__)
CORS(app)  # Permitir requests desde el frontend

class ThereminAPI:
    """API para controlar el Theremin Corporal"""
    
    def __init__(self):
        self.theremin = None
        self.current_frame = None
        self.frame_lock = threading.Lock()
        self.last_params = {}
        self.setup_theremin()
    
    def setup_theremin(self):
        """Inicializar el Theremin con callbacks"""
        try:
            config = ThereminConfig()
            self.theremin = CorporalTheremin(config)
            
            # Configurar callbacks
            self.theremin.on_parameters_changed = self.on_parameters_changed
            self.theremin.on_frame_processed = self.on_frame_processed
            
            print("✅ Theremin inicializado correctamente")
            
        except Exception as e:
            print(f"❌ Error inicializando Theremin: {e}")
            self.theremin = None
    
    def on_parameters_changed(self, params):
        """Callback cuando cambian los parámetros"""
        # Guardar últimos parámetros para la API
        self.last_params = params
    
    def on_frame_processed(self, frame):
        """Callback cuando se procesa un frame"""
        with self.frame_lock:
            try:
                # Reducir tamaño para mejor performance
                frame_resized = cv2.resize(frame, (320, 240))
                
                # Codificar frame como JPEG para enviar via API
                _, buffer = cv2.imencode('.jpg', frame_resized, [
                    cv2.IMWRITE_JPEG_QUALITY, 70
                ])
                
                # Convertir a base64
                self.current_frame = base64.b64encode(buffer).decode('utf-8')
                
            except Exception as e:
                print(f"Error procesando frame: {e}")
                self.current_frame = None
    
    def start(self):
        """Iniciar Theremin"""
        if self.theremin:
            self.theremin.start()
            return True
        return False
    
    def stop(self):
        """Detener Theremin"""
        if self.theremin:
            self.theremin.stop()
            return True
        return False
    
    def get_status(self):
        """Obtener estado actual"""
        if self.theremin:
            status = self.theremin.get_status()
            # Combinar con últimos parámetros
            status.update(self.last_params)
            return status
        return {'error': 'Theremin no inicializado'}
    
    def update_wave_type(self, wave_type):
        """Actualizar tipo de onda"""
        if self.theremin:
            self.theremin.set_wave_type(wave_type)
            return True
        return False

# Instancia global de la API
theremin_api = ThereminAPI()

# Rutas de la API
@app.route('/api/start', methods=['POST'])
def start_theremin():
    """Iniciar el Theremin"""
    success = theremin_api.start()
    return jsonify({
        'success': success, 
        'message': 'Theremin iniciado' if success else 'Error al iniciar'
    })

@app.route('/api/stop', methods=['POST'])
def stop_theremin():
    """Detener el Theremin"""
    success = theremin_api.stop()
    return jsonify({
        'success': success, 
        'message': 'Theremin detenido' if success else 'Error al detener'
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    """Obtener estado actual"""
    status = theremin_api.get_status()
    return jsonify(status)

@app.route('/api/wave_type', methods=['POST'])
def update_wave_type():
    """Cambiar tipo de onda"""
    data = request.get_json()
    wave_type = data.get('wave_type', 'sine')
    
    if wave_type not in ['sine', 'square', 'sawtooth', 'triangle']:
        return jsonify({
            'success': False, 
            'message': 'Tipo de onda no válido'
        })
    
    success = theremin_api.update_wave_type(wave_type)
    return jsonify({
        'success': success, 
        'message': f'Onda cambiada a {wave_type}'
    })

@app.route('/api/frame', methods=['GET'])
def get_frame():
    """Obtener el frame actual de la cámara"""
    if theremin_api.current_frame:
        return jsonify({
            'success': True,
            'frame': theremin_api.current_frame,
            'timestamp': time.time()
        })
    else:
        return jsonify({
            'success': False,
            'frame': None, 
            'message': 'No hay frame disponible'
        })

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    """Obtener o actualizar configuración"""
    if request.method == 'GET':
        # Devolver configuración actual
        if theremin_api.theremin:
            config_dict = theremin_api.theremin.config.__dict__
            return jsonify(config_dict)
        return jsonify({'error': 'Theremin no disponible'})
    
    else:  # POST
        # Actualizar configuración
        data = request.get_json()
        # Aquí implementarías la actualización de configuración
        return jsonify({
            'success': True, 
            'message': 'Configuración actualizada'
        })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint de salud"""
    return jsonify({
        'status': 'healthy',
        'theremin_initialized': theremin_api.theremin is not None,
        'system': 'Corporal Theremin API',
        'timestamp': time.time()
    })

@app.route('/api/debug', methods=['GET'])
def debug_info():
    """Información de depuración"""
    return jsonify({
        'frame_available': theremin_api.current_frame is not None,
        'frame_length': len(theremin_api.current_frame) if theremin_api.current_frame else 0,
        'last_params': theremin_api.last_params,
        'theremin_running': theremin_api.theremin.is_running if theremin_api.theremin else False
    })

if __name__ == '__main__':
    print("🎵 Starting Corporal Theremin API Server...")
    print("📍 Endpoints disponibles:")
    print("   POST /api/start     - Iniciar theremin")
    print("   POST /api/stop      - Detener theremin") 
    print("   GET  /api/status    - Estado actual")
    print("   POST /api/wave_type - Cambiar tipo de onda")
    print("   GET  /api/frame     - Obtener frame de cámara")
    print("   GET  /api/health    - Salud del sistema")
    print("   GET  /api/debug     - Información de depuración")
    
    try:
        # Ejecutar servidor Flask
        app.run(host='127.0.0.1', port=5000, debug=False, threaded=True)
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo servidor...")
    finally:
        if theremin_api.theremin:
            theremin_api.theremin.cleanup()