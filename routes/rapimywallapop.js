module.exports = function (app, gestorBD) {

    app.post("/api/identificar", function (req, res) {
        let seguro = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        let criterio = {
            email: req.body.email,
            password: seguro
        };
        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            if (usuarios == null || usuarios.length == 0) {
                res.status(401); // Unauthorized
                res.json({
                    autenticado: false
                })
            } else {
                let token = app.get('jwt').sign(
                    {
                        usuario: criterio.email,
                        tiempo: Date.now() / 1000
                    }, "secreto");
                res.status(200);
                res.json({
                    autenticado: true,
                    token : token
                })
            }
        });
    });

    app.get("/api/ofertas", function (req, res) {
        gestorBD.obtenerOfertas({}, function (ofertas) {
            if (ofertas == null) {
                res.status(500);
                res.json({
                    error: "se ha producido un error"
                })
            } else {
                res.status(200);
                // Filtramos para que se muestren todas las ofertas menos...
                // ...las vendidas por el usuario registrado
                ofertas = ofertas.filter(function(offer){
                    return offer.seller.localeCompare(res.usuario) != 0;
                });
                res.send(JSON.stringify(ofertas));
            }
        });
    });

    app.put("/api/mensaje/:id", function (req, res) {
        let dt = new Date();
        let mensaje = {
            author: res.usuario,
            date: dt.toLocaleDateString(),
            hour: dt.getTime(),
            content: req.body.message,
            read: false
        };
        let criterio = {
            "_id": gestorBD.mongo.ObjectID(req.params.id)
        };
        gestorBD.obtenerChats(criterio, function(chats){
            if (chats == null) { // Error
                res.status(500);
                res.json({error: "se ha producido un error"});
            }
            else if (chats.length == 0) {
                // Si el chat no existe (coleccion vacia), ES EL PRIMER MENSAJE, LUEGO CREAMOS EL CHAT
                let chat = {
                    idOferta: ,         // puede haber varias conversaciones entre dos usuarios por distintos productos
                    seller: ,           // idOferta es el id de la oferta por la que conversan
                    author: res.usuario,
                    messages: [ {mensaje} ]
                };
                gestorBD.crearChat(chat, function(id){
                    if (id==null) {
                        res.send(500);
                        res.json({error: "se ha producido un error"});
                    } else {
                        res.send(200);
                        res.json({
                            mensaje: "chat creado. mensaje enviado",
                            _id: id
                        });
                    }
                });
            }
            else {
                // Si existe el chat, lo modificamos, añadiendo el nuevo mensaje
                chats[0].messages.push(mensaje);
                gestorBD.modificarChats(criterio, chats[0], function (result) {
                    if (result == null) { // no existe el chat, lo creamos
                        res.send(500);
                        res.json({error: "se ha producido un error"})
                    }
                    else {
                        //??¿¿ por qué falla ??¿¿
                        res.send(200);
                        res.json({
                            mensaje: "mensaje enviado",
                            _id: req.params.id
                        });
                    }
                });
            }
        });
    });

    app.get("/api/chat/:id", function (req, res) {
        let criterio = {
            "_id": gestorBD.mongo.ObjectID(req.params.id)
        };

        gestorBD.obtenerOfertas(criterio, function(ofertas) {
            if (ofertas == null) {
                res.send(500);
                res.json({error: "se ha producido un error"});
            } else {
                // Solo puede haber un chat entre dos usuarios, luego devolverá solo 1 chat.
                let criterio = {
                    idOferta: ofertas[0].id,
                    seller: ofertas[0].seller,
                    author: res.usuario
                };
                gestorBD.obtenerChats(criterio, function(chats){
                    if (chats == null) {
                        res.status(500);
                        res.json({error: "se ha producido un error"});
                    }
                    else {
                        res.status(200);
                        res.send(JSON.stringify(chats[0]));
                    }
                });
            }
        });
    });

    app.delete("/api/chat/:id", function (req, res) {
        let criterio = {
            "_id": gestorBD.mongo.ObjectID(req.params.id)
        };
        gestorBD.eliminarChats(criterio, function (chats) {
            if (chats == null) {
                res.status(500);
                res.json({error: "se ha producido un error"})
            } else {
                res.status(200);
                res.send(JSON.stringify(chats));
            }
        });
    });
};
