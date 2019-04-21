module.exports = function (app, swig, gestorBD) {

    // Registrarse
    app.get('/registrarse', function (req, res) {
        var respuesta = swig.renderFile('views/registro.html', {});
        res.send(respuesta);
    });

    // Añadir un nuevo usuario
    app.post('/usuario', function (req, res) {

        var criterio = {email: req.body.email};

        // Obtenemos la lista de usuarios con el mismo email
        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            // Si no hay ningún email igual al introducido en la BD:
            if (usuarios == null || usuarios.length == 0) {

                var pass = app.get("crypto").createHmac('sha256', app.get('clave'))
                    .update(req.body.password).digest('hex');
                var passConf = app.get("crypto").createHmac('sha256', app.get('clave'))
                    .update(req.body.passwordConfirm).digest('hex');

                // Se comprueba que las contraseñas son iguales:
                if (pass === passConf) {
                    var usuario = {
                        email: req.body.email,
                        name: req.body.nombre,
                        surname: req.body.apellidos,
                        password: pass,
                        passwordConfirm: passConf,
                        role : "user",
                        balance : 100
                    };

                    // Sitodo es correcto se inserta el usuario en la BD:
                    gestorBD.insertarUsuario(usuario, function (id) {
                        if (id == null) {
                            res.redirect("/registrarse" + "?mensaje=Error al registrar usuario" +
                                "&tipoMensaje=alert-danger");
                        } else {
                            res.redirect("/identificarse?mensaje=Nuevo usuario registrado");
                        }
                    });

                } else
                    res.redirect("/registrarse" + "?mensaje=Las contraseñas no coinciden" +
                        "&tipoMensaje=alert-danger");

            } else
                res.redirect("/registrarse" + "?mensaje=El email ya existe" +
                    "&tipoMensaje=alert-danger");

        });
    });

    app.get("/identificarse", function (req, res) {
        var respuesta = swig.renderFile('views/identificacion.html', {});
        res.send(respuesta);
    });

        // Identificación del usuario
    app.post("/identificarse", function (req, res) {
        var pass = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');

        var criterio = {
            email: req.body.email,
            password: pass
        };
        var admin = "admin@email.com";

        // Entramos en sesión
        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            // Si no existe el usuario en la BD:
            if (usuarios == null || usuarios.length == 0) {
                req.session.usuario = null;
                res.redirect("/identificarse" +
                    "?mensaje=Email o password incorrecto" +
                    "&tipoMensaje=alert-danger ");
            }
            // Si el usuario que se identifica NO es admin (se redirige a vista normal):
            else if (criterio.email != admin) {
                req.session.usuario = usuarios[0].email;
                res.redirect("/tienda");
            }
            // Si el usuario que se identifica SÍ es admin (se redirige a vista de admin):
            else {
                req.session.usuario = usuarios[0].email;
                res.redirect("/usuarios");
            }
        });
    });

    app.post("/usuario/eliminar", function(req, res){
        var ids = req.body.checkboxes;

        if (ids != null) {
            if ( typeof ids === 'string' ){ // 1 solo elemento seleccionado -> es un string
                var criterio = {"_id": gestorBD.mongo.ObjectID(ids)};
                borrarOfertasUsuario(res, criterio);
                borrarUsuarios(res, criterio);
            }
            else { // varios elementos -> es array
                for (i = 0; i < ids.length; i++) {
                    var criterio = {"_id": gestorBD.mongo.ObjectID(ids[i])};
                    borrarOfertasUsuario(res, criterio);
                    borrarUsuarios(res, criterio);
                }
            }
            //Actualizamos y mostramos un mensaje
            res.redirect("/usuarios");
        }
        else //Si pulsa el boton sin seleccionar nada se lo indicamos
            res.redirect("/usuarios");
    });

    /**
     * Elimina a un las ofertas de un usuario
     * @param res
     * @param criterio
     */
    function borrarOfertasUsuario(res, criterio) {
        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            if (usuarios == null || usuarios.length == 0)
                res.send("No existe el usuario");
            else {
                var cBorrar = { seller: usuarios[0].email };
                gestorBD.eliminarOferta(cBorrar, function (ofertas) {
                    if (ofertas == null)
                        res.send("Error al eliminar ofertas de un usuario");
                });
            }
        });
    }

    /**
     * Elimina un usuario del sistema
     * @param res
     * @param criterio
     */
    function borrarUsuarios(res, criterio) {
        gestorBD.eliminarUsuario(criterio, function (usuarios) {
            if (usuarios == null)
                res.send("Error al eliminar usuario(s)");
        });
    }

    app.get('/usuarios', function(req, res) {
        gestorBD.obtenerUsuarios({}, function (usuarios) {
            if (usuarios==null)
                res.send("Error al listar usuarios");
            else {
                var respuesta = swig.renderFile('views/vistaAdmin.html', {
                    usuarios: usuarios
                });
                res.send(respuesta);
            }
        });
    });

    app.get('/desconectarse', function (req, res) {
        req.session.usuario = null;
        res.redirect("/identificarse");
    });
};
