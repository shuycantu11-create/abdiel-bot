const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');

// Configuración para leer el número desde la terminal
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Desactivamos el QR por completo
        browser: ["Ubuntu", "Chrome", "20.0.04"] // Necesario para que simule una PC
    });

        // LÓGICA PARA EL CÓDIGO DE TEXTO (PAIRING CODE)
    if (!sock.authState.creds.registered) {
        await delay(10000); // Espera 10 segundos a que la conexión sea completamente estable

        console.log('\n╔════════════════════════════════════════╗');
        console.log('║      📱 ABDIE-BOT: VINCULACIÓN         ║');
        console.log('╚════════════════════════════════════════╝\n');
        
        const numeroTelefono = await question('👉 Ingresa tu número de WhatsApp con código de país (Ej: 521XXXXXXXXXX):\n> ');
        
        // Limpiamos el número por si pusiste espacios o un signo +
        const numeroLimpio = numeroTelefono.replace(/[^0-9]/g, '');
        
        try {
            const codigo = await sock.requestPairingCode(numeroLimpio);
            console.log('\n╔════════════════════════════════════════╗');
            console.log(`║      TU CÓDIGO ES:  ${codigo}        ║`);
            console.log('╚════════════════════════════════════════╝\n');
            console.log('Pasos:');
            console.log('1. Abre WhatsApp en tu celular.');
            console.log('2. Ve a Dispositivos vinculados -> Vincular un dispositivo.');
            console.log('3. Toca en "Vincular con el número de teléfono el lugar".');
            console.log('4. Escribe el código de arriba.\n');
        } catch (error) {
            console.error('❌ Error al generar el código:', error);
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
            const deberiaReconectar = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (deberiaReconectar) iniciarBot();
        } else if (connection === 'open') {
            console.log('🚀 [abdiel-bot] conectado con éxito mediante código escrito.');
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
