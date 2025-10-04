FROM python:alpine3.19

WORKDIR /app

COPY requirements.txt .

RUN python3 -v
RUN ./venv/bin/pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python3", "/app/main.py"]