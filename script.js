document.addEventListener('DOMContentLoaded', function() {
    // Elementos del Login
    const loginSection = document.getElementById('loginSection');
    const formSection = document.getElementById('formSection');
    const loginForm = document.getElementById('loginForm');
    const loginUsuario = document.getElementById('loginUsuario');
    const loginContrasena = document.getElementById('loginContrasena');
    const loginError = document.getElementById('loginError');
    const userGreeting = document.getElementById('userGreeting');
    const logoutButton = document.getElementById('logoutButton');

    // Elementos del Formulario
    const ubicacionSelect = document.getElementById('ubicacionTecnica');
    const codigoSapSelect = document.getElementById('codigoSap');
    const fechaInput = document.getElementById('fecha');
    const dataForm = document.getElementById('dataForm');
    const submitButton = document.getElementById('submitButton');

    // URL de tu Web App de Google Apps Script
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6I3SxdliiDcHtR1r-xj6WOALR1Zh60spuV1n2ZSHZylfy8ZAOClaug904EH0md17n/exec';

    // Variable para almacenar el usuario activo
    let usuarioActual = "";

    // -------------------------------------------------------------
    // LÓGICA DE AUTENTICACIÓN (LOGIN)
    // -------------------------------------------------------------
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const userInput = loginUsuario.value.trim();
        const passInput = loginContrasena.value.trim();

        // Validar credenciales contra usuarios.js
        const usuarioEncontrado = USUARIOS_AUTORIZADOS.find(
            u => u.usuario === userInput && u.contrasena === passInput
        );

        if (usuarioEncontrado) {
            usuarioActual = usuarioEncontrado.usuario;
            loginError.style.display = 'none';
            
            // Ocultar Login y mostrar Formulario
            loginSection.style.display = 'none';
            formSection.style.display = 'block';
            
            // Saludo al usuario
            userGreeting.textContent = `Usuario: ${usuarioActual}`;
            
            // Resetear campos de login
            loginForm.reset();
        } else {
            loginError.style.display = 'block';
        }
    });

    // Botón Cerrar Sesión
    logoutButton.addEventListener('click', function() {
        usuarioActual = "";
        formSection.style.display = 'none';
        loginSection.style.display = 'block';
    });

    // -------------------------------------------------------------
    // CARGA DE DESPLEGABLES (UBICACIONES Y SAP)
    // -------------------------------------------------------------
    if (typeof UBICACIONES_DATA !== 'undefined') {
        UBICACIONES_DATA.forEach(ubicacion => {
            const option = document.createElement('option');
            option.value = ubicacion;
            option.textContent = ubicacion;
            ubicacionSelect.appendChild(option);
        });
    }

    if (typeof CODIGOS_SAP_DATA !== 'undefined') {
        CODIGOS_SAP_DATA.forEach(codigo => {
            const option = document.createElement('option');
            option.value = codigo;
            option.textContent = codigo;
            codigoSapSelect.appendChild(option);
        });
    }

    // Establecer fecha actual por defecto
    const hoy = new Date();
    const year = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    fechaInput.value = `${year}-${mm}-${dd}`;

    // -------------------------------------------------------------
    // ENVÍO DE FORMULARIO A GOOGLE SHEETS
    // -------------------------------------------------------------
    dataForm.addEventListener('submit', function(event) {
        event.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Cargando Aviso...';

        const formData = new FormData(dataForm);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        data.realizado = document.getElementById('realizado').checked ? 'Sí' : 'No';
        data.cambiar = document.getElementById('cambiar').checked ? 'Sí' : 'No';
        data.requireGrua = document.getElementById('requireGrua').checked ? 'Sí' : 'No';
        data.requireAndamio = document.getElementById('requireAndamio').checked ? 'Sí' : 'No';
        data.horas = data.horas ? parseFloat(data.horas) : 0;
        data.hh = data.hh ? parseFloat(data.hh) : 0;

        // COMBINAR EL NOMBRE DE USUARIO CON LA DESCRIPCIÓN INGRSADA
        const descripcionOriginal = document.getElementById('descripcion').value.trim();
        const descripcionConUsuario = `${usuarioActual} - ${descripcionOriginal}`;

        if (!data.ubicacionTecnica || !data.titulo || !descripcionOriginal) {
            alert('Por favor, complete todos los campos obligatorios.');
            submitButton.disabled = false;
            submitButton.textContent = 'Cargar Aviso';
            return;
        }

        // Asignar la descripción formateada
        data.descripcion = descripcionConUsuario;

        sendDataToGoogleSheets(data, year, mm, dd);
    });

    async function sendDataToGoogleSheets(data, year, mm, dd) {
        if (!GOOGLE_SCRIPT_URL) {
            alert('URL de Apps Script no configurada.');
            submitButton.disabled = false;
            submitButton.textContent = 'Cargar Aviso';
            return;
        }

        const sheetData = {
            ubicacionTecnica: data.ubicacionTecnica,
            fecha: data.fecha,
            titulo: data.titulo,
            descripcion: data.descripcion, // Se envía con el formato: "nombre_usuario - texto_descripcion"
            horas: data.horas,
            hh: data.hh,
            requireGrua: data.requireGrua,
            requireAndamio: data.requireAndamio,
            realizado: data.realizado,
            cambiar: data.cambiar,
            codigoSap: data.codigoSap || ''
        };

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(sheetData)
            });

            const result = await response.json();

            if (result.status === "success") {
                alert('Aviso cargado exitosamente en Google Sheets.');
                dataForm.reset();
                fechaInput.value = `${year}-${mm}-${dd}`;
                ubicacionSelect.value = "";
                if (codigoSapSelect) codigoSapSelect.value = "";
            } else {
                throw new Error(result.message || 'Error al guardar el aviso.');
            }
        } catch (error) {
            console.error('Error al enviar datos:', error);
            alert(`Error al guardar el aviso: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Cargar Aviso';
        }
    }
});