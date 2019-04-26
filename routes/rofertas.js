module.exports = function (app, swig, gestorBD) {

    // Función para controlar las sesiones
    function globalRender(route, params, session) {
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
                for (var i = pg - 2; i <= pg + 2; i++)
                    if (i > 0 && i <= ultimaPg)
                        paginas.push(i);

                var params = [];
                params['ofertas'] = ofertas;
                params['paginas'] = paginas;
                params['actual'] = pg;
                res.send(globalRender('views/tienda.html', params, req.session));
                /*var respuesta = swig.renderFile('views/tienda.html', {
                    ofertas: ofertas,
                    paginas: paginas,
                    actual: pg,
                    user: req.session.usuario,
                    role: req.session.usuario.role
                });
                res.send(respuesta);*/
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
        var dt = new Date();
        var fecha = dt.toLocaleDateString();
        var params = [];
        params['date'] = fecha;
        res.send(globalRender('views/nuevaOferta.html', params, req.session));
    });

    // Al añadir una oferta
    app.post("/oferta", function (req, res) {
        if (req.session.usuario == null) {
            res.redirect("/registrarse");
            return;
        } else {
            var oferta = {
                title: req.body.titulo,
                details: req.body.detalle,
                date: req.body.fecha,
                price: req.body.precio,
                seller: req.session.usuario.email,
                sold: false,
                buyer: null
            };
            // Conectarse
            gestorBD.insertarOferta(oferta, function (id) {
                if (id == null) {
                    res.send("Error al insertar ");
                } else {
                    res.redirect("/ofertas/propias");
                }
            });
        }
    });

    // Comprar una oferta
    app.get('/ofertas/comprar/:id', function (req, res) {
        // PRIMERO: modificamos la oferta a VENDIDA y le añadimos el COMPRADOR
        var criterio = {"_id": gestorBD.mongo.ObjectID(req.params.id)};
        var oferta = {
            sold: true,
            buyer: req.session.usuario.email
        };
        gestorBD.modificarOferta(criterio, oferta, function (result) {
            if (result == null) {
                res.send("Error al modificar la oferta");

                // SEGUNDO: obtenemos el dinero de la oferta a comprar
            } else {
                gestorBD.obtenerOfertas(criterio, function (oferta) {
                    if (result == null) {
                        res.send("Error al modificar la oferta");

                        // TERCERO: modificamos el DINERO del COMPRADOR
                    }else {
                        var criterio = {"_id": gestorBD.mongo.ObjectID(req.session.usuario._id)};
                        var precioCompra = oferta[0].price;
                        var comprador = {
                            balance: parseInt(req.session.usuario.balance) - parseInt(precioCompra)
                        };
                        gestorBD.modificarUsuario(criterio, comprador, function (idUser) {
                            if (idUser == null)
                                res.send("Error al modificar usuario.");
                            else {
                                req.session.usuario.balance = comprador.balance;
                                res.redirect("/tienda");
                            }
                        });
                    }
                });
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
