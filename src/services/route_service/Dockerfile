FROM python:3.10-slim

RUN useradd -m -u 1000 -s /bin/bash appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY service/ ./service/
COPY algorithms/ ./algorithms/

RUN mkdir -p /app/cache && chown -R appuser:appuser /app

USER appuser

ENV ROUTING_ALGORITHM=dijkstra
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "service.main:app", "--host", "0.0.0.0", "--port", "8000"]