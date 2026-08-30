document.addEventListener('DOMContentLoaded', function() {
    // Referencias del Login
    const loginSection = document.getElementById('loginSection');
    const formSection = document.getElementById('formSection');
    const loginForm = document.getElementById('loginForm');
    const loginUsuario = document.getElementById('loginUsuario');
    const loginContrasena = document.getElementById('loginContrasena');
    const loginError = document.getElementById('loginError');
    const userGreeting = document.getElementById('userGreeting');
    const logoutButton = document.getElementById('logoutButton');

    // Referencias del Formulario
    const ubicacionSelect = document.getElementById('ubicacionTecnica');
    const codigoSapSelect = document.getElementById('codigoSap');
    const fechaInput = document.getElementById('fecha');
    const dataForm = document.getElementById('dataForm');
    const submitButton = document.getElementById('submitButton');

    // URLs de Apps Script
    const URL_DATOS_SHEET = 'https://script.google.com/macros/s/AKfycbz0LWPbHck36KROtykqidL7GMm9YtMCFU0LmBrScnV-8MdFzjzTf7X_vkNtHoGWQtPG/exec';
    const URL_CARGA_AVISOS = 'https://script.google.com/macros/s/AKfycbx6I3SxdliiDcHtR1r-xj6WOALR1Zh60spuV1n2ZSHZylfy8ZAOClaug904EH0md17n/exec';

    let USUARIOS_AUTORIZADOS = [];
    let usuarioActual = "";

    // 1. CARGA DINÁMICA DE DATOS
    async function cargarParametrosDesdeSheets() {
        try {
            const response = await fetch(URL_DATOS_SHEET);
            const data = await response.json();

            if (data.status === "success") {
                USUARIOS_AUTORIZADOS = data.usuarios;

                ubicacionSelect.innerHTML = '<option value="">Seleccione una ubicación...</option>';
                data.ubicaciones.forEach(ubi => {
                    const opt = document.createElement('option');
                    opt.value = ubi;
                    opt.textContent = ubi;
                    ubicacionSelect.appendChild(opt);
                });

                codigoSapSelect.innerHTML = '<option value="">Código SAP...</option>';
                data.codigosSap.forEach(sap => {
                    const opt = document.createElement('option');
                    opt.value = sap;
                    opt.textContent = sap;
                    codigoSapSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error("Error al cargar parámetros:", error);
        }
    }

    cargarParametrosDesdeSheets();

    // 2. VALIDACIÓN DE LOGIN
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const userInput = String(loginUsuario.value).trim();
        const passInput = String(loginContrasena.value).trim();

        if (USUARIOS_AUTORIZADOS.length === 0) {
            alert('Sincronizando con Google Sheets, aguarde un instante...');
            return;
        }

        const usuarioEncontrado = USUARIOS_AUTORIZADOS.find(
            u => String(u.usuario).trim() === userInput && String(u.contrasena).trim() === passInput
        );

        if (usuarioEncontrado) {
            usuarioActual = usuarioEncontrado.usuario;
            loginError.style.display = 'none';
            loginSection.style.display = 'none';
            formSection.style.display = 'block';
            userGreeting.textContent = `Usuario: ${usuarioActual}`;
            loginForm.reset();
        } else {
            loginError.style.display = 'block';
        }
    });

    // Cerrar sesión
    logoutButton.addEventListener('click', function() {
        usuarioActual = "";
        formSection.style.display = 'none';
        loginSection.style.display = 'block';
    });

    // Fecha actual por defecto
    const hoy = new Date();
    const year = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    fechaInput.value = `${year}-${mm}-${dd}`;

    // 3. ENVÍO DEL FORMULARIO
    dataForm.addEventListener('submit', function(event) {
        event.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Cargando Aviso...';

        const formData = new FormData(dataForm);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        const descripcionTexto = document.getElementById('descripcion').value.trim();

        // Se envía el usuario como campo independiente y en la descripción
        data.usuario = usuarioActual;
        data.descripcion = `${usuarioActual} - ${descripcionTexto}`;
        data.realizado = document.getElementById('realizado').checked ? 'Sí' : 'No';
        data.cambiar = document.getElementById('cambiar').checked ? 'Sí' : 'No';
        data.requireGrua = document.getElementById('requireGrua').checked ? 'Sí' : 'No';
        data.requireAndamio = document.getElementById('requireAndamio').checked ? 'Sí' : 'No';
        data.horas = data.horas ? parseFloat(data.horas) : 0;
        data.hh = data.hh ? parseFloat(data.hh) : 0;

        if (!data.ubicacionTecnica || !data.titulo || !descripcionTexto) {
            alert('Por favor complete todos los campos obligatorios.');
            submitButton.disabled = false;
            submitButton.textContent = 'Cargar Aviso';
            return;
        }

        enviarAvisoAGoogleSheets(data, year, mm, dd);
    });

    async function enviarAvisoAGoogleSheets(data, year, mm, dd) {
        try {
            const response = await fetch(URL_CARGA_AVISOS, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.status === "success") {
                alert('Aviso cargado exitosamente.');
                dataForm.reset();
                fechaInput.value = `${year}-${mm}-${dd}`;
                ubicacionSelect.value = "";
                codigoSapSelect.value = "";
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert(`Error al guardar aviso: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Cargar Aviso';
        }
    }
});
