const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function iniciarAbdielBot() {
    // Guarda tu sesión en una carpeta dedicada
    const { state, saveCreds } = await useMultiFileAuthState('abdiel_sesion');

    // Inicializamos silenciando los logs molestos de la pantalla
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Chrome (Linux)", "Desktop", "10.0.0"]
    });

    // SISTEMA DE CÓDIGO ESCRITO PERSONALIZADO
    if (!sock.authState.creds.registered) {
        await delay(6000); // Espera de estabilidad básica
        
        console.clear();
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║    🔥 BIENVENIDO A: ABDIEL-BOT PRO 🔥  ║');
        console.log('╚════════════════════════════════════════╝\n');
        
        const numeroTelefono = await question('👉 Ingresa tu número de WhatsApp (Ej: 521XXXXXXXXXX):\n> ');
        const numeroLimpio = numeroTelefono.replace(/[^0-9]/g, '');
        
        try {
            console.log('⏳ Conectando con los servidores de WhatsApp...');
            const codigo = await sock.requestPairingCode(numeroLimpio);
            console.log('\n╔════════════════════════════════════════╗');
            console.log(`║      TU CÓDIGO ES:  ${codigo}        ║`);
            console.log('╚════════════════════════════════════════╝\n');
            console.log('Introduce esos 8 dígitos en la notificación de vinculación de tu WhatsApp.\n');
        } catch (error) {
            console.log('\n❌ Error de emparejamiento. Reintentando...');
            await delay(3000);
            iniciarAbdielBot();
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const code = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) {
                iniciarAbdielBot();
            }
        } else if (connection === 'open') {
            console.log('\n🚀 [abdiel-bot]: ¡Conectado con éxito y listo para usar!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // RESPUESTAS Y COMANDOS PERSONALIZADOS
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim().toLowerCase();
        const idRemitente = msg.key.remoteJid;

        // Comandos Interactivos con tu nombre
        if (texto === '!hola') {
            await sock.sendMessage(idRemitente, { 
                text: '¡Hola! Estás hablando con el bot oficial de *Abdiel*. 😎\nEscribe *!menu* para ver las opciones.' 
            });
        }

        if (texto === '!menu') {
            const menuPersonalizado = `*╔════════════════════╗*
* 🪐 ABDIEL-BOT MENU 🪐 *
*╚════════════════════╝*

Asistente Virtual Automatizado de Abdiel.

📌 *!hola* - Saludo e inicio.
📌 *!creador* - Información del desarrollador.
📌 *!ping* - Estado del bot.

_Opciones rápidas (responde solo con el número):_
1️⃣ *Información del Servidor*
2️⃣ *Contacto Directo*`;
            await sock.sendMessage(idRemitente, { text: menuPersonalizado });
        }

        if (texto === '!creador') {
            await sock.sendMessage(idRemitente, { text: 'Este bot es propiedad exclusiva de *Abdiel C.* y está corriendo desde Termux. 📱⚡' });
        }

        if (texto === '!ping') {
            await sock.sendMessage(idRemitente, { text: '🏓 *Pong!* El bot está respondiendo en tiempo récord.' });
        }

        // Submenús por números
        if (texto === '1') {
            await sock.sendMessage(idRemitente, { text: '💻 *Estado:* Corriendo en arquitectura Linux (Termux Android) de forma óptima.' });
        }
        if (texto === '2') {
            await sock.sendMessage(idRemitente, { text: '👤 Para hablar directamente con el dueño de este bot, espera a que Abdiel revise este chat.' });
        }
    });
}

iniciarAbdielBot();
