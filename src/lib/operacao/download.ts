/** Entrega ao usuário um arquivo gerado pelo servidor. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Libera o objeto depois que o navegador iniciou o download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
