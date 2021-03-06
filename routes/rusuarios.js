module.exports = function (app, swig, gestorBD) {

    // Función para controlar las sesiones
    function globalRender(route, params, session) {
        params['user'] = session.usuario;
        params['role'] = session.usuario.role;
        return swig.renderFile(route, params);
    }

    //  Página principal
    app.get('/index', function (req, res) {
        res.send(swig.renderFile('views/index.html', {}));
    });


    // Registrarse
    app.get('/registrarse', function (req, res) {
        res.send(swig.renderFile('views/registro.html', {}));
    });

    // Añadir un nuevo usuario
    app.post('/usuario', function (req, res) {
        let criterio = {email: req.body.email};

        // Obtenemos la lista de usuarios con el mismo email
        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            // Si no hay ningún email igual al introducido en la BD:
            if (usuarios == null || usuarios.length == 0) {
                let pass = app.get("crypto").createHmac('sha256', app.get('clave'))
                    .update(req.body.password).digest('hex');
                let passConf = app.get("crypto").createHmac('sha256', app.get('clave'))
                    .update(req.body.passwordConfirm).digest('hex');

                // Se comprueba que las contraseñas son iguales:
                if (pass === passConf) {
                    let usuario = {
                        email: req.body.email,
                        name: req.body.nombre,
                        surname: req.body.apellidos,
                        password: pass,
                        passwordConfirm: passConf,
                        role: "user",
                        balance: 100
                    };

                    // Sitodo es correcto se inserta el usuario en la BD:
                    gestorBD.insertarUsuario(usuario, function (id) {
                        if (id == null) {
                            res.redirect("/registrarse" + "?mensaje=Error al registrar usuario" +
                                "&tipoMensaje=alert-danger");
                        } else {
                            usuario._id = id;
                            req.session.usuario = usuario;
                            res.redirect("/tienda?mensaje=Nuevo usuario registrado");
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
        if (req.session.usuario == null) {
            res.send(swig.renderFile('views/identificacion.html', {}));

        } else
            res.redirect("/tienda");
    });

    // Identificación del usuario
    app.post("/identificarse", function (req, res) {
        let pass = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');

        let criterio = {
            email: req.body.email,
            password: pass
        };
        let admin = "admin@email.com";

        // Entramos en sesión
        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            // Si no existe el usuario en la BD:
            if (usuarios == null || usuarios.length == 0) {
                req.session.usuario = null;
                res.redirect("/identificarse" +
                    "?mensaje=Email o password incorrecto" +
                    "&tipoMensaje=alert-danger");
            }
            // Si el usuario que se identifica NO es admin (se redirige a vista normal):
            else if (criterio.email != admin) {
                req.session.usuario = usuarios[0];
                res.redirect("/tienda");
            }
            // Si el usuario que se identifica SÍ es admin (se redirige a vista de admin):
            else {
                req.session.usuario = usuarios[0];
                res.redirect("/usuarios");
            }
        });
    });

    app.post("/usuario/eliminar", function (req, res) {
        let ids = req.body.checkboxes;

        if (ids != null) {
            var contador = ids.length;
            if (typeof ids === 'string') { // 1 solo elemento seleccionado -> es un string
                let criterio = {"_id": gestorBD.mongo.ObjectID(ids)};
                borrarUsuario(res, criterio, contador, contador);
            } else {
                for (i = 0; i < contador; i++) {
                    var criterio = {"_id": gestorBD.mongo.ObjectID(ids[i])};
                    borrarUsuario(res, criterio, i+1, contador);
                }
            }
        } else //Si pulsa el boton sin seleccionar nada se lo indicamos
            res.redirect("/usuarios?mensaje=No hay ningún usuario seleccionado&tipoMensaje=alert-danger");
    });

    /**
     * Elimina un usuario del sistema --> 1) Elimina las ofertas del usuario 2) Elimina al usuario
     * @param res
     * @param criterio
     */
    function borrarUsuario(res, criterio, i, contador) {
        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            if (usuarios == null || usuarios.length == 0)
                res.send("No existe el usuario");
            else {
                let cBorrar = {seller: usuarios[0].email};
                gestorBD.eliminarOferta(cBorrar, function (ofertas) {
                    if (ofertas == null)
                        res.send("Error al eliminar ofertas de un usuario");
                });
                gestorBD.eliminarUsuario(criterio, function (usuarios) {
                    if (usuarios == null)
                        res.send("Error al eliminar usuario(s)");
                    else if (parseInt(i) === parseInt(contador))
                            res.redirect("/usuarios?mensaje=Usuario(s) eliminado(s) correctamente");
                });
            }
        });
    }

    app.get('/usuarios', function (req, res) {
        gestorBD.obtenerUsuarios({}, function (usuarios) {
            if (usuarios == null)
                res.send("Error al listar usuarios");
            else {
                params = [];
                params['usuarios'] = usuarios;
                res.send(globalRender('views/vistaAdmin.html', params, req.session));
            }
        });
    });

    app.get('/desconectarse', function (req, res) {
        req.session.usuario = null;
        res.redirect("/identificarse");
    });
};
