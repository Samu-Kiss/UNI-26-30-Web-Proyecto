import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/** Conserva las respuestas HTML, la selección de rol y las redirecciones de Spring. */
@Injectable({ providedIn: 'root' })
export class BackendFormService {
  private readonly document = inject(DOCUMENT);

  enviar(ruta: string, datos: Record<string, string>): void {
    const form = this.document.createElement('form');
    form.method = 'post';
    const base = this.document.defaultView?.__MYT_CONFIG__?.backendUrl || 'http://localhost:8080';
    form.action = new URL(ruta, base).href;
    form.hidden = true;
    for (const [name, value] of Object.entries(datos)) {
      const field = this.document.createElement('input');
      field.type = 'hidden';
      field.name = name;
      field.value = value;
      form.appendChild(field);
    }
    this.document.body.appendChild(form);
    try {
      form.submit();
    } finally {
      form.remove();
    }
  }
}
