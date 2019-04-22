module.exports = function (app, swig, gestorBD) {
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

                var respuesta = swig.renderFile('views/tienda.html', {
                    ofertas: ofertas,
                    paginas: paginas,
                    actual: pg,
                    usuario: req.session.usuario
                });
                res.send(respuesta);
            }
        });

    });

    app.get('/misOfertas', function (req, res) {
       var criterio = { seller: req.session.usuario };
       gestorBD.obtenerOfertas(criterio, function(ofertas){
           if (ofertas == null)
               res.send("Error al listar");
           else {
               var respuesta = swig.renderFile('views/ofertasUsuario.html', {
                   ofertas: ofertas,
                   usuario: req.session.usuario
               });
               res.send(respuesta);
           }
       });
    });

    // Añadir una oferta
    app.get('/nuevaOferta', function (req, res) {
        var respuesta = swig.renderFile('views/nuevaOferta.html', {
            usuario: req.session.usuario
        });
        res.send(respuesta);
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
                seller: req.session.usuario
            };
            // Conectarse
            gestorBD.insertarOferta(oferta, function (id) {
                if (id == null) {
                    res.send("Error al insertar ");
                } else {
                    res.redirect("/tienda");
                }
            });
        }
    });
};
