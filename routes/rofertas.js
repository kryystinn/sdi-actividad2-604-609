module.exports = function (app, swig, gestorBD) {

    // Función para controlar las sesiones
    function globalRender(route, params, session) {
        if (params === null)
            params = [];
        params['user'] = session.usuario;
        params['role'] = session.usuario.role;
        return swig.renderFile(route, params);
    }

    app.get("/tienda", function (req, res) {
        var criterio = {};
        if (req.query.busqueda != null)
            criterio = {"title": {$regex: ".*" + req.query.busqueda + ".*", $options: 'i'}};

        var pg = parseInt(req.query.pg);
        if (req.query.pg == null)
            pg = 1;

        gestorBD.obtenerOfertasPg(criterio, pg, function (ofertas, total) {
            if (ofertas == null)
                res.send("Error al listar");
            else {
                var ultimaPg = total / 5;
                if (total % 5 > 0)
                    ultimaPg = ultimaPg + 1;

                var paginas = [];
                for (var i = pg - 2; i <= pg + 2; i++){
                    if (i > 0 && i <= ultimaPg)
                        paginas.push(i);
                }

                var params = [];
                params['ofertas'] = ofertas;
                params['paginas'] = paginas;
                params['actual'] = pg;
                res.send(globalRender('views/tienda.html', params, req.session));
            }
        });

    });

    app.get('/ofertas/propias', function (req, res) {
        var criterio = {seller: req.session.usuario.email};
        gestorBD.obtenerOfertas(criterio, function (ofertas) {
            if (ofertas == null)
                res.send("Error al listar");
            else {
                var params = [];
                params['ofertas'] = ofertas;
                res.send(globalRender('views/ofertasUsuario.html', params, req.session));
            }
        });
    });

    //ofertas destacadas
    app.get('/ofertas/destacadas', function(req, res){
        var criterio = { starred: true };
        gestorBD.obtenerOfertas(criterio, function (ofertas) {
            if (ofertas == null)
                res.send("Error al listar");
            else {
                var params = [];
                params['ofertas'] = ofertas;
                res.send(globalRender('views/ofertasDestacadas.html', params, req.session));
            }
        });
    });

    // Dar de baja una oferta.
    app.get('/ofertas/eliminar/:id', function (req, res) {
        var criterio = {"_id": gestorBD.mongo.ObjectID(req.params.id)};
        gestorBD.eliminarOferta(criterio, function (ofertas) {
            if (ofertas == null) {
                res.send("Error al eliminar oferta.");
            } else {
                res.redirect("/ofertas/propias");
            }
        });
    });

    // Añadir una oferta
    app.get('/ofertas/agregar', function (req, res) {
        res.send(globalRender('views/nuevaOferta.html', null, req.session));
    });

    // Al añadir una oferta
    app.post("/oferta", function (req, res) {
        if (req.session.usuario == null) {
            res.redirect("/registrarse");
            return;
        } else {
            let dt = new Date();
            let fecha = dt.toLocaleDateString();
            if (req.body.checkboxStarred == "on")
                var cb = true;
            else
                var cb = false;
            var oferta = {
                title: req.body.titulo,
                details: req.body.detalle,
                date: fecha,
                price: req.body.precio,
                seller: req.session.usuario.email,
                sold: false,
                buyer: null,
                starred: cb
            };
            // Conectarse
            gestorBD.insertarOferta(oferta, function (id) {
                if (id == null) {
                    res.send("Error al insertar ");

                } else {
                    // SI la oferta es DESTACADA: descontar dinero
                    if (!cb) {
                        res.redirect("/ofertas/propias");
                    } else {
                        var criterio = {"_id": gestorBD.mongo.ObjectID(req.session.usuario._id)};
                        var usuario = {
                            balance: parseInt(req.session.usuario.balance) - 20
                        };
                        gestorBD.modificarUsuario(criterio, usuario, function (result) {
                            if (result == null)
                                res.send("Error al modificar usuario.");
                            else {
                                req.session.usuario.balance = usuario.balance;
                                res.redirect("/ofertas/propias");
                            }
                        });
                    }
                }
            });
        }
    });

    // Destacar una oferta
    app.get('/ofertas/destacar/:id', function (req, res) {
        // PRIMERO modificamos la OFERTA a starred=true
        var criterio = {"_id": gestorBD.mongo.ObjectID(req.params.id)};
        var oferta = {
          starred: true
        };
        gestorBD.modificarOferta(criterio, oferta, function (result) {
            if (result == null)
                res.send("Error al modificar oferta.");

            // SEGUNDO, modificamos el dinero del usuario
            else{
                var criterio = {"_id": gestorBD.mongo.ObjectID(req.session.usuario._id)};
                var usuario = {
                    balance: parseInt(req.session.usuario.balance) - 20
                };
                gestorBD.modificarUsuario(criterio, usuario, function (result) {
                    if (result == null)
                        res.send("Error al modificar usuario.");
                    else {
                        req.session.usuario.balance = usuario.balance;
                        res.redirect("/ofertas/propias");
                    }
                });
            }

        });
    });

    // Comprar una oferta
    app.get('/ofertas/comprar/:id', function (req, res) {
        // PRIMERO: comprobamos que el usuario tenga dinero para comprar la oferta
        criterio = {
            "_id": gestorBD.mongo.ObjectID(req.params.id)
        };
        gestorBD.obtenerOfertas(criterio, function (result) {
            if (result == null) {
                res.send("Error al encontrar la oferta");
            } else {
                var vendedorEmail = result[0].seller;
                var precioOferta = result[0].price;
                if (req.session.usuario.balance >= precioOferta) {
                    // SEGUNDO: modificamos la oferta a VENDIDA y le añadimos el COMPRADOR
                    var criterio = {"_id": gestorBD.mongo.ObjectID(req.params.id)};
                    var oferta = {
                        sold: true,
                        buyer: req.session.usuario.email
                    };
                    gestorBD.modificarOferta(criterio, oferta, function (result) {
                        if (result == null) {
                            res.send("Error al modificar la oferta");

                            // TERCERO: modificamos el DINERO del COMPRADOR
                        } else {
                            var criterio = {"_id": gestorBD.mongo.ObjectID(req.session.usuario._id)};
                            var comprador = {
                                balance: parseInt(req.session.usuario.balance) - parseInt(precioOferta)
                            };
                            gestorBD.modificarUsuario(criterio, comprador, function (idUser) {
                                if (idUser == null)
                                    res.send("Error al modificar usuario.");
                                else {
                                    req.session.usuario.balance = comprador.balance;

                                    // CUARTO: modificamos el DINERO del VENDEDOR
                                    var criterio = {"email": vendedorEmail};
                                    gestorBD.obtenerUsuarios(criterio, function (usuarios) {
                                        if (usuarios == null)
                                            res.send("Error al encontrar usuario vendedor.");
                                        else {
                                            var dineroVendedor = usuarios[0].balance;
                                            var criterio = {"email": vendedorEmail};
                                            var vendedor = {
                                                balance: parseInt(dineroVendedor) + parseInt(precioOferta)
                                            };
                                            gestorBD.modificarUsuario(criterio, vendedor, function (vendedor) {
                                                if (vendedor == null)
                                                    res.send("Error al modificar usuario vendedor.");
                                                else {
                                                    res.redirect("/tienda");
                                                }
                                            });
                                        }
                                    });


                                }
                            });
                        }
                    });
                } else
                    res.redirect("/tienda?mensaje=No tienes suficiente dinero para esta oferta.&tipoMensaje=alert-danger");
            }
        });
    });

    // Compras del usuario
    app.get('/ofertas/compras', function (req, res) {
        var criterio = {"buyer": req.session.usuario.email};
        gestorBD.obtenerOfertas(criterio, function (compras) {
            if (compras == null) {
                res.send("Error al listar.");
            } else {
                var params = [];
                params['compras'] = compras;
                res.send(globalRender('views/comprasUsuario.html', params, req.session));
            }

        });
    });

}
;
