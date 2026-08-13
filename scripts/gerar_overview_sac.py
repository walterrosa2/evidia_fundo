import os
import sys
import json
import re
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils.dataframe import dataframe_to_rows
import google.generativeai as genai

# Definir codificação e chaves
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

API_KEY = "AQ.Ab8RN6Js8XhHq71dhdLCSVQEl1qnzePft4ny6VVzSxlj6Ldlqw"
genai.configure(api_key=API_KEY)

TXT_PATH = r"E:\Backup_HD_Walter\Cruvinel_dados\Plataforma Fundos Investimentos\Dados\ELETROMAR X TOTVS\resultado_paginado_ELETROMAR  X TOTVS_20260805-1016_20260805-1409.txt"
OUTPUT_EXCEL = r"E:\Backup_HD_Walter\Cruvinel_dados\Plataforma Fundos Investimentos\Dados\ELETROMAR X TOTVS\overview_contexto_global_SAC_ELETROMAR_X_TOTVS.xlsx"
WORKSPACE_OUTPUT = r"c:\Users\walte\OneDrive\Workspace\IA\Cruvinel\Projetos_MVP\Projetos\Plataforma fundos\blueprint-builder-biz-main\outputs\overview_contexto_global_SAC_ELETROMAR_X_TOTVS.xlsx"

def carregar_e_amostrar_texto(filepath, max_chars=120000):
    print(f"📄 Lendo arquivo de processo: {filepath}")
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        texto = f.read()
    
    total_len = len(texto)
    print(f"📊 Tamanho total do documento: {total_len} caracteres.")
    
    if total_len <= max_chars:
        return texto
    
    # Amostragem inteligente: início (petição inicial), meio (contratos/perícia), fim (decisões/sentença)
    parte1 = texto[:40000]
    parte2 = texto[total_len//2 - 20000 : total_len//2 + 20000]
    parte3 = texto[-40000:]
    
    return f"{parte1}\n\n[... SEÇÃO INTERMEDIÁRIA COMPLEMENTAR ...]\n\n{parte2}\n\n[... SEÇÃO FINAL DO PROCESSO ...]\n\n{parte3}"

def executar_analise_contexto_global_sac(texto_amostra):
    print("🧠 Enviando requisição para Gemini (Contexto Global SAC)...")
    
    prompt = """
Você é um especialista sênior em Perícia Judicial Financeira, Auditoria de Contratos de Software e Análise de Risco Contratual (Contexto Global SAC).
Sua tarefa é produzir um OVERVIEW COMPLETO E ESTRUTURADO do processo judicial ELETROMAR MÓVEIS E ELETRODOMÉSTICOS LTDA X TOTVS S.A.

Analise o texto do processo fornecido e retorne ESTRITAMENTE um objeto JSON válido (sem textos antes ou depois) com a seguinte estrutura:

{
  "Visao_Geral": [
    {
      "Campo": "Processo",
      "Valor": "ELETROMAR X TOTVS"
    },
    {
      "Campo": "Partes Envolvidas",
      "Valor": "Eletromar Móveis e Eletrodomésticos Ltda (Autora) x TOTVS S.A. / JK (Réis)"
    },
    {
      "Campo": "Objeto da Lide",
      "Valor": "Descrição do objeto da ação, contratos rescindidos e pleito de indenização/devolução"
    },
    {
      "Campo": "Contexto Global SAC",
      "Valor": "Análise da amortização contratual, parcelamentos, serviços prestados vs faturados e impacto financeiro"
    },
    {
      "Campo": "Fase Processual Atual",
      "Valor": "Descrição da fase processual, laudo pericial e recursos"
    }
  ],
  "Tese_Eletromar": [
    {
      "Ponto": "Descumprimento Contratual",
      "Detalhamento": "Detalhe da alegação da Eletromar referente à implantação incompleta do ERP TOTVS"
    },
    {
      "Ponto": "Inscrição Indevida em Cadastros de Restrição",
      "Detalhamento": "Inclusão indevida no Serasa/SPC antes da entrega total do sistema"
    },
    {
      "Ponto": "Perdas, Danos e Restituição",
      "Detalhamento": "Pedido de restituição dos valores pagos e indenização por danos materiais/morais"
    }
  ],
  "Tese_Totvs": [
    {
      "Ponto": "Adimplemento das Licenças",
      "Detalhamento": "Alegação de disponibilização de licenças de software e prestação de manutenção"
    },
    {
      "Ponto": "Individualização das Obrigações",
      "Detalhamento": "Tese de ausência de responsabilidade solidária entre TOTVS e a parceira de implantação"
    },
    {
      "Ponto": "Cobrança Legítima",
      "Detalhamento": "Defesa da validade dos títulos faturados e contratação dos serviços"
    }
  ],
  "Analise_Financeira_e_SAC": [
    {
      "Item_Financeiro": "Contratos Faturados",
      "Analise_Detalhada": "Análise dos contratos de cessão de uso, manutenção e implantação"
    },
    {
      "Item_Financeiro": "Valores Pagos vs Pendentes",
      "Analise_Detalhada": "Confronto entre valores desembolsados pela Eletromar e cobranças efetuadas pela TOTVS"
    },
    {
      "Item_Financeiro": "Métrica de Amortização / Entregáveis",
      "Analise_Detalhada": "Percentual de horas/rotinas entregues vs valor total cobrado no plano de amortização"
    }
  ],
  "Nulidades_e_Pericia": [
    {
      "Aspecto": "Laudo Pericial",
      "Constatacao": "Principais achados do laudo técnico judicial sobre aceite formal e horas rodadas"
    },
    {
      "Aspecto": "Impugnações e Vulnerabilidades",
      "Constatacao": "Pontos fracos ou omissões apontados pelos assistentes técnicos"
    }
  ],
  "Matriz_Estrategica_de_Valores": [
    {
      "Rubrica": "Restituição de Valores Pagos",
      "Valor_Estimado": "R$ A apurar no processo",
      "Nivel_Risco": "Moderado",
      "Recomendacao": "Manter pleito com base no descumprimento de aceite formal"
    },
    {
      "Rubrica": "Danos Morais / Negativação",
      "Valor_Estimado": "R$ Indenização pleiteada",
      "Nivel_Risco": "Baixo",
      "Recomendacao": "Forte evidência de negativação prematura"
    },
    {
      "Rubrica": "Rescisão de Licenciamento",
      "Valor_Estimado": "Valor integral dos contratos",
      "Nivel_Risco": "Favorável",
      "Recomendacao": "Confirmar jurisprudência sobre contratos coligados de software"
    }
  ]
}

Responda ÚNICA E EXCLUSIVAMENTE com o objeto JSON válido contendo dados específicos, profundos e reais extraídos do processo.
"""
    
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(
        [prompt, f"DOCUMENTO DO PROCESSO:\n{texto_amostra}"],
        generation_config={"temperature": 0.1, "response_mime_type": "application/json"}
    )
    
    raw_text = response.text.strip()
    return json.loads(raw_text)

def formatar_planilha_excel(json_dados, output_file):
    print(f"📊 Gerando planilha Excel formatada: {output_file}")
    
    wb = openpyxl.Workbook()
    # Remover aba padrão
    wb.remove(wb.active)
    
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Calibri", size=10)
    title_font = Font(name="Calibri", size=14, bold=True, color="1F4E78")
    
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    for aba_nome, lista_dados in json_dados.items():
        ws = wb.create_sheet(title=aba_nome[:31])
        df = pd.DataFrame(lista_dados)
        
        # Título da Aba
        ws.append([f"OVERVIEW DO PROCESSO (CONTEXTO GLOBAL SAC) — {aba_nome.replace('_', ' ')}"])
        ws.cell(row=1, column=1).font = title_font
        ws.append([]) # Linha em branco
        
        # Inserir DataFrame
        for r_idx, row in enumerate(dataframe_to_rows(df, index=False, header=True), start=3):
            ws.append(row)
            for c_idx in range(1, len(row) + 1):
                cell = ws.cell(row=r_idx, column=c_idx)
                if r_idx == 3:
                    cell.fill = header_fill
                    cell.font = header_font
                    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                else:
                    cell.font = data_font
                    cell.border = thin_border
                    cell.alignment = Alignment(vertical="top", wrap_text=True)
        
        # Ajustar largura das colunas
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 15), 80)
            
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    wb.save(output_file)
    print(f"✅ Excel de Overview SAC salvo com sucesso!")

def main():
    try:
        texto = carregar_e_amostrar_texto(TXT_PATH)
        resultado_json = executar_analise_contexto_global_sac(texto)
        
        # Gerar na pasta do HD/Dados
        formatar_planilha_excel(resultado_json, OUTPUT_EXCEL)
        
        # Gerar no workspace do projeto
        formatar_planilha_excel(resultado_json, WORKSPACE_OUTPUT)
        
        print("\n🎉 Execução concluída com sucesso absoluto!")
        print(f"📁 Arquivo Principal: {OUTPUT_EXCEL}")
        print(f"📁 Arquivo Workspace: {WORKSPACE_OUTPUT}")
    except Exception as e:
        print(f"❌ Erro na execução: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
