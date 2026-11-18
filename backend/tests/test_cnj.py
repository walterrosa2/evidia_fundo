import pytest

from evidia.domain.cnj import InvalidCnj, parse_cnj
from evidia.fixtures.origination import make_cnj


def test_numero_publico_conhecido_valida_digito_e_tribunal():
    # Numero de processo publico ja citado na demo do projeto; usado so como vetor de DV.
    cnj = parse_cnj("1116020-53.2020.8.26.0100")
    assert cnj.masked == "1116020-53.2020.8.26.0100"
    assert cnj.court_label == "TJSP"
    assert cnj.court_code == "8.26"


def test_normaliza_entrada_sem_mascara():
    assert parse_cnj("11160205320208260100").masked == "1116020-53.2020.8.26.0100"


@pytest.mark.parametrize(
    "raw",
    [None, "", "123", "1116020-54.2020.8.26.0100", "9000009-00.2024.8.26.0100", "abc"],
)
def test_rejeita_cnj_ausente_curto_ou_com_digito_errado(raw):
    with pytest.raises(InvalidCnj):
        parse_cnj(raw)


def test_gerador_da_fixture_produz_digito_valido():
    cnj = make_cnj(9000001, 2024, "5", "02", "0001")
    assert parse_cnj(cnj).court_label == "TRT2"
