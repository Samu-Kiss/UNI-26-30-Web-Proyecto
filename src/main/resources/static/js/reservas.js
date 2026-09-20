function mostrarCancelacion(reservaId) {
    const formulario = document.getElementById(
        "cancelacion-" + reservaId
    );

    formulario.style.display = "flex";
}

function cerrarCancelacion(reservaId) {
    const formulario = document.getElementById(
        "cancelacion-" + reservaId
    );

    const motivo = document.getElementById(
        "motivo-" + reservaId
    );

    motivo.value = "";
    formulario.style.display = "none";
}