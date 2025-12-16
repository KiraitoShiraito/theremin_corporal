/**
 * frontend/js/theremin-controller.js
 * Controlador principal del Theremin Corporal
 * Maneja la comunicación con el backend y la lógica de audio
 */
class ThereminController {
    constructor() {
        this.backendUrl = 'http://127.0.0.1:5000';
        this.isConnected = false;
        this.isThereminRunning = false;
        this.currentStatus = {
            frequency: 440,
            volume: 0,
            left_hand_detected: false,
            right_hand_detected: false,
            wave_type: 'sine'
        };
        this.frameInterval = null;
        this.statusInterval = null;
        
        // Referencias a elementos del DOM
        this.visualizerCanvas = document.getElementById('audioVisualizer');
        this.visualizerCtx = this.visualizerCanvas.getContext('2d');
        
        this.initializeController();
    }

    /**
     * Inicializar el controlador
     */
    initializeController() {
        console.log('🎵 Inicializando Theremin Controller...');
        this.setupEventListeners();
        this.startHealthCheck();
        this.startVisualizer();
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Los event listeners se configurarán desde el UIManager
    }

    /**
     * Verificar conexión con el backend
     */
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.backendUrl}/api/health`);
            const data = await response.json();
            
            this.isConnected = data.status === 'healthy';
            return this.isConnected;
            
        } catch (error) {
            console.error('❌ Error conectando con el backend:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Iniciar verificación periódica de salud
     */
    startHealthCheck() {
        setInterval(async () => {
            const wasConnected = this.isConnected;
            await this.checkBackendHealth();
            
            if (wasConnected !== this.isConnected) {
                this.onConnectionChange(this.isConnected);
            }
        }, 3000);
    }

    /**
     * Manejar cambios en la conexión
     */
    onConnectionChange(connected) {
        if (connected) {
            console.log('✅ Conectado al backend');
            this.startStatusUpdates();
            this.startFrameUpdates();
        } else {
            console.log('❌ Desconectado del backend');
            this.stopStatusUpdates();
            this.stopFrameUpdates();
        }
        
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('thereminConnectionChange', {
            detail: { connected }
        }));
    }

    /**
     * Iniciar actualizaciones de estado
     */
    startStatusUpdates() {
        this.stopStatusUpdates();
        
        this.statusInterval = setInterval(async () => {
            await this.updateStatus();
        }, 50); // Actualizar cada 50ms para tiempo real
    }

    /**
     * Detener actualizaciones de estado
     */
    stopStatusUpdates() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }

    /**
     * Actualizar estado desde el backend
     */
    async updateStatus() {
        try {
            const response = await fetch(`${this.backendUrl}/api/status`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Actualizar estado actual
            this.currentStatus = {
                ...this.currentStatus,
                ...data
            };
            
            console.log('📊 Estado actualizado:', {
                frequency: this.currentStatus.frequency,
                volume: this.currentStatus.volume,
                hands: `${this.currentStatus.left_hand_detected ? 'I' : ''}${this.currentStatus.right_hand_detected ? 'D' : ''}`
            });
            
            // Disparar evento de actualización de estado
            window.dispatchEvent(new CustomEvent('thereminStatusUpdate', {
                detail: this.currentStatus
            }));
            
        } catch (error) {
            console.error('Error actualizando estado:', error);
        }
    }

    /**
     * Iniciar actualizaciones de video
     */
    startFrameUpdates() {
        this.stopFrameUpdates();
        
        this.frameInterval = setInterval(async () => {
            await this.updateFrame();
        }, 1000 / 10); // 10 FPS para no sobrecargar
    }

    /**
     * Detener actualizaciones de video
     */
    stopFrameUpdates() {
        if (this.frameInterval) {
            clearInterval(this.frameInterval);
            this.frameInterval = null;
        }
    }

    /**
     * Actualizar frame de video
     */
    async updateFrame() {
        try {
            const response = await fetch(`${this.backendUrl}/api/frame`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.frame) {
                // Disparar evento con el frame
                window.dispatchEvent(new CustomEvent('thereminFrameUpdate', {
                    detail: { 
                        frame: data.frame,
                        timestamp: data.timestamp 
                    }
                }));
            }
            
        } catch (error) {
            console.error('Error actualizando frame:', error);
        }
    }

    /**
     * Obtener información de depuración
     */
    async getDebugInfo() {
        try {
            const response = await fetch(`${this.backendUrl}/api/debug`);
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo info de depuración:', error);
            return null;
        }
    }

    /**
     * Iniciar el Theremin
     */
    async startTheremin() {
        try {
            const response = await fetch(`${this.backendUrl}/api/start`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.isThereminRunning = true;
                console.log('🎵 Theremin iniciado');
                
                window.dispatchEvent(new CustomEvent('thereminStateChange', {
                    detail: { running: true }
                }));
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Error iniciando theremin:', error);
            return false;
        }
    }

    /**
     * Detener el Theremin
     */
    async stopTheremin() {
        try {
            const response = await fetch(`${this.backendUrl}/api/stop`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.isThereminRunning = false;
                console.log('🛑 Theremin detenido');
                
                window.dispatchEvent(new CustomEvent('thereminStateChange', {
                    detail: { running: false }
                }));
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Error deteniendo theremin:', error);
            return false;
        }
    }

    /**
     * Cambiar tipo de onda
     */
    async setWaveType(waveType) {
        try {
            const response = await fetch(`${this.backendUrl}/api/wave_type`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ wave_type: waveType })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Actualizar estado local
                this.currentStatus.wave_type = waveType;
            }
            
            return data.success;
            
        } catch (error) {
            console.error('Error cambiando tipo de onda:', error);
            return false;
        }
    }

    /**
     * Iniciar visualizador de audio
     */
    startVisualizer() {
        this.visualizeAudio();
    }

    /**
     * Visualizar audio (simulación)
     */
    visualizeAudio() {
        const draw = () => {
            requestAnimationFrame(draw);
            
            const width = this.visualizerCanvas.width;
            const height = this.visualizerCanvas.height;
            
            // Limpiar canvas
            this.visualizerCtx.fillStyle = '#1e293b';
            this.visualizerCtx.fillRect(0, 0, width, height);
            
            if (!this.isThereminRunning || this.currentStatus.volume < 0.01) {
                return;
            }
            
            // Dibujar forma de onda basada en los parámetros actuales
            const frequency = this.currentStatus.frequency || 440;
            const volume = this.currentStatus.volume || 0;
            const waveType = this.currentStatus.wave_type || 'sine';
            
            this.visualizerCtx.beginPath();
            this.visualizerCtx.lineWidth = 2;
            this.visualizerCtx.strokeStyle = this.getWaveColor(waveType);
            
            for (let x = 0; x < width; x++) {
                const normalizedX = x / width;
                let y;
                
                switch (waveType) {
                    case 'sine':
                        y = height / 2 + Math.sin(normalizedX * Math.PI * 2 * (frequency / 100)) * (height / 2 - 10) * volume;
                        break;
                    case 'square':
                        y = height / 2 + (Math.sin(normalizedX * Math.PI * 2 * (frequency / 100)) > 0 ? 1 : -1) * (height / 2 - 10) * volume;
                        break;
                    case 'sawtooth':
                        y = height / 2 + (2 * (normalizedX * (frequency / 50) - Math.floor(0.5 + normalizedX * (frequency / 50)))) * (height / 2 - 10) * volume;
                        break;
                    case 'triangle':
                        y = height / 2 + (2 * Math.abs(2 * (normalizedX * (frequency / 50) - Math.floor(normalizedX * (frequency / 50) + 0.5))) - 1) * (height / 2 - 10) * volume;
                        break;
                    default:
                        y = height / 2;
                }
                
                if (x === 0) {
                    this.visualizerCtx.moveTo(x, y);
                } else {
                    this.visualizerCtx.lineTo(x, y);
                }
            }
            
            this.visualizerCtx.stroke();
        };
        
        draw();
    }

    /**
     * Obtener color según el tipo de onda
     */
    getWaveColor(waveType) {
        const colors = {
            sine: '#6366f1',
            square: '#10b981',
            sawtooth: '#f59e0b',
            triangle: '#ef4444'
        };
        return colors[waveType] || '#6366f1';
    }

    /**
     * Obtener estado actual
     */
    getStatus() {
        return this.currentStatus;
    }

    /**
     * Verificar si está conectado
     */
    isBackendConnected() {
        return this.isConnected;
    }

    /**
     * Verificar si el theremin está ejecutándose
     */
    isThereminActive() {
        return this.isThereminRunning;
    }
}