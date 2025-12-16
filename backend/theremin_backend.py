# backend/theremin_backend.py

import cv2
import mediapipe as mp
import numpy as np
import pyaudio
import threading
import time
import json
from dataclasses import dataclass
from typing import Optional, Tuple, Callable
import logging

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ThereminBackend")

@dataclass
class ThereminConfig:
    """Configuración del Theremin"""
    # Video
    camera_index: int = 0
    frame_width: int = 640
    frame_height: int = 480
    
    # Audio
    sample_rate: int = 44100
    frames_per_buffer: int = 256
    frequency_range: Tuple[float, float] = (200.0, 1000.0)
    volume_range: Tuple[float, float] = (0.0, 1.0)
    
    # Control
    wave_type: str = "sine"  # sine, square, sawtooth, triangle
    smooth_factor: float = 0.1  # Suavizado de parámetros
    left_hand_controls: str = "volume"  # "volume" o "frequency"
    right_hand_controls: str = "frequency"  # "volume" o "frequency"

class AudioEngine:
    """Motor de audio para generación de sonido"""
    
    def __init__(self, config: ThereminConfig):
        self.config = config
        self.audio = pyaudio.PyAudio()
        self.stream = None
        self.is_playing = False
        self.current_phase = 0
        
        # Parámetros actuales
        self.frequency = 440.0
        self.volume = 0.0
        self.wave_type = config.wave_type
        
        self.setup_audio()
    
    def setup_audio(self):
        """Configurar stream de audio"""
        try:
            self.stream = self.audio.open(
                format=pyaudio.paFloat32,
                channels=1,
                rate=self.config.sample_rate,
                output=True,
                frames_per_buffer=self.config.frames_per_buffer,
                stream_callback=self.audio_callback
            )
            logger.info("Audio stream configurado correctamente")
        except Exception as e:
            logger.error(f"Error configurando audio: {e}")
            raise
    
    def audio_callback(self, in_data, frame_count, time_info, status):
        """Callback para generación continua de audio"""
        if status:
            logger.warning(f"Status audio: {status}")
        
        if not self.is_playing or self.volume < 0.01:
            # Silencio cuando no está reproduciendo
            data = np.zeros(frame_count, dtype=np.float32)
        else:
            # Generar onda
            data = self.generate_wave(frame_count)
        
        return (data.tobytes(), pyaudio.paContinue)
    
    def generate_wave(self, num_samples):
        """Generar forma de onda según el tipo seleccionado"""
        t = np.arange(num_samples) / self.config.sample_rate
        t_global = np.arange(num_samples) / self.config.sample_rate + self.current_phase
        
        if self.wave_type == "sine":
            wave = np.sin(2 * np.pi * self.frequency * t_global)
        elif self.wave_type == "square":
            wave = np.sign(np.sin(2 * np.pi * self.frequency * t_global))
        elif self.wave_type == "sawtooth":
            wave = 2 * (t_global * self.frequency - np.floor(0.5 + t_global * self.frequency))
        elif self.wave_type == "triangle":
            wave = 2 * np.abs(2 * (t_global * self.frequency - np.floor(t_global * self.frequency + 0.5))) - 1
        else:
            wave = np.sin(2 * np.pi * self.frequency * t_global)
        
        # Actualizar fase para continuidad
        self.current_phase += num_samples / self.config.sample_rate
        self.current_phase %= 1.0 / self.frequency if self.frequency > 0 else 1.0
        
        # Aplicar volumen y limitar
        wave = wave * self.volume
        wave = np.clip(wave, -0.9, 0.9)  # Prevenir clipping
        
        return wave.astype(np.float32)
    
    def update_parameters(self, frequency: float, volume: float):
        """Actualizar parámetros de audio con suavizado"""
        self.frequency = frequency
        self.volume = volume
    
    def set_wave_type(self, wave_type: str):
        """Cambiar tipo de onda"""
        if wave_type in ["sine", "square", "sawtooth", "triangle"]:
            self.wave_type = wave_type
            logger.info(f"Tipo de onda cambiado a: {wave_type}")
    
    def start(self):
        """Iniciar reproducción de audio"""
        if self.stream and not self.is_playing:
            self.stream.start_stream()
            self.is_playing = True
            logger.info("Audio iniciado")
    
    def stop(self):
        """Detener reproducción de audio"""
        if self.stream and self.is_playing:
            self.stream.stop_stream()
            self.is_playing = False
            logger.info("Audio detenido")
    
    def cleanup(self):
        """Limpiar recursos de audio"""
        self.stop()
        if self.stream:
            self.stream.close()
        self.audio.terminate()
        logger.info("Recursos de audio liberados")

class HandTracker:
    """Seguimiento de manos usando MediaPipe"""
    
    def __init__(self, config: ThereminConfig):
        self.config = config
        self.mp_hands = mp.solutions.hands
        self.mp_draw = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        # Estado de seguimiento
        self.left_hand_pos = None
        self.right_hand_pos = None
        
        # Estilos de dibujo
        self.hand_landmark_style = self.mp_draw.DrawingSpec(
            color=(0, 255, 0), thickness=2, circle_radius=2
        )
        self.hand_connection_style = self.mp_draw.DrawingSpec(
            color=(255, 0, 0), thickness=2
        )
    
    def process_frame(self, frame):
        """Procesar frame y detectar manos"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)
        
        self.left_hand_pos = None
        self.right_hand_pos = None
        
        if results.multi_hand_landmarks:
            for hand_landmarks, handedness in zip(
                results.multi_hand_landmarks, 
                results.multi_handedness
            ):
                hand_label = handedness.classification[0].label
                
                # Usar landmark de muñeca (0) para posición general
                wrist = hand_landmarks.landmark[0]
                x = int(wrist.x * self.config.frame_width)
                y = int(wrist.y * self.config.frame_height)
                
                if hand_label == "Left":
                    self.left_hand_pos = (x, y)
                else:
                    self.right_hand_pos = (x, y)
                
                # Dibujar landmarks (opcional)
                self.mp_draw.draw_landmarks(
                    frame, hand_landmarks, self.mp_hands.HAND_CONNECTIONS,
                    self.hand_landmark_style, self.hand_connection_style
                )
        
        return frame
    
    def get_hand_positions(self):
        """Obtener posiciones actuales de las manos"""
        return self.left_hand_pos, self.right_hand_pos
    
    def cleanup(self):
        """Liberar recursos"""
        self.hands.close()

class CorporalTheremin:
    """Clase principal del Theremin Corporal"""
    
    def __init__(self, config: ThereminConfig = None):
        self.config = config or ThereminConfig()
        self.audio_engine = None
        self.hand_tracker = None
        self.camera = None
        self.is_running = False
        self.processing_thread = None
        
        # Callbacks para UI
        self.on_parameters_changed = None
        self.on_frame_processed = None
        
        self.setup()
    
    def setup(self):
        """Configurar todos los componentes"""
        try:
            # Configurar cámara
            self.camera = cv2.VideoCapture(self.config.camera_index)
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.frame_width)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.frame_height)
            
            # Inicializar componentes
            self.hand_tracker = HandTracker(self.config)
            self.audio_engine = AudioEngine(self.config)
            
            logger.info("Theremin Corporal inicializado correctamente")
            logger.info(f"Configuración de manos: Izquierda={self.config.left_hand_controls}, Derecha={self.config.right_hand_controls}")
            
        except Exception as e:
            logger.error(f"Error en inicialización: {e}")
            self.cleanup()
            raise
    
    def map_hand_to_parameters(self, left_hand, right_hand):
        """Mapear posiciones de manos a parámetros de audio"""
        frequency = 440.0
        volume = 0.0
        
        # MANO IZQUIERDA ahora controla VOLUMEN
        if left_hand and self.config.left_hand_controls == "volume":
            normalized_y = left_hand[1] / self.config.frame_height
            vol_min, vol_max = self.config.volume_range
            volume = vol_max - (vol_max - vol_min) * normalized_y  # Invertir: arriba = más volumen
            volume = max(vol_min, min(vol_max, volume))  # Clamp
        
        # MANO IZQUIERDA controla FRECUENCIA (si está configurado así)
        elif left_hand and self.config.left_hand_controls == "frequency":
            normalized_y = left_hand[1] / self.config.frame_height
            freq_min, freq_max = self.config.frequency_range
            frequency = freq_min + (freq_max - freq_min) * normalized_y
        
        # MANO DERECHA ahora controla FRECUENCIA
        if right_hand and self.config.right_hand_controls == "frequency":
            normalized_y = right_hand[1] / self.config.frame_height
            freq_min, freq_max = self.config.frequency_range
            frequency = freq_min + (freq_max - freq_min) * normalized_y
        
        # MANO DERECHA controla VOLUMEN (si está configurado así)
        elif right_hand and self.config.right_hand_controls == "volume":
            normalized_y = right_hand[1] / self.config.frame_height
            vol_min, vol_max = self.config.volume_range
            volume = vol_max - (vol_max - vol_min) * normalized_y  # Invertir: arriba = más volumen
            volume = max(vol_min, min(vol_max, volume))  # Clamp
        
        # Si ninguna mano está detectada, silenciar
        if not left_hand and not right_hand:
            volume = 0.0
        
        return frequency, volume
    
    def processing_loop(self):
        """Bucle principal de procesamiento"""
        logger.info("Iniciando bucle de procesamiento")
        
        while self.is_running:
            try:
                # Leer frame
                ret, frame = self.camera.read()
                if not ret:
                    logger.warning("No se pudo leer frame de la cámara")
                    continue
                
                # Voltear para efecto espejo
                frame = cv2.flip(frame, 1)
                
                # Procesar detección de manos
                processed_frame = self.hand_tracker.process_frame(frame)
                
                # Obtener posiciones y mapear parámetros
                left_hand, right_hand = self.hand_tracker.get_hand_positions()
                frequency, volume = self.map_hand_to_parameters(left_hand, right_hand)
                
                # Actualizar audio
                self.audio_engine.update_parameters(frequency, volume)
                
                # Llamar callbacks si están definidos
                if self.on_parameters_changed:
                    params = {
                        'frequency': frequency,
                        'volume': volume,
                        'left_hand_detected': left_hand is not None,
                        'right_hand_detected': right_hand is not None,
                        'left_hand_controls': self.config.left_hand_controls,
                        'right_hand_controls': self.config.right_hand_controls
                    }
                    self.on_parameters_changed(params)
                
                if self.on_frame_processed:
                    self.on_frame_processed(processed_frame)
                
                # Pequeña pausa para no saturar
                time.sleep(0.01)
                
            except Exception as e:
                logger.error(f"Error en bucle de procesamiento: {e}")
                break
    
    def start(self):
        """Iniciar el Theremin"""
        if not self.is_running:
            self.is_running = True
            self.audio_engine.start()
            
            # Iniciar hilo de procesamiento
            self.processing_thread = threading.Thread(target=self.processing_loop)
            self.processing_thread.daemon = True
            self.processing_thread.start()
            
            logger.info("Theremin iniciado")
    
    def stop(self):
        """Detener el Theremin"""
        self.is_running = False
        self.audio_engine.stop()
        
        if self.processing_thread and self.processing_thread.is_alive():
            self.processing_thread.join(timeout=2.0)
        
        logger.info("Theremin detenido")
    
    def set_wave_type(self, wave_type: str):
        """Cambiar tipo de onda"""
        self.audio_engine.set_wave_type(wave_type)
    
    def update_config(self, new_config: ThereminConfig):
        """Actualizar configuración"""
        self.config = new_config
        logger.info(f"Configuración actualizada: Izquierda={self.config.left_hand_controls}, Derecha={self.config.right_hand_controls}")
    
    def get_status(self):
        """Obtener estado actual"""
        return {
            'is_running': self.is_running,
            'frequency': self.audio_engine.frequency,
            'volume': self.audio_engine.volume,
            'wave_type': self.audio_engine.wave_type,
            'left_hand_controls': self.config.left_hand_controls,
            'right_hand_controls': self.config.right_hand_controls
        }
    
    def cleanup(self):
        """Liberar todos los recursos"""
        self.stop()
        
        if self.audio_engine:
            self.audio_engine.cleanup()
        
        if self.hand_tracker:
            self.hand_tracker.cleanup()
        
        if self.camera and self.camera.isOpened():
            self.camera.release()
        
        cv2.destroyAllWindows()
        logger.info("Todos los recursos liberados")

# Función de utilidad para crear instancia preconfigurada
def create_theremin():
    """Crear instancia preconfigurada del Theremin"""
    config = ThereminConfig(
        left_hand_controls="volume",    # Mano izquierda controla volumen
        right_hand_controls="frequency"  # Mano derecha controla frecuencia
    )
    return CorporalTheremin(config)

if __name__ == "__main__":
    # Ejemplo de uso directo
    theremin = create_theremin()
    
    try:
        theremin.start()
        print("Theremin ejecutándose. Presiona Ctrl+C para detener.")
        print(f"Configuración: Izquierda controla {theremin.config.left_hand_controls}")
        print(f"Configuración: Derecha controla {theremin.config.right_hand_controls}")
        
        # Mantener el programa corriendo
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nDeteniendo Theremin...")
    finally:
        theremin.cleanup()