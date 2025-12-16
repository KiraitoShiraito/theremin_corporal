# backend/config.py

import json
import os
from dataclasses import dataclass, asdict
from typing import Tuple

@dataclass
class ThereminConfig:
    """Configuración del Theremin Corporal"""
    
    # Video
    camera_index: int = 0
    frame_width: int = 640
    frame_height: int = 480
    show_video: bool = True
    
    # Audio
    sample_rate: int = 44100
    frames_per_buffer: int = 256
    frequency_range: Tuple[float, float] = (200.0, 1000.0)
    volume_range: Tuple[float, float] = (0.0, 1.0)
    
    # Control de manos
    left_hand_controls: str = "volume"    # "volume" o "frequency"
    right_hand_controls: str = "frequency" # "volume" o "frequency"
    
    # Control de audio
    wave_type: str = "sine"  # sine, square, sawtooth, triangle
    smooth_factor: float = 0.1
    hand_timeout: float = 2.0  # Segundos sin detección
    
    # UI
    theme: str = "dark"  # dark, light
    
    def save(self, filename: str = "theremin_config.json"):
        """Guardar configuración a archivo"""
        with open(filename, 'w') as f:
            # Convertir tuplas a listas para JSON
            config_dict = asdict(self)
            config_dict['frequency_range'] = list(config_dict['frequency_range'])
            config_dict['volume_range'] = list(config_dict['volume_range'])
            json.dump(config_dict, f, indent=2)
    
    @classmethod
    def load(cls, filename: str = "theremin_config.json"):
        """Cargar configuración desde archivo"""
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                config_dict = json.load(f)
                # Convertir listas a tuplas
                config_dict['frequency_range'] = tuple(config_dict['frequency_range'])
                config_dict['volume_range'] = tuple(config_dict['volume_range'])
                return cls(**config_dict)
        else:
            # Configuración por defecto con manos invertidas
            return cls(
                left_hand_controls="volume",
                right_hand_controls="frequency"
            )