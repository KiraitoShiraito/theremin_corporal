/**
 * frontend/js/ui-manager.js
 * Gestor de Interfaz de Usuario
 * Maneja todas las interacciones y actualizaciones de la UI
 */
class UIManager {
    constructor(thereminController) {
        this.controller = thereminController;
        this.videoVisible = true;
        this.frameCount = 0;
        this.lastFpsUpdate = Date.now();
        this.lastStatusUpdate = Date.now();
        
        // Referencias a elementos del DOM
        this.elements = {
            // Botones
            startBtn: document.getElementById('startBtn'),
            startThereminBtn: document.getElementById('startThereminBtn'),
            stopThereminBtn: document.getElementById('stopThereminBtn'),
            toggleVideoBtn: document.getElementById('toggleVideoBtn'),
            
            // Selectores
            waveTypeSelect: document.getElementById('waveTypeSelect'),
            
            // Elementos de estado
            thereminStatus: document.getElementById('thereminStatus'),
            thereminIndicator: document.getElementById('thereminIndicator'),
            handsStatus: document.getElementById('handsStatus'),
            frequencyValue: document.getElementById('frequencyValue'),
            volumeValue: document.getElementById('volumeValue'),
            
            // Contenedores
            videoPlaceholder: document.getElementById('videoPlaceholder'),
            videoCanvas: document.getElementById('videoCanvas'),
            
            // Medidores
            freqMeter: document.getElementById('freqMeter'),
            volMeter: document.getElementById('volMeter'),
            fpsCounter: document.getElementById('fpsCounter')
        };
        
        // Inicializar canvas de video
        this.videoCtx = this.elements.videoCanvas.getContext('2d');
        this.initializeUI();
    }

    /**
     * Inicializar la interfaz de usuario
     */
    initializeUI() {
        console.log('🎨 Inicializando UI Manager...');
        this.setupEventListeners();
        this.setupCustomEvents();
        this.updateUI();
        
        // Verificar estado inicial
        this.checkInitialState();
    }

    /**
     * Verificar estado inicial
     */
    async checkInitialState() {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/health');
            const data = await response.json();
            
            if (data.status === 'healthy') {
                this.onConnectionChange(true);
            }
        } catch (error) {
            console.log('Backend no disponible inicialmente');
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botón de iniciar cámara
        this.elements.startBtn.addEventListener('click', () => {
            this.showVideoFeed();
        });

        // Botón de iniciar theremin
        this.elements.startThereminBtn.addEventListener('click', async () => {
            await this.handleStartTheremin();
        });

        // Botón de detener theremin
        this.elements.stopThereminBtn.addEventListener('click', async () => {
            await this.handleStopTheremin();
        });

        // Botón de toggle video
        this.elements.toggleVideoBtn.addEventListener('click', () => {
            this.toggleVideo();
        });

        // Selector de tipo de onda
        this.elements.waveTypeSelect.addEventListener('change', (e) => {
            this.handleWaveTypeChange(e.target.value);
        });
    }

    /**
     * Configurar eventos personalizados
     */
    setupCustomEvents() {
        // Cambios en la conexión
        window.addEventListener('thereminConnectionChange', (e) => {
            this.onConnectionChange(e.detail.connected);
        });

        // Actualizaciones de estado
        window.addEventListener('thereminStatusUpdate', (e) => {
            this.onStatusUpdate(e.detail);
        });

        // Cambios de estado del theremin
        window.addEventListener('thereminStateChange', (e) => {
            this.onThereminStateChange(e.detail.running);
        });

        // Evento para recibir frames de video
        window.addEventListener('thereminFrameUpdate', (e) => {
            this.onFrameUpdate(e.detail.frame);
        });
    }

    /**
     * Manejar cambio de conexión
     */
    onConnectionChange(connected) {
        console.log('Conexión cambiada:', connected);
        
        if (connected) {
            this.showNotification('✅ Conectado al backend', 'success');
            this.enableControls();
        } else {
            this.showNotification('❌ Desconectado del backend', 'error');
            this.disableControls();
        }
        this.updateUI();
    }

    /**
     * Manejar actualización de estado
     */
    onStatusUpdate(status) {
        const now = Date.now();
        
        // Limitar a 10 actualizaciones por segundo
        if (now - this.lastStatusUpdate < 100) {
            return;
        }
        
        this.lastStatusUpdate = now;
        this.updateStatusDisplay(status);
        this.updateMeters(status);
    }

    /**
     * Manejar actualización de frame
     */
    onFrameUpdate(frameData) {
        if (!this.videoVisible || !frameData) return;
        
        this.drawVideoFrame(frameData);
        this.updateFPS();
    }

    /**
     * Manejar cambio de estado del theremin
     */
    onThereminStateChange(running) {
        console.log('Estado theremin cambiado:', running);
        
        if (running) {
            this.elements.startThereminBtn.disabled = true;
            this.elements.stopThereminBtn.disabled = false;
            this.elements.thereminStatus.textContent = 'Ejecutándose';
            this.elements.thereminIndicator.classList.add('active');
        } else {
            this.elements.startThereminBtn.disabled = false;
            this.elements.stopThereminBtn.disabled = true;
            this.elements.thereminStatus.textContent = 'Detenido';
            this.elements.thereminIndicator.classList.remove('active');
        }
    }

    /**
     * Mostrar feed de video
     */
    showVideoFeed() {
        this.elements.videoPlaceholder.style.display = 'none';
        this.elements.videoCanvas.style.display = 'block';
        this.elements.toggleVideoBtn.disabled = false;
        this.elements.startThereminBtn.disabled = false;
        this.showNotification('📹 Cámara activada', 'success');
        
        // Forzar una actualización de frame
        if (this.controller.isBackendConnected()) {
            this.controller.updateFrame();
        }
    }

    /**
     * Alternar visibilidad del video
     */
    toggleVideo() {
        this.videoVisible = !this.videoVisible;
        
        if (this.videoVisible) {
            this.elements.videoCanvas.style.display = 'block';
            this.elements.toggleVideoBtn.innerHTML = '<span class="btn-icon">👁️</span> Ocultar Video';
            this.showNotification('📹 Video mostrado', 'info');
        } else {
            this.elements.videoCanvas.style.display = 'none';
            this.elements.toggleVideoBtn.innerHTML = '<span class="btn-icon">👁️</span> Mostrar Video';
            this.showNotification('📹 Video ocultado', 'info');
        }
    }

    /**
     * Dibujar frame de video en el canvas
     */
    drawVideoFrame(frameData) {
        try {
            if (!frameData) {
                console.log('No hay datos de frame');
                return;
            }
            
            // Crear una imagen a partir de los datos base64
            const img = new Image();
            img.onload = () => {
                try {
                    // Limpiar canvas
                    this.videoCtx.clearRect(0, 0, 
                        this.elements.videoCanvas.width, 
                        this.elements.videoCanvas.height
                    );
                    
                    // Ajustar tamaño del canvas al tamaño de la imagen
                    this.elements.videoCanvas.width = img.width;
                    this.elements.videoCanvas.height = img.height;
                    
                    // Dibujar la imagen
                    this.videoCtx.drawImage(img, 0, 0);
                    
                    // Contar FPS
                    this.frameCount++;
                    
                } catch (error) {
                    console.error('Error dibujando imagen:', error);
                }
            };
            
            img.onerror = (error) => {
                console.error('Error cargando imagen:', error);
                console.log('Datos de imagen:', frameData.substring(0, 100) + '...');
            };
            
            // Asignar los datos de la imagen
            img.src = `data:image/jpeg;base64,${frameData}`;
            
        } catch (error) {
            console.error('Error en drawVideoFrame:', error);
        }
    }

    /**
     * Manejar inicio del theremin
     */
    async handleStartTheremin() {
        this.showNotification('🎵 Iniciando Theremin...', 'info');
        
        const success = await this.controller.startTheremin();
        
        if (success) {
            this.showNotification('✅ Theremin iniciado correctamente', 'success');
        } else {
            this.showNotification('❌ Error al iniciar Theremin', 'error');
        }
    }

    /**
     * Manejar detención del theremin
     */
    async handleStopTheremin() {
        this.showNotification('🛑 Deteniendo Theremin...', 'info');
        
        const success = await this.controller.stopTheremin();
        
        if (success) {
            this.showNotification('✅ Theremin detenido', 'success');
        } else {
            this.showNotification('❌ Error al detener Theremin', 'error');
        }
    }

    /**
     * Manejar cambio de tipo de onda
     */
    async handleWaveTypeChange(waveType) {
        const success = await this.controller.setWaveType(waveType);
        
        if (success) {
            this.showNotification(`✅ Onda cambiada a ${this.getWaveTypeName(waveType)}`, 'success');
        } else {
            this.showNotification('❌ Error al cambiar tipo de onda', 'error');
            // Revertir selección
            const currentType = this.controller.currentStatus.wave_type || 'sine';
            this.elements.waveTypeSelect.value = currentType;
        }
    }

    /**
     * Obtener nombre legible del tipo de onda
     */
    getWaveTypeName(waveType) {
        const names = {
            sine: 'Sinusoidal',
            square: 'Cuadrada',
            sawtooth: 'Sierra',
            triangle: 'Triangular'
        };
        return names[waveType] || waveType;
    }

    /**
     * Actualizar display de estado
     */
    updateStatusDisplay(status) {
        // Estado de manos
        const leftHand = status.left_hand_detected ? 'I' : '';
        const rightHand = status.right_hand_detected ? 'D' : '';
        const handsText = leftHand || rightHand ? `${leftHand}${rightHand}` : 'Ninguna';
        
        this.elements.handsStatus.textContent = handsText;
        this.elements.handsStatus.style.color = (status.left_hand_detected || status.right_hand_detected) ? '#10b981' : '#ef4444';

        // Frecuencia
        if (status.frequency !== undefined) {
            this.elements.frequencyValue.textContent = `${status.frequency.toFixed(1)} Hz`;
        }

        // Volumen
        if (status.volume !== undefined) {
            const volumePercent = Math.round(status.volume * 100);
            this.elements.volumeValue.textContent = `${volumePercent}%`;
            this.elements.volumeValue.style.color = volumePercent > 0 ? '#10b981' : '#64748b';
        }
        
        // Actualizar selector de tipo de onda si es necesario
        if (status.wave_type && this.elements.waveTypeSelect.value !== status.wave_type) {
            this.elements.waveTypeSelect.value = status.wave_type;
        }
    }

    /**
     * Actualizar medidores visuales
     */
    updateMeters(status) {
        // Medidor de frecuencia
        if (status.frequency !== undefined) {
            const freqRange = [200, 1000];
            const freqPercent = ((status.frequency - freqRange[0]) / (freqRange[1] - freqRange[0])) * 100;
            const clampedPercent = Math.max(0, Math.min(100, freqPercent));
            this.elements.freqMeter.style.width = `${clampedPercent}%`;
        }

        // Medidor de volumen
        if (status.volume !== undefined) {
            const volPercent = status.volume * 100;
            const clampedVolPercent = Math.max(0, Math.min(100, volPercent));
            this.elements.volMeter.style.width = `${clampedVolPercent}%`;
        }
    }

    /**
     * Actualizar contador FPS
     */
    updateFPS() {
        const now = Date.now();
        
        if (now - this.lastFpsUpdate >= 1000) {
            this.elements.fpsCounter.textContent = `${this.frameCount} FPS`;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
    }

    /**
     * Habilitar controles
     */
    enableControls() {
        this.elements.startBtn.disabled = false;
        this.elements.waveTypeSelect.disabled = false;
        this.elements.toggleVideoBtn.disabled = false;
        this.elements.startThereminBtn.disabled = false;
    }

    /**
     * Deshabilitar controles
     */
    disableControls() {
        this.elements.startBtn.disabled = true;
        this.elements.startThereminBtn.disabled = true;
        this.elements.stopThereminBtn.disabled = true;
        this.elements.toggleVideoBtn.disabled = true;
        this.elements.waveTypeSelect.disabled = true;
    }

    /**
     * Mostrar notificación
     */
    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Estilos para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        // Botón de cerrar
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Añadir al documento
        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Obtener color de notificación
     */
    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#6366f1',
            warning: '#f59e0b'
        };
        return colors[type] || colors.info;
    }

    /**
     * Actualizar UI completa
     */
    updateUI() {
        // Esta función puede ser usada para actualizaciones generales de la UI
        const isConnected = this.controller.isBackendConnected();
        
        if (!isConnected) {
            this.elements.thereminStatus.textContent = 'Desconectado';
            this.elements.thereminIndicator.classList.remove('active');
            this.elements.handsStatus.textContent = 'Ninguna';
            this.elements.frequencyValue.textContent = '0 Hz';
            this.elements.volumeValue.textContent = '0%';
        }
    }
}

// Añadir estilos para las animaciones de notificación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);