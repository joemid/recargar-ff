// server.js - RECARGAR-FF v4 - Optimizado + Seguro
const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ========== CONFIG ==========
const CONFIG = {
    PORT: process.env.PORT || 3001,
    TIMEOUT: 45000,
    MAX_REINTENTOS: 2,
    DELAY_RAPIDO: 150,
    DELAY_MEDIO: 300,
    DELAY_LARGO: 500,
    // MODO TEST: true = no canjea de verdad, false = producción
    // Para producción: MODO_TEST=false o MODO_TEST=0
    MODO_TEST: (() => {
        const val = (process.env.MODO_TEST || '').toString().toLowerCase().trim();
        return val !== 'false' && val !== '0';
    })()
};

const SUPABASE_URL = 'https://jodltxvsernvdevqkswp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGx0eHZzZXJudmRldnFrc3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDA5MjAsImV4cCI6MjA4MTkxNjkyMH0.hG0VSDrdU2QAHVoUdJoDuCmCMyLb0lU5Oepfi7MJ_bA';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let browser = null;
let cola = [];
let procesando = false;

// ========== LOGS ==========
function log(emoji, mensaje, datos = null) {
    const tiempo = new Date().toLocaleTimeString('es-VE');
    const texto = `[${tiempo}] ${emoji} ${mensaje}`;
    if (datos) {
        console.log(texto, datos);
    } else {
        console.log(texto);
    }
}

// ========== SUPABASE ==========
async function supabaseQuery(table, query = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    return res.json();
}

async function supabaseUpdate(table, data, query) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify(data)
    });
}

async function supabaseInsert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=representation' },
        body: JSON.stringify(data)
    });
    return res.json();
}

// ========== INICIAR NAVEGADOR ==========
async function initBrowser() {
    if (browser) return;
    
    log('🚀', 'Iniciando navegador...');
    const isRailway = !!process.env.RAILWAY_ENVIRONMENT;
    
    browser = await puppeteer.launch({
        headless: isRailway ? 'new' : false,
        executablePath: isRailway ? '/usr/bin/google-chrome-stable' : undefined,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-animations',
            '--disable-extensions'
        ]
    });
    
    log('✅', 'Navegador listo');
}

// ========== CANJE OPTIMIZADO ==========
async function ejecutarRecarga(idJugador, pinRecarga, nicknameEsperado = null, hacerCanje = true) {
    let page = null;
    const start = Date.now();
    
    try {
        log('🎮', '═'.repeat(45));
        log('🎮', hacerCanje ? 'INICIANDO RECARGA' : 'TEST (SIN CANJEAR)');
        log('📋', `ID: ${idJugador} | PIN: ${pinRecarga.substring(0, 8)}...`);
        if (nicknameEsperado) log('👤', `Nickname esperado: ${nicknameEsperado}`);
        
        // 1. Abrir página
        log('1️⃣', 'Abriendo página...');
        page = await browser.newPage();
        await page.setViewport({ width: 1100, height: 900 });
        
        // Optimización: bloquear solo imágenes y fonts (NO CSS)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const tipo = req.resourceType();
            if (tipo === 'image' || tipo === 'font' || tipo === 'media') {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        // 2. Cargar página
        log('2️⃣', 'Cargando redeem.hype.games...');
        await page.goto('https://redeem.hype.games', { waitUntil: 'domcontentloaded', timeout: CONFIG.TIMEOUT });
        await sleep(1000);
        
        // 3. Ingresar PIN
        log('3️⃣', 'Ingresando PIN de recarga...');
        await page.waitForSelector('#pininput', { timeout: 8000 });
        await page.type('#pininput', pinRecarga, { delay: 15 });
        await sleep(CONFIG.DELAY_RAPIDO);
        
        // 4. Validar PIN
        log('4️⃣', 'Validando PIN...');
        await page.click('#btn-validate');
        
        // 5. Esperar formulario
        log('5️⃣', 'Esperando formulario...');
        await sleep(1500);
        await page.waitForSelector('#GameAccountId', { visible: true, timeout: 15000 });
        await sleep(500);
        
        // 6. Llenar datos
        log('6️⃣', 'Llenando datos...');
        
        // Nombre
        await page.waitForSelector('#Name', { visible: true, timeout: 5000 });
        await page.click('#Name');
        await page.type('#Name', 'Cliente Web', { delay: 10 });
        
        // Fecha nacimiento
        await page.click('#BornAt');
        await page.type('#BornAt', '15/03/1995', { delay: 10 });
        
        // País
        await page.select('#NationalityAlphaCode', 'VE');
        await sleep(CONFIG.DELAY_MEDIO);
        
        // CHECKBOX - Importante!
        log('☑️', 'Marcando checkbox...');
        const checkbox = await page.$('#privacy');
        if (checkbox) {
            const isChecked = await page.evaluate(el => el.checked, checkbox);
            if (!isChecked) {
                await checkbox.click();
                await sleep(CONFIG.DELAY_RAPIDO);
            }
        }
        
        // Verificar que el checkbox está marcado
        const checkboxMarcado = await page.evaluate(() => document.querySelector('#privacy')?.checked);
        if (!checkboxMarcado) {
            await page.evaluate(() => {
                const cb = document.querySelector('#privacy');
                if (cb) cb.checked = true;
            });
            await sleep(CONFIG.DELAY_RAPIDO);
        }
        
        log('✅', 'Formulario completo');
        
        // 7. Ingresar ID
        log('7️⃣', 'Ingresando ID jugador...');
        await page.click('#GameAccountId');
        await page.type('#GameAccountId', idJugador, { delay: 20 });
        await sleep(CONFIG.DELAY_MEDIO);
        
        // 8. Verificar jugador
        log('8️⃣', 'Verificando jugador...');
        await page.click('#btn-verify');
        
        let nickname = null;
        for (let i = 0; i < 50; i++) {
            await sleep(200);
            nickname = await page.evaluate(() => {
                // Buscar el botón con el nombre del jugador
                const el = document.querySelector('#btn-player-game-data');
                if (el && el.offsetParent !== null) {
                    const t = el.textContent.trim();
                    if (t.length >= 3 && t.length <= 30 && !t.includes('Verify')) return t;
                }
                // También buscar en otros posibles elementos
                const altEl = document.querySelector('.player-name, .game-account-name, [data-player-name]');
                if (altEl) return altEl.textContent.trim();
                return null;
            });
            if (nickname) break;
            
            // Verificar si hay error
            const hayError = await page.evaluate(() => {
                const err = document.querySelector('.error, .alert-danger, [class*="error"]');
                return err ? err.textContent : null;
            });
            if (hayError) {
                log('❌', `Error en página: ${hayError}`);
                break;
            }
        }
        
        if (!nickname) {
            // Tomar screenshot para debug
            log('📸', 'Tomando captura de debug...');
            throw new Error('Jugador no encontrado - verificar formulario');
        }
        
        log('✅', `Jugador verificado: ${nickname}`);
        
        // 9. VERIFICAR NICKNAME SI SE PROPORCIONÓ
        if (nicknameEsperado && nicknameEsperado.trim() !== '') {
            const nickLower = nickname.toLowerCase().trim();
            const esperadoLower = nicknameEsperado.toLowerCase().trim();
            
            if (nickLower !== esperadoLower) {
                log('❌', `NICKNAME NO COINCIDE!`);
                log('❌', `Esperado: "${nicknameEsperado}" | Recibido: "${nickname}"`);
                throw new Error(`Nickname no coincide: esperado "${nicknameEsperado}", recibido "${nickname}"`);
            }
            log('✅', 'Nickname verificado correctamente');
        }
        
        // 10. Canjear o parar
        if (hacerCanje) {
            log('9️⃣', 'Canjeando...');
            await page.click('#btn-redeem');
            await sleep(2500);
            
            // Verificar resultado
            const resultado = await page.evaluate(() => {
                const body = document.body.innerText.toLowerCase();
                if (body.includes('success') || body.includes('exitoso') || body.includes('completado') || body.includes('canjeado')) {
                    return { ok: true };
                }
                const error = document.querySelector('.error, .alert-danger, [class*="error"]');
                if (error) return { ok: false, msg: error.textContent.trim() };
                return { ok: true };
            });
            
            const elapsed = Date.now() - start;
            await page.close();
            
            if (resultado.ok) {
                log('🎉', `RECARGA EXITOSA (${elapsed}ms)`);
                log('🎮', '═'.repeat(45));
                return { success: true, nickname, time_ms: elapsed };
            } else {
                throw new Error(resultado.msg || 'Error en el canje');
            }
        } else {
            log('⏸️', 'DETENIDO - Modo test (no se canjeó)');
            const elapsed = Date.now() - start;
            await sleep(1000);
            await page.close();
            
            log('✅', `TEST EXITOSO (${elapsed}ms)`);
            log('🎮', '═'.repeat(45));
            return { success: true, nickname, time_ms: elapsed, test_mode: true };
        }
        
    } catch (e) {
        log('❌', `ERROR: ${e.message}`);
        log('🎮', '═'.repeat(45));
        if (page) await page.close().catch(() => {});
        return { success: false, error: e.message };
    }
}

// ========== COLA DE ESPERA ==========
async function procesarCola() {
    if (procesando || cola.length === 0) return;
    
    procesando = true;
    const { datos, resolve, intentos } = cola.shift();
    
    log('📥', `Procesando solicitud (${cola.length} en espera)`);
    
    try {
        const resultado = await ejecutarRecargaConReintentos(datos, intentos);
        resolve(resultado);
    } catch (e) {
        resolve({ success: false, error: e.message });
    }
    
    procesando = false;
    
    // Procesar siguiente en cola
    if (cola.length > 0) {
        setTimeout(procesarCola, 500);
    }
}

async function ejecutarRecargaConReintentos(datos, maxIntentos = CONFIG.MAX_REINTENTOS) {
    const { id_juego, pinData, producto, nicknameEsperado, transaccion_id, telefono } = datos;
    
    // Si está en MODO_TEST, no canjear de verdad
    const hacerCanjeReal = !CONFIG.MODO_TEST;
    
    for (let intento = 1; intento <= maxIntentos; intento++) {
        log('🔄', `Intento ${intento}/${maxIntentos}${CONFIG.MODO_TEST ? ' (MODO TEST)' : ''}`);
        
        const resultado = await ejecutarRecarga(id_juego, pinData.pin, nicknameEsperado, hacerCanjeReal);
        
        if (resultado.success) {
            if (CONFIG.MODO_TEST) {
                // En modo test, liberar el PIN y NO registrar venta
                await supabaseUpdate('pins_web', { estado: 'libre' }, `?id=eq.${pinData.id}`);
                
                log('🧪', 'MODO TEST - PIN liberado, venta NO registrada');
                return {
                    success: true,
                    test_mode: true,
                    nickname: resultado.nickname,
                    time_ms: resultado.time_ms,
                    pin: pinData.pin,
                    producto: producto.nombre || 'Free Fire',
                    mensaje: '🧪 TEST EXITOSO - PIN no canjeado'
                };
            }
            
            // Modo producción - Registrar venta
            log('💾', 'Registrando venta...');
            const venta = await supabaseInsert('ventas', {
                id_juego,
                producto_id: producto.id,
                juego: producto.nombre || 'Free Fire',
                cantidad: producto.cantidad || 0,
                costo_usd: producto.costo_usd || 0,
                precio_usd: producto.precio_usd || 0,
                operador_nombre: 'Web',
                telefono_cliente: telefono || null,
                pin_usado: pinData.pin
            });
            
            // Marcar PIN usado
            await supabaseUpdate('pins_web', 
                { estado: 'usado', usado_en: new Date().toISOString(), venta_id: venta[0]?.id }, 
                `?id=eq.${pinData.id}`);
            
            // Marcar transacción procesada
            if (transaccion_id) {
                await supabaseUpdate('transacciones_web', 
                    { procesada: true, venta_id: venta[0]?.id }, 
                    `?id=eq.${transaccion_id}`);
            }
            
            log('🎉', 'RECARGA COMPLETADA');
            return {
                success: true,
                nickname: resultado.nickname,
                venta_id: venta[0]?.id,
                time_ms: resultado.time_ms,
                pin: pinData.pin,
                producto: producto.nombre || 'Free Fire',
                intentos: intento
            };
        }
        
        // Si falló y hay más intentos
        if (intento < maxIntentos) {
            log('⚠️', `Falló intento ${intento}, reintentando en 2s...`);
            await sleep(2000);
        }
    }
    
    // Todos los intentos fallaron
    log('❌', 'Todos los intentos fallaron');
    await supabaseUpdate('pins_web', 
        { estado: 'error', error_mensaje: 'Falló después de reintentos' }, 
        `?id=eq.${pinData.id}`);
    
    return { success: false, error: 'Falló después de múltiples intentos' };
}

function agregarACola(datos) {
    return new Promise((resolve) => {
        cola.push({ datos, resolve, intentos: CONFIG.MAX_REINTENTOS });
        log('📋', `Agregado a cola (posición ${cola.length})`);
        procesarCola();
    });
}

// ========== ENDPOINTS ==========

// Estado
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        en_cola: cola.length,
        procesando
    });
});

// Stock
app.get('/stock', async (req, res) => {
    try {
        const stock = await supabaseQuery('stock_pins_web', '?select=*');
        res.json({ success: true, data: stock });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// Buscar PIN
app.get('/buscar-pin/:producto_id', async (req, res) => {
    const { producto_id } = req.params;
    try {
        const pins = await supabaseQuery('pins_web', 
            `?producto_id=eq.${producto_id}&estado=eq.libre&select=id,pin,monto_usd&limit=1`);
        
        if (!pins.length) {
            return res.json({ success: false, error: 'No hay PINs disponibles' });
        }
        
        res.json({ success: true, pin_id: pins[0].id, pin: pins[0].pin, monto_usd: pins[0].monto_usd });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// TEST FLUJO (sin canjear)
app.post('/test-flujo', async (req, res) => {
    const { id_juego, producto_id, nickname } = req.body;
    
    if (!id_juego || !producto_id) {
        return res.json({ success: false, error: 'Faltan datos' });
    }
    
    log('🧪', 'TEST FLUJO SOLICITADO');
    
    try {
        // Buscar PIN
        const pins = await supabaseQuery('pins_web', 
            `?producto_id=eq.${producto_id}&estado=eq.libre&select=id,pin,monto_usd&limit=1`);
        
        if (!pins.length) {
            return res.json({ success: false, error: 'No hay PINs disponibles' });
        }
        
        // Ejecutar sin canjear
        const resultado = await ejecutarRecarga(id_juego, pins[0].pin, nickname, false);
        
        res.json({
            ...resultado,
            test_mode: true,
            mensaje: resultado.success ? 'Test exitoso - PIN NO canjeado' : 'Test falló'
        });
        
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// RECARGA AUTOMÁTICA (con cola y reintentos)
app.post('/recarga', async (req, res) => {
    const { id_juego, producto_id, transaccion_id, telefono, nickname } = req.body;
    
    if (!id_juego || !producto_id) {
        return res.json({ success: false, error: 'Faltan datos (id_juego, producto_id)' });
    }
    
    log('🎯', `RECARGA SOLICITADA: ID=${id_juego} Prod=${producto_id}`);
    
    try {
        // 1. Buscar PIN
        log('📦', 'Buscando PIN...');
        const pins = await supabaseQuery('pins_web', 
            `?producto_id=eq.${producto_id}&estado=eq.libre&select=id,pin,monto_usd&limit=1`);
        
        if (!pins.length) {
            return res.json({ success: false, error: 'No hay PINs disponibles para este producto' });
        }
        
        const pinData = pins[0];
        log('✅', `PIN encontrado: ${pinData.pin.substring(0, 8)}...`);
        
        // 2. Reservar PIN
        await supabaseUpdate('pins_web', { estado: 'procesando' }, `?id=eq.${pinData.id}`);
        
        // 3. Obtener producto
        const productos = await supabaseQuery('productos', `?id=eq.${producto_id}&select=*`);
        const producto = productos[0] || { id: producto_id, nombre: 'Free Fire', cantidad: 0 };
        
        // 4. Agregar a cola
        const resultado = await agregarACola({
            id_juego,
            pinData,
            producto,
            nicknameEsperado: nickname,
            transaccion_id,
            telefono
        });
        
        res.json(resultado);
        
    } catch (e) {
        log('❌', `Error: ${e.message}`);
        res.json({ success: false, error: e.message });
    }
});

// ========== INICIO ==========
async function start() {
    console.log('\n');
    log('🎮', '═'.repeat(45));
    log('🎮', 'RECARGAR-FF v4 - Optimizado + Seguro');
    log('🎮', '═'.repeat(45));
    log('📍', `Entorno: ${process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local'}`);
    log('📍', `Puerto: ${CONFIG.PORT}`);
    log('📍', `Max reintentos: ${CONFIG.MAX_REINTENTOS}`);
    
    if (CONFIG.MODO_TEST) {
        log('🧪', '═'.repeat(45));
        log('🧪', '⚠️  MODO TEST ACTIVADO');
        log('🧪', '   Los PINs NO se canjean de verdad');
        log('🧪', '   Para producción: MODO_TEST=false');
        log('🧪', '═'.repeat(45));
    } else {
        log('🚨', '═'.repeat(45));
        log('🚨', '⚠️  MODO PRODUCCIÓN');
        log('🚨', '   Los PINs SÍ se canjean de verdad');
        log('🚨', '═'.repeat(45));
    }
    
    await initBrowser();
    
    app.listen(CONFIG.PORT, '0.0.0.0', () => {
        console.log('');
        log('⚡', `Servidor listo en puerto ${CONFIG.PORT}`);
        console.log('');
        log('📋', 'Endpoints:');
        console.log('      GET  /stock              - Ver PINs disponibles');
        console.log('      GET  /buscar-pin/:id     - Buscar PIN por producto');
        console.log('      POST /test-flujo         - 🧪 Probar sin canjear');
        console.log('      POST /recarga            - 🎮 Recarga real');
        console.log('');
        log('🆕', 'Mejoras v4:');
        console.log('      ✅ Verificación de nickname');
        console.log('      ✅ Reintentos automáticos (x2)');
        console.log('      ✅ Cola de espera');
        console.log('      ✅ Velocidad optimizada (~10s)');
        console.log('');
    });
}

process.on('SIGINT', async () => { if (browser) await browser.close(); process.exit(); });
process.on('SIGTERM', async () => { if (browser) await browser.close(); process.exit(); });

start();
