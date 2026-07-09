module.exports = {
    name: 'hola',
    descripcion: 'Saluda al usuario',
    ejecutar(sock, idRemitente) {
        sock.sendMessage(idRemitente, { 
            text: '¡Hola! Bienvenido a *abdiel-bot*. Escribe *!menu* para ver las opciones avanzadas. 🤖🔥' 
        });
    }
};
