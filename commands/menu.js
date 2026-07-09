module.exports = {
    name: 'menu',
    descripcion: 'Muestra el menú interactivo',
    ejecutar(sock, idRemitente) {
        const textoMenu = `*╔════════════════════╗*
* 🤖 ABDIE-BOT MENU 🤖 *
*╚════════════════════╝*

¡Hola! Soy un asistente modular avanzado. Aquí tienes lo que puedo hacer:

📌 *!hola* - Saludo de bienvenida.
📌 *!ping* - Prueba de velocidad del bot.
📌 *!id* - Muestra tu identificador de WhatsApp.

_También puedes responder enviando solo el número de opción:_
1️⃣ *Soporte Técnico*
2️⃣ *Horarios de atención*`;

        sock.sendMessage(idRemitente, { text: textoMenu });
    }
};
