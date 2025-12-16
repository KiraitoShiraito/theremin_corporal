/**
 * frontend/js/app.js
 * Aplicación Principal del Theremin Corporal
 * Punto de entrada y coordinación de todos los componentes
 */
/**
 * Aplicación Principal del Theremin Corporal
 * Punto de entrada y coordinación de todos los componentes
 */
class ThereminApp {
    constructor() {
        this.thereminController = null;
        this.uiManager = null;
        this.isInitialized = false;
        
        console.log('🚀 Theremin App: Constructor llamado');
        
        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }

    /**
     * Inicializar la aplicación
     */
    async initializeApp() {
        console.log('🚀 Iniciando Theremin Corporal App...');
        
        try {
            // Mostrar mensaje de bienvenida
            this.showWelcomeMessage();
            
            // Inicializar controlador
            this.thereminController = new ThereminController();
            
            // Inicializar UI Manager
            this.uiManager = new UIManager(this.thereminController);
            
            this.isInitialized = true;
            console.log('✅ Aplicación inicializada correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
            this.showError('Error al inicializar la aplicación: ' + error.message);
        }
    }

    /**
     * Mostrar mensaje de bienvenida
     */
    showWelcomeMessage() {
        console.log(`
            🎵 THEREMIN CORPORAL 🎵
            ======================
            Control musical con visión por computadora
            
            Instrucciones:
            - Mano izquierda: Controla el volumen
            - Mano derecha: Controla la frecuencia (altura)
            - Mueve las manos hacia arriba/abajo para ajustar
            
            Asegúrate de que el backend esté ejecutándose en http://127.0.0.1:5000
        `);
    }

    /**
     * Mostrar error
     */
    showError(message) {
        if (this.uiManager) {
            this.uiManager.showNotification(`❌ ${message}`, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * Obtener instancia del controlador
     */
    getController() {
        return this.thereminController;
    }

    /**
     * Obtener instancia del UI Manager
     */
    getUIManager() {
        return this.uiManager;
    }

    /**
     * Verificar si la aplicación está inicializada
     */
    isAppInitialized() {
        return this.isInitialized;
    }
}

// Inicializar la aplicación
console.log('🎵 Theremin App: Script cargado');
window.thereminApp = new ThereminApp();

// Manejar errores no capturados
window.addEventListener('error', (event) => {
    console.error('Error no capturado:', event.error);
    
    if (window.thereminApp && window.thereminApp.uiManager) {
        window.thereminApp.uiManager.showNotification(
            '❌ Error inesperado en la aplicación',
            'error'
        );
    }
});

// Exportar para uso global (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThereminApp, ThereminController, UIManager };
}