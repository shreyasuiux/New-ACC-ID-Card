/**
 * Configuration for background removal library
 * This file pre-configures the library to avoid WASM threading errors
 */

// CRITICAL: Configure ONNX Runtime IMMEDIATELY (runs at module load time)
if (typeof window !== 'undefined') {
  // Set ONNX Runtime environment variables BEFORE library initialization
  (window as any).ort = (window as any).ort || {};
  (window as any).ort.env = (window as any).ort.env || {};
  (window as any).ort.env.wasm = (window as any).ort.env.wasm || {};
  
  // Force single-threaded mode to prevent cross-origin isolation warnings
  (window as any).ort.env.wasm.numThreads = 1;
  (window as any).ort.env.wasm.simd = true; // Keep SIMD for performance
  (window as any).ort.env.wasm.proxy = false; // Disable worker proxy
  
  // Also set generic environment variables
  (window as any).ENV = (window as any).ENV || {};
  (window as any).ENV.WASM_NUM_THREADS = 1;
  
  console.log('✓ ONNX Runtime configured for single-threaded mode');
}

let isConfigured = false;

export async function configureBackgroundRemoval() {
  if (isConfigured) {
    console.log('Background removal already configured, skipping...');
    return;
  }

  try {
    // Set environment variables before importing the library
    if (typeof window !== 'undefined') {
      // Force single-threaded mode by setting environment variables
      (window as any).ENV = (window as any).ENV || {};
      (window as any).ENV.WASM_NUM_THREADS = 1;
    }
    
    // Try to import and configure, but don't fail if Config is not available
    try {
      const bgRemoval = await import('@imgly/background-removal');
      
      // Check if Config exists and has a set method
      if (bgRemoval.Config && typeof bgRemoval.Config.set === 'function') {
        bgRemoval.Config.set({
          device: 'cpu', // Use CPU instead of trying GPU/WebGL
          numThreads: 1, // CRITICAL: Force single thread to avoid cross-origin isolation requirements
          debug: false, // Disable debug mode
          fetchArgs: {
            cache: 'force-cache', // Cache model downloads
          },
          progress: (key: string, current: number, total: number) => {
            // Optional: You can handle progress here
            if (key === 'fetch:model') {
              const progress = (current / total) * 100;
              console.log(`Downloading model: ${progress.toFixed(0)}%`);
            } else if (key === 'compute:inference') {
              const progress = (current / total) * 100;
              console.log(`Background removal progress: ${progress.toFixed(0)}%`);
            }
          },
        });
        console.log('✓ Background removal configured (MEDIUM model, single-threaded mode for professional quality)');
      } else {
        console.log('⚠️ Config.set not available, using default settings');
      }
      
      // Additional fallback: Try to access and configure the preload function
      if (typeof (bgRemoval as any).preload === 'function') {
        try {
          await (bgRemoval as any).preload({
            model: 'medium', // Use medium model for professional quality
            device: 'cpu',
            numThreads: 1,
          });
          console.log('✓ Background removal MEDIUM model preloaded');
        } catch (preloadError) {
          console.log('⚠️ Preload not available, will load on-demand');
        }
      }
    } catch (configError) {
      console.warn('Could not configure background removal, using defaults:', configError);
    }

    isConfigured = true;
  } catch (error) {
    console.error('Failed to configure background removal:', error);
    isConfigured = true; // Mark as configured to avoid repeated attempts
  }
}