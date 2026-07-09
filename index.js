const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');

    // Usamos pino para SILENCIAR por completo los logs raros de la pantalla
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }), 
        browser: ["Chrome (Linux)", "Desktop", "10.0.0"]
    });

    if (!sock.authState.creds.registered) {
        // Espera de 6 segundos para estabilizar la conexión silenciosa
        await delay(6000); 
        
        console.clear();
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║      📱 ABDIE-BOT: VINCULACIÓN         ║');
        console.log('╚════════════════════════════════════════╝\n');
        
        const numeroTelefono = await question('👉 Ingresa tu número de WhatsApp con código de país (Ej: 521XXXXXXXXXX):\n> ');
        const numeroLimpio = numeroTelefono.replace(/[^0-9]/g, '');
        
        try {
            console.log('⏳ Generando código de vinculación seguro...');
            const codigo = await sock.requestPairingCode(numeroLimpio);
            console.log('\n╔════════════════════════════════════════╗');
            console.log(`║      TU CÓDIGO ES:  ${codigo}        ║`);
            console.log('╚════════════════════════════════════════╝\n');
        } catch (error) {
            console.log('\n❌ No se pudo generar el código. Reintentando de forma automática...');
            await delay(3000);
            iniciarBot();
        }
    }

    // Cargar comandos dinámicamente
    const comandos = new Map();
    const rutaComandos = path.join(__dirname, 'commands');
    if (fs.existsSync(rutaComandos)) {
        const archivosComandos = fs.readdirSync(rutaComandos).filter(file => file.endsWith('.js'));
        for (const archivo of archivosComandos) {
            const comando = require(path.join(rutaComandos, archivo));
            comandos.set(comando.name, comando);
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const code = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
            // Si la conexión se cae, vuelve a intentar de forma inteligente
            if (code !== DisconnectReason.loggedOut) {
                iniciarBot();
            }
        } else if (connection === 'open') {
            console.log('🚀 [abdiel-bot] ¡Conectado con éxito al WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        const idRemitente = msg.key.remoteJid;

        if (texto.startsWith('!')) {
            const nombreComando = texto.slice(1).toLowerCase().split(' ')[0];
            if (comandos.has(nombreComando)) {
                comandos.get(nombreComando).ejecutar(sock, idRemitente);
            }
            return;
        }
    });
}

iniciarBot();
