import { describe, expect, it } from "vitest";
import { HELP } from "./help";

const FORMATS = [
  ["O que é", "Como é calculado", "Como ler"],
  ["O que é", "Como funciona", "Como ler"],
  ["O que faz", "Quando usar", "O que muda"],
];

describe("ajuda das telas operacionais", () => {
  const entries = Object.entries(HELP);

  it("todo tópico tem três partes, em um dos formatos do guia", () => {
    for (const [topic, entry] of entries) {
      const lines = entry.text.split(/\n/);
      const heads = lines.map((line) => line.split(":")[0]);
      expect(FORMATS, topic).toContainEqual(heads);
      for (const line of lines) {
        expect(line.split(": ").slice(1).join(": ").length, topic).toBeGreaterThanOrEqual(15);
      }
      expect(entry.text.length, topic).toBeLessThanOrEqual(560);
    }
  });

  it("segue o guia editorial: terceira pessoa e sem instrução de navegação", () => {
    for (const [topic, entry] of entries) {
      expect(entry.text.toLowerCase(), topic).not.toMatch(
        /\bvocê\b|\bseu\b|\bsua\b|clique|\babra\b/,
      );
    }
  });

  it("rótulos são únicos e não repetem o nome de botões da tela", () => {
    const labels = entries.map(([, entry]) => entry.label);
    expect(new Set(labels).size).toBe(labels.length);
    const buttons = [
      "Colunas",
      "Visões",
      "Exportar",
      "Achados em Tabela",
      "Abrir Diligência",
      "Abrir Contraditório",
      "Emitir Memorando",
      "Aprovar Memorando",
      "Preparar Execução",
      "Registrar Consulta",
      "Importar Relatório",
      "Ver Itens do P4",
    ];
    for (const label of labels) {
      for (const button of buttons) {
        expect(label.toLowerCase(), label).not.toContain(button.toLowerCase());
      }
    }
  });
});
