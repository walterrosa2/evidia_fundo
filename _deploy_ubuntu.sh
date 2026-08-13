#!/bin/bash
set -e

echo "=== 🚀 Iniciando Deploy do Evidia Fundo no Servidor Ubuntu (Porta 8518) ==="

# 1. Pull das últimas alterações do Git
echo "📥 1. Atualizando código do repositório Git..."
git pull origin main

# 2. Rebuild e reinício dos containers Docker
echo "🐳 2. Subindo aplicação com Docker Compose..."
docker compose up -d --build

# 3. Limpeza de imagens não utilizadas
echo "🧹 3. Limpando imagens Docker antigas..."
docker image prune -f

echo "=== ✅ Deploy concluído com sucesso! Aplicação disponível em http://137.131.133.9:8518/ ==="
