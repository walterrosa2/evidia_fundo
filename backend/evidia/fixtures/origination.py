"""Fixture SINTETICA da originacao.

Nenhum dado abaixo descreve processo, parte ou pessoa real. Os CNJs sao gerados com
digito verificador valido a partir de sequenciais ficticios, e os nomes dizem
explicitamente que sao sinteticos. O formato reproduz CasoSaida, /analisados e Estudo
como declarados no codigo da originacao (ver research.md).
"""

from __future__ import annotations

from typing import Any

from evidia.domain.cnj import check_digits


def make_cnj(sequential: int, year: int, segment: str, court: str, origin: str) -> str:
    seq = f"{sequential:07d}"
    dv = check_digits(seq, str(year), segment, court, origin)
    return f"{seq}-{dv}.{year}.{segment}.{court}.{origin}"


def build_fixture() -> dict[str, Any]:
    cnj_a = make_cnj(9000001, 2024, "8", "26", "0100")
    cnj_b = make_cnj(9000002, 2023, "8", "19", "0001")
    cnj_c = make_cnj(9000003, 2022, "8", "13", "0024")

    def caso(id_: int, cnj: str | None, atualizado: str) -> dict[str, Any]:
        return {
            "id": id_,
            "advogado_id": 100 + id_,
            "advogado_nome": f"Advogado Sintetico {id_}",
            "processo_cnj_principal": cnj,
            "executivo_id": 1,
            "executivo_nome": "Executivo Sintetico",
            "repassado_por_id": 1,
            "nivel_liberado": 3,
            "linha": "N",
            "etapa": "V2",
            "etapa_rotulo": "Reunião",
            "recado": None,
            "vendo_lead_id": None,
            "criado_em": "2026-10-01T12:00:00+00:00",
            "atualizado_em": atualizado,
            "ultimo_contato": None,
            "etapa_desde": None,
            "prazo_em": None,
            "prazo_atividade": None,
            "eventos": None,
        }

    def estudo(id_: int, cnj: str, autor: str, reu: str, completude: str) -> dict[str, Any]:
        return {
            "id": id_,
            "versao": 2,
            "cnj": cnj,
            "titulo": f"{autor} contra {reu}",
            "o_que_vender": [],
            "analise": None,
            "base_da_analise": {
                "fontes": ["capa", "movimentos"],
                "n_movimentos": 12,
                "n_publicacoes": 0,
                "tem_laudo": False,
                "tem_sentenca": False,
                "completude": completude,
                "tem_autos": False,
            },
            "gerado_em": "2026-11-01T15:30:00+00:00",
            "simulado": True,
            "dados": {
                "autor": autor,
                "reus": [reu],
                "classe": "Procedimento Comum Cível",
                "assunto": "Prestação de serviços (sintético)",
                "orgao_julgador": "Vara Cível Sintética",
                "juiz": "Magistrado Sintético",
                "distribuicao": "2024-02-10",
                "valor_causa": "R$ 100.000,00",
            },
            "contatos": {
                "advogados": [
                    {
                        "pessoa_id": 1,
                        "nome": "Advogada Sintética Um",
                        "oab": "000001/SP",
                        "polo": "ativo",
                        "representa": autor,
                    }
                ]
            },
        }

    autor_a, reu_a = "Autora Sintética Alfa Ltda.", "Ré Sintética Beta S.A."
    autor_b, reu_b = "Autora Sintética Gama Ltda.", "Ré Sintética Delta S.A."

    return {
        "_aviso": "DADOS SINTETICOS — nao representam processos ou pessoas reais",
        "casos": [
            caso(1, cnj_a, "2026-11-10T10:00:00+00:00"),
            caso(2, cnj_b, "2026-11-11T10:00:00+00:00"),
            # CNJ com digito verificador invalido: deve virar rascunho, nao processo.
            caso(3, "9000009-00.2024.8.26.0100", "2026-11-12T10:00:00+00:00"),
            # Caso sem estudo e sem partes informadas.
            caso(4, cnj_c, "2026-11-13T10:00:00+00:00"),
        ],
        "analisados": [
            {
                "cnj": cnj_a,
                "titulo": f"{autor_a} contra {reu_a}",
                "autor": autor_a,
                "reu": reu_a,
                "classe": "Procedimento Comum Cível",
                "fase": "instrução",
                "estudo_em": "2026-11-01T15:30:00+00:00",
                "reestudo_pendente": False,
                "executivos": ["Executivo Sintetico"],
            },
            {
                "cnj": cnj_b,
                "titulo": f"{autor_b} contra {reu_b}",
                "autor": autor_b,
                "reu": reu_b,
                "classe": "Procedimento Comum Cível",
                "fase": "saneamento",
                "estudo_em": "2026-11-01T15:30:00+00:00",
                "reestudo_pendente": False,
                "executivos": [],
            },
        ],
        "estudos": {
            cnj_a: estudo(11, cnj_a, autor_a, reu_a, "movimentos"),
            cnj_b: estudo(12, cnj_b, autor_b, reu_b, "so_capa"),
        },
    }
