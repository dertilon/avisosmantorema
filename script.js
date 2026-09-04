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
    const codigoSapInput = document.getElementById('codigoSapInput');
    const codigoSapHidden = document.getElementById('codigoSap');
    const sapDropdownList = document.getElementById('sapDropdownList');
    const fechaInput = document.getElementById('fecha');
    const dataForm = document.getElementById('dataForm');
    const submitButton = document.getElementById('submitButton');

    // URLs de Apps Script
    const URL_DATOS_SHEET = 'https://script.google.com/macros/s/AKfycbz0LWPbHck36KROtykqidL7GMm9YtMCFU0LmBrScnV-8MdFzjzTf7X_vkNtHoGWQtPG/exec';
    const URL_CARGA_AVISOS = 'https://script.google.com/macros/s/AKfycbx6I3SxdliiDcHtR1r-xj6WOALR1Zh60spuV1n2ZSHZylfy8ZAOClaug904EH0md17n/exec';

    let LISTA_SAP_GLOBAL = [];
    let usuarioActual = "";

    // -------------------------------------------------------------
    // 1. CARGA DE UBICACIONES TÉCNICAS (DESDE UBICACIONES.JS)
    // -------------------------------------------------------------
    if (typeof UBICACIONES_DATA !== 'undefined' && Array.isArray(UBICACIONES_DATA)) {
        ubicacionSelect.innerHTML = '<option value="">Seleccione una ubicación...</option>';
        UBICACIONES_DATA.forEach(ubi => {
            const opt = document.createElement('option');
            opt.value = ubi;
            opt.textContent = ubi;
            ubicacionSelect.appendChild(opt);
        });
    } else {
        console.warn("No se encontró el array UBICACIONES_DATA en ubicaciones.js");
    }

    // -------------------------------------------------------------
    // 2. CARGA DE REPUESTOS SAP (DESDE GOOGLE SHEETS)
    // -------------------------------------------------------------
    async function cargarParametrosDesdeSheets() {
        try {
            const response = await fetch(URL_DATOS_SHEET);
            const data = await response.json();

            if (data.status === "success" && data.codigosSap) {
                LISTA_SAP_GLOBAL = data.codigosSap.map(item => {
                    if (typeof item === 'object') {
                        return { codigo: item.codigo, etiqueta: item.etiqueta };
                    }
                    return { codigo: item, etiqueta: item };
                });
            }
        } catch (error) {
            console.error("Error al cargar repuestos SAP desde Google Sheets:", error);
        }
    }

    cargarParametrosDesdeSheets();

    // -------------------------------------------------------------
    // BUSCADOR PREDICTIVO SAP
    // -------------------------------------------------------------
    function renderizarListaSap(filtro = '') {
        const texto = filtro.toLowerCase().trim();
        const filtrados = LISTA_SAP_GLOBAL.filter(item => 
            item.etiqueta.toLowerCase().includes(texto)
        );

        sapDropdownList.innerHTML = '';

        if (filtrados.length === 0) {
            sapDropdownList.innerHTML = '<div class="sap-dropdown-item" style="color:#7f8c8d; cursor:default;">No se encontraron repuestos</div>';
            sapDropdownList.style.display = 'block';
            return;
        }

        filtrados.forEach(item => {
            const div = document.createElement('div');
            div.className = 'sap-dropdown-item';
            div.textContent = item.etiqueta;
            div.addEventListener('click', function() {
                codigoSapInput.value = item.etiqueta;
                codigoSapHidden.value = item.codigo;
                sapDropdownList.style.display = 'none';
            });
            sapDropdownList.appendChild(div);
        });

        sapDropdownList.style.display = 'block';
    }

    codigoSapInput.addEventListener('input', function() {
        codigoSapHidden.value = this.value;
        renderizarListaSap(this.value);
    });

    codigoSapInput.addEventListener('focus', function() {
        renderizarListaSap(this.value);
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.sap-autocomplete-container')) {
            sapDropdownList.style.display = 'none';
        }
    });

    // -------------------------------------------------------------
    // 3. VALIDACIÓN DE LOGIN (DESDE USUARIOS.JS)
    // -------------------------------------------------------------
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const userInput = String(loginUsuario.value).trim();
        const passInput = String(loginContrasena.value).trim();

        if (typeof USUARIOS_AUTORIZADOS === 'undefined' || USUARIOS_AUTORIZADOS.length === 0) {
            alert('No se pudo leer el archivo usuarios.js');
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
            userGreeting.textContent = `Legajo: ${usuarioActual}`;
            loginForm.reset();
        } else {
            loginError.style.display = 'block';
        }
    });

    logoutButton.addEventListener('click', function() {
        usuarioActual = "";
        formSection.style.display = 'none';
        loginSection.style.display = 'block';
    });

    // Fecha actual
    const hoy = new Date();
    const year = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    fechaInput.value = `${year}-${mm}-${dd}`;

    // -------------------------------------------------------------
    // 4. ENVÍO DEL FORMULARIO A GOOGLE SHEETS
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

        const descripcionTexto = document.getElementById('descripcion').value.trim();

        data.usuario = usuarioActual;
        data.descripcion = `${usuarioActual} - ${descripcionTexto}`;
        data.realizado = document.getElementById('realizado').checked ? 'Sí' : 'No';
        data.cambiar = document.getElementById('cambiar').checked ? 'Sí' : 'No';
        data.requireGrua = document.getElementById('requireGrua').checked ? 'Sí' : 'No';
        data.requireAndamio = document.getElementById('requireAndamio').checked ? 'Sí' : 'No';
        data.horas = data.horas ? parseFloat(data.horas) : 0;
        data.hh = data.hh ? parseFloat(data.hh) : 0;
        data.codigoSap = codigoSapHidden.value || codigoSapInput.value;

        if (!data.ubicacionTecnica || !data.titulo || !descripcionTexto) {
            alert('Por favor complete todos los campos obligatorios.');
            submitButton.disabled = false;
            submitButton.textContent = 'CARGAR AVISO';
            return;
        }

        enviarAvisoAGoogleSheets(data, year, mm, dd);
    });

    async function enviarAvisoAGoogleSheets(data, year, mm, dd) {
        const mensajeExito = document.getElementById('mensajeExito');

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
                if (mensajeExito) {
                    mensajeExito.style.display = 'block';
                    setTimeout(() => {
                        mensajeExito.style.display = 'none';
                    }, 4000);
                }

                dataForm.reset();
                fechaInput.value = `${year}-${mm}-${dd}`;
                ubicacionSelect.value = "";
                codigoSapInput.value = "";
                codigoSapHidden.value = "";
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert(`Error al guardar aviso: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'CARGAR AVISO';
        }
    }
});
