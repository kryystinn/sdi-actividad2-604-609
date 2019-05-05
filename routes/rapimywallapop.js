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
                let userBalance = usuarios[0].balance;
                res.status(200);
                res.json({
                    autenticado: true,
                    token: token,
                    balance: userBalance
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
                ofertas = ofertas.filter(function (offer) {
                    return offer.seller.localeCompare(res.usuario) != 0;
                });
                res.send(JSON.stringify(ofertas));
            }
        });
    });

    app.post("/api/mensaje", function (req, res) {
        let mensaje = {
            idOferta: req.body.idOferta,
            author: res.usuario,
            receptor: req.body.receptor,
            date: new Date(),
            content: req.body.message,
            read: false
        };
        gestorBD.enviarMensaje(mensaje, function (mensaje) {
            if (mensaje == null) { // Error
                res.status(500);
                res.json({error: "se ha producido un error"});
            } else {
                res.status(200);
                res.send(JSON.stringify(mensaje));
            }
        });
    });

    app.get("/api/chat/:id", function (req, res) {
        let criterio = {
            "idOferta": req.params.id,
            $or: [
                {
                    "author": res.usuario
                },
                {
                    "receptor": res.usuario
                }]
        };
        gestorBD.obtenerMensajes(criterio, function (mensajes) {
            if (mensajes == null) {
                res.status(500);
                res.json({error: "se ha producido un error"})
            } else {
                mensajes.sort((m1, m2) => m1.date - m2.date);
                res.status(200);
                res.send(JSON.stringify(mensajes));
            }
        });
    });

    app.delete("/api/chat/:id", function (req, res) {
        let criterio = {
            "idOferta": req.params.id,
            $or: [
                {
                    "author": res.usuario
                },
                {
                    "receptor": res.usuario
                }]
        };
        gestorBD.eliminarMensajes(criterio, function (chats) {
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
