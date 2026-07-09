const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    // Cargar comandos dinámicamente de la carpeta /commands
    const comandos = new Map();
    const rutaComandos = path.join(__dirname, 'commands');
    
    if (fs.existsSync(rutaComandos)) {
        const archivosComandos = fs.readdirSync(rutaComandos).filter(file => file.endsWith('.js'));
        for (const archivo of archivosComandos) {
            const comando = require(path.join(rutaComandos, archivo));
            comandos.set(comando.name, comando);
        }
        console.log(`📦 Se cargaron ${comandos.size} comandos con éxito.`);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) console.log('👉 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP:');
        
        if (connection === 'close') {
            const deberiaReconectar = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (deberiaReconectar) iniciarBot();
        } else if (connection === 'open') {
            console.log('🚀 [abdiel-bot] está en línea y procesando comandos de forma modular.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Escucha de mensajes interactivos
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        const idRemitente = msg.key.remoteJid;

        // 1. Lógica para comandos con prefijo "!"
        if (texto.startsWith('!')) {
            const nombreComando = texto.slice(1).toLowerCase().split(' ')[0];
            
            if (comandos.has(nombreComando)) {
                comandos.get(nombreComando).ejecutar(sock, idRemitente);
            } else if (nombreComando === 'ping') {
                await sock.sendMessage(idRemitente, { text: '🏓 ¡Pong! Conexión estable.' });
            } else if (nombreComando === 'id') {
                await sock.sendMessage(idRemitente, { text: `Tu ID de WhatsApp es:\n\`\`\`${idRemitente}\`\`\`` });
            }
            return;
        }

        // 2. Lógica para respuestas automáticas por número (Submenús)
        switch (texto) {
            case '1':
                await sock.sendMessage(idRemitente, { text: '🛠️ *Soporte:* Déjanos tu duda en este chat y un asesor humano te responderá pronto.' });
                break;
            case '2':
                await sock.sendMessage(idRemitente, { text: '🕒 *Horarios:* Nuestro horario automatizado es 24/7. Atención humana de Lunes a Viernes de 9 AM a 6 PM.' });
                break;
        }
    });
}

iniciarBot();
