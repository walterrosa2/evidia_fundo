# API operacional da Evidia (FastAPI). Imagem para homologacao local; NAO e deploy de producao.
# Construir a partir da pasta backend/:  docker build -t evidia-api backend

# ---- dependencias
FROM python:3.13-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- execucao
FROM python:3.13-slim
# Tesseract (com portugues) faz a leitura local de documentos digitalizados, sem API paga.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 evidia \
    && mkdir -p /data && chown evidia:evidia /data

WORKDIR /app
COPY --from=builder /install /usr/local
COPY alembic.ini ./
COPY migrations ./migrations
COPY evidia ./evidia
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Banco, arquivos recebidos e logs ficam no volume /data, fora da imagem.
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    EVIDIA_API_HOST=0.0.0.0 \
    EVIDIA_API_PORT=8007 \
    EVIDIA_DATABASE_URL=sqlite:////data/evidia.db \
    EVIDIA_STORAGE_DIR=/data/storage \
    EVIDIA_LOG_DIR=/data/logs

USER evidia
VOLUME ["/data"]
EXPOSE 8007
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request;urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('EVIDIA_API_PORT','8007')+'/health',timeout=4)"
ENTRYPOINT ["./docker-entrypoint.sh"]
